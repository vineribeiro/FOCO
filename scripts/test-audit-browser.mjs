import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { auditCredentials as credentials, createAuditFixtures } from './fixtures/audit-browser.mjs';

// Run against a local production build by default. Published URLs are opt-in.
// ALL API traffic is fulfilled locally, including failed synthetic login/refresh.
const base = process.env.FOCO_E2E_BASE_URL || 'http://127.0.0.1:4173/FOCO/';
const output = process.env.FOCO_E2E_OUTPUT_DIR || 'work/audit-browser';
const proxyBridge = process.env.FOCO_BROWSER_PROXY_BRIDGE === '1';
mkdirSync(output, { recursive: true });
const results = [];
const contexts = [];
const safety = { interceptedApiRequests: 0, blockedUnexpectedWrites: [], unmockedApiRequests: [], externalWritesSent: 0 };
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});

async function until(predicate, message, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(30);
  }
  assert.fail(message);
}

async function fixturePage({ authenticated = true, failedPath = null, refreshMode = null, authFailure = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block' });
  contexts.push(context);
  const fixtures = createAuditFixtures();
  const state = { failedPath, refreshMode, authFailure, refreshRequests: 0, apiRequests: [] };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
    const apiPrefix = '/functions/v1/foco-api';
    const isApi = url.pathname.startsWith(apiPrefix) || url.pathname.startsWith('/api/');
    if (isApi || /(?:^|\.)supabase\.(?:co|com)$/.test(url.hostname)) {
      safety.interceptedApiRequests++;
      const path = url.pathname.startsWith(apiPrefix) ? url.pathname.slice(apiPrefix.length) : url.pathname;
      const key = request.method() + ' ' + path;
      state.apiRequests.push(key);
      const json = (status, body) => route.fulfill({ status,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS' },
        contentType: 'application/json', body: JSON.stringify(body) });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS' }, body: '' });
      if (path === '/api/auth/refresh' && request.method() === 'POST') {
        state.refreshRequests++;
        if (state.refreshMode === 'hang') return; // Hold until AbortController's deadline.
        if (state.refreshMode === 'offline') return route.abort('internetdisconnected');
        if (state.refreshMode === '503') return json(503, { error: 'Falha temporária sintética' });
        return json(200, { token: credentials.renewedAccess, refresh_token: credentials.renewedRefresh,
          expires_at: Math.floor(Date.now() / 1000) + 3600 });
      }
      if (request.method() === 'POST' && ['/api/auth/login', '/api/auth/register'].includes(path) && state.authFailure) {
        return json(state.authFailure.status, { error: state.authFailure.error });
      }
      if (request.method() !== 'GET') {
        safety.blockedUnexpectedWrites.push(key);
        return json(403, { error: 'Unexpected write blocked by synthetic regression test' });
      }
      if (!Object.hasOwn(fixtures, path)) {
        safety.unmockedApiRequests.push(key);
        return json(404, { error: 'Missing synthetic API fixture' });
      }
      return state.failedPath === path ? json(503, { error: 'Falha temporária sintética' }) : json(200, fixtures[path]);
    }
    // Defense in depth: nothing except read-only static traffic can leave this harness.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      safety.blockedUnexpectedWrites.push(request.method() + ' ' + url.origin + url.pathname);
      return route.abort('blockedbyclient');
    }
    if (!proxyBridge || url.protocol !== 'https:') return route.continue();
    // Optional cloud bridge uses inherited Node proxy/CA. TLS verification stays ON.
    try {
      const response = await fetch(request.url(), { method: request.method(),
        headers: await request.allHeaders(), signal: AbortSignal.timeout(25000) });
      const headers = Object.fromEntries(response.headers);
      for (const key of ['content-encoding', 'content-length', 'transfer-encoding']) delete headers[key];
      return route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
    } catch {
      return route.abort('failed');
    }
  });
  await context.addInitScript(({ authenticated, expired, credentials }) => {
    if (!authenticated) return;
    localStorage.setItem('foco_auth_token', credentials.access);
    localStorage.setItem('foco_auth_refresh_token', credentials.refresh);
    if (expired) localStorage.setItem('foco_auth_expires_at', '1');
  }, { authenticated, expired: Boolean(refreshMode), credentials });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  return { page, context, state };
}

async function openView(page, view) {
  const url = new URL(base);
  if (view) url.searchParams.set('view', view);
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, 'The tested production build must respond with HTTP 200');
  await page.locator('#foco-main-content').waitFor();
}

async function auditAxe(page, label) {
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const violations = audit.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
    nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failureSummary: n.failureSummary })) }));
  writeFileSync(`${output}/${label}-axe.json`, JSON.stringify({ synthetic: true, violations,
    incomplete: audit.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })) }, null, 2));
  await page.screenshot({ path: `${output}/${label}.png`, fullPage: true, animations: 'disabled' });
  assert.deepEqual(violations, [], `${label}: WCAG A/AA axe violations (see JSON artifact)`);
}

