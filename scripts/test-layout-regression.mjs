import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { auditCredentials as credentials, createAuditFixtures } from './fixtures/audit-browser.mjs';

// Synthetic layout checks against a production preview. All API traffic is local,
// including the extraction response: neither a file nor a prompt reaches an AI.
// Session UUID/replay contracts remain in their dedicated regression suites.
const base = process.env.FOCO_E2E_BASE_URL || 'http://127.0.0.1:4173/FOCO/';
const output = process.env.FOCO_E2E_OUTPUT_DIR || 'work/layout-regression';
const baseline = process.env.FOCO_LAYOUT_BASELINE_DIR || '../layout-review/screens';
const proxyBridge = process.env.FOCO_BROWSER_PROXY_BRIDGE === '1';
const fixedNow = '2026-11-14T12:00:00.000Z';
const viewports = [{ width: 320, height: 720 }, { width: 390, height: 844 },
  { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const views = ['dashboard', 'sessao', 'arquivos', 'novo-treino', 'perfil', 'treinos', 'progresso', 'anamnese'];
const days = [
  ['segunda', 'Segunda-feira'], ['terca', 'Terça-feira'], ['quarta', 'Quarta-feira'],
  ['quinta', 'Quinta-feira'], ['sexta', 'Sexta-feira'], ['sabado', 'Sábado'], ['domingo', 'Domingo'],
];
const longNotes = 'Nota sintética completa: mantenha uma execução confortável e confira as orientações recebidas antes de aprovar a ficha. '
  + 'Esta observação longa precisa continuar legível em uma tela de 320 px e no desktop, sem reticências ou texto escondido.\n\n'
  + 'Referência de revisão: ' + 'referencia-sintetica-de-exercicio-'.repeat(8) + 'FIM DA NOTA SINTÉTICA.';
const extraction = {
  plan_name: 'Ficha importada sintética', goal: 'Treino Geral', weekly_frequency: 3,
  confidence_notes: 'Leitura simulada apenas para revisar o layout. Confira todos os campos antes de aprovar.',
  extracted_exercises: [{ exercise_name: 'Supino reto com barra', muscle_group: 'Peitoral',
    training_day: 'segunda', sets: 3, reps_min: 8, reps_max: 12, suggested_load_kg: 20,
    rest_seconds: 90, notes: longNotes }],
};
const referenceAssessmentFiles = [2, 5, 45, 200].map((daysAgo, index) => ({
  id: 'reference-synthetic-report-' + index, user_id: 'audit-synthetic-user',
  filename: 'avaliacao-sintetica-' + index + '.pdf', processing_status: 'processed',
  mime_type: 'application/pdf', storage_path: 'synthetic-not-a-real-file',
  created_at: new Date(Date.parse(fixedNow) - daysAgo * 86400000).toISOString(),
  extracted_data: { summary: 'Relatório sintético exclusivo para verificar o filtro de datas.',
    metrics: [{ name: 'Peso corporal', value: [76, 77, 80, 82][index] + ' kg', interpretation: '' },
      { name: 'Gordura corporal', value: [24, 25, 26, 27][index] + '%', interpretation: '' }],
    limitations: 'Fixture local, sem avaliação ou arquivo real.' },
}));
const safety = { interceptedApiRequests: 0, mockedExtractionRequests: 0,
  mockedProfileUpdateRequests: 0,
  blockedUnexpectedWrites: [], unmockedApiRequests: [], externalWritesSent: 0 };
const results = [];
const contexts = new Set();
mkdirSync(join(output, 'screens'), { recursive: true });

// Archive the audit's existing captures when available; CI can run without them.
// These are evidence for review, not pixel snapshots or an assertion of fidelity.
const baselineEvidence = [];
if (existsSync(baseline)) {
  mkdirSync(join(output, 'before'), { recursive: true });
  for (const name of readdirSync(baseline).filter(name => /\.png$/.test(name)).sort()) {
    copyFileSync(join(baseline, name), join(output, 'before', name));
    baselineEvidence.push({ file: name, sha256: createHash('sha256').update(readFileSync(join(baseline, name))).digest('hex') });
  }
}
writeFileSync(join(output, 'baseline.json'), JSON.stringify({ source: resolve(baseline),
  available: baselineEvidence.length > 0, captures: baselineEvidence }, null, 2));

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

async function fixturePage(viewport, { overrides = {}, mockProfileUpdate = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce',
    colorScheme: 'dark', serviceWorkers: 'block' });
  contexts.add(context);
  const fixtures = { ...createAuditFixtures(), ...overrides };
  // Distinct names prove that choosing a weekday filters the displayed exercises.
  // The explicit RepDB variant keeps those renamed synthetic exercises accurate.
  for (const plan of [fixtures['/api/workouts/active'], ...fixtures['/api/workouts']]) {
    plan.exercises = plan.exercises.map(exercise => ({ ...exercise, repdb_id: 'bench-press',
      exercise_name: 'Supino reto com barra · ' + exercise.training_day }));
  }
  const state = { apiRequests: [], extractionPayload: null, profileUpdatePayload: null };
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
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' };
      const json = (status, body) => route.fulfill({ status, headers,
        contentType: 'application/json', body: JSON.stringify(body) });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
      if (path === '/api/ai/extract-sheet' && request.method() === 'POST') {
        safety.mockedExtractionRequests++;
        state.extractionPayload = request.postDataJSON();
        return json(200, extraction);
      }
      if (mockProfileUpdate && path === '/api/profile' && request.method() === 'PUT') {
        safety.mockedProfileUpdateRequests++;
        state.profileUpdatePayload = request.postDataJSON();
        fixtures[path] = { ...fixtures[path], ...state.profileUpdatePayload };
        fixtures['/api/auth/me'].profile = fixtures[path];
        return json(200, fixtures[path]);
      }
      if (request.method() !== 'GET') {
        safety.blockedUnexpectedWrites.push(key);
        return json(403, { error: 'Unexpected write blocked by synthetic layout regression test' });
      }
      if (!Object.hasOwn(fixtures, path)) {
        safety.unmockedApiRequests.push(key);
        return json(404, { error: 'Missing synthetic API fixture' });
      }
      return json(200, fixtures[path]);
    }
    // Same write firewall and optional verified-TLS cloud bridge as audit-browser.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      safety.blockedUnexpectedWrites.push(request.method() + ' ' + url.origin + url.pathname);
      return route.abort('blockedbyclient');
    }
    if (!proxyBridge || url.protocol !== 'https:') return route.continue();
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
  await context.addInitScript(({ credentials }) => {
    localStorage.setItem('foco_auth_token', credentials.access);
    localStorage.setItem('foco_auth_refresh_token', credentials.refresh);
    localStorage.setItem('foco_selected_training_day', 'segunda');
  }, { credentials });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  // A weekend catches accidental five-day strips and active-day auto-scroll
  // moving the whole page down past the primary workout action.
  await page.clock.setFixedTime(new Date(fixedNow));
  return { page, context, state };
}

