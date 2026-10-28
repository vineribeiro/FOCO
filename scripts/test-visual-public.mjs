import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

/** Public, anonymous-only visual smoke. NO production login, user edits or mock data. */
const BASE = 'https://vineribeiro.github.io/FOCO/';
const OUT = 'visual-qa';
const sizes = [
  { label: 'mobile-320', width: 320, height: 720 },
  { label: 'mobile-390', width: 390, height: 844 },
  { label: 'mobile-430', width: 430, height: 932 },
  { label: 'tablet-768', width: 768, height: 1024 },
  { label: 'desktop-1440', width: 1440, height: 900 },
];
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = false;
try {
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      isMobile: size.width < 768,
      hasTouch: size.width < 768,
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response?.status(), 200, 'FOCO site should respond with HTTP 200');
      await page.getByRole('heading', { name: /entre na sua conta/i }).waitFor({ timeout: 20000 });
      await page.getByRole('button', { name: /entrar no foco/i }).waitFor({ timeout: 15000 });
      // The login form must work without horizontal scrolling at all five widths.
      const dimensions = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        doc: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      const overflow = Math.max(dimensions.doc, dimensions.body) - dimensions.viewport;
      const primaryAction = await page.getByRole('button', { name: /entrar no foco/i }).boundingBox();
      assert.ok(primaryAction && primaryAction.height >= 44, 'Primary login button should have >= 44px height');
      await page.screenshot({ path: OUT + '/' + size.label + '.png', fullPage: true, animations: 'disabled' });
      assert.ok(overflow <= 2, 'Horizontal overflow of ' + overflow + 'px at ' + size.width + 'px');
      results.push({ viewport: size.label, status: 'PASS', overflow_px: overflow, primary_cta_height_px: primaryAction.height });
    } catch (error) {
      failed = true;
      results.push({ viewport: size.label, status: 'FAIL', error: String(error) });
      try { await page.screenshot({ path: OUT + '/' + size.label + '-failed.png', fullPage: true }); } catch { /* preserve original error */ }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync(OUT + '/report.json', JSON.stringify({ public_login_only: true, tested_at: new Date().toISOString(), results }, null, 2));
}
for (const item of results) console.log(item.viewport + ': ' + item.status + (item.error ? ' ' + item.error : ' horizontal overflow ' + item.overflow_px + 'px'));
if (failed) process.exitCode = 1;
