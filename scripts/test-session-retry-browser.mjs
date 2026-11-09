import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { auditCredentials, createAuditFixtures } from './fixtures/audit-browser.mjs';

// Synthetic-only regression tests: no real login, upload, write or paid API call.
const base = process.env.FOCO_E2E_BASE_URL || 'http://127.0.0.1:4173/FOCO/';
const output = process.env.FOCO_E2E_OUTPUT_DIR || 'work/session-retry-browser';
const localOrigin = new URL(base).origin;
mkdirSync(output, { recursive: true });
const results = [];
const contexts = [];
const unexpectedWrites = [];
const userId = createAuditFixtures()['/api/auth/me'].user.id;
const workoutKey = 'foco:workout-draft:v1:' + encodeURIComponent(userId);
const cardioKey = 'foco:cardio-draft:v1:' + encodeURIComponent(userId);
const otherWorkoutKey = 'foco:workout-draft:v1:another-synthetic-account';
const otherCardioKey = 'foco:cardio-draft:v1:another-synthetic-account';
const sentinel = 'another account draft must survive';
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});

async function fixturePage({ seededWorkout = false, seededCardio = false, quota = false, loseFirstResponse = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block' });
  contexts.push(context);
  const fixtures = createAuditFixtures();
  const state = { posts: [], records: new Map(), discardedResponse: false };
  await context.addInitScript(({ seededWorkout, seededCardio, quota, userId, credentials, sentinel }) => {
    localStorage.setItem('foco_auth_token', credentials.access);
    if (!sessionStorage.getItem('__foco_session_retry_seeded')) {
      sessionStorage.setItem('__foco_session_retry_seeded', '1');
      localStorage.setItem('foco:workout-draft:v1:another-synthetic-account', sentinel);
      localStorage.setItem('foco:cardio-draft:v1:another-synthetic-account', sentinel);
      const now = Date.now();
      if (seededWorkout) localStorage.setItem('foco:workout-draft:v1:' + encodeURIComponent(userId), JSON.stringify({
        version: 1, updatedAt: now, clientRequestId: crypto.randomUUID(),
        sessionStartedAt: new Date(now - 60000).toISOString(), planId: 'audit-plan',
        selectedTrainingDay: 'segunda', sessionNotes: 'Notas sintéticas preservadas',
        exerciseLogs: [{ exercise_name: 'Supino reto com barra', muscle_group: 'Peitoral', rest_seconds: 60,
          sets: [{ set_number: 1, repetitions: 10, load_kg: 20, completed: true }] }],
      }));
      if (seededCardio) localStorage.setItem('foco:cardio-draft:v1:' + encodeURIComponent(userId), JSON.stringify({
        version: 1, clientRequestId: crypto.randomUUID(), machine: 'esteira', effort: 'leve',
        startedAt: now - 60000, finishedAt: now - 1000, runningSince: null,
        accumulatedSeconds: 60, finalizing: true, metric: '1,25', notes: 'Cardio sintético preservado',
      }));
    }
    window.__focoAuditQuota = quota;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (window.__focoAuditQuota && /foco:(?:workout|cardio)-draft:/.test(key)) {
        throw new DOMException('Synthetic quota limit', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  }, { seededWorkout, seededCardio, quota, userId, credentials: auditCredentials, sentinel });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const prefix = '/functions/v1/foco-api';
    const isApi = url.pathname.startsWith(prefix) || url.pathname.startsWith('/api/');
    if (isApi || /(?:^|\.)supabase\.(?:co|com)$/.test(url.hostname)) {
      const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS' }, body: JSON.stringify(body) });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS' }, body: '' });
      if (request.method() === 'POST' && path === '/api/sessions') {
        const payload = request.postDataJSON();
        assert.match(payload.client_request_id, /^[0-9a-f-]{36}$/i, 'Every new finalization must identify its logical session');
        state.posts.push(payload);
        let record = state.records.get(payload.client_request_id);
        if (!record) {
          record = { ...payload, id: 'synthetic-session-' + state.records.size, user_id: userId };
          state.records.set(payload.client_request_id, record);
        }
        if (loseFirstResponse && !state.discardedResponse) {
          state.discardedResponse = true;
          return route.abort('failed'); // The server saved it, but the client never got its response.
        }
        return json(201, record);
      }
      if (request.method() !== 'GET') {
        unexpectedWrites.push(request.method() + ' ' + path);
        return json(403, { error: 'Unexpected write blocked by session regression test' });
      }
      return Object.hasOwn(fixtures, path) ? json(200, fixtures[path]) : json(404, { error: 'No synthetic fixture' });
    }
    if (/RepDB\/exercise-dataset\/main\/exercises\.json|exercise-dataset\.com\/exercises\.json/.test(request.url())) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 1, exercises: [{
        id: 'bench-press', name_en: 'Bench Press', body_part: 'chest', equipment: 'barbell',
        images: { flat: { start: 'images/flat/bench-press-start.webp', peak: 'images/flat/bench-press-peak.webp' } },
      }] }) });
    }
    if (request.url().includes('RepDB/exercise-dataset/main/images/flat/')) return route.fulfill({
      status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L5sAAAAASUVORK5CYII=', 'base64'),
    });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      unexpectedWrites.push(request.method() + ' ' + url.origin + url.pathname);
      return route.abort('blockedbyclient');
    }
    // A local build is sufficient here. External fonts/assets are irrelevant to
    // persistence and are blocked so this regression has no external data seam.
    if (url.origin === localOrigin) return route.continue();
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return { context, page, state };
}

