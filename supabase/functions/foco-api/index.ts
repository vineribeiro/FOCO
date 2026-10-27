import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "https://buoefcnkpdrhevzbakze.supabase.co";
function publicApiKey(): string {
  const singular = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (singular) return singular;
  try {
    const named = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (typeof named.default === "string") return named.default;
  } catch { /* use legacy key below */ }
  return Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_0oYKLSj8WxQMV2A9TtNGew_zduFYPVI";
}
const KEY = publicApiKey();
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const ORIGINS = ["https://vineribeiro.github.io", "http://localhost:5173", "http://127.0.0.1:5173"];
const CORS = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
function response(data: unknown, status = 200, origin = ""): Response {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS,
    ...(ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  }});
}
function client(token = ""): SupabaseClient {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: token ? { Authorization: "Bearer " + token } : {} },
  });
}
function token(req: Request): string {
  const h = req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}
async function auth(req: Request): Promise<{ db: SupabaseClient; user: User }> {
  const jwt = token(req);
  if (!jwt) throw new ApiError(401, "Sessão ausente. Entre novamente no FOCO.");
  const db = client(jwt);
  const result = await db.auth.getUser(jwt);
  if (result.error || !result.data.user) throw new ApiError(401, "Sua sessão expirou. Entre novamente no FOCO.");
  return { db, user: result.data.user };
}
function admin(): SupabaseClient | null {
  let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!secret) {
    try { secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { /* optional */ }
  }
  return secret ? createClient(URL, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}
async function body(req: Request): Promise<any> {
  try { return await req.json(); } catch { throw new ApiError(400, "Corpo da requisição inválido."); }
}
function text(v: unknown, max = 500): string { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function arr(v: unknown, max = 10): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map(x => x.trim().slice(0, 80)).filter(Boolean) : [];
}
function fail(error: any, fallback: string): void { if (error) throw new ApiError(400, error.message || fallback); }
async function profile(db: SupabaseClient, user: User): Promise<any> {
  const r = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  fail(r.error, "Não foi possível carregar o perfil.");
  if (r.data) return r.data;
  const metadata = user.user_metadata || {};
  const seed = await db.from("profiles").upsert({
    id: user.id,
    full_name: text(metadata.full_name || user.email?.split("@")[0] || "Atleta", 160),
    experience_level: ["iniciante", "intermediario", "avancado"].includes(metadata.experience_level) ? metadata.experience_level : "iniciante",
    current_weight_kg: Number(metadata.current_weight_kg) || null,
    height_cm: Number(metadata.height_cm) || null,
    updated_at: new Date().toISOString(),
  }).select("*").single();
  fail(seed.error, "Não foi possível inicializar o perfil.");
  return seed.data;
}
async function saveProfile(db: SupabaseClient, user: User, input: any): Promise<any> {
  const current = await profile(db, user);
  const row = {
    id: user.id, full_name: text(input.full_name || current.full_name, 160) || "Atleta",
    birth_date: Object.prototype.hasOwnProperty.call(input, "birth_date") ? (input.birth_date || null) : (current.birth_date || null),
    height_cm: !Object.prototype.hasOwnProperty.call(input, "height_cm") ? (current.height_cm ?? null) : (input.height_cm === "" || input.height_cm == null ? null : Number(input.height_cm)),
    current_weight_kg: !Object.prototype.hasOwnProperty.call(input, "current_weight_kg") ? (current.current_weight_kg ?? null) : (input.current_weight_kg === "" || input.current_weight_kg == null ? null : Number(input.current_weight_kg)),
    experience_level: ["iniciante", "intermediario", "avancado"].includes(input.experience_level) ? input.experience_level : (current.experience_level || "iniciante"),
    updated_at: new Date().toISOString(),
  };
  const r = await db.from("profiles").upsert(row).select("*").single();
  fail(r.error, "Não foi possível salvar o perfil.");
  return r.data;
}
async function plans(db: SupabaseClient, uid: string): Promise<any[]> {
  const p = await db.from("workout_plans").select("*").eq("user_id", uid).order("created_at", { ascending: false });
  fail(p.error, "Não foi possível carregar as fichas.");
  if (!p.data?.length) return [];
  const ex = await db.from("workout_exercises").select("*").in("plan_id", p.data.map((x: any) => x.id)).order("position", { ascending: true });
  fail(ex.error, "Não foi possível carregar os exercícios.");
  return p.data.map((item: any) => ({ ...item, exercises: (ex.data || []).filter((e: any) => e.plan_id === item.id).map((e: any) => ({ ...e, suggested_load_kg: Number(e.suggested_load_kg || 0) })) }));
}
async function createPlan(db: SupabaseClient, uid: string, input: any, givenExercises?: any[]): Promise<any> {
  const exercises = givenExercises || input.exercises;
  if (!text(input.name, 160) || !Array.isArray(exercises) || exercises.length === 0) throw new ApiError(400, "Nome do plano e lista de exercícios são obrigatórios.");
  const status = ["ativo", "inativo", "rascunho"].includes(input.status) ? input.status : "ativo";
  if (status === "ativo") fail((await db.from("workout_plans").update({ status: "inativo" }).eq("user_id", uid)).error, "Não foi possível desativar a ficha anterior.");
  const p = await db.from("workout_plans").insert({
    user_id: uid, name: text(input.name, 160), version: Number(input.version) || 1,
    goal: text(input.goal, 160) || "Hipertrofia", weekly_frequency: Number(input.weekly_frequency) || 4,
    status, approved_at: new Date().toISOString(),
  }).select("*").single();
  fail(p.error, "Não foi possível criar a ficha.");
  const rows = exercises.map((e: any, i: number) => ({
    plan_id: p.data.id, exercise_name: text(e.exercise_name, 160) || "Exercício",
    muscle_group: text(e.muscle_group, 80) || "Geral",
    sets: Number(e.sets) || 3, reps_min: Number(e.reps_min) || 8, reps_max: Number(e.reps_max) || 12,
    rest_seconds: Number(e.rest_seconds) || 60, suggested_load_kg: Number(e.suggested_load_kg) || 0,
    notes: text(e.notes, 500), position: i,
  }));
  const ex = await db.from("workout_exercises").insert(rows).select("*");
  if (ex.error) { await db.from("workout_plans").delete().eq("id", p.data.id); fail(ex.error, "Não foi possível salvar os exercícios."); }
  return { ...p.data, exercises: ex.data || [] };
}
async function sessions(db: SupabaseClient, uid: string): Promise<any[]> {
  const s = await db.from("workout_sessions").select("*").eq("user_id", uid).order("started_at", { ascending: false });
  fail(s.error, "Não foi possível carregar o histórico.");
  if (!s.data?.length) return [];
  const sets = await db.from("exercise_sets").select("*").in("session_id", s.data.map((x: any) => x.id)).order("position", { ascending: true });
  fail(sets.error, "Não foi possível carregar as séries.");
  return s.data.map((item: any) => ({ ...item, sets: (sets.data || []).filter((x: any) => x.session_id === item.id) }));
}

const exerciseSchema = { type: "OBJECT", properties: {
  exercise_name: { type: "STRING" }, muscle_group: { type: "STRING" }, sets: { type: "INTEGER" },
  reps_min: { type: "INTEGER" }, reps_max: { type: "INTEGER" }, rest_seconds: { type: "INTEGER" },
  suggested_load_kg: { type: "NUMBER" }, notes: { type: "STRING" },
}, required: ["exercise_name", "muscle_group", "sets", "reps_min", "reps_max", "rest_seconds", "suggested_load_kg"] };
const workoutSchema = { type: "OBJECT", properties: {
  name: { type: "STRING" }, goal: { type: "STRING" }, weekly_frequency: { type: "INTEGER" },
  explanation: { type: "STRING" }, exercises: { type: "ARRAY", items: exerciseSchema },
}, required: ["name", "goal", "weekly_frequency", "explanation", "exercises"] };

function mediaData(value: string): string {
  const match = value.match(/^data:[^;]+;base64,([\s\S]+)$/);
  return match ? match[1] : value.replace(/\s/g, "");
}
async function aiJson(prompt: string, schema: any, media?: { data: string; mime: string }): Promise<any> {
  if (!GEMINI_KEY) throw new ApiError(503, "Configure GEMINI_API_KEY em Supabase → Edge Functions → Secrets para ativar a IA.");
  const parts: any[] = [];
  if (media) parts.push({ inline_data: { mime_type: media.mime, data: media.data } });
  parts.push({ text: prompt });
  const models = [...new Set([GEMINI_MODEL, "gemini-2.5-flash"])];
  let detail = "O Gemini não retornou uma resposta.";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.35 } }),
      });
      const raw = await result.text();
      if (result.ok) {
        let data: any = {}; try { data = JSON.parse(raw); } catch { /* parse below */ }
        const output = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").trim();
        try { return JSON.parse(output); } catch { detail = "O Gemini retornou JSON inválido."; break; }
      }
      try { detail = JSON.parse(raw)?.error?.message || raw; } catch { detail = raw; }
      if (![408, 429, 500, 502, 503, 504].includes(result.status)) throw new ApiError(502, "Falha na API do Gemini: " + String(detail).slice(0, 400));
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  throw new ApiError(503, "O Gemini está temporariamente indisponível. " + String(detail).slice(0, 250));
}

