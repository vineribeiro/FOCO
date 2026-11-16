import "jsr:@supabase/functions-js@2.119.0/edge-runtime.d.ts";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.119.0";
import { assertPasswordNotLeaked, PasswordSecurityError } from "./password-security.ts";
import { createAiRouter, AiError } from "./aiRouter.mjs";
import { buildAutomaticWorkout, PlannerError, AUTOMATIC_PLANNER_VERSION } from "./automaticPlanner.mjs";
import { preparePersonalQuestion, validatePersonalAnswer, personalSources, PERSONAL_SCHEMA, PERSONAL_COACH_VERSION } from "./personalCoach.mjs";
import { catalogExercise } from "./trainingCatalog.mjs";
import {
  SCIENCE_ENGINE_VERSION,
} from "./trainingScience.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://buoefcnkpdrhevzbakze.supabase.co";
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
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-3.5-flash-lite";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY")?.trim() || "";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b";
const aiRouter = createAiRouter({ geminiKey: GEMINI_KEY, groqKey: GROQ_KEY,
  geminiModel: GEMINI_MODEL, groqModel: GROQ_MODEL, geminiFallbackModel: GEMINI_FALLBACK_MODEL,
  primary: Deno.env.get("AI_PRIMARY_PROVIDER") || "gemini" });
const ORIGINS = ["https://vineribeiro.github.io", "http://localhost:5173", "http://127.0.0.1:5173"];
const CORS = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) { super(message); this.status = status; this.code = code; }
}
function authError(error: any, invalidMessage: string, invalidStatus = 401): never {
  if (error?.name === "AuthRetryableFetchError" || error instanceof TypeError
    || error?.name === "AbortError" || !Number.isFinite(Number(error?.status)) || Number(error?.status) <= 0
    || Number(error?.status) >= 500 || Number(error?.status) === 429) {
    throw new ApiError(503, "A autenticação está temporariamente indisponível. Tente novamente; sua sessão foi preservada.", "AUTH_UNAVAILABLE");
  }
  throw new ApiError(invalidStatus, invalidMessage, "AUTH_INVALID");
}
function rpcError(error: any, fallback: string): void {
  if (!error) return;
  const explicit = /^PT(400|401|403|404|409)$/.exec(error.code || "");
  if (explicit) throw new ApiError(Number(explicit[1]), error.message || fallback, error.code);
  if (/^22/.test(error.code || "") || error.code === "23503" || error.code === "23514") {
    throw new ApiError(400, "Confira os dados enviados e tente novamente.", "INVALID_INPUT");
  }
  // Do not fall back to the old multi-request writes if a deployment lacks its migration.
  throw new ApiError(503, fallback + " Tente novamente em instantes.", "DATABASE_UNAVAILABLE");
}
function response(data: unknown, status = 200, origin = ""): Response {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS,
    ...(ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  }});
}
function client(token = ""): SupabaseClient {
  return createClient(SUPABASE_URL, KEY, {
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
  let result;
  try { result = await db.auth.getUser(jwt); }
  catch (error) { authError(error, "Sua sessão expirou. Entre novamente no FOCO."); }
  if (result.error) authError(result.error, "Sua sessão expirou. Entre novamente no FOCO.");
  if (!result.data.user) throw new ApiError(401, "Sua sessão expirou. Entre novamente no FOCO.", "AUTH_INVALID");
  return { db, user: result.data.user };
}
function admin(): SupabaseClient | null {
  let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!secret) {
    try { secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { /* optional */ }
  }
  return secret ? createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}
async function body(req: Request): Promise<any> {
  try { return await req.json(); } catch { throw new ApiError(400, "Corpo da requisição inválido."); }
}
function text(v: unknown, max = 500): string { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function arr(v: unknown, max = 10): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map(x => x.trim().slice(0, 80)).filter(Boolean) : [];
}
function fail(error: any, fallback: string): void { if (error) throw new ApiError(400, error.message || fallback); }

const PRIVATE_FILE_BUCKET = "foco-private-files";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function decodeUploadedFile(encodedValue: unknown, mimeType: string): Uint8Array {
  if (typeof encodedValue !== "string" || encodedValue.length > 15_000_000) throw new ApiError(413, "O arquivo excede o limite de 10 MB.");
  const encoded = encodedValue.replace(/^data:[^,]+;base64,/i, "").replace(/\s/g, "");
  let binary: string;
  try { binary = atob(encoded); } catch { throw new ApiError(400, "O conteúdo do arquivo não está em base64 válido."); }
  if (!binary.length || binary.length > MAX_FILE_BYTES) throw new ApiError(413, "Envie um arquivo com até 10 MB.");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  let valid = false;
  if (mimeType === "application/pdf") valid = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mimeType === "image/jpeg") valid = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") valid = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (mimeType === "image/webp") valid = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!ALLOWED_FILE_TYPES.includes(mimeType) || !valid) throw new ApiError(415, "O conteúdo do arquivo não corresponde a um PDF, JPG, PNG ou WebP válido.");
  return bytes;
}

function safeFilename(value: unknown, mimeType: string): string {
  const defaultName = mimeType === "application/pdf" ? "documento.pdf" : mimeType === "image/jpeg" ? "imagem.jpg" : mimeType === "image/png" ? "imagem.png" : "imagem.webp";
  const raw = text(value, 200).replace(/\\/g, "/").split("/").pop() || defaultName;
  const clean = raw.replace(/[^a-zA-Z0-9._()-]/g, "_").replace(/^\.+/, "").slice(0, 120);
  return clean || defaultName;
}

async function storeUploadedFile(db: SupabaseClient, user: User, input: any, mimeType: string, status = "pending"): Promise<any> {
  const bytes = decodeUploadedFile(input.base64, mimeType);
  const filename = safeFilename(input.filename, mimeType);
  const storagePath = user.id + "/" + crypto.randomUUID() + "-" + filename;
  const upload = await db.storage.from(PRIVATE_FILE_BUCKET).upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (upload.error) throw new ApiError(502, "Não foi possível salvar o arquivo original no armazenamento seguro: " + upload.error.message);
  const record = await db.from("uploaded_files").insert({ user_id: user.id, filename, storage_path: storagePath, mime_type: mimeType, processing_status: status, extracted_data: null }).select("id,filename,storage_path,mime_type,processing_status,created_at").single();
  if (record.error || !record.data) {
    await db.storage.from(PRIVATE_FILE_BUCKET).remove([storagePath]);
    throw new ApiError(500, record.error?.message || "Não foi possível registrar o arquivo enviado.");
  }
  return record.data;
}

async function updateUploadedFile(db: SupabaseClient, userId: string, fileId: string, status: "processed" | "failed", extractedData: unknown = null): Promise<void> {
  const update = await db.from("uploaded_files").update({ processing_status: status, extracted_data: extractedData }).eq("id", fileId).eq("user_id", userId).select("id").maybeSingle();
  if (update.error || !update.data) throw new ApiError(500, update.error?.message || "Não foi possível atualizar o estado do arquivo.");
}
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
  if (
    Object.prototype.hasOwnProperty.call(input, "current_weight_kg") &&
    r.data.current_weight_kg != null &&
    Number(r.data.current_weight_kg) !== Number(current.current_weight_kg)
  ) {
    const measurement = await db.from("body_measurements").insert({
      user_id: user.id,
      measurement_type: "peso",
      value: Number(r.data.current_weight_kg),
      unit: "kg",
      measured_at: new Date().toISOString(),
    });
    if (measurement.error) console.error("[FOCO] Perfil salvo; não foi possível registrar a medição de peso:", measurement.error.message);
  }
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
  // uid is intentionally not sent: the invoker RPC derives ownership from auth.uid().
  const result = await db.rpc("foco_create_workout", { p_plan: { ...input, exercises } });
  rpcError(result.error, "Não foi possível salvar a ficha; a ficha anterior foi preservada.");
  return result.data;
}

