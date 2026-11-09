import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertPasswordNotLeaked, PasswordSecurityError } from "../supabase/functions/foco-api/password-security.ts";

// Entirely offline: no real passwords, HIBP requests, email, or Supabase writes.
const password = "synthetic-FOCO-password-for-unit-tests-only";
const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
const suffix = hash.slice(5);
const other = (suffix[0] === "A" ? "B" : "A") + suffix.slice(1);
let verified = 0;
async function check(label: string, run: () => Promise<void>) {
  await run();
  verified++;
  console.log("PASS " + label);
}
function reply(text: string, status = 200): typeof fetch {
  return (async () => new Response(text, { status })) as typeof fetch;
}
async function reject(fetchImpl: typeof fetch, status: 400 | 503) {
  await assert.rejects(() => assertPasswordNotLeaked(password, { fetchImpl, timeoutMs: 100 }), error => {
    assert.ok(error instanceof PasswordSecurityError);
    assert.equal(error.status, status);
    assert.ok(!error.message.includes(password));
    assert.ok(!error.message.includes(hash));
    assert.ok(!error.message.includes(suffix));
    return true;
  });
}

await check("envelope envia somente prefixo5 com padding e sem credenciais", async () => {
  const fetchImpl = (async (input, init) => {
    assert.equal(input, "https://api.pwnedpasswords.com/range/" + hash.slice(0, 5));
    assert.ok(!String(input).includes(suffix));
    assert.equal(init?.method, "GET");
    assert.equal(new Headers(init?.headers).get("add-padding"), "true");
    assert.match(new Headers(init?.headers).get("user-agent") || "", /^FOCO-/);
    assert.equal(new Headers(init?.headers).get("authorization"), null);
    assert.equal(init?.body, undefined);
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response(other + ":23\r\n" + suffix + ":0\r\n");
  }) as typeof fetch;
  await assertPasswordNotLeaked(password, { fetchImpl });
});
await check("senha não encontrada é aceita", async () => {
  await assertPasswordNotLeaked(password, { fetchImpl: reply(other + ":50\n") });
});
await check("ocorrência positiva é recusada", async () => {
  await reject(reply(other + ":0\r\n" + suffix + ":12\r\n"), 400);
});
await check("sufixo minúsculo também é reconhecido", async () => {
  await reject(reply(suffix.toLowerCase() + ":1\n"), 400);
});
await check("padding com zero não é senha comprometida", async () => {
  await assertPasswordNotLeaked(password, { fetchImpl: reply(suffix + ":000\n") });
});
await check("indisponibilidade HTTP falha fechada", async () => {
  await reject(reply("provider unavailable", 503), 503);
});
await check("404 não é tratado como senha segura", async () => {
  await reject(reply("not found", 404), 503);
});
await check("erro de rede retorna mensagem fixa sem vazar erro upstream", async () => {
  await reject((async () => { throw new Error(password + hash); }) as typeof fetch, 503);
});
await check("resposta vazia e resposta inválida falham fechadas", async () => {
  for (const text of ["", "<html>unavailable</html>", suffix + ":NaN", other + ":1\nINVALID"]) {
    await reject(reply(text), 503);
  }
});
await check("resposta excessiva falha fechada", async () => {
  await reject(reply((other + ":1\n").repeat(15000)), 503);
});
await check("timeout limita operação e aborta requisição", async () => {
  let signal: AbortSignal | undefined;
  const fetchImpl = ((_input, init) => {
    signal = init?.signal as AbortSignal;
    return new Promise<Response>(() => {});
  }) as typeof fetch;
  await assert.rejects(() => assertPasswordNotLeaked(password, { fetchImpl, timeoutMs: 10 }), error => {
    assert.ok(error instanceof PasswordSecurityError);
    assert.equal(error.status, 503);
    assert.equal(signal?.aborted, true);
    return true;
  });
});
console.log("PASSWORD SECURITY: " + verified + " verificações offline aprovadas.");
