import assert from "node:assert/strict";

// Safe, read-only production checks. Never create users, save workouts,
// access personal data, or trigger a paid AI generation request.
const API = "https://buoefcnkpdrhevzbakze.supabase.co/functions/v1/foco-api";
const SITE = "https://vineribeiro.github.io/FOCO/";
const ORIGIN = "https://vineribeiro.github.io";
const headers = { Origin: ORIGIN };
let verified = 0;

async function request(url, options = {}) {
  const result = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(18000),
    redirect: "follow",
  });
  return result;
}
async function check(label, task) {
  await task();
  verified++;
  console.log("PASS " + label);
}

// Public status: gateway + Deno function + FOCO deployment.
await check("Edge Function responde e anuncia o motor correto", async () => {
  const response = await request(API + "/api/system/status");
  assert.equal(response.status, 200, "endpoint de status");
  const data = await response.json();
  assert.equal(data.app, "FOCO");
  assert.equal(data.science_engine, "foco-training-study-2026.3");
  assert.equal(data.database, "supabase-postgres");
  assert.equal(data.ai_status, "configured", "chave Gemini deve estar configurada");
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
});

await check("CORS preflight autorizado", async () => {
  const response = await request(API + "/api/files", {
    method: "OPTIONS",
    headers: { "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization,apikey,content-type" },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
});

// Negative auth testing: no JWT, no writes and no costs to AI provider.
for (const pathname of ["/api/auth/me", "/api/profile", "/api/files", "/api/workouts", "/api/sessions", "/api/measurements", "/api/recommendations"]) {
  await check("Sem JWT: GET " + pathname + " → 401", async () => {
    const response = await request(API + pathname);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(typeof body.error, "string");
    assert.ok(body.error.length > 0);
  });
}
for (const pathname of ["/api/ai/generate-workout", "/api/ai/analyze-bioimpedance", "/api/ai/extract-sheet", "/api/ai/review-progression"]) {
  await check("Sem JWT: POST " + pathname + " → 401", async () => {
    const response = await request(API + pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(typeof body.error, "string");
  });
}

await check("GitHub Pages entrega HTML do FOCO", async () => {
  const response = await request(SITE);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  const html = await response.text();
  assert.match(html, /<div[^>]+id=["']root["']/);
  const asset = html.match(/(?:src|href)=["'](\/FOCO\/assets\/[^"']+\.js)["']/)?.[1];
  assert.ok(asset, "bundle JS deve referenciar /FOCO/assets/");
  const bundle = await request("https://vineribeiro.github.io" + asset);
  assert.equal(bundle.status, 200, "bundle de produção está acessível");
});

console.log("FOCO PRODUCTION SMOKE: " + verified + " verificações aprovadas, sem modificar dados.");
