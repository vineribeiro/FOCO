import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { api, ApiRequestError, getStoredToken, isAuthenticationFailure, removeStoredToken, setStoredToken } from '../src/services/api';

// Execute the real client with synthetic storage, a controlled clock and no network.
const values = new Map<string, string>();
const timers = new Map<number, () => void>();
let timerId = 0;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, String(value)),
  removeItem: (key: string) => values.delete(key),
} });
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  location: { hostname: 'audit.invalid', protocol: 'https:' },
  setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
  clearTimeout: (id: number) => timers.delete(id),
} });
const user = { id: 'synthetic-user', email: 'synthetic@example.invalid' };
const profile = { id: user.id, full_name: 'Synthetic Athlete' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const refreshData = { token: 'synthetic-new-access', refresh_token: 'synthetic-new-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600 };
const path = (input: RequestInfo | URL) => new URL(String(input)).pathname.split('/foco-api')[1];
const seed = (expired = true) => {
  removeStoredToken(); values.clear(); timers.clear();
  setStoredToken('synthetic-old-access', 'synthetic-old-refresh', expired ? 1 : Math.floor(Date.now() / 1000) + 3600);
};
const settle = async () => { await nextTurn(); };
const fireNextTimer = () => {
  const next = timers.entries().next().value as [number, () => void] | undefined;
  assert.ok(next, 'A pending request must have a timeout');
  timers.delete(next[0]); next[1]();
};
const catchError = (promise: Promise<unknown>) => promise.then(() => { throw new Error('Expected failure'); }, error => error);
let passed = 0;
async function check(label: string, callback: () => Promise<void>) {
  await callback();
  removeStoredToken(); await settle();
  assert.equal(timers.size, 0, 'Each operation must release its timers');
  passed++; console.log('PASS ' + label);
}

await check('offline renewal preserves both credentials and is recoverable', async () => {
  seed(); globalThis.fetch = async () => { throw new TypeError('Synthetic offline'); };
  const error = await catchError(api.getMe());
  assert.ok(error instanceof ApiRequestError); assert.equal(error.code, 'NETWORK_ERROR');
  assert.equal(isAuthenticationFailure(error), false);
  assert.equal(getStoredToken(), 'synthetic-old-access');
  assert.equal(values.get('foco_auth_refresh_token'), 'synthetic-old-refresh');
});

for (const status of [429, 503]) {
  await check('renewal HTTP ' + status + ' never signs the user out', async () => {
    seed(); globalThis.fetch = async () => json({ error: 'Synthetic temporary outage' }, status);
    const error = await catchError(api.getMe());
    assert.equal(error.status, status); assert.equal(isAuthenticationFailure(error), false);
    assert.equal(getStoredToken(), 'synthetic-old-access');
  });
}

await check('malformed successful renewal preserves the original session', async () => {
  seed(); globalThis.fetch = async () => json({ token: 'incomplete' });
  const error = await catchError(api.getMe());
  assert.equal(error.code, 'INVALID_RESPONSE'); assert.equal(getStoredToken(), 'synthetic-old-access');
});

await check('invalid refresh credentials clear storage only after HTTP 401', async () => {
  seed(); globalThis.fetch = async () => json({ error: 'Synthetic expired session' }, 401);
  const error = await catchError(api.getMe());
  assert.equal(isAuthenticationFailure(error), true);
  assert.equal(getStoredToken(), null); assert.equal(values.get('foco_auth_refresh_token'), undefined);
});

await check('concurrent private requests share one refresh and use the rotated token', async () => {
  seed(); let renewals = 0; let release!: (response: Response) => void; const authorizations: string[] = [];
  globalThis.fetch = async (input, options) => {
    if (path(input) === '/api/auth/refresh') { renewals++; return new Promise(resolve => { release = resolve; }); }
    authorizations.push(new Headers(options?.headers).get('Authorization') || '');
    return json(path(input) === '/api/auth/me' ? { user, profile } : path(input) === '/api/profile' ? profile : []);
  };
  const requests = Promise.all([api.getMe(), api.getProfile(), api.getSessions()]);
  await settle(); assert.equal(renewals, 1); release(json(refreshData)); await requests;
  assert.deepEqual(authorizations, Array(3).fill('Bearer ' + refreshData.token));
  assert.equal(getStoredToken(), refreshData.token); assert.equal(values.get('foco_auth_refresh_token'), refreshData.refresh_token);
});

await check('auth timeout includes a stalled refresh, even when transport ignores abort', async () => {
  seed(); globalThis.fetch = async () => new Promise(() => {});
  const result = catchError(api.getMe()); await settle(); fireNextTimer();
  const error = await result;
  assert.equal(error.code, 'REQUEST_TIMEOUT'); assert.equal(getStoredToken(), 'synthetic-old-access');
  // The shared refresh has its own deadline so it cannot poison subsequent retries.
  fireNextTimer(); await settle();
  globalThis.fetch = async input => path(input) === '/api/auth/refresh' ? json(refreshData) : json({ user, profile });
  assert.equal((await api.getMe()).user.id, user.id);
});

await check('standalone renewal has a deadline and releases its single-flight operation', async () => {
  seed(); globalThis.fetch = async () => new Promise(() => {});
  const result = catchError(api.getGoals()); await settle(); fireNextTimer();
  assert.equal((await result).code, 'REQUEST_TIMEOUT');
  globalThis.fetch = async input => path(input) === '/api/auth/refresh' ? json(refreshData) : json([]);
  assert.deepEqual(await api.getGoals(), []);
});

await check('auth timeout also includes response body parsing', async () => {
  seed(false); globalThis.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) }) as Response;
  const result = catchError(api.getMe()); await settle(); fireNextTimer();
  assert.equal((await result).code, 'REQUEST_TIMEOUT'); assert.equal(getStoredToken(), 'synthetic-old-access');
});

