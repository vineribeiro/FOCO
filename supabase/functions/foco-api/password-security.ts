// Have I Been Pwned Pwned Passwords range API (free, no API key).
// https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
// SHA-1 is only a lookup fingerprint here; Supabase Auth stores the password.
// Only five hash characters leave this function. Do not log passwords or hashes.

export class PasswordSecurityError extends Error {
  constructor(public readonly status: 400 | 503, message: string) {
    super(message);
    this.name = "PasswordSecurityError";
  }
}

type PasswordSecurityOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const UNAVAILABLE = "Não foi possível verificar a segurança da senha agora. Tente novamente em instantes.";
const MAX_RANGE_BYTES = 512 * 1024;

async function readRange(response: Response): Promise<string> {
  if (response.status !== 200 || !response.body) throw new PasswordSecurityError(503, UNAVAILABLE);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RANGE_BYTES) {
        await reader.cancel();
        throw new PasswordSecurityError(503, UNAVAILABLE);
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function assertPasswordNotLeaked(password: string, options: PasswordSecurityOptions = {}): Promise<void> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  bytes.fill(0);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const suffix = hash.slice(5);
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new PasswordSecurityError(503, UNAVAILABLE));
    }, options.timeoutMs ?? 5000);
  });

  try {
    const range = await Promise.race([
      (async () => {
        const response = await (options.fetchImpl ?? fetch)("https://api.pwnedpasswords.com/range/" + hash.slice(0, 5), {
          method: "GET",
          headers: {
            "Add-Padding": "true",
            Accept: "text/plain",
            "User-Agent": "FOCO-Password-Security/1.0 (+https://github.com/vineribeiro/FOCO)",
          },
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          redirect: "error",
          signal: controller.signal,
        });
        return await readRange(response);
      })(),
      deadline,
    ]);

    const lines = range.trim().split(/\r?\n/);
    let compromised = false;
    for (const line of lines) {
      const match = /^([0-9A-Fa-f]{35}):([0-9]+)$/.exec(line);
      if (!match) throw new PasswordSecurityError(503, UNAVAILABLE);
      // Padded records have zero occurrences and must not reject a password.
      if (match[1].toUpperCase() === suffix && /[1-9]/.test(match[2])) compromised = true;
    }
    if (compromised) {
      throw new PasswordSecurityError(400, "Essa senha aparece em vazamentos conhecidos. Escolha uma senha diferente e exclusiva.");
    }
  } catch (error) {
    if (error instanceof PasswordSecurityError) throw error;
    // Provider failures can include request details. Return a fixed safe message.
    throw new PasswordSecurityError(503, UNAVAILABLE);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