async function check(name, viewport, run, fixtureOptions) {
  const started = Date.now();
  let fixture;
  try {
    fixture = await fixturePage(viewport, fixtureOptions);
    await run(fixture);
    results.push({ name, status: 'PASS', duration_ms: Date.now() - started });
    console.log('PASS ' + name);
  } catch (error) {
    if (fixture) await fixture.page.screenshot({ path: join(output, 'screens', name + '-failure.png'),
      fullPage: true, animations: 'disabled' }).catch(() => {});
    results.push({ name, status: 'FAIL', error: String(error), duration_ms: Date.now() - started });
    console.error('FAIL ' + name + ': ' + error);
  } finally {
    if (fixture) { await fixture.context.close(); contexts.delete(fixture.context); }
  }
}

async function openView(page, view) {
  const url = new URL(base);
  url.searchParams.set('view', view);
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, 'The production preview must respond with HTTP 200');
  await page.locator('#foco-main-content').waitFor();
  await until(() => page.locator('#foco-main-content').evaluate(node => node.innerText.trim().length > 0),
    view + ': main content must load');
}

async function noGlobalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(Math.max(geometry.document, geometry.body) <= geometry.viewport + 1,
    label + ': global horizontal overflow ' + JSON.stringify(geometry));
}

async function capture(page, label, fullPage = false) {
  await page.screenshot({ path: join(output, 'screens', label + '.png'), fullPage, animations: 'disabled' });
}