async function dispatch(req: Request, path: string, origin: string): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, ...(ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) } });
  if (method === "GET" && path === "/api/system/status") return response({
    app: "FOCO", version: "2.0.0", ai_status: GEMINI_KEY ? "configured" : "missing_key",
    database: "supabase-postgres", storage_persistent: true, storage_file_exists: false,
    remote_storage_configured: true, remote_storage_ready: true, remote_storage_error: false,
    supabase_sync_available: true, timestamp: new Date().toISOString(),
  }, 200, origin);

  if (method === "POST" && path === "/api/auth/register") {
    const b = await body(req);
    const email = text(b.email, 254).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
    const name = text(b.full_name, 160);
    if (!email.includes("@") || password.length < 6 || !name) throw new ApiError(400, "Informe nome, e-mail válido e senha de pelo menos 6 caracteres.");
    const a = client();
    const r = await a.auth.signUp({ email, password, options: { data: {
      full_name: name,
      experience_level: ["iniciante", "intermediario", "avancado"].includes(b.experience_level) ? b.experience_level : "iniciante",
      current_weight_kg: Number(b.current_weight_kg) || 75,
      height_cm: Number(b.height_cm) || 175,
    } } });
    if (r.error) throw new ApiError(400, r.error.message);
    if (!r.data.user) throw new ApiError(400, "Não foi possível criar a conta.");
    if (!r.data.session?.access_token) throw new ApiError(409, "Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre no FOCO.");
    const db = client(r.data.session.access_token);
    const pr = await db.from("profiles").upsert({
      id: r.data.user.id, full_name: name,
      experience_level: ["iniciante", "intermediario", "avancado"].includes(b.experience_level) ? b.experience_level : "iniciante",
      current_weight_kg: Number(b.current_weight_kg) || 75, height_cm: Number(b.height_cm) || 175,
      updated_at: new Date().toISOString(),
    }).select("*").single();
    fail(pr.error, "Conta criada, mas o perfil não pôde ser salvo. Entre novamente para concluir.");
    await db.from("body_measurements").insert({ user_id: r.data.user.id, measurement_type: "peso", value: Number(b.current_weight_kg) || 75, unit: "kg" });
    return response({ token: r.data.session.access_token, user: { id: r.data.user.id, email: r.data.user.email, full_name: name }, profile: pr.data }, 201, origin);
  }
  if (method === "POST" && path === "/api/auth/login") {
    const b = await body(req), a = client();
    const r = await a.auth.signInWithPassword({ email: text(b.email, 254).toLowerCase(), password: String(b.password || "") });
    if (r.error || !r.data.session || !r.data.user) throw new ApiError(401, "Credenciais inválidas. Verifique seu e-mail e senha.");
    const db = client(r.data.session.access_token), p = await profile(db, r.data.user);
    return response({ token: r.data.session.access_token, user: { id: r.data.user.id, email: r.data.user.email, full_name: p.full_name }, profile: p }, 200, origin);
  }
  if (method === "POST" && path === "/api/auth/forgot-password") {
    const b = await body(req);
    const r = await client().auth.resetPasswordForEmail(text(b.email, 254).toLowerCase(), { redirectTo: "https://vineribeiro.github.io/FOCO/" });
    fail(r.error, "Não foi possível solicitar recuperação de senha.");
    return response({ message: "Se o e-mail estiver cadastrado, as instruções serão enviadas." }, 200, origin);
  }

  const { db, user } = await auth(req);
  if (method === "GET" && path === "/api/auth/me") { const p = await profile(db, user); return response({ user: { id: user.id, email: user.email, full_name: p.full_name }, profile: p }, 200, origin); }
  if (method === "POST" && path === "/api/auth/reset-password") {
    const b = await body(req); if (typeof b.new_password !== "string" || b.new_password.length < 6) throw new ApiError(400, "Senha deve ter ao menos 6 caracteres.");
    const r = await db.auth.updateUser({ password: b.new_password }); fail(r.error, "Não foi possível alterar a senha."); return response({ message: "Senha alterada." }, 200, origin);
  }
  if (method === "DELETE" && path === "/api/auth/account") {
    const a = admin(); if (!a) throw new ApiError(503, "Configure a secret key do Supabase nas funções para excluir uma conta.");
    fail((await a.auth.admin.deleteUser(user.id)).error, "Não foi possível excluir a conta."); return response({ message: "Conta excluída." }, 200, origin);
  }
  if (path === "/api/profile" && method === "GET") return response(await profile(db, user), 200, origin);
  if (path === "/api/profile" && method === "PUT") return response(await saveProfile(db, user, await body(req)), 200, origin);

  if (path === "/api/anamnesis" && method === "GET") {
    const r = await db.from("anamneses").select("*").eq("user_id", user.id).maybeSingle(); fail(r.error, "Não foi possível carregar a anamnese."); return response(r.data || null, 200, origin);
  }
  if (path === "/api/anamnesis" && method === "PUT") {
    const b = await body(req), goal = text(b.primary_goal, 120), freq = Number(b.weekly_frequency), mins = Number(b.session_minutes);
    const pain = text(b.pain_or_injuries, 1200), health = text(b.health_notes, 1200), consent = b.consent_health_data === true;
    if (!goal) throw new ApiError(400, "Selecione o objetivo principal.");
    if (!Number.isInteger(freq) || freq < 2 || freq > 7) throw new ApiError(400, "A frequência deve ser de 2 a 7 dias.");
    if (!Number.isInteger(mins) || mins < 20 || mins > 180) throw new ApiError(400, "O tempo por sessão deve ficar entre 20 e 180 minutos.");
    if ((pain || health) && !consent) throw new ApiError(400, "Autorize explicitamente o uso de informações de saúde.");
    const row = { user_id: user.id, primary_goal: goal, goal_details: text(b.goal_details, 1200), training_age: text(b.training_age, 80),
      activity_level: text(b.activity_level, 80), weekly_frequency: freq, session_minutes: mins, preferred_days: arr(b.preferred_days, 7),
      priority_muscles: arr(b.priority_muscles, 10), equipment_available: arr(b.equipment_available, 12), current_routine: text(b.current_routine, 1200),
      exercise_preferences: text(b.exercise_preferences, 1200), pain_or_injuries: pain, health_notes: health,
      sleep_quality: text(b.sleep_quality, 80), cardio_habits: text(b.cardio_habits, 500), consent_health_data: consent, updated_at: new Date().toISOString() };
    const r = await db.from("anamneses").upsert(row, { onConflict: "user_id" }).select("*").single(); fail(r.error, "Não foi possível salvar a anamnese."); return response(r.data, 200, origin);
  }

  if (path === "/api/goals" && method === "GET") { const r = await db.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }); fail(r.error, "Falha ao carregar metas."); return response(r.data || [], 200, origin); }
  if (path === "/api/goals" && method === "POST") {
    const b = await body(req); if (!b.goal_type) throw new ApiError(400, "Tipo de meta é obrigatório.");
    const r = await db.from("goals").insert({ user_id: user.id, goal_type: text(b.goal_type, 100), description: text(b.description, 1000), priority: Number(b.priority) || 1, target_date: b.target_date || null }).select("*").single();
    fail(r.error, "Não foi possível salvar a meta."); return response(r.data, 201, origin);
  }
  let m = path.match(/^\/api\/goals\/([^/]+)$/);
  if (method === "DELETE" && m) { const r = await db.from("goals").delete().eq("id", m[1]).eq("user_id", user.id).select("id"); fail(r.error, "Falha ao excluir meta."); if (!r.data?.length) throw new ApiError(404, "Meta não encontrada."); return response({ message: "Objetivo removido." }, 200, origin); }

  if (path === "/api/workouts" && method === "GET") return response(await plans(db, user.id), 200, origin);
  if (path === "/api/workouts/active" && method === "GET") return response((await plans(db, user.id)).find((p: any) => p.status === "ativo") || null, 200, origin);
  if (path === "/api/workouts" && method === "POST") return response(await createPlan(db, user.id, await body(req)), 201, origin);
  m = path.match(/^\/api\/workouts\/([^/]+)\/activate$/);
  if (method === "PUT" && m) {
    fail((await db.from("workout_plans").update({ status: "inativo" }).eq("user_id", user.id)).error, "Falha ao atualizar fichas.");
    const r = await db.from("workout_plans").update({ status: "ativo", approved_at: new Date().toISOString() }).eq("id", m[1]).eq("user_id", user.id).select("id").maybeSingle();
    fail(r.error, "Falha ao ativar ficha."); if (!r.data) throw new ApiError(404, "Ficha não encontrada."); return response({ message: "Ficha ativada." }, 200, origin);
  }
  m = path.match(/^\/api\/workouts\/([^/]+)$/);
  if (method === "DELETE" && m) { const r = await db.from("workout_plans").delete().eq("id", m[1]).eq("user_id", user.id).select("id"); fail(r.error, "Falha ao excluir ficha."); if (!r.data?.length) throw new ApiError(404, "Ficha não encontrada."); return response({ message: "Ficha excluída." }, 200, origin); }

  if (path === "/api/sessions" && method === "GET") return response(await sessions(db, user.id), 200, origin);
  if (path === "/api/sessions" && method === "POST") {
    const b = await body(req);
    const s = await db.from("workout_sessions").insert({ user_id: user.id, plan_id: b.plan_id || null, plan_name: text(b.plan_name, 160),
      started_at: b.started_at || new Date().toISOString(), finished_at: b.finished_at || new Date().toISOString(), duration_seconds: Number(b.duration_seconds) || 0,
      notes: text(b.notes, 1200), status: ["in_progress", "completed", "cancelled"].includes(b.status) ? b.status : "completed" }).select("*").single();
    fail(s.error, "Não foi possível salvar a sessão.");
    const sets = Array.isArray(b.sets) ? b.sets : [];
    let inserted: any[] = [];
    if (sets.length) {
      const r = await db.from("exercise_sets").insert(sets.map((x: any, i: number) => ({ session_id: s.data.id, exercise_name: text(x.exercise_name, 160) || "Exercício",
        set_number: Number(x.set_number) || i + 1, repetitions: Number(x.repetitions) || 0, load_kg: Number(x.load_kg) || 0, completed: x.completed !== false, position: i }))).select("*");
      if (r.error) { await db.from("workout_sessions").delete().eq("id", s.data.id); fail(r.error, "Não foi possível salvar as séries."); }
      inserted = r.data || [];
    }
    return response({ ...s.data, sets: inserted }, 201, origin);
  }

  if (path === "/api/measurements" && method === "GET") { const r = await db.from("body_measurements").select("*").eq("user_id", user.id).order("measured_at"); fail(r.error, "Falha ao carregar medidas."); return response(r.data || [], 200, origin); }
  if (path === "/api/measurements" && method === "POST") { const b = await body(req); if (!b.measurement_type || !Number.isFinite(Number(b.value))) throw new ApiError(400, "Tipo e valor obrigatórios.");
    const r = await db.from("body_measurements").insert({ user_id: user.id, measurement_type: text(b.measurement_type, 100), value: Number(b.value), unit: text(b.unit, 20) || "kg", measured_at: b.measured_at || new Date().toISOString() }).select("*").single();
    fail(r.error, "Falha ao salvar medida."); return response(r.data, 201, origin); }
  m = path.match(/^\/api\/measurements\/([^/]+)$/);
  if (method === "DELETE" && m) { const r = await db.from("body_measurements").delete().eq("id", m[1]).eq("user_id", user.id).select("id"); fail(r.error, "Falha ao excluir medida."); if (!r.data?.length) throw new ApiError(404, "Medida não encontrada."); return response({ message: "Medida removida." }, 200, origin); }

  if (path === "/api/files" && method === "GET") { const r = await db.from("uploaded_files").select("*").eq("user_id", user.id).order("created_at", { ascending: false }); fail(r.error, "Falha ao carregar arquivos."); return response(r.data || [], 200, origin); }
  if (path === "/api/files" && method === "POST") throw new ApiError(501, "Armazenamento do arquivo original ainda não configurado; a análise não guarda o arquivo original.");
  m = path.match(/^\/api\/files\/([^/]+)$/);
  if (method === "DELETE" && m) { const r = await db.from("uploaded_files").delete().eq("id", m[1]).eq("user_id", user.id).select("id"); fail(r.error, "Falha ao remover arquivo."); if (!r.data?.length) throw new ApiError(404, "Arquivo não encontrado."); return response({ message: "Arquivo removido." }, 200, origin); }

  if (path === "/api/ai/generate-workout" && method === "POST") {
    const b = await body(req), p = await profile(db, user);
    const an = await db.from("anamneses").select("*").eq("user_id", user.id).maybeSingle(); fail(an.error, "Falha ao carregar anamnese.");
    const a = an.data || {};
    const restriction = a.consent_health_data ? [a.pain_or_injuries, a.health_notes].filter(Boolean).join("; ") : "";
    const prompt = "Você é o treinador virtual do aplicativo FOCO, especializado em musculação baseada em evidências. Gere uma ficha equilibrada e personalizada em português do Brasil.\n" +
      "Objetivo: " + text(b.goal || a.primary_goal, 160) + "\nExperiência: " + text(b.experience_level || p.experience_level, 80) +
      "\nFrequência: " + (Number(b.weekly_frequency || a.weekly_frequency) || 4) + " dias/semana\nMúsculos prioritários: " + text(b.focus_muscles, 500) +
      "\nEquipamentos: " + text(b.equipment_available, 500) + "\nRestrições: " + [text(b.restrictions, 800), restriction].filter(Boolean).join("; ") +
      "\nPeso: " + (p.current_weight_kg || "não informado") + " kg\nAnamnese: " + JSON.stringify(a) +
      "\nRegras: distribua volume e recuperação; priorize grupos selecionados sem negligenciar os demais; respeite equipamento, tempo, preferência e nível; não diagnostique; cargas sugeridas conservadoras. Retorne apenas JSON no schema.";
    const r = await aiJson(prompt, workoutSchema);
    if (!Array.isArray(r.exercises) || !r.exercises.length) throw new ApiError(502, "O Gemini não gerou uma lista de exercícios válida.");
    return response(r, 200, origin);
  }

  if (path === "/api/ai/extract-sheet" && method === "POST") {
    const b = await body(req), mime = String(b.mime_type || "");
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mime) || typeof b.base64 !== "string" || b.base64.length > 15_000_000) throw new ApiError(415, "Envie PDF, JPG, PNG ou WebP válido de até 10 MB.");
    const schema = { type: "OBJECT", properties: { plan_name: { type: "STRING" }, goal: { type: "STRING" }, weekly_frequency: { type: "INTEGER" }, confidence_notes: { type: "STRING" }, extracted_exercises: { type: "ARRAY", items: exerciseSchema } }, required: ["plan_name", "extracted_exercises", "confidence_notes"] };
    const prompt = "Você lê fichas de musculação. Extraia apenas o que estiver legível: nome, objetivo, frequência e exercícios com grupamento, séries, repetições, descanso em segundos, carga em kg (0 se ausente) e notas. Não invente dados ilegíveis; explicite incertezas. Notas do usuário: " + text(b.notes, 1000) + ". Retorne somente JSON.";
    const r = await aiJson(prompt, schema, { data: mediaData(b.base64), mime }); 
    await db.from("uploaded_files").insert({ user_id: user.id, filename: text(b.filename, 200) || "ficha-processada", storage_path: "processed-data-only", mime_type: mime, processing_status: "processed", extracted_data: r });
    return response(r, 200, origin);
  }

  if (path === "/api/ai/analyze-bioimpedance" && method === "POST") {
    const b = await body(req), mime = String(b.mime_type || "");
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mime) || typeof b.base64 !== "string" || b.base64.length > 15_000_000) throw new ApiError(415, "Envie PDF, JPG, PNG ou WebP válido de até 10 MB.");
    const schema = { type: "OBJECT", properties: {
      summary: { type: "STRING" }, metrics: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, value: { type: "STRING" }, interpretation: { type: "STRING" } }, required: ["name", "value", "interpretation"] } },
      strengths: { type: "ARRAY", items: { type: "STRING" } }, attention_points: { type: "ARRAY", items: { type: "STRING" } }, training_recommendations: { type: "ARRAY", items: { type: "STRING" } },
      nutrition_discussion: { type: "ARRAY", items: { type: "STRING" } }, questions_for_professional: { type: "ARRAY", items: { type: "STRING" } }, limitations: { type: "STRING" },
    }, required: ["summary", "metrics", "strengths", "attention_points", "training_recommendations", "nutrition_discussion", "questions_for_professional", "limitations"] };
    const prompt = "Você é um assistente de educação em composição corporal. Leia o relatório e explique em português claro. Extraia somente métricas legíveis, não invente dados, não diagnostique nem prescreva tratamento ou dieta. Explique limitações da bioimpedância e sugira perguntas para um profissional. Contexto: " + text(b.context, 1200) + ". Retorne só JSON.";
    return response(await aiJson(prompt, schema, { data: mediaData(b.base64), mime }), 200, origin);
  }

  if (path === "/api/ai/review-progression" && method === "POST") {
    const b = await body(req), interval = Number(b.review_interval_days) === 30 ? 30 : 15;
    const all = await plans(db, user.id), active = all.find((x: any) => x.status === "ativo");
    if (!active) throw new ApiError(400, "Você precisa ter uma ficha ativa para revisar o ciclo.");
    const history = (await sessions(db, user.id)).slice(0, 20);
    const schema = { type: "OBJECT", properties: {
      review_interval_days: { type: "INTEGER" }, explanation: { type: "STRING" },
      progression_summary: { type: "OBJECT", properties: { strength_delta: { type: "STRING" }, volume_analysis: { type: "STRING" }, focus_adjustments: { type: "STRING" } }, required: ["strength_delta", "volume_analysis", "focus_adjustments"] },
      proposed_plan: { type: "OBJECT", properties: { name: { type: "STRING" }, goal: { type: "STRING" }, weekly_frequency: { type: "INTEGER" }, exercises: { type: "ARRAY", items: exerciseSchema } }, required: ["name", "goal", "weekly_frequency", "exercises"] },
    }, required: ["review_interval_days", "explanation", "progression_summary", "proposed_plan"] };
    const prompt = "Revise este ciclo de musculação após " + interval + " dias. Ficha atual: " + JSON.stringify(active) + ". Histórico: " + JSON.stringify(history) + ". Feedback: " + text(b.user_feedback, 1200) + ". Avalie aderência e progressão, sem presumir o que não foi registrado; proponha ajustes cautelosos e explique-os. Responda apenas JSON.";
    const result = await aiJson(prompt, schema);
    const rec = await db.from("ai_recommendations").insert({ user_id: user.id, previous_plan_id: active.id, review_interval_days: interval, explanation: result.explanation, status: "pending", proposed_plan: result.proposed_plan }).select("*").single();
    fail(rec.error, "Não foi possível salvar a recomendação.");
    return response({ recommendation_id: rec.data.id, ...result }, 200, origin);
  }

  if (path === "/api/recommendations" && method === "GET") { const r = await db.from("ai_recommendations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }); fail(r.error, "Falha ao carregar recomendações."); return response(r.data || [], 200, origin); }
  m = path.match(/^\/api\/recommendations\/([^/]+)\/status$/);
  if (method === "POST" && m) {
    const b = await body(req); if (!["approved", "rejected"].includes(b.status)) throw new ApiError(400, "Status inválido.");
    const r = await db.from("ai_recommendations").select("*").eq("id", m[1]).eq("user_id", user.id).maybeSingle(); fail(r.error, "Falha ao carregar recomendação.");
    if (!r.data) throw new ApiError(404, "Recomendação não encontrada.");
    let planId = r.data.proposed_plan_id || null;
    if (b.status === "approved" && r.data.proposed_plan) {
      const proposal = r.data.proposed_plan;
      planId = (await createPlan(db, user.id, { name: proposal.name || "Ficha atualizada", goal: proposal.goal || "Progressão", weekly_frequency: proposal.weekly_frequency || 4, status: "ativo" }, proposal.exercises || [])).id;
    }
    fail((await db.from("ai_recommendations").update({ status: b.status, proposed_plan_id: planId }).eq("id", m[1]).eq("user_id", user.id)).error, "Falha ao atualizar recomendação.");
    return response({ message: b.status === "approved" ? "Plano aprovado e ativado." : "Proposta recusada." }, 200, origin);
  }

  throw new ApiError(404, "Rota do FOCO não encontrada.");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, ...(ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) } });
  try {
    const url = new URL(req.url), marker = "/functions/v1/foco-api", i = url.pathname.indexOf(marker);
    const path = i >= 0 ? (url.pathname.slice(i + marker.length) || "/") : url.pathname;
    return await dispatch(req, path, origin);
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro inesperado no FOCO.";
    console.error("[FOCO API]", status, message);
    return response({ error: message }, status, origin);
  }
});
