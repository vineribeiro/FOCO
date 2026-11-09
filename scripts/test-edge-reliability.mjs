import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Run the actual Edge route/helper implementations with isolated service seams.
// Storage/Auth/RPC are in memory: no production accounts, emails or AI calls.
const source = readFileSync(new URL('../supabase/functions/foco-api/index.ts', import.meta.url), 'utf8');
const compiled = stripTypeScriptTypes(source.slice(source.indexOf('const SUPABASE_URL')), { mode: 'transform' });
let currentDb, currentAdmin, handler;
globalThis.Deno = { env: { get: key => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'synthetic-admin' : '' }, serve: value => { handler = value; } };
class PasswordSecurityError extends Error { constructor(message, status) { super(message); this.status = status; } }
const api = new Function('createClient', 'PasswordSecurityError', 'assertPasswordNotLeaked', compiled + '\nreturn {auth,dispatch,deleteOwnAccount,legacySessionRequestId,sessions};')(
  (_url,key) => key === 'synthetic-admin' ? currentAdmin : currentDb,
  PasswordSecurityError, async () => {},
);
const user = { id: '11111111-1111-4111-8111-111111111111' };
const other = '22222222-2222-4222-8222-222222222222';
let checks = 0;
const check = async (label, task) => { await task(); checks++; console.log('PASS ' + label); };
const req = (path, method = 'GET', body) => new Request('https://local.invalid/api/' + path, {
  method, headers: { Authorization: 'Bearer synthetic-jwt', 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

function services(initialFiles = []) {
  const files = new Set(initialFiles), removed = [], authEvents = [];
  let removeCount = 0, failRemoveAt = -1, failRevoke = false, failDelete = false;
  const bucket = {
    async list(prefix, { limit, offset }) {
      assert.equal(offset,0); assert.equal(limit,100);
      assert.ok(prefix === user.id || prefix.startsWith(user.id + '/'));
      const children = new Map();
      for (const path of files) {
        if (!path.startsWith(prefix + '/')) continue;
        const rest = path.slice(prefix.length + 1), slash = rest.indexOf('/');
        const name = slash < 0 ? rest : rest.slice(0,slash);
        children.set(name,{ name,id: slash < 0 ? 'synthetic-file-' + path : null });
      }
      return { data: [...children.values()].sort((a,b) => a.name.localeCompare(b.name)).slice(0,limit),error:null };
    },
    async remove(paths) {
      assert.ok(paths.length <= 100);
      removeCount++;
      if (removeCount === failRemoveAt) return { data:null,error:{ message:'Synthetic unavailable' } };
      for (const path of paths) {
        assert.ok(path.startsWith(user.id + '/'));
        assert.ok(!path.includes('/../'));
        files.delete(path); removed.push(path);
      }
      return { data:paths.map(name => ({name})),error:null };
    },
  };
  const db = { storage: { from: name => { assert.equal(name,'foco-private-files'); return bucket; } },
    auth: { getUser: async () => ({ data:{user},error:null }) } };
  const admin = { auth:{ admin:{
    async signOut(jwt,scope) { assert.equal(jwt,'synthetic-jwt'); assert.equal(scope,'global'); authEvents.push('revoke'); return { error:failRevoke ? {message:'Synthetic revoke failure'} : null }; },
    async deleteUser(id) { assert.equal(id,user.id); assert.ok(![...files].some(path => path.startsWith(user.id + '/'))); authEvents.push('delete'); return {error:failDelete ? {message:'Synthetic delete failure'} : null}; },
  } } };
  return { db,admin,files,removed,authEvents,bucket,
    failRemoveAt(value) { failRemoveAt = value; }, failRevoke(value) { failRevoke = value; }, failDelete(value) { failDelete = value; } };
}

await check('deletion drains 250 files plus nested folders without touching another account', async () => {
  const paths = Array.from({length:250},(_,i) => `${user.id}/file-${String(i).padStart(3,'0')}.pdf`);
  paths.push(`${user.id}/nested/deeper/report.pdf`,`${other}/private.pdf`);
  const s = services(paths); currentAdmin = s.admin;
  await api.deleteOwnAccount(s.db,user,'synthetic-jwt');
  assert.equal(s.removed.length,251); assert.deepEqual([...s.files],[`${other}/private.pdf`]);
  assert.deepEqual(s.authEvents,['revoke','delete']);
});
await check('partial Storage failure preserves the account and retry finishes safely', async () => {
  const s = services(Array.from({length:130},(_,i) => `${user.id}/file-${i}.pdf`)); currentAdmin = s.admin;
  s.failRemoveAt(2);
  await assert.rejects(api.deleteOwnAccount(s.db,user,'synthetic-jwt'), error => error.status === 503 && error.code === 'ACCOUNT_DELETION_INCOMPLETE');
  assert.equal(s.files.size,30); assert.deepEqual(s.authEvents,[]);
  s.failRemoveAt(-1); await api.deleteOwnAccount(s.db,user,'synthetic-jwt');
  assert.equal(s.files.size,0); assert.deepEqual(s.authEvents,['revoke','delete']);
});
await check('revocation/deletion failure is explicit and can be retried after files are gone', async () => {
  const s = services([`${user.id}/report.pdf`]); currentAdmin = s.admin;
  s.failRevoke(true);
  await assert.rejects(api.deleteOwnAccount(s.db,user,'synthetic-jwt'),error => error.code === 'ACCOUNT_DELETION_INCOMPLETE');
  assert.deepEqual(s.authEvents,['revoke']); assert.equal(s.files.size,0);
  s.failRevoke(false); s.failDelete(true);
  await assert.rejects(api.deleteOwnAccount(s.db,user,'synthetic-jwt'),error => error.code === 'ACCOUNT_DELETION_INCOMPLETE');
  s.failDelete(false); await api.deleteOwnAccount(s.db,user,'synthetic-jwt');
  assert.deepEqual(s.authEvents,['revoke','revoke','delete','revoke','delete']);
});
await check('malformed Storage paths abort before removal or account deletion', async () => {
  const s = services(); currentAdmin = s.admin;
  s.bucket.list = async () => ({data:[{name:'../another-account.pdf',id:'synthetic'}],error:null});
  await assert.rejects(api.deleteOwnAccount(s.db,user,'synthetic-jwt'), error => error.status === 503);
  assert.equal(s.removed.length,0); assert.deepEqual(s.authEvents,[]);
});
await check('getUser/refresh distinguish transient Auth failures from invalid credentials', async () => {
  for (const error of [{name:'AuthRetryableFetchError',status:0},{name:'AuthApiError',status:503},new TypeError('Synthetic offline')]) {
    currentDb = {auth:{getUser:async () => ({error,data:{}}),refreshSession:async () => ({error,data:{}})}};
    assert.equal((await handler(req('auth/me'))).status,503);
    assert.equal((await handler(req('auth/refresh','POST',{refresh_token:'synthetic-refresh'}))).status,503);
  }
  currentDb = {auth:{getUser:async () => ({error:{status:401},data:{}}),refreshSession:async () => ({error:{status:400},data:{}})}};
  assert.equal((await handler(req('auth/me'))).status,401);
  assert.equal((await handler(req('auth/refresh','POST',{refresh_token:'synthetic-refresh'}))).status,401);
});
await check('legacy session identifiers are stable per exact start, account and plan', async () => {
  const first = await api.legacySessionRequestId(user.id,'2026-11-09T12:00:00.000Z','plan-a');
  assert.match(first,/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(first,await api.legacySessionRequestId(user.id,'2026-11-09T12:00:00.000Z','plan-a'));
  assert.notEqual(first,await api.legacySessionRequestId(other,'2026-11-09T12:00:00.000Z','plan-a'));
  assert.notEqual(first,await api.legacySessionRequestId(user.id,'2026-11-09T12:00:00.001Z','plan-a'));
  assert.notEqual(first,await api.legacySessionRequestId(user.id,'2026-11-09T12:00:00.000Z','plan-b'));
});
await check('session route keeps the draft UUID, rejects malformed IDs and maps conflicts', async () => {
  let payload;
  currentDb = {auth:{getUser:async () => ({data:{user},error:null})},rpc:async (name,args) => {
    assert.equal(name,'foco_record_session'); payload=args.p_session;
    return {data:{id:'synthetic-saved',sets:[]},error:null};
  }};
  const body = {client_request_id:'33333333-3333-4333-8333-333333333333',started_at:'2026-11-09T12:00:00Z',sets:[]};
  assert.equal((await handler(req('sessions','POST',body))).status,201);
  assert.equal(payload.client_request_id,body.client_request_id);
  assert.equal((await handler(req('sessions','POST',{...body,client_request_id:'invalid'}))).status,400);
  currentDb.rpc = async () => ({data:null,error:{code:'PT409',message:'Synthetic replay conflict'}});
  assert.equal((await handler(req('sessions','POST',body))).status,409);
});
await check('history omits the internal fingerprint', async () => {
  const db = {from: table => ({select:() => ({eq:() => ({order:async () => ({data:[{id:'s',client_request_fingerprint:'internal',client_request_id:'public-operation-id'}],error:null})}),in:() => ({order:async () => ({data:[{session_id:'s'}],error:null})})})})};
  const result = await api.sessions(db,user.id);
  assert.equal(result[0].client_request_fingerprint,undefined);
  assert.equal(result[0].client_request_id,'public-operation-id');
});
await check('registration never invents body measurements when optional fields are blank', async () => {
  let metadata, savedProfile;
  const measurements = [];
  currentDb = {
    auth: { signUp: async input => {
      metadata = input.options.data;
      return { data: { user, session: { access_token: 'synthetic-session' } }, error: null };
    } },
    from: table => table === 'profiles' ? { upsert: row => {
      savedProfile = row;
      return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
    } } : { insert: async row => { measurements.push(row); return { error: null }; } },
  };
  const body = { full_name: 'Atleta sintético', email: 'synthetic@example.invalid', password: 'synthetic-password-only' };
  assert.equal((await handler(req('auth/register', 'POST', body))).status, 201);
  assert.equal(metadata.current_weight_kg, null); assert.equal(metadata.height_cm, null);
  assert.equal(savedProfile.current_weight_kg, null); assert.equal(savedProfile.height_cm, null);
  assert.equal(measurements.length, 0);
  assert.equal((await handler(req('auth/register', 'POST', { ...body, current_weight_kg: 76.5, height_cm: 178 }))).status, 201);
  assert.equal(savedProfile.current_weight_kg, 76.5); assert.equal(savedProfile.height_cm, 178);
  assert.equal(measurements.length, 1); assert.equal(measurements[0].value, 76.5);
  assert.equal((await handler(req('auth/register', 'POST', { ...body, current_weight_kg: -1 }))).status, 400);
  assert.equal(measurements.length, 1);
});
console.log(`EDGE RELIABILITY: ${checks} groups passed; no network or production data used.`);