async function axe(page, label) {
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const violations = audit.violations.map(item => ({ id: item.id, impact: item.impact, help: item.help,
    helpUrl: item.helpUrl, nodes: item.nodes.map(node => ({ target: node.target, html: node.html,
      failureSummary: node.failureSummary })) }));
  writeFileSync(join(output, label + '-axe.json'), JSON.stringify({ synthetic: true, violations,
    incomplete: audit.incomplete.map(item => ({ id: item.id, nodes: item.nodes.length })) }, null, 2));
  assert.deepEqual(violations, [], label + ': WCAG A/AA violations (see axe JSON)');
}

async function precedes(first, second, message) {
  assert.equal(await first.evaluate((node, other) => Boolean(node.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING),
    await second.elementHandle()), true, message);
}

async function homeLayout(page, viewport) {
  const hero = page.locator('.foco-v6-hero');
  const week = page.locator('.foco-21-week-section');
  const start = hero.getByRole('button', { name: 'Iniciar treino', exact: true });
  await until(() => start.isEnabled(), 'Home must expose its loaded primary workout action');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => window.scrollY), 0,
    'Revealing the active Saturday must not scroll the page past the primary action');
  const heroBox = await hero.boundingBox();
  const weekBox = await week.boundingBox();
  const startBox = await start.boundingBox();
  assert.ok(heroBox && weekBox && startBox, 'Home content must have visible layout boxes');
  await precedes(hero, week, 'The workout hero must lead the weekly support in DOM order');
  if (viewport.width === 1440) {
    assert.ok(heroBox.x + heroBox.width <= weekBox.x + 1, 'Desktop Home must place the week beside the workout');
    assert.ok(weekBox.y >= 0 && weekBox.y + weekBox.height < viewport.height,
      'Desktop weekly support must be visible without scrolling');
  } else if (viewport.width <= 390) {
    assert.ok(weekBox.y >= heroBox.y + heroBox.height - 1, 'Mobile Home must stack the week after the workout');
    assert.ok(Math.abs(heroBox.x - weekBox.x) <= 2, 'Mobile Home must use one aligned content column');
    const nav = await page.getByRole('navigation', { name: 'Navegação principal', exact: true }).boundingBox();
    assert.ok(startBox.y >= 0 && startBox.y + startBox.height <= nav.y,
      'Home primary action must be visible above bottom navigation');
  }
  assert.equal(await week.locator('[data-training-day]').count(), days.length, 'Every weekday, including weekends, must be available');
  for (const day of ['sabado', 'domingo']) {
    const button = week.locator('[data-training-day="' + day + '"]');
    assert.match(await button.innerText(), day === 'sabado' ? /SÁB/ : /DOM/);
  }
}