async function check(name, run) {
  const start = Date.now();
  try {
    await run();
    results.push({ name, status: 'PASS', duration_ms: Date.now() - start });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, status: 'FAIL', error: String(error), duration_ms: Date.now() - start });
    console.error('FAIL ' + name + ': ' + error);
  }
}

try {
  await check('profile-fields-and-native-delete-dialog', async () => {
    const { page, context } = await fixturePage();
    await openView(page, 'perfil');
    await page.getByText('Editar meus dados', { exact: true }).click();
    assert.equal(await page.getByLabel('Nome Completo', { exact: true }).inputValue(), 'Atleta de Teste');
    await page.getByLabel('Data de Nascimento', { exact: true }).waitFor();
    await auditAxe(page, 'profile');
    const trigger = page.getByRole('button', { name: 'Excluir Minha Conta Definitivamente', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Confirmar exclusão da conta', exact: true });
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'foco-delete-cancel');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      // Chromium may move focus to its browser chrome between native modal
      // cycles (reported as body). Background page controls must remain inert.
      assert.equal(await dialog.evaluate(node => document.activeElement === document.body || node.contains(document.activeElement)), true,
        'Tab must never reach a background page control');
    }
    await dialog.locator('input').focus();
    await trigger.evaluate(node => node.focus());
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true,
      'Native modality must reject programmatic focus on background controls');
    await auditAxe(page, 'delete-dialog');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await trigger.evaluate(node => document.activeElement === node), true, 'Closing modal must restore its trigger');
    await context.close();
  });

  await check('anamnesis-fields-all-steps', async () => {
    const { page, context } = await fixturePage();
    await openView(page, 'anamnese');
    await page.getByLabel('Objetivo principal', { exact: true }).waitFor();
    await auditAxe(page, 'anamnesis-goal');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Exercícios ou estilos de treino que prefere (opcional)', { exact: true }).waitFor();
    await auditAxe(page, 'anamnesis-routine');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Dores, lesões ou movimentos que precisa evitar (opcional)', { exact: true }).waitFor();
    await auditAxe(page, 'anamnesis-health');
    await context.close();
  });

  await check('new-workout-fields-ai-and-repeated-manual-rows', async () => {
    const { page, context } = await fixturePage();
    await openView(page, 'novo-treino');
    await page.getByLabel('Objetivo Principal', { exact: true }).waitFor();
    await auditAxe(page, 'new-workout-ai');
    await page.getByRole('button', { name: 'Montador Manual', exact: true }).click();
    const initialRows = await page.getByLabel('Nome', { exact: true }).count();
    await page.getByRole('button', { name: 'Adicionar Exercício', exact: true }).click();
    assert.equal(await page.getByLabel('Nome', { exact: true }).count(), initialRows + 1, 'Every repeated exercise row must have its own label');
    assert.equal(await page.getByRole('button', { name: /^Remover exercício / }).count(), initialRows + 1);
    const ids = await page.locator('input[id],select[id],textarea[id]').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(new Set(ids).size, ids.length, 'Repeated manual rows must not duplicate IDs');
    await auditAxe(page, 'new-workout-manual');
    await context.close();
  });

  await check('goals-fields-wcag', async () => {
    const { page, context } = await fixturePage();
    await openView(page, 'objetivos');
    await page.getByLabel('Tipo de Meta', { exact: true }).waitFor();
    await page.getByText('Meta sintética recuperada', { exact: true }).waitFor();
    await auditAxe(page, 'goals');
    await context.close();
  });

  await check('client-navigation-title-focus-and-history', async () => {
    const { page, context } = await fixturePage();
    await openView(page, 'dashboard');
    await until(() => page.evaluate(() => document.activeElement?.id === 'foco-main-content'), 'Initial authenticated main landmark should receive focus');
    assert.equal(await page.title(), 'Início | FOCO');
    await page.getByRole('navigation', { name: 'Navegação principal', exact: true }).getByRole('button', { name: 'Perfil', exact: true }).click();
    await until(async () => (await page.title()) === 'Meu perfil | FOCO', 'Profile navigation should update document title');
    await until(() => page.evaluate(() => document.activeElement?.id === 'foco-main-content'), 'New route should focus main content');
    await page.goBack();
    await until(async () => (await page.title()) === 'Início | FOCO', 'History traversal should update document title');
    await until(() => page.evaluate(() => document.activeElement?.id === 'foco-main-content'), 'History traversal should focus main content');
    await context.close();
  });

  for (const [view, path, empty, recovered] of [
    ['objetivos', '/api/goals', 'Nenhuma meta ativa cadastrada.', 'Meta sintética recuperada'],
    ['arquivos', '/api/files', 'Nenhum arquivo enviado até o momento.', 'documento-sintetico.pdf'],
  ]) await check(view + '-503-is-not-empty-and-retry-recovers', async () => {
    const { page, context, state } = await fixturePage({ failedPath: path });
    await openView(page, view);
    const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true });
    await retry.waitFor();
    assert.match(await page.getByRole('alert').innerText(), /Não foi possível consultar/);
    assert.equal(await page.getByText(empty, { exact: true }).count(), 0, 'Server failure must never claim zero saved records');
    await page.screenshot({ path: `${output}/${view}-503.png`, fullPage: true, animations: 'disabled' });
    state.failedPath = null;
    await retry.click();
    await page.getByText(recovered, { exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').count(), 0, 'Successful retry should clear the unavailable state');
    assert.ok(state.apiRequests.filter(key => key === 'GET ' + path).length >= 2, 'Retry must query the API again');
    await context.close();
  });

  await check('anamnesis-failed-load-cannot-overwrite-defaults', async () => {
    const { page, context, state } = await fixturePage({ failedPath: '/api/anamnesis' });
    await openView(page, 'anamnese');
    await page.getByRole('heading', { name: 'Respostas indisponíveis', exact: true }).waitFor();
    assert.equal(await page.locator('main input,main select,main textarea').count(), 0, 'Do not expose editable defaults after failing to load saved answers');
    assert.equal(await page.getByRole('button', { name: /salvar/i }).count(), 0);
    state.failedPath = null;
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await page.getByLabel('Objetivo principal', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Meta mais específica (opcional)', { exact: true }).inputValue(), 'Resposta sintética preservada');
    await context.close();
  });

  for (const mode of ['hang', '503', 'offline']) await check('refresh-' + mode + '-preserves-credentials-and-retry-restores', async () => {
    const { page, context, state } = await fixturePage({ refreshMode: mode });
    if (mode === 'hang') await page.clock.install();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await until(() => state.refreshRequests > 0, 'Expired session must attempt refresh');
    if (mode === 'hang') await page.clock.fastForward(13000);
    const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true });
    await retry.waitFor();
    assert.equal(await page.locator('.foco-v6-splash').count(), 0, 'Refresh cannot leave an infinite startup splash');
    assert.equal(await page.getByRole('heading', { name: /Entre na sua conta/ }).count(), 0, 'Transient refresh failure must not force a login');
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('foco_auth_token'), localStorage.getItem('foco_auth_refresh_token')]),
      [credentials.access, credentials.refresh], 'A temporary failure must preserve both access and refresh credentials');
    state.refreshMode = null;
    await retry.click();
    await page.locator('#foco-main-content').waitFor();
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('foco_auth_token'), localStorage.getItem('foco_auth_refresh_token')]),
      [credentials.renewedAccess, credentials.renewedRefresh], 'Successful retry must store the renewed synthetic session');
    assert.ok(state.refreshRequests >= 2, 'Retry must run a fresh refresh request');
    await context.close();
  });

  for (const mode of ['login', 'register']) await check('failed-' + mode + '-retains-form-and-announces-error', async () => {
    const error = mode === 'login' ? 'Invalid login credentials' : 'Password strength: leaked password';
    const { page, context, state } = await fixturePage({ authenticated: false,
      authFailure: { status: mode === 'login' ? 401 : 400, error } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Entre na sua conta/ }).waitFor();
    if (mode === 'register') await page.getByRole('tab', { name: 'Criar conta', exact: true }).click();
    await page.getByLabel('E-mail', { exact: true }).fill('auth-test@example.invalid');
    await page.getByLabel('Senha', { exact: true }).fill('OnlySyntheticPassword!2026');
    if (mode === 'register') {
      await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa Sintética');
      await page.getByLabel('Confirmar senha', { exact: true }).fill('OnlySyntheticPassword!2026');
    }
    await page.getByRole('button', { name: mode === 'login' ? /Entrar no FOCO/ : /Criar.*(perfil|conta)/i }).click();
    const alert = page.getByRole('alert');
    await alert.waitFor();
    assert.match(await alert.innerText(), mode === 'login' ? /E-mail ou senha incorretos/ : /senha mais forte/i);
    assert.equal(await page.getByLabel('E-mail', { exact: true }).inputValue(), 'auth-test@example.invalid');
    assert.equal(await page.getByLabel('Senha', { exact: true }).inputValue(), 'OnlySyntheticPassword!2026');
    if (mode === 'register') {
      assert.equal(await page.getByLabel('Nome completo', { exact: true }).inputValue(), 'Pessoa Sintética');
      assert.equal(await page.getByLabel('Confirmar senha', { exact: true }).inputValue(), 'OnlySyntheticPassword!2026');
    }
    assert.equal(await page.locator('.foco-v6-splash').count(), 0);
    assert.ok(state.apiRequests.includes('POST /api/auth/' + mode));
    await page.screenshot({ path: `${output}/failed-${mode}.png`, fullPage: true, animations: 'disabled' });
    await context.close();
  });
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
  if (safety.blockedUnexpectedWrites.length || safety.unmockedApiRequests.length) results.push({ name: 'fixture-firewall', status: 'FAIL',
    error: 'Unexpected traffic: ' + JSON.stringify(safety) });
  writeFileSync(`${output}/report.json`, JSON.stringify({ synthetic: true, real_user_authenticated: false,
    tested_at: new Date().toISOString(), base_url: base, safety, results }, null, 2));
}
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