await check('logout prevents a late refresh response from resurrecting credentials', async () => {
  seed(); let release!: (response: Response) => void;
  globalThis.fetch = async () => new Promise(resolve => { release = resolve; });
  const result = catchError(api.getMe()); await settle(); removeStoredToken();
  release(json(refreshData)); await result; await settle();
  assert.equal(getStoredToken(), null); assert.equal(values.get('foco_auth_refresh_token'), undefined);
});

await check('a failed old refresh cannot delete a more recent login', async () => {
  seed(); let release!: (response: Response) => void;
  globalThis.fetch = async () => new Promise(resolve => { release = resolve; });
  const result = catchError(api.getMe()); await settle();
  setStoredToken('another-login-access', 'another-login-refresh', Math.floor(Date.now() / 1000) + 3600);
  release(json({ error: 'Old refresh invalid' }, 401));
  assert.equal((await result).code, 'SESSION_CHANGED'); assert.equal(getStoredToken(), 'another-login-access');
});

await check('cancelling one caller does not cancel refresh needed by another request', async () => {
  seed(); let release!: (response: Response) => void; let renewals = 0;
  globalThis.fetch = async input => {
    if (path(input) === '/api/auth/refresh') { renewals++; return new Promise(resolve => { release = resolve; }); }
    return json(profile);
  };
  const controller = new AbortController();
  const cancelled = catchError(api.getMe({ signal: controller.signal }));
  const survivor = api.getProfile(); await settle(); controller.abort();
  assert.equal((await cancelled).name, 'AbortError'); release(json(refreshData));
  assert.deepEqual(await survivor, profile); assert.equal(renewals, 1);
});

await check('an already cancelled restore does not start a refresh or network request', async () => {
  seed(); let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('Network must not be reached'); };
  const controller = new AbortController(); controller.abort();
  const error = await catchError(api.getMe({ signal: controller.signal }));
  assert.equal(error.name, 'AbortError'); assert.equal(requests, 0);
  assert.equal(getStoredToken(), 'synthetic-old-access');
});

await check('auth server failure with a valid token preserves credentials', async () => {
  seed(false); globalThis.fetch = async () => json({ error: 'Synthetic server unavailable' }, 503);
  const error = await catchError(api.getMe()); assert.equal(error.status, 503);
  assert.equal(getStoredToken(), 'synthetic-old-access');
});

await check('successful auth response must contain an actual user and profile', async () => {
  seed(false); globalThis.fetch = async () => json({});
  const error = await catchError(api.getMe()); assert.equal(error.code, 'INVALID_RESPONSE');
  assert.equal(getStoredToken(), 'synthetic-old-access');
});

console.log(`FOCO auth reliability: ${passed} checks passed with synthetic data and zero network requests.`);
