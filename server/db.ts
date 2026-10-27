import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
}

export interface Profile {
  id: string; // user_id
  full_name: string;
  birth_date?: string;
  height_cm?: number;
  current_weight_kg?: number;
  experience_level?: 'iniciante' | 'intermediario' | 'avancado';
  created_at: string;
  updated_at: string;
}

export interface Anamnesis {
  user_id: string;
  primary_goal: string;
  goal_details: string;
  training_age: string;
  activity_level: string;
  weekly_frequency: number;
  session_minutes: number;
  preferred_days: string[];
  priority_muscles: string[];
  equipment_available: string[];
  current_routine: string;
  exercise_preferences: string;
  pain_or_injuries: string;
  health_notes: string;
  sleep_quality: string;
  cardio_habits: string;
  consent_health_data: boolean;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: string;
  description: string;
  priority: number;
  target_date?: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  plan_id: string;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  suggested_load_kg: number;
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  version: number;
  goal: string;
  weekly_frequency: number;
  status: 'ativo' | 'inativo' | 'rascunho';
  created_at: string;
  approved_at?: string;
  exercises?: WorkoutExercise[];
}

export interface ExerciseSet {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  repetitions: number;
  load_kg: number;
  completed: boolean;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id?: string;
  plan_name?: string;
  started_at: string;
  finished_at?: string;
  duration_seconds: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  sets?: ExerciseSet[];
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measurement_type: string;
  value: number;
  unit: string;
  measured_at: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  extracted_data?: any;
  created_at: string;
}

export interface AIRecommendation {
  id: string;
  user_id: string;
  previous_plan_id?: string;
  proposed_plan_id?: string;
  review_interval_days: number;
  explanation: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  proposed_plan?: Omit<Partial<WorkoutPlan>, 'exercises'> & { exercises?: any[] };
}

interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  goals: Goal[];
  workout_plans: WorkoutPlan[];
  workout_exercises: WorkoutExercise[];
  workout_sessions: WorkoutSession[];
  exercise_sets: ExerciseSet[];
  body_measurements: BodyMeasurement[];
  uploaded_files: UploadedFile[];
  ai_recommendations: AIRecommendation[];
  anamneses: Anamnesis[];
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STATE_TABLE = 'foco_app_state';
const REMOTE_STORAGE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

function validateDatabaseShape(value: unknown): DatabaseSchema {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid FOCO database snapshot');
  }
  const input = value as Partial<DatabaseSchema>;
  const arrayKeys: (keyof DatabaseSchema)[] = [
    'users', 'profiles', 'goals', 'workout_plans', 'workout_exercises',
    'workout_sessions', 'exercise_sets', 'body_measurements',
    'uploaded_files', 'ai_recommendations', 'anamneses',
  ];
  for (const key of arrayKeys) {
    if (input[key] !== undefined && !Array.isArray(input[key])) {
      throw new Error(`Invalid FOCO database field: ${String(key)}`);
    }
  }
  return {
    ...INITIAL_DB,
    ...input,
    users: input.users ?? [],
    profiles: input.profiles ?? [],
    goals: input.goals ?? [],
    workout_plans: input.workout_plans ?? [],
    workout_exercises: input.workout_exercises ?? [],
    workout_sessions: input.workout_sessions ?? [],
    exercise_sets: input.exercise_sets ?? [],
    body_measurements: input.body_measurements ?? [],
    uploaded_files: input.uploaded_files ?? [],
    ai_recommendations: input.ai_recommendations ?? [],
    anamneses: input.anamneses ?? [],
  };
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const RENDER_PERSISTENT_ROOT = path.resolve('/var/data');
const configuredDataDir = process.env.FOCO_DATA_DIR?.trim();

function isRenderPersistentDiskMounted(): boolean {
  try {
    // Checking the mount table avoids treating an ordinary ephemeral /var/data
    // directory as durable storage.
    return fs.readFileSync('/proc/mounts', 'utf-8').split('\n').some((line) => {
      const mountPoint = line.split(' ')[1]?.replace(/\\040/g, ' ');
      return mountPoint === RENDER_PERSISTENT_ROOT;
    });
  } catch {
    return false;
  }
}