async function openView(page, view) {
  const url = new URL(base); url.searchParams.set('view', view);
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  await page.locator('#foco-main-content').waitFor();
}
async function getStored(page, key) { return page.evaluate(key => localStorage.getItem(key), key); }
async function check(name, task) {
  try { await task(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, status: 'FAIL', error: String(error) }); console.error('FAIL ' + name + ': ' + error); }
}

try {
  await check('workout: lost response + reload replays the same record, then focuses the success dialog', async () => {
    const { context, page, state } = await fixturePage();
    await openView(page, 'sessao');
    await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Repetições da série atual' }).fill('10');
    await page.getByRole('button', { name: 'Concluir série', exact: true }).first().click();
    await page.getByRole('button', { name: 'Finalizar e salvar treino', exact: true }).click();
    const retry = page.getByRole('button', { name: 'Tentar salvar o mesmo treino', exact: true });
    await retry.waitFor();
    await page.getByRole('alert').filter({ hasText: /mantido para tentar novamente/ }).waitFor();
    assert.equal(state.posts.length, 1);
    const original = state.posts[0];
    assert.deepEqual(JSON.parse(await getStored(page, workoutKey)).pendingSubmission, original);
    await page.reload({ waitUntil: 'domcontentloaded' }); await retry.waitFor();
    assert.deepEqual(JSON.parse(await getStored(page, workoutKey)).pendingSubmission, original);
    await retry.click();
    const dialog = page.getByRole('dialog', { name: 'Treino concluído e registrado', exact: true });
    await dialog.waitFor();
    assert.deepEqual(state.posts[1], original);
    assert.equal(state.records.size, 1);
    assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true);
    assert.equal(await getStored(page, workoutKey), null);
    assert.equal(await getStored(page, otherWorkoutKey), sentinel);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    await context.close();
  });

  await check('cardio: lost response + reload preserves time, metrics and replay identity', async () => {
    const { context, page, state } = await fixturePage({ seededCardio: true });
    await openView(page, 'cardio');
    await page.getByRole('button', { name: 'Finalizar e registrar cardio', exact: true }).click();
    const retry = page.getByRole('button', { name: 'Tentar salvar o mesmo cardio', exact: true });
    await retry.waitFor();
    await page.getByRole('alert').filter({ hasText: /mantido para tentar novamente/ }).waitFor();
    assert.equal(state.posts.length, 1);
    const original = state.posts[0];
    assert.equal(original.duration_seconds, 60);
    assert.match(original.notes, /1,25 km/);
    assert.equal(await page.getByLabel(/Distância percorrida/).isDisabled(), true);
    await page.reload({ waitUntil: 'domcontentloaded' }); await retry.waitFor();
    assert.deepEqual(JSON.parse(await getStored(page, cardioKey)).pendingSubmission, original);
    assert.equal(await page.getByRole('timer').innerText(), '00:01:00');
    await retry.click();
    await page.getByText('Cardio registrado no histórico.', { exact: true }).last().waitFor();
    assert.deepEqual(state.posts[1], original);
    assert.equal(state.records.size, 1);
    assert.equal(await getStored(page, cardioKey), null);
    assert.equal(await getStored(page, otherCardioKey), sentinel);
    await context.close();
  });

  await check('storage quota: finalization sends nothing until its replay snapshot can be preserved', async () => {
    const { context, page, state } = await fixturePage({ seededWorkout: true, quota: true, loseFirstResponse: false });
    await openView(page, 'sessao');
    const previousRaw = await getStored(page, workoutKey);
    await page.getByRole('button', { name: 'Finalizar e salvar treino', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: /O treino ainda não foi enviado/ }).waitFor();
    assert.equal(state.posts.length, 0);
    assert.equal(await getStored(page, workoutKey), previousRaw);
    await page.evaluate(() => { window.__focoAuditQuota = false; });
    await page.getByRole('button', { name: 'Tentar salvar o mesmo treino', exact: true }).click();
    await page.getByRole('dialog', { name: 'Treino concluído e registrado' }).waitFor();
    assert.equal(state.posts.length, 1);
    assert.equal(await getStored(page, workoutKey), null);
    assert.equal(await getStored(page, otherWorkoutKey), sentinel);
    await context.close();
  });
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  writeFileSync(output + '/report.json', JSON.stringify({ synthetic: true, real_user_authenticated: false,
    production_write_requests_sent: 0, unexpectedWrites, results }, null, 2));
}
assert.deepEqual(unexpectedWrites, [], 'All API writes must be explicitly mocked');
if (results.some(result => result.status !== 'PASS')) process.exitCode = 1;