async function legacySessionRequestId(userId: string, startedAt: string, planId: string): Promise<string> {
  // Older deployed clients do not have a draft UUID. Their exact start instant identifies
  // a session; never use a time bucket, duration or exercise-name similarity to merge it.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(["foco-legacy-session-v1", userId, startedAt, planId])));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 128; // RFC 9562 version 8, application-defined hash.
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

async function deleteOwnAccount(db: SupabaseClient, user: User, jwt: string): Promise<void> {
  const elevated = admin();
  if (!elevated) throw new ApiError(503, "A exclusão de conta está temporariamente indisponível. Tente novamente mais tarde.");
  const bucket = db.storage.from(PRIVATE_FILE_BUCKET);
  // Use the user's RLS-scoped Storage client, not an admin list or paths supplied by
  // uploaded_files. Always drain offset 0 so deleting a page cannot skip the next one.
  const deadline = Date.now() + 45_000;
  async function drain(prefix: string): Promise<void> {
    while (true) {
      if (Date.now() > deadline) throw new ApiError(503, "A exclusão ainda não terminou. Parte dos arquivos pode ter sido removida; tente novamente para concluir.", "ACCOUNT_DELETION_INCOMPLETE");
      const listed = await bucket.list(prefix, { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });
      if (listed.error) throw new ApiError(503, "Não foi possível concluir a exclusão dos arquivos. Sua conta ainda existe; tente novamente.", "ACCOUNT_DELETION_INCOMPLETE");
      if (!listed.data?.length) return;
      const paths: string[] = [];
      for (const entry of listed.data) {
        if (!entry.name || entry.name === "." || entry.name === ".." || /[\\/]/.test(entry.name)) {
          throw new ApiError(503, "Não foi possível verificar um arquivo. Tente novamente para concluir a exclusão.", "ACCOUNT_DELETION_INCOMPLETE");
        }
        const path = prefix + "/" + entry.name;
        if (!path.startsWith(user.id + "/")) throw new ApiError(403, "Arquivo fora da conta.");
        if (entry.id) paths.push(path);
        else await drain(path);
      }
      if (paths.length) {
        const removed = await bucket.remove(paths);
        if (removed.error) throw new ApiError(503, "Alguns arquivos não puderam ser excluídos. Sua conta ainda existe; tente novamente para concluir.", "ACCOUNT_DELETION_INCOMPLETE");
      }
      // Virtual folders disappear after their last object is removed.
    }
  }
  await drain(user.id);
  const revoked = await elevated.auth.admin.signOut(jwt, "global");
  if (revoked.error) throw new ApiError(503, "Os arquivos foram removidos, mas a exclusão da conta não terminou. Entre novamente e tente concluir.", "ACCOUNT_DELETION_INCOMPLETE");
  const deleted = await elevated.auth.admin.deleteUser(user.id);
  if (deleted.error) throw new ApiError(503, "A exclusão da conta ainda não terminou. Entre novamente e tente concluir; arquivos já removidos não serão recuperados.", "ACCOUNT_DELETION_INCOMPLETE");
}
async function sessions(db: SupabaseClient, uid: string): Promise<any[]> {
  const s = await db.from("workout_sessions").select("*").eq("user_id", uid).order("started_at", { ascending: false });
  fail(s.error, "Não foi possível carregar o histórico.");
  if (!s.data?.length) return [];
  const sets = await db.from("exercise_sets").select("*").in("session_id", s.data.map((x: any) => x.id)).order("position", { ascending: true });
  fail(sets.error, "Não foi possível carregar as séries.");
  return s.data.map((item: any) => {
    const { client_request_fingerprint: _fingerprint, ...visible } = item;
    return { ...visible, sets: (sets.data || []).filter((x: any) => x.session_id === item.id) };
  });
}

const exerciseSchema = { type: "OBJECT", properties: {
  exercise_name: { type: "STRING" }, muscle_group: { type: "STRING" }, sets: { type: "INTEGER" },
  reps_min: { type: "INTEGER" }, reps_max: { type: "INTEGER" }, rest_seconds: { type: "INTEGER" },
  suggested_load_kg: { type: "NUMBER" }, notes: { type: "STRING" }, training_day: { type: "STRING" }, rir_target: { type: "INTEGER" },
}, required: ["exercise_name", "muscle_group", "sets", "reps_min", "reps_max", "rest_seconds", "suggested_load_kg", "training_day"] };
const importExerciseSchema = { ...exerciseSchema, required: exerciseSchema.required.filter((field: string) => field !== "training_day") };
const workoutSchema = { type: "OBJECT", properties: {
  name: { type: "STRING" }, goal: { type: "STRING" }, weekly_frequency: { type: "INTEGER" },
  explanation: { type: "STRING" }, exercises: { type: "ARRAY", items: exerciseSchema },
}, required: ["name", "goal", "weekly_frequency", "explanation", "exercises"] };


// A ficha precisa indicar o dia de CADA exercício; não deixar o motor repetir a mesma ficha todos os dias.
const WEEKDAYS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;
const OFFICIAL_EXERCISES: readonly string[] = [
  "Supino reto com barra",
  "Supino inclinado com halteres",
  "Supino declinado com barra",
  "Supino na máquina",
  "Flexão de braços",
  "Crucifixo com halteres",
  "Crossover nas polias",
  "Peck deck",
  "Supino reto com halteres",
  "Mergulho nas paralelas com foco no peito",
  "Supino no Smith",
  "Flexão inclinada",
  "Puxada frontal na polia",
  "Remada curvada com barra",
  "Remada baixa no cabo",
  "Remada unilateral com halter",
  "Barra fixa pronada",
  "Remada com peito apoiado",
  "Remada com barra T",
  "Pulldown com braços estendidos",
  "Pullover com halter",
  "Remada invertida",
  "Remada na máquina",
  "Puxada frontal com pegada neutra",
  "Remada curvada no Smith",
  "Remada unilateral no cabo",
  "Remada Pendlay",
  "Remada inclinada no cabo",
  "Puxada frontal com pegada supinada",
  "Pullover na máquina",
  "Desenvolvimento com halteres",
  "Desenvolvimento na máquina",
  "Desenvolvimento com barra",
  "Elevação lateral com halteres",
  "Elevação lateral no cabo",
  "Elevação lateral na máquina",
  "Elevação frontal com halteres",
  "Elevação frontal no cabo",
  "Crucifixo inverso na máquina",
  "Crucifixo inverso com halteres",
  "Crucifixo inverso no cabo",
  "Remada alta no cabo",
  "Face pull na polia",
  "Rotação externa do ombro no cabo",
  "Rotação externa com elástico",
  "Arnold press",
  "Encolhimento de ombros com halteres",
  "Elevação em Y",
  "Rotação externa deitado de lado",
  "Rosca direta com barra reta",
  "Rosca direta com barra EZ",
  "Rosca direta com halteres",
  "Rosca alternada com halteres",
  "Rosca martelo com halteres",
  "Rosca martelo na polia com corda",
  "Rosca Scott com barra EZ",
  "Rosca Scott com halter",
  "Rosca concentrada com halter",
  "Rosca direta na polia com barra reta",
  "Rosca unilateral na polia",
  "Rosca inclinada com halteres",
  "Rosca bayesiana na polia",
  "Rosca martelo alternada",
  "Rosca reversa com barra EZ",
  "Rosca reversa na polia",
  "Rosca de bíceps na máquina",
  "Rosca Scott na máquina",
  "Rosca drag com barra",
  "Rosca 21",
  "Tríceps pulley com barra reta",
  "Tríceps pulley com corda",
  "Tríceps pulley com barra V",
  "Tríceps testa com barra EZ",
  "Tríceps testa com halteres",
  "Tríceps francês unilateral com halter",
  "Tríceps francês com dois halteres",
  "Tríceps coice com halter",
  "Extensão de tríceps acima da cabeça na polia",
  "Extensão unilateral de tríceps acima da cabeça na polia",
  "Tríceps testa na polia",
  "Mergulho no banco para tríceps",
  "Mergulho nas paralelas assistido",
  "Mergulho nas paralelas com peso corporal",
  "Supino com pegada fechada",
  "Supino fechado com halteres",
  "Tríceps coice na polia",
  "Extensão unilateral de tríceps na polia",
  "Extensão de tríceps na máquina",
  "Flexão de braços com pegada fechada",
  "Extensão de tríceps com elástico",
  "Flexão de punho com barra",
  "Flexão de punho com halteres",
  "Flexão de punho na polia",
  "Extensão de punho com halteres",
  "Extensão de punho com barra",
  "Extensão de punho na polia",
  "Rosca reversa com halteres",
  "Pronação do antebraço com halter",
  "Supinação do antebraço com halter",
  "Pronação e supinação com martelo",
  "Caminhada do fazendeiro",
  "Caminhada unilateral com carga",
  "Sustentação estática de carga",
  "Suspensão na barra",
  "Suspensão assistida na barra",
  "Sustentação de pegada em pinça",
  "Fechamento de hand gripper",
  "Extensão dos dedos com elástico",
  "Agachamento livre com barra",
  "Agachamento frontal",
  "Leg press 45 graus",
  "Cadeira extensora",
  "Agachamento goblet",
  "Agachamento no Smith",
  "Afundo",
  "Afundo reverso",
  "Agachamento búlgaro",
  "Subida no banco",
  "Agachamento sissy assistido",
  "Agachamento na máquina hack",
  "Agachamento com halteres",
  "Agachamento com calcanhares elevados",
  "Leg press unilateral",
  "Cadeira extensora unilateral",
  "Agachamento com peso corporal",
  "Mesa flexora",
  "Cadeira flexora",
  "Flexora unilateral",
  "Stiff com barra",
  "Stiff com halteres",
  "Levantamento terra romeno",
  "Levantamento terra romeno com halteres",
  "Levantamento terra convencional",
  "Levantamento terra com barra hexagonal",
  "Pull-through no cabo",
  "Extensão de quadril no banco a 45 graus",
  "Extensão de quadril no banco a 45 graus com carga",
  "Nordic curl",
  "Nordic curl assistido",
  "Flexão de joelho no cabo",
  "Bom dia com barra",
  "Ponte de glúteos com pés no chão",
  "Hip thrust",
  "Ponte de glúteos unilateral",
  "Hip thrust unilateral",
  "Agachamento búlgaro com ênfase no quadril",
  "Flexão de joelhos com sliders",
  "Hip thrust com barra",
  "Hip thrust na máquina",
  "Ponte de glúteos",
  "Abdução de quadril na máquina",
  "Abdução de quadril no cabo",
  "Abdução de quadril deitado de lado",
  "Coice de glúteo no cabo",
  "Coice de glúteo na máquina",
  "Extensão de quadril em quatro apoios",
  "Agachamento sumô",
  "Avanço reverso",
  "Abdução de quadril com mini band",
  "Abdução de quadril em pé sem carga",
  "Panturrilha em pé na máquina",
  "Panturrilha sentada na máquina",
  "Panturrilha no leg press",
  "Panturrilha em pé unilateral",
  "Panturrilha em pé no Smith",
  "Panturrilha em pé com halteres",
  "Panturrilha no degrau com peso corporal",
  "Panturrilha sentada com halter",
  "Panturrilha unilateral com halter",
  "Panturrilha unilateral no leg press",
  "Panturrilha donkey",
  "Elevação de ponta dos pés",
  "Abdominal crunch",
  "Abdominal reverso",
  "Abdominal bicicleta",
  "Abdominal oblíquo",
  "Prancha abdominal",
  "Prancha lateral",
  "Prancha com joelhos apoiados",
  "Abdominal crunch com carga",
  "Abdominal na polia",
  "Elevação de joelhos deitado",
  "Elevação de pernas deitado",
  "Elevação de joelhos na cadeira romana",
  "Elevação de pernas na cadeira romana",
  "Elevação oblíqua de joelhos na cadeira romana",
  "Abdominal com roda",
  "Abdominal V-up",
  "Mountain climber",
  "Dead bug",
  "Pallof press",
  "Rotação russa",
  "Prancha alta com toque no ombro",
  "Extensão lombar no banco 45 graus",
  "Extensão lombar com carga",
  "Extensão de tronco no chão",
  "Bird dog",
  "Superman",
  "Good morning",
  "Levantamento terra com barra",
  "Pull-through na polia",
  "Encolhimento com halteres",
  "Encolhimento com barra",
  "Encolhimento no Smith",
  "Encolhimento na máquina",
  "Remada alta com corda na polia",
  "Remada alta com halteres",
  "Face pull",
  "Encolhimento com barra atrás do corpo",
  "Crucifixo invertido",
  "Remada alta com barra",
  "Encolhimento com kettlebells",
  "Adução de quadril na máquina",
  "Abdução de quadril na polia",
  "Adução de quadril na polia",
  "Adução de quadril deitado de lado",
  "Caminhada lateral com miniband",
  "Clam shell",
  "Agachamento sumô com halter",
  "Caminhada na esteira",
  "Caminhada inclinada na esteira",
  "Corrida na esteira",
  "Bicicleta ergométrica",
  "Bicicleta ergométrica intervalada",
  "Transport elíptico",
  "Remo ergométrico",
  "Pular corda",
  "Polichinelo",
  "Corrida parada",
  "Avanço alternado",
  "Burpee",
  "Kettlebell swing",
  "Corrida intervalada"
];
const officialExerciseName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
const officialExerciseKeys = new Set(OFFICIAL_EXERCISES.map(officialExerciseName));
const DEFAULT_DAYS: Record<number, string[]> = {
  2: ["segunda", "quinta"],
  3: ["segunda", "quarta", "sexta"],
  4: ["segunda", "terca", "quinta", "sexta"],
  5: ["segunda", "terca", "quarta", "quinta", "sexta"],
  6: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
  7: [...WEEKDAYS],
};
function normalizedDay(value: unknown): string {
  const normalized = text(value, 40).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const root = normalized.replace(/[^a-z]/g, "");
  return WEEKDAYS.find(day => root === day || root.startsWith(day)) || "";
}
function scheduleDays(preferred: unknown, frequency: number): string[] {
  const candidates = Array.isArray(preferred) ? preferred.map(normalizedDay).filter(Boolean) : [];
  const unique = [...new Set(candidates)];
  if (unique.length && unique.length < frequency) throw new ApiError(400, "A anamnese tem " + unique.length + " dia(s) disponível(is), mas a ficha pede " + frequency + ". Ajuste os dias na anamnese ou reduza a frequência.");
  if (unique.length >= frequency) return unique.slice(0, frequency);
  return DEFAULT_DAYS[frequency];
}
function mediaData(value: string): string {
  const match = value.match(/^data:[^;]+;base64,([\s\S]+)$/);
  return match ? match[1] : value.replace(/\s/g, "");
}
async function aiJson(prompt: string, schema: any, media?: { data: string; mime: string }, context: any = {}): Promise<any> {
  try {
    return await aiRouter.generate({ prompt, schema, catalog: media ? undefined : OFFICIAL_EXERCISES,
      media, ...context });
  } catch (error) {
    if (error instanceof AiError || error instanceof Error && "status" in error && "code" in error) {
      const typed = error as AiError;
      throw new ApiError(typed.status, typed.message, typed.code);
    }
    throw error;
  }
}
async function dispatch(req: Request, path: string, origin: string): Promise<Response> {
  const method = req.method.toUpperCase();

  // Normalize the route supplied by the Supabase gateway. Auth endpoints must
  // remain public even when the runtime exposes an extra prefix or trailing slash.
  path = path.replace(/\/+/g, "/").replace(/\/+$/, "") || "/";
  const apiPathIndex = path.lastIndexOf("/api/");
  if (apiPathIndex > 0) path = path.slice(apiPathIndex);
  if (path === "/api/auth/login" || path === "/api/auth/register" || path === "/api/auth/refresh" || path === "/api/auth/forgot-password") {
    console.log("[FOCO ROUTE]", method, path);
  }

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, ...(ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) } });
  if (method === "GET" && path === "/api/system/status") return response({
    app: "FOCO", version: "3.2.0", build: "2026-11-16-rules-recovery", science_engine: SCIENCE_ENGINE_VERSION,
    automatic_planner: AUTOMATIC_PLANNER_VERSION, personal_coach: PERSONAL_COACH_VERSION,
    ai_status: GROQ_KEY || GEMINI_KEY ? "configured" : "missing_key",
    ai_provider: aiRouter.status().primary,
    ai_primary_provider: aiRouter.status().primary, ai_fallback_provider: aiRouter.status().fallback,
    ai_routing: "automatic-fallback", ai_max_calls_per_request: aiRouter.status().max_calls,
    ai_text_status: GROQ_KEY || GEMINI_KEY ? "configured" : "missing_key",
    ai_media_status: GEMINI_KEY ? "configured" : "missing_key",
    database: "supabase-postgres", storage_persistent: true, storage_file_exists: true,
    storage_bucket: PRIVATE_FILE_BUCKET, file_uploads_supported: true,
    remote_storage_configured: true, remote_storage_ready: true, remote_storage_error: false,
    supabase_sync_available: true, timestamp: new Date().toISOString(),
  }, 200, origin);

  if (method === "POST" && path === "/api/auth/register") {
    const b = await body(req);
    const email = text(b.email, 254).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
    const name = text(b.full_name, 160);
    if (!email.includes("@") || password.length < 8 || !name) throw new ApiError(400, "Informe nome, e-mail válido e senha de pelo menos 8 caracteres.");
    const weightKg = b.current_weight_kg == null || b.current_weight_kg === "" ? null : Number(b.current_weight_kg);
    const heightCm = b.height_cm == null || b.height_cm === "" ? null : Number(b.height_cm);
    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 350)) throw new ApiError(400, "Informe um peso válido entre 30 e 350 kg, ou deixe o campo vazio.");
    if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250)) throw new ApiError(400, "Informe uma altura válida entre 100 e 250 cm, ou deixe o campo vazio.");
    await assertPasswordNotLeaked(password);
    const a = client();
    const r = await a.auth.signUp({ email, password, options: { data: {
      full_name: name,
      experience_level: ["iniciante", "intermediario", "avancado"].includes(b.experience_level) ? b.experience_level : "iniciante",
      current_weight_kg: weightKg,
      height_cm: heightCm,
    } } });
    if (r.error) authError(r.error, r.error.message || "Não foi possível criar a conta.", 400);
    if (!r.data.user) throw new ApiError(400, "Não foi possível criar a conta.");
    if (!r.data.session?.access_token) throw new ApiError(409, "Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre no FOCO.");
    const db = client(r.data.session.access_token);
    const pr = await db.from("profiles").upsert({
      id: r.data.user.id, full_name: name,
      experience_level: ["iniciante", "intermediario", "avancado"].includes(b.experience_level) ? b.experience_level : "iniciante",
      current_weight_kg: weightKg, height_cm: heightCm,
      updated_at: new Date().toISOString(),
    }).select("*").single();
    fail(pr.error, "Conta criada, mas o perfil não pôde ser salvo. Entre novamente para concluir.");
    if (weightKg !== null) {
      const measured = await db.from("body_measurements").insert({ user_id: r.data.user.id, measurement_type: "peso", value: weightKg, unit: "kg" });
      fail(measured.error, "Conta criada, mas a medição não pôde ser registrada. Entre no FOCO e confira seus dados.");
    }
    return response({ token: r.data.session.access_token, refresh_token: r.data.session.refresh_token, expires_at: r.data.session.expires_at, user: { id: r.data.user.id, email: r.data.user.email, full_name: name }, profile: pr.data }, 201, origin);
  }
  if (method === "POST" && path === "/api/auth/login") {
    const b = await body(req), a = client();
    const r = await a.auth.signInWithPassword({ email: text(b.email, 254).toLowerCase(), password: String(b.password || "") });
    if (r.error) authError(r.error, "Credenciais inválidas. Verifique seu e-mail e senha.");
    if (!r.data.session || !r.data.user) throw new ApiError(401, "Credenciais inválidas. Verifique seu e-mail e senha.");
    const db = client(r.data.session.access_token), p = await profile(db, r.data.user);
    return response({ token: r.data.session.access_token, refresh_token: r.data.session.refresh_token, expires_at: r.data.session.expires_at, user: { id: r.data.user.id, email: r.data.user.email, full_name: p.full_name }, profile: p }, 200, origin);
  }
  if (method === "POST" && path === "/api/auth/forgot-password") {
    const b = await body(req);
    const r = await client().auth.resetPasswordForEmail(text(b.email, 254).toLowerCase(), { redirectTo: "https://vineribeiro.github.io/FOCO/" });
    fail(r.error, "Não foi possível solicitar recuperação de senha.");
    return response({ message: "Se o e-mail estiver cadastrado, as instruções serão enviadas." }, 200, origin);
  }
  if (method === "POST" && path === "/api/auth/refresh") {
    const b = await body(req);
    const refreshToken = text(b.refresh_token, 1200);
    if (!refreshToken) throw new ApiError(401, "A sessão expirou. Entre novamente no FOCO.");
    let r;
    try { r = await client().auth.refreshSession({ refresh_token: refreshToken }); }
    catch (error) { authError(error, "A sessão expirou. Entre novamente no FOCO."); }
    if (r.error) authError(r.error, "A sessão expirou. Entre novamente no FOCO.");
    if (!r.data.session || !r.data.user) throw new ApiError(401, "A sessão expirou. Entre novamente no FOCO.", "AUTH_INVALID");
    return response({
      token: r.data.session.access_token,
      refresh_token: r.data.session.refresh_token,
      expires_at: r.data.session.expires_at,
      user: { id: r.data.user.id, email: r.data.user.email },
    }, 200, origin);
  }

  const { db, user } = await auth(req);
  if (method === "GET" && path === "/api/auth/me") { const p = await profile(db, user); return response({ user: { id: user.id, email: user.email, full_name: p.full_name }, profile: p }, 200, origin); }
  if (method === "POST" && path === "/api/auth/reset-password") {
    const b = await body(req); if (typeof b.new_password !== "string" || b.new_password.length < 8) throw new ApiError(400, "Senha deve ter ao menos 8 caracteres.");
    await assertPasswordNotLeaked(b.new_password);
    const r = await db.auth.updateUser({ password: b.new_password }); fail(r.error, "Não foi possível alterar a senha."); return response({ message: "Senha alterada." }, 200, origin);
  }
  if (method === "DELETE" && path === "/api/auth/account") {
    await deleteOwnAccount(db, user, token(req));
    return response({ message: "Conta e arquivos excluídos." }, 200, origin);
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
  m = path.match(/^\/api\/workouts\/([^/]+)\/exercises$/);
  if (method === "POST" && m) {
    const planId = m[1];
    const b = await body(req);
    const input = b.exercise || b;
    const plan = await db.from("workout_plans").select("id").eq("id", planId).eq("user_id", user.id).maybeSingle();
    fail(plan.error, "Não foi possível verificar a ficha.");
    if (!plan.data) throw new ApiError(404, "Ficha não encontrada.");

    const exerciseName = text(input.exercise_name, 160);
    if (!exerciseName) throw new ApiError(400, "O nome do exercício é obrigatório.");
    const validDays = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const trainingDay = input.training_day == null || input.training_day === "" ? null : text(input.training_day, 20);
    if (trainingDay && !validDays.includes(trainingDay)) throw new ApiError(400, "Dia da semana inválido.");
    let duplicateQuery = db.from("workout_exercises").select("id").eq("plan_id", planId).ilike("exercise_name", exerciseName);
    if (trainingDay) duplicateQuery = duplicateQuery.or(`training_day.eq.${trainingDay},training_day.is.null`);
    const duplicate = await duplicateQuery.limit(1).maybeSingle();
    fail(duplicate.error, "Não foi possível verificar os exercícios existentes.");
    if (duplicate.data) throw new ApiError(409, "Esse exercício já está na ficha selecionada.");

    const last = await db.from("workout_exercises").select("position").eq("plan_id", planId).order("position", { ascending: false }).limit(1).maybeSingle();
    fail(last.error, "Não foi possível ordenar os exercícios.");
    const exercise = await db.from("workout_exercises").insert({
      plan_id: planId,
      exercise_name: exerciseName,
      repdb_id: typeof input.repdb_id === "string" && /^[a-z0-9-]{1,100}$/.test(input.repdb_id) ? input.repdb_id : null,
      muscle_group: text(input.muscle_group, 80) || "Geral",
      sets: Math.min(10, Math.max(1, Number(input.sets) || 3)),
      reps_min: Math.min(100, Math.max(1, Number(input.reps_min) || 8)),
      reps_max: Math.min(100, Math.max(1, Number(input.reps_max) || 12)),
      rest_seconds: Math.min(600, Math.max(5, Number(input.rest_seconds) || 60)),
      suggested_load_kg: Math.max(0, Number(input.suggested_load_kg) || 0),
      notes: text(input.notes, 500),
      training_day: trainingDay,
      position: Number(last.data?.position ?? -1) + 1,
    }).select("*").single();
    fail(exercise.error, "Não foi possível adicionar o exercício à ficha.");
    return response({ ...exercise.data, suggested_load_kg: Number(exercise.data.suggested_load_kg || 0) }, 201, origin);
  }

  m = path.match(/^\/api\/workouts\/([^/]+)\/exercises\/([^/]+)$/);
  if (method === "PATCH" && m) {
    const planId = m[1];
    const exerciseId = m[2];
    const b = await body(req);
    const validDays = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const trainingDay = b.training_day == null || b.training_day === "" ? null : text(b.training_day, 20);
    if (trainingDay && !validDays.includes(trainingDay)) throw new ApiError(400, "Dia da semana inválido.");

    const plan = await db.from("workout_plans").select("id").eq("id", planId).eq("user_id", user.id).maybeSingle();
    fail(plan.error, "Não foi possível verificar a ficha.");
    if (!plan.data) throw new ApiError(404, "Ficha não encontrada.");

    const existingExercise = await db.from("workout_exercises")
      .select("id,exercise_name")
      .eq("id", exerciseId)
      .eq("plan_id", planId)
      .maybeSingle();
    fail(existingExercise.error, "Não foi possível carregar o exercício.");
    if (!existingExercise.data) throw new ApiError(404, "Exercício não encontrado nesta ficha.");

    let duplicateQuery = db.from("workout_exercises")
      .select("id")
      .eq("plan_id", planId)
      .ilike("exercise_name", existingExercise.data.exercise_name);
    duplicateQuery = duplicateQuery.neq("id", exerciseId);
    if (trainingDay) duplicateQuery = duplicateQuery.or(`training_day.eq.${trainingDay},training_day.is.null`);
    const duplicate = await duplicateQuery.limit(1).maybeSingle();
    fail(duplicate.error, "Não foi possível verificar os exercícios existentes.");
    if (duplicate.data) throw new ApiError(409, "Já existe um exercício com esse nome neste dia.");

    const updated = await db.from("workout_exercises")
      .update({ training_day: trainingDay })
      .eq("id", exerciseId)
      .eq("plan_id", planId)
      .select("*")
      .maybeSingle();
    fail(updated.error, "Não foi possível atualizar o dia do exercício.");
    if (!updated.data) throw new ApiError(404, "Exercício não encontrado nesta ficha.");
    return response({ ...updated.data, suggested_load_kg: Number(updated.data.suggested_load_kg || 0) }, 200, origin);
  }

  m = path.match(/^\/api\/workouts\/([^/]+)\/activate$/);
  if (method === "PUT" && m) {
    const r = await db.rpc("foco_activate_workout", { p_plan_id: m[1] });
    rpcError(r.error, "Não foi possível ativar a ficha; a ficha anterior foi preservada.");
    return response(r.data, 200, origin);
  }
  m = path.match(/^\/api\/workouts\/([^/]+)$/);
  if (method === "DELETE" && m) { const r = await db.from("workout_plans").delete().eq("id", m[1]).eq("user_id", user.id).select("id"); fail(r.error, "Falha ao excluir ficha."); if (!r.data?.length) throw new ApiError(404, "Ficha não encontrada."); return response({ message: "Ficha excluída." }, 200, origin); }

  if (path === "/api/sessions" && method === "GET") return response(await sessions(db, user.id), 200, origin);
  if (path === "/api/sessions" && method === "POST") {
    const b = await body(req);
    const start = new Date(b.started_at || Date.now());
    if (!Number.isFinite(start.getTime())) throw new ApiError(400, "O início da sessão é inválido.");
    const startedAt = start.toISOString();
    if (b.client_request_id != null && (typeof b.client_request_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.client_request_id))) {
      throw new ApiError(400, "O identificador da sessão é inválido.");
    }
    const clientRequestId = b.client_request_id || (b.started_at
      ? await legacySessionRequestId(user.id, startedAt, String(b.plan_id || "")) : crypto.randomUUID());
    const saved = await db.rpc("foco_record_session", { p_session: {
      ...b, client_request_id: clientRequestId, started_at: startedAt,
      finished_at: b.finished_at || new Date().toISOString(), sets: Array.isArray(b.sets) ? b.sets : [],
    } });
    rpcError(saved.error, "Não foi possível salvar a sessão; seu rascunho foi preservado.");
    return response(saved.data, 201, origin);
  }

  if (path === "/api/measurements" && method === "GET") { const r = await db.from("body_measurements").select("*").eq("user_id", user.id).order("measured_at"); fail(r.error, "Falha ao carregar medidas."); return response(r.data || [], 200, origin); }
  if (path === "/api/measurements" && method === "POST") { const b = await body(req); if (!b.measurement_type || !Number.isFinite(Number(b.value))) throw new ApiError(400, "Tipo e valor obrigatórios.");
    const r = await db.from("body_measurements").insert({ user_id: user.id, measurement_type: text(b.measurement_type, 100), value: Number(b.value), unit: text(b.unit, 20) || "kg", measured_at: b.measured_at || new Date().toISOString() }).select("*").single();
    fail(r.error, "Falha ao salvar medida."); return response(r.data, 201, origin); }
  m = path.match(/^\/api\/measurements\/([^/]+)$/);
  if (method === "DELETE" && m) { const r = await db.from("body_measurements").delete().eq("id", m[1]).eq("user_id", user.id).select("id"); fail(r.error, "Falha ao excluir medida."); if (!r.data?.length) throw new ApiError(404, "Medida não encontrada."); return response({ message: "Medida removida." }, 200, origin); }

  if (path === "/api/files" && method === "GET") {
    const r = await db.from("uploaded_files").select("id,user_id,filename,storage_path,mime_type,processing_status,extracted_data,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    fail(r.error, "Falha ao carregar arquivos.");
    return response(r.data || [], 200, origin);
  }
  if (path === "/api/files" && method === "POST") {
    const b = await body(req), mime = text(b.mime_type, 100);
    if (!ALLOWED_FILE_TYPES.includes(mime)) throw new ApiError(415, "Envie PDF, JPG, PNG ou WebP.");
    const saved = await storeUploadedFile(db, user, b, mime, "pending");
    return response({ id: saved.id, filename: saved.filename, mime_type: saved.mime_type, processing_status: saved.processing_status, created_at: saved.created_at }, 201, origin);
  }
  m = path.match(/^\/api\/files\/([^/]+)\/download$/);
  if (method === "GET" && m) {
    const file = await db.from("uploaded_files").select("id,storage_path").eq("id", m[1]).eq("user_id", user.id).maybeSingle();
    fail(file.error, "Falha ao consultar o arquivo.");
    if (!file.data) throw new ApiError(404, "Arquivo não encontrado.");
    if (!file.data.storage_path?.startsWith(user.id + "/")) throw new ApiError(404, "O original deste registro antigo não está armazenado.");
    const signed = await db.storage.from(PRIVATE_FILE_BUCKET).createSignedUrl(file.data.storage_path, 300);
    if (signed.error || !signed.data?.signedUrl) throw new ApiError(502, "Não foi possível gerar um link seguro para este arquivo.");
    return response({ url: signed.data.signedUrl, expires_in: 300 }, 200, origin);
  }
  m = path.match(/^\/api\/files\/([^/]+)$/);
  if (method === "DELETE" && m) {
    const file = await db.from("uploaded_files").select("id,storage_path").eq("id", m[1]).eq("user_id", user.id).maybeSingle();
    fail(file.error, "Falha ao consultar o arquivo.");
    if (!file.data) throw new ApiError(404, "Arquivo não encontrado.");
    if (file.data.storage_path?.startsWith(user.id + "/")) {
      const removed = await db.storage.from(PRIVATE_FILE_BUCKET).remove([file.data.storage_path]);
      if (removed.error) throw new ApiError(502, "Não foi possível apagar o arquivo do armazenamento seguro.");
    }
    const deleted = await db.from("uploaded_files").delete().eq("id", m[1]).eq("user_id", user.id).select("id");
    fail(deleted.error, "Falha ao remover o registro do arquivo.");
    if (!deleted.data?.length) throw new ApiError(404, "Arquivo não encontrado.");
    return response({ message: "Arquivo e registro removidos." }, 200, origin);
  }

  // The old URL remains an alias for cached clients. Neither route invokes AI.
  if ((path === "/api/workouts/preview" || path === "/api/ai/generate-workout") && method === "POST") {
    const b = await body(req);
    const pr = await db.from("profiles").select("experience_level").eq("id",user.id).maybeSingle();
    fail(pr.error,"Falha ao carregar experiência.");
    const p: any = pr.data || {};
    const an = await db.from("anamneses").select("*").eq("user_id", user.id).maybeSingle();
    fail(an.error, "Falha ao carregar anamnese.");
    const a = an.data || {};
    const frequency = Number(b.weekly_frequency ?? a.weekly_frequency ?? 3);
    if (!Number.isInteger(frequency) || frequency < 2 || frequency > 7) throw new ApiError(400, "Escolha de 2 a 7 dias.");
    if (b.available_days !== undefined && (!Array.isArray(b.available_days)
      || b.available_days.length !== frequency || new Set(b.available_days.map(normalizedDay)).size !== frequency
      || b.available_days.some((day: unknown) => !normalizedDay(day))))
      throw new ApiError(400, "Confira os dias disponíveis: selecione de 2 a 7 dias distintos, de acordo com a frequência.");
    const days = scheduleDays(b.available_days ?? a.preferred_days, frequency);
    const activePlans = await plans(db, user.id);
    const previous = activePlans.find((plan: any) => plan.status === "ativo");
    try {
      const result = buildAutomaticWorkout({ days, experience: b.experience_level || p.experience_level || 'iniciante',
        goal: text(b.goal || a.primary_goal || 'Hipertrofia', 160),
        sessionMinutes: Number(b.session_minutes ?? a.session_minutes ?? 60),
        priorityMuscles: text(b.focus_muscles || (a.priority_muscles || []).join(','), 500).split(','),
        equipmentAvailable: text(b.equipment_available || (a.equipment_available || []).join(','), 500),
        restrictions: [text(b.restrictions, 800), ...(a.consent_health_data ? [a.pain_or_injuries, a.health_notes] : [])].filter(Boolean).join('; '),
        preferences: text(a.exercise_preferences, 500), previousExercises: previous?.exercises || [], previousGoal: previous?.goal || '',
        excludedExercises: arr(b.excluded_exercises, 30),
      });
      return response(result, 200, origin);
    } catch (error) {
      if (error instanceof PlannerError) throw new ApiError(error.status, error.message, error.code);
      throw error;
    }
  }

  if (path === "/api/ai/personal" && method === "POST") {
    const b = await body(req);
    let prepared;
    try { prepared = preparePersonalQuestion({message:b.message,history:b.history,context:null}); }
    catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'Confira sua pergunta.'); }
    if (prepared.safetyReply) return response({...prepared.safetyReply,references:personalSources(prepared.safetyReply.sources)},200,origin);
    let context: any = null;
    if (b.share_training_context === true) {
      // Fetch through the authenticated client and current user ID. No clinical
      // anamnesis, OKOK/body measurements, email or unrelated accounts are sent.
      const pr = await db.from("profiles").select("experience_level").eq("id",user.id).maybeSingle();
      fail(pr.error,"Falha ao carregar experiência.");
      const p: any = pr.data || {};
      const ar = await db.from("workout_plans").select("id,name,goal,weekly_frequency").eq("user_id",user.id).eq("status","ativo").order("created_at",{ascending:false}).limit(1).maybeSingle();
      fail(ar.error,"Falha ao carregar ficha para o Personal.");
      const active: any = ar.data;
      if(active){const ex = await db.from("workout_exercises").select("exercise_name,muscle_group,training_day,sets,reps_min,reps_max,rest_seconds").eq("plan_id",active.id).order("position",{ascending:true}).limit(24);
        fail(ex.error,"Falha ao carregar exercícios para o Personal.");active.exercises=ex.data||[];}
      const hr = await db.from("workout_sessions").select("id,started_at,duration_seconds").eq("user_id",user.id).eq("status","completed").order("started_at",{ascending:false}).limit(3);
      fail(hr.error,"Falha ao carregar registros para o Personal.");
      const history: any[] = hr.data || [];
      if(history.length){const sr = await db.from("exercise_sets").select("session_id,exercise_name,repetitions,load_kg,completed").in("session_id",history.map((session:any)=>session.id)).eq("completed",true).order("position",{ascending:true}).limit(120);
        fail(sr.error,"Falha ao carregar séries para o Personal.");
        for(const session of history)session.sets=(sr.data||[]).filter((set:any)=>set.session_id===session.id);}
      context = {
        experience: p.experience_level || null,
        plan: active ? {name: text(active.name,100),goal:text(active.goal,100),weekly_frequency:active.weekly_frequency,
          exercises:(active.exercises||[]).slice(0,24).map((ex:any)=>({name:text(ex.exercise_name,100),group:ex.muscle_group,day:ex.training_day,
            sets:ex.sets,reps_min:ex.reps_min,reps_max:ex.reps_max,rest_seconds:ex.rest_seconds}))} : null,
        recent_sessions: history.map((session:any)=>({started_at:session.started_at,duration_seconds:session.duration_seconds,sets_are_sample:true,
          sets:(session.sets||[]).filter((set:any)=>set.completed).slice(0,8).map((set:any)=>({exercise:text(set.exercise_name,100),
            repetitions:set.repetitions,load_kg:set.load_kg}))})),
      };
    }
    if(context) prepared = preparePersonalQuestion({message:b.message,history:b.history,context});
    try {
      const result = await aiRouter.generate({scope:user.id,operation:'personal',prompt:prepared.prompt,schema:PERSONAL_SCHEMA,
        validate:validatePersonalAnswer,maxOutputTokens:1600,catalog:undefined,media:undefined});
      return response({...result,references:personalSources(result.sources),coach_version:PERSONAL_COACH_VERSION},200,origin);
    } catch (error) {
      if (error instanceof AiError) throw new ApiError(error.status,error.message,error.code);
      throw error;
    }
  }

  if (path === "/api/ai/extract-sheet" && method === "POST") {
    const b = await body(req), mime = String(b.mime_type || "");
    if (!ALLOWED_FILE_TYPES.includes(mime) || typeof b.base64 !== "string" || b.base64.length > 15_000_000) throw new ApiError(415, "Envie PDF, JPG, PNG ou WebP válido de até 10 MB.");
    const savedFile = await storeUploadedFile(db, user, b, mime, "pending");
    const schema = { type: "OBJECT", properties: { plan_name: { type: "STRING" }, goal: { type: "STRING" }, weekly_frequency: { type: "INTEGER" }, confidence_notes: { type: "STRING" }, extracted_exercises: { type: "ARRAY", items: importExerciseSchema } }, required: ["plan_name", "extracted_exercises", "confidence_notes"] };
    const prompt = "Você lê fichas de musculação. Extraia apenas o que estiver legível: nome, objetivo, frequência e exercícios com grupamento, séries, repetições, descanso em segundos, carga em kg (0 se ausente) e notas. Não invente dados ilegíveis; explicite incertezas. Notas do usuário: " + text(b.notes, 1000) + ". Retorne somente JSON.";
    try {
      const r = await aiJson(prompt, schema, { data: mediaData(b.base64), mime }, { scope: user.id, operation: path, cacheResult: false });
      if (!Array.isArray(r.extracted_exercises) || !r.extracted_exercises.length) throw new ApiError(422, "A IA não encontrou exercícios legíveis. Envie uma foto mais nítida ou um PDF com a ficha inteira.");
      await updateUploadedFile(db, user.id, savedFile.id, "processed", r);
      return response({ ...r, file_id: savedFile.id }, 200, origin);
    } catch (error) {
      try { await updateUploadedFile(db, user.id, savedFile.id, "failed", null); } catch { /* preserve the original processing error */ }
      throw error;
    }
  }

  if (path === "/api/ai/analyze-bioimpedance" && method === "POST") {
    const b = await body(req), mime = String(b.mime_type || "");
    if (!ALLOWED_FILE_TYPES.includes(mime) || typeof b.base64 !== "string" || b.base64.length > 15_000_000) throw new ApiError(415, "Envie PDF, JPG, PNG ou WebP válido de até 10 MB.");
    const savedFile = await storeUploadedFile(db, user, b, mime, "pending");
    const schema = { type: "OBJECT", properties: {
      summary: { type: "STRING" }, metrics: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, value: { type: "STRING" }, interpretation: { type: "STRING" } }, required: ["name", "value", "interpretation"] } },
      strengths: { type: "ARRAY", items: { type: "STRING" } }, attention_points: { type: "ARRAY", items: { type: "STRING" } }, training_recommendations: { type: "ARRAY", items: { type: "STRING" } },
      nutrition_discussion: { type: "ARRAY", items: { type: "STRING" } }, questions_for_professional: { type: "ARRAY", items: { type: "STRING" } }, limitations: { type: "STRING" },
    }, required: ["summary", "metrics", "strengths", "attention_points", "training_recommendations", "nutrition_discussion", "questions_for_professional", "limitations"] };
    const prompt = "Você é um assistente de educação em composição corporal. Leia o relatório e explique em português claro. Extraia somente métricas legíveis, não invente dados, não diagnostique nem prescreva tratamento ou dieta. Explique limitações da bioimpedância e sugira perguntas para um profissional. Contexto: " + text(b.context, 1200) + ". Retorne só JSON.";
    try {
      const result = await aiJson(prompt, schema, { data: mediaData(b.base64), mime }, { scope: user.id, operation: path, cacheResult: false });
      await updateUploadedFile(db, user.id, savedFile.id, "processed", result);
      return response({ ...result, file_id: savedFile.id }, 200, origin);
    } catch (error) {
      try { await updateUploadedFile(db, user.id, savedFile.id, "failed", null); } catch { /* preserve the original processing error */ }
      throw error;
    }
  }

  if (path === "/api/ai/review-progression" && method === "POST") {
    const b = await body(req), interval = Number(b.review_interval_days) === 30 ? 30 : 15;
    const all = await plans(db, user.id), active = all.find((x: any) => x.status === "ativo");
    if (!active) throw new ApiError(400, "Você precisa ter uma ficha ativa para revisar o ciclo.");
    const history = await sessions(db, user.id);
    const an = await db.from("anamneses").select("*").eq("user_id", user.id).maybeSingle();
    fail(an.error, "Falha ao carregar anamnese para revisão.");
    const a = an.data || {}, p = await profile(db,user);
    if (text(b.user_feedback,1200)) throw new ApiError(409,"Para interpretar seu relato, pergunte ao Personal FOCO. A revisão automática usa os registros e as preferências estruturadas.","FEEDBACK_REVIEW");
    let proposal;
    const currentDays = [...new Set((active.exercises||[]).map((ex:any)=>normalizedDay(ex.training_day)).filter(Boolean))] as string[];
    try {
      proposal=buildAutomaticWorkout({days:currentDays.length>=2?currentDays:scheduleDays(a.preferred_days,Number(active.weekly_frequency)||3),
        experience:p.experience_level||'iniciante',goal:active.goal,sessionMinutes:Number(a.session_minutes)||60,
        priorityMuscles:a.priority_muscles||[],equipmentAvailable:(a.equipment_available||[]).join(', '),
        restrictions:a.consent_health_data?[a.pain_or_injuries,a.health_notes].filter(Boolean).join('; '):'',
        preferences:text(a.exercise_preferences,500),previousExercises:active.exercises||[],previousGoal:active.goal});
    }catch(error){if(error instanceof PlannerError)throw new ApiError(error.status,error.message,error.code);throw error;}
    const since=Date.now()-interval*86400000;
    const completed=history.filter((session:any)=>session.status==='completed'&&Date.parse(session.started_at)>=since);
    const completedSets=completed.reduce((sum:number,session:any)=>sum+(session.sets||[]).filter((set:any)=>set.completed).length,0);
    const result={review_interval_days:interval,generation:proposal.generation,planning:proposal.planning,training_science:proposal.training_science,
      proposed_plan:{name:proposal.name,goal:proposal.goal,weekly_frequency:proposal.weekly_frequency,exercises:proposal.exercises},
      explanation:'Revisão pelo motor de regras FOCO, sem chamada à IA. Foram encontrados '+completed.length+' treinos e '+completedSets+' séries concluídas nos últimos '+interval+' dias. A ficha atual só muda se você aprovar esta proposta. Cargas iniciais ficam a seu critério; confira os registros anteriores antes de ajustá-las.',
      progression_summary:{strength_delta:completed.length+' treinos e '+completedSets+' séries concluídas nos últimos '+interval+' dias. Repetições e cargas não comprovam técnica ou RIR.',
        volume_analysis:'A proposta foi conferida quanto a volume, cobertura muscular, recuperação e duração.',
        focus_adjustments:'Prioridades usadas: '+((a.priority_muscles||[]).join(', ')||'equilíbrio global')+'. Progressão dupla: confira técnica e recuperação antes de aumentar a carga.'}};
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
    const status = e instanceof ApiError || e instanceof PasswordSecurityError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro inesperado no FOCO.";
    console.error("[FOCO API]", status, message);
    return response({ error: message, ...(e instanceof ApiError && e.code ? { code: e.code } : {}) }, status, origin);
  }
});