async function sessionLayout(page, viewport) {
  const stage = page.locator('.foco-v7-session-stage');
  const badge = stage.locator('.foco-repdb-source');
  await badge.waitFor();
  const collisions = await badge.evaluate(node => {
    const badge = node.getBoundingClientRect();
    return [...node.closest('.foco-v7-session-stage').querySelectorAll('button')].filter(button => {
      const box = button.getBoundingClientRect();
      return box.width && box.height && box.left < badge.right && box.right > badge.left
        && box.top < badge.bottom && box.bottom > badge.top;
    }).map(button => button.getAttribute('aria-label') || button.innerText);
  });
  assert.deepEqual(collisions, [], 'The RepDB attribution badge must be free of overlapping hero buttons');
  const start = page.getByRole('button', { name: 'Iniciar treino', exact: true });
  assert.ok(['static', 'relative'].includes(await start.evaluate(node => getComputedStyle(node).position)),
    'Session start action must participate in document flow');
  await precedes(stage, start, 'Session start must follow the exercise hero');
  await precedes(start, page.getByRole('group', { name: 'Modo do exercício', exact: true }),
    'Start action must precede secondary session controls');
  if (viewport.width <= 390) {
    const action = await start.boundingBox();
    const nav = await page.getByRole('navigation', { name: 'Navegação principal', exact: true }).boundingBox();
    assert.ok(action.y >= 0 && action.y + action.height <= nav.y,
      'Session start must be visible above the bottom navigation before scrolling');
  }
  const execution = page.getByRole('group', { name: 'Modo do exercício', exact: true })
    .getByRole('button', { name: 'Execução', exact: true });
  await execution.focus();
  await page.keyboard.press('Enter');
  assert.equal(await execution.getAttribute('aria-pressed'), 'true', 'Execution mode must be keyboard reachable');
  await page.getByRole('button', { name: 'Voltar ao registro', exact: true }).click();
  await start.click(); // Local in-progress snapshot only. Never finish/save the workout.
  const fields = page.getByRole('region', { name: 'Registrar série', exact: true });
  const complete = page.getByRole('button', { name: 'Concluir série', exact: true });
  const rest = page.getByRole('region', { name: 'Controle de descanso', exact: true });
  await complete.waitFor();
  await precedes(fields, complete, 'Conclude-series action must follow the current load/repetition fields');
  await precedes(complete, rest, 'Conclude-series action must precede rest support');
  const fieldBox = await fields.boundingBox();
  const actionBox = await complete.boundingBox();
  const restBox = await rest.boundingBox();
  assert.ok(actionBox.y >= fieldBox.y + fieldBox.height - 1 && actionBox.y + actionBox.height <= restBox.y + 1,
    'Conclude-series action must visually sit between the fields and rest controls');
  await noGlobalOverflow(page, 'active session ' + viewport.width);
}

async function manualAndProfile(page, view, viewport) {
  if (view === 'novo-treino') {
    const goal = page.getByLabel('Objetivo Principal', { exact: true });
    await goal.selectOption('Força Pura & Cargas');
    await page.getByRole('button', { name: 'Montador Manual', exact: true }).click();
    const name = page.getByLabel('Nome da Ficha', { exact: true });
    await name.waitFor();
    assert.equal(await page.locator('#foco-ai-intro').count(), 0, 'AI hero must be absent in manual mode');
    assert.equal(await page.getByRole('button', { name: 'Atualizar anamnese', exact: true }).count(), 0,
      'Manual fields must lead without AI-only support');
    const box = await name.boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height < viewport.height, 'The first manual field must be visible after selecting its mode');
    await name.fill('Rascunho manual preservado');
    await page.getByLabel('Nome', { exact: true }).first().fill('Exercício manual preservado');
    await page.getByRole('button', { name: 'Gerar com IA', exact: true }).click();
    assert.equal(await goal.inputValue(), 'Força Pura & Cargas', 'Switching modes must preserve the AI fields');
    await page.getByRole('button', { name: 'Montador Manual', exact: true }).click();
    assert.equal(await name.inputValue(), 'Rascunho manual preservado', 'Switching modes must preserve the manual plan name');
    assert.equal(await page.getByLabel('Nome', { exact: true }).first().inputValue(), 'Exercício manual preservado');
    await noGlobalOverflow(page, 'manual mode ' + viewport.width);
    await capture(page, view + '-' + viewport.width + '-manual-full', true);
  } else {
    await page.getByText('Editar meus dados', { exact: true }).click();
    const main = page.locator('#foco-main-content');
    assert.equal(await main.getByRole('heading', { level: 1 }).count(), 1, 'Expanded profile must retain one page title');
    assert.equal(await main.locator('.foco-v6-profile-avatar').count(), 1, 'Expanded profile must retain one identity avatar');
    assert.equal(await main.locator('form').getByRole('heading', { name: 'Atleta de Teste', exact: true }).count(), 0,
      'Editing must not repeat the profile identity block');
    assert.equal(await page.getByLabel('Nome Completo', { exact: true }).inputValue(), 'Atleta de Teste');
    assert.equal(await page.getByLabel('E-mail Cadastrado', { exact: true }).inputValue(), 'atleta@example.invalid');
    assert.equal(await page.getByLabel('E-mail Cadastrado', { exact: true }).isDisabled(), true);
    await page.getByLabel('Data de Nascimento', { exact: true }).waitFor();
    await page.getByLabel('Nível de Experiência', { exact: true }).waitFor();
    assert.ok(await main.getByRole('status').count(), 'Profile must retain its status announcement region');
    await noGlobalOverflow(page, 'expanded profile ' + viewport.width);
    await capture(page, view + '-' + viewport.width + '-expanded-full', true);
  }
}

