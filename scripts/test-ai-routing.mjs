import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Run the published helper with isolated providers. These checks never send
// credentials, user data, media, or inference requests to an external service.
const source = readFileSync(new URL('../supabase/functions/foco-api/index.ts', import.meta.url), 'utf8');
const helper = stripTypeScriptTypes(source.slice(source.indexOf('async function aiJson('), source.indexOf('async function dispatch(')), { mode: 'transform' });
class ApiError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
class GroqError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}
const catalog = ['Supino reto com barra', 'Agachamento livre com barra'];
const schema = { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } }, required: ['ok'] };
const media = { data: 'c3ludGhldGljLW1lZGlh', mime: 'image/png' };
function harness({ groqKey = 'synthetic-groq', geminiKey = 'synthetic-gemini', groqResponse = async () => ({ ok: true }) } = {}) {
  const calls = { groq: [], gemini: [] };
  const aiJson = new Function(
    'GROQ_KEY', 'GROQ_MODEL', 'GEMINI_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODEL',
    'OFFICIAL_EXERCISES', 'ApiError', 'GroqError', 'generateGroqJson', 'fetch',
    helper + '\nreturn aiJson;',
  )(
    groqKey, 'openai/gpt-oss-20b', geminiKey, 'synthetic-primary', 'synthetic-secondary',
    catalog, ApiError, GroqError,
    async options => { calls.groq.push(options); return groqResponse(options); },
    async (url, options) => {
      calls.gemini.push({ url, options });
      assert.equal(options.headers['x-goog-api-key'], geminiKey);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }));
    },
  );
  return { calls, run: attachment => aiJson('synthetic prompt', schema, attachment) };
}

let checks = 0;
async function check(label, fn) { await fn(); checks++; console.log('PASS ' + label); }

await check('text uses Groq exclusively when its key is configured', async () => {
  const h = harness();
  assert.deepEqual(await h.run(), { ok: true });
  assert.equal(h.calls.groq.length, 1);
  assert.equal(h.calls.gemini.length, 0);
  const request = h.calls.groq[0];
  assert.equal(request.apiKey, 'synthetic-groq');
  assert.equal(request.model, 'openai/gpt-oss-20b');
  assert.equal(request.prompt, 'synthetic prompt');
  assert.equal(request.schema, schema);
  assert.equal(request.catalog, catalog);
});

await check('Groq-only configuration can generate text without a Gemini key', async () => {
  const h = harness({ geminiKey: '' });
  assert.deepEqual(await h.run(), { ok: true });
  assert.equal(h.calls.groq.length, 1);
  assert.equal(h.calls.gemini.length, 0);
});

await check('missing Groq configuration preserves the Gemini text path', async () => {
  const h = harness({ groqKey: '' });
  assert.deepEqual(await h.run(), { ok: true });
  assert.equal(h.calls.groq.length, 0);
  assert.equal(h.calls.gemini.length, 1);
  const request = JSON.parse(h.calls.gemini[0].options.body);
  assert.deepEqual(request.contents[0].parts, [{ text: 'synthetic prompt' }]);
  assert.deepEqual(request.generationConfig.responseSchema, schema);
});

await check('images and PDFs always retain the Gemini media path', async () => {
  for (const mime of ['image/png', 'application/pdf']) {
    const h = harness();
    const attachment = { ...media, mime };
    assert.deepEqual(await h.run(attachment), { ok: true });
    assert.equal(h.calls.groq.length, 0);
    assert.equal(h.calls.gemini.length, 1);
    const request = JSON.parse(h.calls.gemini[0].options.body);
    assert.deepEqual(request.contents[0].parts[0], { inline_data: { mime_type: mime, data: media.data } });
  }
});

await check('missing media credential fails before contacting either provider', async () => {
  const h = harness({ geminiKey: '' });
  await assert.rejects(h.run(media), error => error instanceof ApiError && error.status === 503);
  assert.equal(h.calls.groq.length, 0);
  assert.equal(h.calls.gemini.length, 0);
});

await check('Groq errors retain their HTTP status and never silently fall back to Gemini', async () => {
  for (const status of [429, 502, 503]) {
    const failure = new GroqError(status, 'Synthetic provider failure', 'SYNTHETIC_GROQ_ERROR');
    const h = harness({ groqResponse: async () => { throw failure; } });
    await assert.rejects(h.run(), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      assert.equal(error.message, failure.message);
      assert.equal(error.code, failure.code);
      return true;
    });
    assert.equal(h.calls.groq.length, 1);
    assert.equal(h.calls.gemini.length, 0);
  }
});

await check('unexpected Groq transport failures are redacted without a Gemini retry', async () => {
  const h = harness({ groqResponse: async () => { throw new Error('synthetic-groq synthetic-private-context'); } });
  await assert.rejects(h.run(), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 503);
    assert.equal(error.code, 'AI_UNAVAILABLE');
    assert.doesNotMatch(error.message, /synthetic-groq|synthetic-private-context/);
    return true;
  });
  assert.equal(h.calls.groq.length, 1);
  assert.equal(h.calls.gemini.length, 0);
});

await check('public status reports text and media configuration independently without exposing keys', async () => {
  const dispatchSource = stripTypeScriptTypes(source.slice(source.indexOf('async function dispatch('), source.indexOf('\nDeno.serve(')), { mode: 'transform' });
  for (const [groqKey, geminiKey] of [['', ''], ['synthetic-groq', ''], ['', 'synthetic-gemini'], ['synthetic-groq', 'synthetic-gemini']]) {
    const dispatch = new Function('GROQ_KEY', 'GEMINI_KEY', 'SCIENCE_ENGINE_VERSION', 'PRIVATE_FILE_BUCKET', 'response', dispatchSource + '\nreturn dispatch;')(
      groqKey, geminiKey, 'synthetic-science', 'synthetic-bucket',
      (body, status) => new Response(JSON.stringify(body), { status }),
    );
    const response = await dispatch(new Request('https://local.invalid/api/system/status'), '/api/system/status', '');
    assert.equal(response.status, 200);
    const raw = await response.text();
    assert.doesNotMatch(raw, /synthetic-groq|synthetic-gemini/);
    const data = JSON.parse(raw);
    assert.equal(data.ai_status, groqKey || geminiKey ? 'configured' : 'missing_key');
    assert.equal(data.ai_text_status, groqKey || geminiKey ? 'configured' : 'missing_key');
    assert.equal(data.ai_media_status, geminiKey ? 'configured' : 'missing_key');
    assert.equal(data.ai_provider, groqKey ? 'groq' : 'gemini');
  }
});

console.log(`AI ROUTING: ${checks} groups passed; no network or production data used.`);