const useRenderPersistentDisk =
  process.env.NODE_ENV === 'production' &&
  isRenderPersistentDiskMounted();
const DATA_DIR = path.resolve(
  configuredDataDir ||
  (useRenderPersistentDisk ? path.join(RENDER_PERSISTENT_ROOT, 'foco') : DEFAULT_DATA_DIR),
);
const DB_FILE = path.join(DATA_DIR, 'foco_persistent_store.json');
const LEGACY_DB_FILE = path.join(DEFAULT_DATA_DIR, 'foco_persistent_store.json');

export function getDatabaseStorageStatus() {
  return db.getStorageStatus();
}

const INITIAL_DB: DatabaseSchema = {
  users: [],
  profiles: [],
  goals: [],
  workout_plans: [],
  workout_exercises: [],
  workout_sessions: [],
  exercise_sets: [],
  body_measurements: [],
  uploaded_files: [],
  ai_recommendations: [],
  anamneses: [],
};

class FocoDatabase {
  private data: DatabaseSchema;
  private remoteReady = false;
  private remoteWriteChain: Promise<void> = Promise.resolve();
  private remoteWriteError: string | null = null;
  private localStoreLoadError: string | null = null;

  constructor() {
    try {
      this.data = this.load();
    } catch (error) {
      if (!REMOTE_STORAGE_CONFIGURED) throw error;
      // Keep a record that the local data could not be read. Remote recovery is
      // allowed, but an empty snapshot must never overwrite an unreadable store.
      this.localStoreLoadError = error instanceof Error ? error.message : String(error);
      this.data = validateDatabaseShape(INITIAL_DB);
      console.warn('[FOCO DB] Local store is unavailable; attempting recovery from Supabase.');
    }
  }

  isRemoteStorageConfigured(): boolean {
    return REMOTE_STORAGE_CONFIGURED;
  }

  isRemoteStorageReady(): boolean {
    return this.remoteReady;
  }

  getStorageStatus() {
    const isOnRenderDisk =
      DATA_DIR === RENDER_PERSISTENT_ROOT ||
      DATA_DIR.startsWith(RENDER_PERSISTENT_ROOT + path.sep);
    return {
      engine: this.remoteReady ? 'supabase-json-snapshot' : 'json-file',
      directory: DATA_DIR,
      fileExists: fs.existsSync(DB_FILE),
      remoteStorageConfigured: REMOTE_STORAGE_CONFIGURED,
      remoteStorageReady: this.remoteReady,
      remoteStorageError: this.remoteWriteError,
      persistentDiskConfigured: isOnRenderDisk && isRenderPersistentDiskMounted(),
    };
  }

  private remoteEndpoint(query: string): string {
    return `${SUPABASE_URL}/rest/v1/${SUPABASE_STATE_TABLE}${query}`;
  }

