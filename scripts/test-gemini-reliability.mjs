import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Exercise the actual helper with synthetic responses and a virtual clock.
// No credentials, user data, Gemini requests, or real waits.
const source = readFileSync(new URL('../supabase/functions/foco-api/index.ts', import.meta.url), 'utf8');
const helper = stripTypeScriptTypes(source.slice(source.indexOf('async function aiJson('), source.indexOf('async function dispatch(')), { mode: 'transform' });
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
function harness(respond, fallback = 'secondary') {
  let now = 0, timer;
  const calls = [];
  const run = new Function('GEMINI_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODEL', 'ApiError', 'fetch', 'Date', 'setTimeout', 'clearTimeout', helper + '\nreturn aiJson;')(
    'synthetic-key', 'primary', fallback, ApiError,
    async (url, options) => {
      const model = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
      calls.push(model);
      assert.equal(options.headers['x-goog-api-key'], 'synthetic-key');
      assert.equal(JSON.parse(options.body).generationConfig.responseMimeType, 'application/json');
      return respond({ model, options, calls, budget: timer.ms,
        elapse: ms => { now += ms; },
        timeout: () => { now += timer.ms; timer.fn(); throw new DOMException('Synthetic timeout', 'AbortError'); },
      });
    }, { now: () => now },
    (fn, ms) => { timer = { fn, ms }; if (ms === 350) { now += ms; fn(); } return timer; },
    id => { if (timer === id) timer = undefined; },
  );
  return { run: () => run('synthetic prompt', {}), calls, now: () => now, timer: () => timer };
}
const success = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }));
const failure = status => new Response(JSON.stringify({ error: { message: 'Synthetic provider failure' } }), { status });
let checks = 0;
async function check(label, fn) { await fn(); checks++; console.log('PASS ' + label); }
await check('overload immediately tries fallback before repeating primary', async () => {
  const h = harness(({model}) => model === 'primary' ? failure(503) : success());
  assert.deepEqual(await h.run(), {ok:true}); assert.deepEqual(h.calls, ['primary','secondary']); assert.equal(h.timer(),undefined);
});
await check('slow primary leaves a full attempt for fallback, including response body', async () => {
  const h = harness(({model,timeout,budget,elapse}) => {
    if (model === 'primary') return timeout();
    assert.equal(budget,25_000);
    return { ok:true, text:async () => { elapse(24_000); return await success().text(); } };
  });
  assert.deepEqual(await h.run(),{ok:true}); assert.equal(h.now(),49_000);
  assert.deepEqual(h.calls,['primary','secondary']); assert.equal(h.timer(),undefined);
});
await check('transient failures retry both models with a bounded total deadline', async () => {
  const h = harness(() => failure(429));
  await assert.rejects(h.run(),e => e.status === 503);
  assert.deepEqual(h.calls,['primary','secondary','primary','secondary']);
  const slow = harness(({timeout}) => timeout());
  await assert.rejects(slow.run(),e => e.status === 503);
  assert.equal(slow.now(),55_000); assert.equal(slow.timer(),undefined);
});
await check('missing model and invalid JSON can recover through fallback', async () => {
  for (const response of [failure(404),new Response('{broken'),new Response(JSON.stringify({candidates:[]}))]) {
    const h = harness(({model}) => model === 'primary' ? response : success());
    assert.deepEqual(await h.run(),{ok:true}); assert.deepEqual(h.calls,['primary','secondary']);
  }
});
await check('invalid credentials stop immediately without extra provider calls', async () => {
  for (const status of [400,401,403]) {
    const h = harness(() => failure(status));
    await assert.rejects(h.run(),e => e.status === 502); assert.deepEqual(h.calls,['primary']);
  }
});
await check('identical configured models are deduplicated', async () => {
  const h = harness(() => failure(503),'primary');
  await assert.rejects(h.run(),e => e.status === 503); assert.deepEqual(h.calls,['primary','primary']);
});
console.log(`GEMINI RELIABILITY: ${checks} groups passed.`);