try {
  for (const viewport of viewports) {
    for (const view of views) await check(view + '-' + viewport.width, viewport, async ({ page }) => {
      await openView(page, view);
      if (view === 'dashboard') await homeLayout(page, viewport);
      else if (view === 'sessao') await page.getByRole('button', { name: 'Iniciar treino', exact: true }).waitFor();
      else if (view === 'novo-treino') await page.getByLabel('Objetivo Principal', { exact: true }).waitFor();
      else if (view === 'anamnese') await page.getByLabel('Objetivo principal', { exact: true }).waitFor();
      await noGlobalOverflow(page, view + ' ' + viewport.width);
      await capture(page, view + '-' + viewport.width + '-default');
      if (view === 'sessao') await sessionLayout(page, viewport);
      if (view === 'novo-treino' || view === 'perfil') await manualAndProfile(page, view, viewport);
      if ([320, 1440].includes(viewport.width) && ['dashboard', 'sessao', 'novo-treino', 'perfil'].includes(view))
        await axe(page, view + '-' + viewport.width);
    });
  }

  for (const viewport of [viewports[0], viewports[3]]) await check('extracted-notes-' + viewport.width, viewport, async ({ page, state }) => {
    await openView(page, 'arquivos');
    const pdf = Buffer.from('%PDF-1.4\n% Synthetic layout fixture, no real document.\n%%EOF\n');
    await page.getByLabel('Selecionar ficha de treino', { exact: true }).setInputFiles({
      name: 'ficha-sintetica-layout.pdf', mimeType: 'application/pdf', buffer: pdf });
    const extract = page.getByRole('button', { name: 'Extrair exercícios com IA', exact: true });
    await extract.focus();
    await page.keyboard.press('Enter');
    const noteCopies = page.locator('[data-extracted-notes="0"]');
    await until(async () => (await noteCopies.count()) > 0, 'Extracted notes must render after the mocked response');
    let note;
    for (const copy of await noteCopies.all()) if (await copy.isVisible()) note = copy;
    assert.ok(note, 'The current responsive review must visibly expose its note');
    assert.equal(await note.innerText(), longNotes, 'The complete note must be readable, including its final sentence');
    const readability = await note.evaluate(node => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return { clippedX: node.scrollWidth > node.clientWidth + 1, clippedY: node.scrollHeight > node.clientHeight + 1,
        clamp: style.webkitLineClamp, ellipsis: style.textOverflow === 'ellipsis', left: box.left, right: box.right,
        viewport: document.documentElement.clientWidth };
    });
    assert.equal(readability.clippedX || readability.clippedY || readability.ellipsis, false,
      'The full note must not be clipped or replaced by ellipsis: ' + JSON.stringify(readability));
    assert.ok(!readability.clamp || readability.clamp === 'none' || readability.clamp === '0', 'Notes must not be line clamped');
    assert.ok(readability.left >= 0 && readability.right <= readability.viewport + 1, 'The full note must fit the responsive review');
    const approve = page.getByRole('button', { name: 'Aprovar e Salvar Ficha', exact: true });
    await precedes(note, approve, 'Approval must follow the exercise review and complete notes');
    await approve.focus(); // Prove keyboard reachability; never execute approval.
    assert.equal(await approve.evaluate(node => document.activeElement === node), true);
    assert.equal(state.extractionPayload.filename, 'ficha-sintetica-layout.pdf');
    assert.equal(state.extractionPayload.mime_type, 'application/pdf');
    assert.match(state.extractionPayload.base64, /^data:application\/pdf;base64,/);
    assert.deepEqual(state.apiRequests.filter(key => !key.startsWith('GET ') && !key.startsWith('OPTIONS ')),
      ['POST /api/ai/extract-sheet'], 'Extraction must be the only synthetic write; approval is never executed');
    await noGlobalOverflow(page, 'extracted review ' + viewport.width);
    await capture(page, 'arquivos-' + viewport.width + '-extracted-full', true);
    await axe(page, 'extracted-review-' + viewport.width);
  });

  await check('all-seven-weekdays-filter-and-keyboard', viewports[0], async ({ page }) => {
    for (const [day, label] of days) {
      await openView(page, 'dashboard');
      const button = page.locator('.foco-21-week-section [data-training-day="' + day + '"]');
      await button.focus();
      await page.keyboard.press('Enter');
      await until(() => page.url().includes('view=detalhes'), 'Choosing ' + label + ' must open its workout detail');
      const rows = page.locator('.foco-v6-exercise-list .foco-v8-exercise-info');
      await until(async () => (await rows.count()) > 0, 'Selected weekday exercises must load');
      assert.deepEqual(await rows.locator('strong').allTextContents(), ['Supino reto com barra · ' + day],
        'The selected workout detail must only contain that day’s exercises');
      assert.equal(await page.evaluate(() => localStorage.getItem('foco_selected_training_day')), day);
      await noGlobalOverflow(page, 'detail ' + day);
    }
  });

  for (const viewport of viewports.slice(0, 2)) await check('onboarding-keyboard-height-and-retained-fields-' + viewport.width,
    viewport, async ({ page, state }) => {
      await openView(page, 'anamnese');
      const goal = page.getByRole('button', { name: /Perda de gordura/ });
      await goal.waitFor();
      await goal.focus();
      await page.keyboard.press('Enter');
      assert.equal(await goal.getAttribute('aria-pressed'), 'true', 'Goal selection must work from the keyboard');
      await noGlobalOverflow(page, 'onboarding goal ' + viewport.width);
      await capture(page, 'anamnese-' + viewport.width + '-goal');
      await axe(page, 'onboarding-goal-' + viewport.width);
      await page.getByRole('button', { name: 'Avançar', exact: true }).click();
      const height = page.getByRole('slider', { name: 'Ajustar altura em centímetros', exact: true });
      await height.waitFor();
      assert.equal(await height.inputValue(), '175', 'Height selection must start from the actual profile fixture');
      await height.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await height.inputValue(), '176', 'A native keyboard step must update the height');
      assert.equal(await height.getAttribute('aria-valuetext'), '176 centímetros');
      assert.match(await page.locator('.foco-height-output').innerText(), /176\s*cm/,
        'Displayed height must reflect the same real input value');
      await noGlobalOverflow(page, 'onboarding height ' + viewport.width);
      await capture(page, 'anamnese-' + viewport.width + '-height');
      await axe(page, 'onboarding-height-' + viewport.width);
      await page.getByRole('button', { name: 'Voltar ao objetivo', exact: true }).click();
      assert.equal(await goal.getAttribute('aria-pressed'), 'true', 'Returning must retain the chosen goal');
      await page.getByRole('button', { name: 'Avançar', exact: true }).click();
      assert.equal(await height.inputValue(), '176', 'Returning must retain the chosen height');
      await page.getByRole('button', { name: 'Avançar', exact: true }).click();
      const formGoal = page.getByLabel('Objetivo principal', { exact: true });
      await formGoal.waitFor();
      assert.equal(await formGoal.inputValue(), 'Definição & Emagrecimento',
        'The full form must retain the goal chosen in the compact intro');
      assert.deepEqual(state.profileUpdatePayload, { height_cm: 176 },
        'Only the explicitly chosen height may be sent to the in-memory profile fixture');
      const details = page.getByLabel('Meta mais específica (opcional)', { exact: true });
      await details.fill('Objetivo sintético preservado entre etapas');
      await page.getByLabel('Tempo por sessão', { exact: true }).selectOption('45');
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByRole('button', { name: 'Etapa anterior', exact: true }).click();
      assert.equal(await details.inputValue(), 'Objetivo sintético preservado entre etapas');
      assert.equal(await formGoal.inputValue(), 'Definição & Emagrecimento');
      assert.equal(await page.getByLabel('Tempo por sessão', { exact: true }).inputValue(), '45');
      assert.deepEqual(state.apiRequests.filter(key => !key.startsWith('GET ') && !key.startsWith('OPTIONS ')),
        ['PUT /api/profile'], 'Only the local height fixture may be updated; never save an actual anamnesis');
      await noGlobalOverflow(page, 'onboarding full form ' + viewport.width);
      await capture(page, 'anamnese-' + viewport.width + '-retained-form', true);
    }, { overrides: { '/api/anamnesis': null }, mockProfileUpdate: true });

  await check('weekly-navigation-seven-days-and-dated-completions', viewports[1], async ({ page, state }) => {
    await openView(page, 'treinos');
    const rows = page.locator('.foco-v6-week-rows [data-training-day]');
    await until(async () => (await rows.count()) === 7, 'The active fixture must expose all seven scheduled days');
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-training-day'))),
      days.map(([day]) => day), 'Weekly rows must preserve weekday ordering including Saturday and Sunday');
    const range = page.locator('.foco-v6-week-dates [role="status"]');
    const currentRange = await range.innerText();
    assert.match(currentRange, /09.*nov.*15.*nov/i, 'The fixed Saturday must belong to the 9–15 November week');
    const doneDays = () => page.locator('.foco-v6-week-rows .is-done').evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('data-training-day')));
    await until(async () => JSON.stringify(await doneDays()) === '["quinta"]',
      'Only this week’s Thursday session may be marked complete');
    const originalUrl = page.url();
    await page.getByRole('button', { name: 'Ver semana anterior', exact: true }).click();
    assert.match(await range.innerText(), /02.*nov.*08.*nov/i, 'Previous must move the date range back exactly one week');
    assert.equal(page.url(), originalUrl, 'Week arrows must navigate dates without replacing the page');
    assert.deepEqual(await doneDays(), ['terca'], 'Previous week must use its own Tuesday completion');
    await capture(page, 'treinos-390-previous-week');
    await page.getByRole('button', { name: 'Ver próxima semana', exact: true }).click();
    assert.equal(await range.innerText(), currentRange);
    await page.getByRole('button', { name: 'Ver próxima semana', exact: true }).click();
    assert.match(await range.innerText(), /16.*nov.*22.*nov/i, 'Next must move the date range forward exactly one week');
    assert.deepEqual(await doneDays(), [], 'A future week must not inherit past completion badges');
    await page.getByRole('button', { name: 'Semana atual', exact: true }).click();
    assert.equal(await range.innerText(), currentRange, 'Current week must restore the original range');
    assert.deepEqual(await doneDays(), ['quinta']);
    assert.equal(await page.getByRole('button', { name: 'Semana atual', exact: true }).count(), 0);
    const saturday = page.locator('.foco-v6-week-rows [data-training-day="sabado"] .foco-week-select');
    await saturday.click();
    assert.equal(await saturday.getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Selecionar treino', exact: true }).click();
    await page.locator('.foco-v7-stage-footer h2').waitFor();
    assert.equal(await page.locator('.foco-v7-stage-footer h2').innerText(), 'Supino reto com barra · sabado',
      'Starting the selected Saturday must open Saturday’s exercise rather than the previous day');
    assert.ok(state.apiRequests.every(key => key.startsWith('GET ') || key.startsWith('OPTIONS ')),
      'Week navigation must never mutate a saved workout or session');
    await noGlobalOverflow(page, 'selected Saturday session');
  }, { overrides: { '/api/sessions': [
    { id: 'synthetic-current-thursday', plan_id: 'audit-plan', status: 'completed',
      started_at: '2026-11-12T12:00:00.000Z', finished_at: '2026-11-12T12:30:00.000Z',
      duration_seconds: 1800, notes: 'Treino escolhido da semana: Quinta-feira', sets: [] },
    { id: 'synthetic-previous-tuesday', plan_id: 'audit-plan', status: 'completed',
      started_at: '2026-11-03T12:00:00.000Z', finished_at: '2026-11-03T12:30:00.000Z',
      duration_seconds: 1800, notes: 'Treino escolhido da semana: Terça-feira', sets: [] },
  ] } });

  await check('progress-period-buttons-and-report-select-stay-synchronized', viewports[1], async ({ page, state }) => {
    await openView(page, 'progresso');
    const periods = page.getByRole('group', { name: 'Período de evolução', exact: true });
    const points = page.locator('.foco-v6-progress-svg circle');
    await until(async () => (await points.count()) === 2, 'The default 30-day trend must contain only the two recent reports');
    await periods.getByRole('button', { name: '7 dias', exact: true }).click();
    assert.equal(await periods.getByRole('button', { name: '7 dias', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await points.count(), 2, 'Seven days must exclude the 45-day and 200-day reports');
    assert.match(await page.locator('.foco-progress-delta').innerText(), /-1\s*kg/,
      'The visible delta must use the selected seven-day endpoints');
    await page.getByRole('button', { name: 'Ver relatório completo', exact: true }).click();
    const report = page.locator('#foco-v6-report');
    assert.equal(await report.getAttribute('open'), '', 'The report action must open the actual report disclosure');
    const select = report.getByLabel('Período dos gráficos', { exact: true });
    assert.equal(await select.inputValue(), '7', 'The report filter must reflect the selected period button');
    await select.selectOption('365');
    assert.equal(await periods.getByRole('button', { name: '1 ano', exact: true }).getAttribute('aria-pressed'), 'true',
      'Changing the report filter must update the top period control');
    await until(async () => (await points.count()) === 4, 'The yearly trend must include all four synthetic reports');
    assert.match(await page.locator('.foco-progress-delta').innerText(), /-6\s*kg/,
      'The visible delta must update to the yearly endpoints');
    const comparison = page.getByRole('region', { name: 'Evolução entre avaliações OKOK', exact: true });
    await until(() => comparison.getByText('4 medições comparáveis', { exact: true }).isVisible(),
      'The detailed OKOK chart must use the same yearly date filter');
    await capture(page, 'progresso-390-yearly-report-full', true);
    await select.selectOption('7');
    assert.equal(await periods.getByRole('button', { name: '7 dias', exact: true }).getAttribute('aria-pressed'), 'true');
    await until(async () => (await points.count()) === 2, 'Returning to seven days must restore the recent two-point trend');
    await until(() => comparison.getByText('2 medições comparáveis', { exact: true }).isVisible(),
      'The detailed chart must return to the same two recent reports');
    assert.ok(state.apiRequests.every(key => key.startsWith('GET ') || key.startsWith('OPTIONS ')),
      'Date filtering and report navigation must never mutate a measurement');
    await noGlobalOverflow(page, 'seven-day progress report');
  }, { overrides: { '/api/files': referenceAssessmentFiles } });

  await check('sidebar-one-current-exact-destination', viewports[3], async ({ page }) => {
    const routes = [['dashboard', 'Início'], ['sessao', 'Treinar'], ['progresso', 'Minha evolução'],
      ['biblioteca', 'Biblioteca'], ['perfil', 'Perfil'], ['treinos', 'Minhas fichas'],
      ['novo-treino', 'Nova ficha'], ['arquivos', 'Avaliação OKOK'], ['anamnese', 'Anamnese'],
      ['objetivos', 'Meus objetivos'], ['cardio', 'Cardio livre'], ['configuracoes', 'Configurações']];
    for (const [view, label] of routes) {
      await openView(page, view);
      const sidebar = page.getByRole('complementary', { name: 'Navegação do FOCO', exact: true });
      const current = sidebar.locator('[aria-current="page"]');
      assert.equal(await current.count(), 1, view + ': sidebar must expose exactly one current page');
      assert.equal((await current.innerText()).trim(), label, view + ': only the exact destination is current');
      await noGlobalOverflow(page, 'sidebar destination ' + view);
    }
  });
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
  if (safety.blockedUnexpectedWrites.length || safety.unmockedApiRequests.length) results.push({
    name: 'fixture-firewall', status: 'FAIL', error: 'Unexpected traffic: ' + JSON.stringify(safety) });
  writeFileSync(join(output, 'report.json'), JSON.stringify({ synthetic: true, real_user_authenticated: false,
    tested_at: new Date().toISOString(), base_url: base, baseline_available: baselineEvidence.length > 0,
    viewports, safety, results }, null, 2));
}
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