  private remoteApiHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: SUPABASE_SERVICE_KEY,
      ...extra,
    };
    // New Supabase secret keys (sb_secret_...) are opaque API keys, not JWTs.
    // Legacy service_role keys are JWTs and also require the Bearer header.
    if (!SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${SUPABASE_SERVICE_KEY}`;
    }
    return headers;
  }

  private async readRemoteSnapshot(): Promise<DatabaseSchema | null> {
    const response = await fetch(this.remoteEndpoint('?key=eq.global&select=payload'), {
      method: 'GET',
      headers: this.remoteApiHeaders({ Accept: 'application/json' }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Supabase read failed (HTTP ${response.status}). Check the migration and server environment. ${detail}`);
    }
    const rows = await response.json() as Array<{ payload?: unknown }>;
    if (!Array.isArray(rows)) throw new Error('Supabase returned an invalid FOCO database response');
    if (rows.length === 0) return null;
    return validateDatabaseShape(rows[0].payload);
  }

  private async writeRemoteSnapshot(snapshot: DatabaseSchema): Promise<void> {
    const response = await fetch(this.remoteEndpoint('?on_conflict=key'), {
      method: 'POST',
      headers: this.remoteApiHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({
        key: 'global',
        payload: snapshot,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Supabase write failed (HTTP ${response.status}). ${detail}`);
    }
  }

  async initializeRemote(): Promise<void> {
    if (!REMOTE_STORAGE_CONFIGURED) {
      console.warn('[FOCO DB] Supabase storage is not configured; using local JSON storage.');
      return;
    }

    // Fail startup rather than silently falling back to ephemeral storage if the
    // remote database was explicitly configured but cannot be reached.
    const remoteSnapshot = await this.readRemoteSnapshot();
    if (remoteSnapshot) {
      this.data = remoteSnapshot;
      this.remoteReady = true;
      try {
        this.persistLocal();
      } catch (error) {
        // Local storage is a cache only when Supabase is configured as primary.
        console.warn('[FOCO DB] Supabase data loaded, but local cache could not be written:', error);
      }
      console.log('[FOCO DB] Loaded FOCO data from Supabase.');
      return;
    }

    // Seed only when the local file was read successfully. If it was corrupt or
    // missing due to a previous failure, never upload an empty database over it.
    if (this.localStoreLoadError) {
      throw new Error(
        'Supabase has no FOCO snapshot and the local store could not be read. ' +
        'Startup was stopped to prevent replacing recoverable user data. ' +
        this.localStoreLoadError,
      );
    }

    this.remoteReady = true;
    await this.writeRemoteSnapshot(this.data);
    try {
      this.persistLocal();
    } catch (error) {
      console.warn('[FOCO DB] Supabase initialized, but local cache could not be written:', error);
    }
    console.log('[FOCO DB] Initialized Supabase storage from the existing local store.');
  }

  async flushRemote(): Promise<void> {
    if (!REMOTE_STORAGE_CONFIGURED || !this.remoteReady) return;
    await this.remoteWriteChain;
    if (this.remoteWriteError) {
      throw new Error('A gravação no banco persistente falhou: ' + this.remoteWriteError);
    }
  }

  private load(): DatabaseSchema {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    // On first start with a newly mounted Render disk, copy the legacy file if it
    // still exists. Never overwrite an existing file on the persistent disk.
    if (
      path.resolve(DB_FILE) !== path.resolve(LEGACY_DB_FILE) &&
      !fs.existsSync(DB_FILE) &&
      fs.existsSync(LEGACY_DB_FILE)
    ) {
      fs.copyFileSync(LEGACY_DB_FILE, DB_FILE);
      console.warn('[FOCO DB] Migrated legacy JSON store to configured data directory.');
    }

    if (!fs.existsSync(DB_FILE)) {
      const emptyDb = JSON.parse(JSON.stringify(INITIAL_DB)) as DatabaseSchema;
      this.persist(emptyDb);
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[FOCO DB] No existing store was found. A new empty store was initialized. ' +
          'Check FOCO_DATA_DIR / the Render persistent disk before registering existing users again.',
        );
      }
      return emptyDb;
    }

    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      // Backward-compatible defaults for stores created before newer features.
      return validateDatabaseShape(parsed);
    } catch (err) {
      // Preserve the original file and fail closed. Do not replace possibly
      // recoverable user data with an empty database.
      const backupFile = `${DB_FILE}.corrupt.${new Date().toISOString().replace(/[:.]/g, '-')}`;
      try {
        fs.copyFileSync(DB_FILE, backupFile);
      } catch (backupError) {
        console.error('[FOCO DB] Could not back up unreadable data file:', backupError);
      }
      console.error('[FOCO DB] Failed to load the existing store. Startup aborted to protect data.', err);
      throw new Error(
        `FOCO data store could not be read. The original file was preserved; inspect ${backupFile} before recovery.`,
        { cause: err },
      );
    }
  }

  private persistLocal(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const data = dataToSave || this.data;
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}.${crypto.randomBytes(3).toString('hex')}`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Error persisting local FOCO snapshot:', err);
      throw new Error('Não foi possível persistir os dados locais. A operação não pode ser confirmada.', { cause: err });
    }
  }

  private persist(dataToSave?: DatabaseSchema) {
    if (!this.remoteReady) {
      this.persistLocal(dataToSave);
      return;
    }

    // Once Supabase is initialized it is the source of truth. Local file writes
    // are best-effort only, so an ephemeral/read-only filesystem cannot block saves.
    try {
      this.persistLocal(dataToSave);
    } catch (error) {
      console.warn('[FOCO DB] Remote storage is active; local cache write failed:', error);
    }

    // Snapshot requests are serialized so simultaneous mutations cannot finish
    // remote writes out of order within this single-instance MVP backend.
    const snapshot = JSON.parse(JSON.stringify(dataToSave || this.data)) as DatabaseSchema;
    this.remoteWriteChain = this.remoteWriteChain.then(async () => {
      try {
        await this.writeRemoteSnapshot(snapshot);
        this.remoteWriteError = null;
      } catch (error) {
        this.remoteWriteError = error instanceof Error ? error.message : String(error);
        console.error('[FOCO DB] Remote persistence failed:', this.remoteWriteError);
      }
    });
  }

  // --- Users & Profiles ---
  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  updateUserPassword(userId: string, passwordHash: string): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.password_hash = passwordHash;
    this.persist();
    return true;
  }

  createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);

    // Create default profile
    const profile: Profile = {
      id: newUser.id,
      full_name: newUser.full_name,
      experience_level: 'iniciante',
      current_weight_kg: 75,
      height_cm: 175,
      created_at: newUser.created_at,
      updated_at: newUser.created_at,
    };
    this.data.profiles.push(profile);

    // Add default initial weight measurement
    this.addMeasurement({
      user_id: newUser.id,
      measurement_type: 'peso',
      value: 75,
      unit: 'kg',
      measured_at: new Date().toISOString(),
    });

    this.persist();
    return newUser;
  }

  getProfile(userId: string): Profile | undefined {
    return this.data.profiles.find(p => p.id === userId);
  }

  updateProfile(userId: string, updates: Partial<Profile>): Profile | undefined {
    const profile = this.data.profiles.find(p => p.id === userId);
    if (!profile) return undefined;
    Object.assign(profile, updates, { updated_at: new Date().toISOString() });
    if (updates.current_weight_kg) {
      this.addMeasurement({
        user_id: userId,
        measurement_type: 'peso',
        value: updates.current_weight_kg,
        unit: 'kg',
        measured_at: new Date().toISOString(),
      });
    }
    this.persist();
    return profile;
  }

  getAnamnesis(userId: string): Anamnesis | undefined {
    return this.data.anamneses.find((item) => item.user_id === userId);
  }

  saveAnamnesis(userId: string, values: Omit<Anamnesis, 'user_id' | 'updated_at'>): Anamnesis {
    const saved: Anamnesis = {
      ...values,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    const existingIndex = this.data.anamneses.findIndex((item) => item.user_id === userId);
    if (existingIndex >= 0) this.data.anamneses[existingIndex] = saved;
    else this.data.anamneses.push(saved);
    this.persist();
    return saved;
  }

  deleteUser(userId: string): boolean {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.data.profiles = this.data.profiles.filter(p => p.id !== userId);
    this.data.goals = this.data.goals.filter(g => g.user_id !== userId);
    this.data.anamneses = this.data.anamneses.filter(a => a.user_id !== userId);
    
    // clean plans & exercises
    const userPlans = this.data.workout_plans.filter(p => p.user_id === userId);
    const planIds = new Set(userPlans.map(p => p.id));
    this.data.workout_exercises = this.data.workout_exercises.filter(e => !planIds.has(e.plan_id));
    this.data.workout_plans = this.data.workout_plans.filter(p => p.user_id !== userId);

    // clean sessions & sets
    const userSessions = this.data.workout_sessions.filter(s => s.user_id === userId);
    const sessionIds = new Set(userSessions.map(s => s.id));
    this.data.exercise_sets = this.data.exercise_sets.filter(s => !sessionIds.has(s.session_id));
    this.data.workout_sessions = this.data.workout_sessions.filter(s => s.user_id !== userId);

    this.data.body_measurements = this.data.body_measurements.filter(m => m.user_id !== userId);
    this.data.uploaded_files = this.data.uploaded_files.filter(f => f.user_id !== userId);
    this.data.ai_recommendations = this.data.ai_recommendations.filter(r => r.user_id !== userId);
    
    this.persist();
    return true;
  }

  // --- Goals ---
  getGoals(userId: string): Goal[] {
    return this.data.goals.filter(g => g.user_id === userId);
  }

  addGoal(goal: Omit<Goal, 'id' | 'created_at'>): Goal {
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.data.goals.push(newGoal);
    this.persist();
    return newGoal;
  }

  deleteGoal(userId: string, goalId: string): boolean {
    const lenBefore = this.data.goals.length;
    this.data.goals = this.data.goals.filter(g => !(g.id === goalId && g.user_id === userId));
    if (this.data.goals.length !== lenBefore) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Workout Plans & Exercises ---
  getWorkoutPlans(userId: string): WorkoutPlan[] {
    const plans = this.data.workout_plans.filter(p => p.user_id === userId);
    return plans.map(p => ({
      ...p,
      exercises: this.data.workout_exercises.filter(e => e.plan_id === p.id),
    }));
  }

  getActiveWorkoutPlan(userId: string): WorkoutPlan | undefined {
    const plan = this.data.workout_plans.find(p => p.user_id === userId && p.status === 'ativo');
    if (!plan) return undefined;
    return {
      ...plan,
      exercises: this.data.workout_exercises.filter(e => e.plan_id === plan.id),
    };
  }

  createWorkoutPlan(
    userId: string,
    planData: Omit<WorkoutPlan, 'id' | 'user_id' | 'created_at' | 'exercises'>,
    exercises: Omit<WorkoutExercise, 'id' | 'plan_id'>[]
  ): WorkoutPlan {
    // If new plan is active, deactivate other plans
    if (planData.status === 'ativo') {
      this.data.workout_plans
        .filter(p => p.user_id === userId)
        .forEach(p => { p.status = 'inativo'; });
    }

    const newPlan: WorkoutPlan = {
      ...planData,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    };

    this.data.workout_plans.push(newPlan);

    const createdExercises: WorkoutExercise[] = exercises.map(e => {
      const ex: WorkoutExercise = {
        ...e,
        id: crypto.randomUUID(),
        plan_id: newPlan.id,
      };
      this.data.workout_exercises.push(ex);
      return ex;
    });

    this.persist();
    return {
      ...newPlan,
      exercises: createdExercises,
    };
  }

  activateWorkoutPlan(userId: string, planId: string): boolean {
    const plan = this.data.workout_plans.find(p => p.id === planId && p.user_id === userId);
    if (!plan) return false;
    this.data.workout_plans.filter(p => p.user_id === userId).forEach(p => { p.status = 'inativo'; });
    plan.status = 'ativo';
    plan.approved_at = new Date().toISOString();
    this.persist();
    return true;
  }

  deleteWorkoutPlan(userId: string, planId: string): boolean {
    const plan = this.data.workout_plans.find(p => p.id === planId && p.user_id === userId);
    if (!plan) return false;
    this.data.workout_plans = this.data.workout_plans.filter(p => p.id !== planId);
    this.data.workout_exercises = this.data.workout_exercises.filter(e => e.plan_id !== planId);
    this.persist();
    return true;
  }

  // --- Workout Sessions & Sets ---
  getWorkoutSessions(userId: string): WorkoutSession[] {
    const sessions = this.data.workout_sessions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    return sessions.map(s => ({
      ...s,
      sets: this.data.exercise_sets.filter(set => set.session_id === s.id),
    }));
  }

  createWorkoutSession(
    userId: string,
    sessionData: Omit<WorkoutSession, 'id' | 'user_id' | 'sets'>,
    sets: Omit<ExerciseSet, 'id' | 'session_id' | 'created_at'>[]
  ): WorkoutSession {
    const newSession: WorkoutSession = {
      ...sessionData,
      id: crypto.randomUUID(),
      user_id: userId,
    };
    this.data.workout_sessions.push(newSession);

    const createdSets: ExerciseSet[] = sets.map(s => {
      const newSet: ExerciseSet = {
        ...s,
        id: crypto.randomUUID(),
        session_id: newSession.id,
        created_at: new Date().toISOString(),
      };
      this.data.exercise_sets.push(newSet);
      return newSet;
    });

    this.persist();
    return {
      ...newSession,
      sets: createdSets,
    };
  }

  // --- Body Measurements ---
  getMeasurements(userId: string): BodyMeasurement[] {
    return this.data.body_measurements
      .filter(m => m.user_id === userId)
      .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  }

  addMeasurement(measurement: Omit<BodyMeasurement, 'id'>): BodyMeasurement {
    const newMeasurement: BodyMeasurement = {
      ...measurement,
      id: crypto.randomUUID(),
    };
    this.data.body_measurements.push(newMeasurement);
    this.persist();
    return newMeasurement;
  }

  deleteMeasurement(userId: string, measurementId: string): boolean {
    const initialLen = this.data.body_measurements.length;
    this.data.body_measurements = this.data.body_measurements.filter(
      m => !(m.id === measurementId && m.user_id === userId)
    );
    if (this.data.body_measurements.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Uploaded Files ---
  getUploadedFiles(userId: string): UploadedFile[] {
    return this.data.uploaded_files
      .filter(f => f.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addUploadedFile(file: Omit<UploadedFile, 'id' | 'created_at'>): UploadedFile {
    const newFile: UploadedFile = {
      ...file,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.data.uploaded_files.push(newFile);
    this.persist();
    return newFile;
  }

  deleteUploadedFile(userId: string, fileId: string): boolean {
    const initialLen = this.data.uploaded_files.length;
    this.data.uploaded_files = this.data.uploaded_files.filter(
      f => !(f.id === fileId && f.user_id === userId)
    );
    if (this.data.uploaded_files.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- AI Recommendations ---
  getRecommendations(userId: string): AIRecommendation[] {
    return this.data.ai_recommendations
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addRecommendation(rec: Omit<AIRecommendation, 'id' | 'created_at'>): AIRecommendation {
    const newRec: AIRecommendation = {
      ...rec,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.data.ai_recommendations.push(newRec);
    this.persist();
    return newRec;
  }

  updateRecommendationStatus(userId: string, recId: string, status: 'approved' | 'rejected'): boolean {
    const rec = this.data.ai_recommendations.find(r => r.id === recId && r.user_id === userId);
    if (!rec) return false;
    rec.status = status;

    // If approved and has proposed plan, create and activate it!
    if (status === 'approved' && rec.proposed_plan) {
      const p = rec.proposed_plan;
      this.createWorkoutPlan(
        userId,
        {
          name: p.name || 'Nova Ficha - Ciclo Aprovado',
          version: (p.version || 1),
          goal: p.goal || 'Progressão de Carga',
          weekly_frequency: p.weekly_frequency || 4,
          status: 'ativo',
        },
        (p.exercises || []).map(e => ({
          exercise_name: e.exercise_name || 'Exercício',
          muscle_group: e.muscle_group || 'Geral',
          sets: e.sets || 3,
          reps_min: e.reps_min || 8,
          reps_max: e.reps_max || 12,
          rest_seconds: e.rest_seconds || 60,
          suggested_load_kg: e.suggested_load_kg || 0,
          notes: e.notes || '',
        }))
      );
    }

    this.persist();
    return true;
  }
}

export const db = new FocoDatabase();
