import {
  User,
  Profile,
  Goal,
  WorkoutPlan,
  WorkoutExercise,
  WorkoutSession,
  BodyMeasurement,
  UploadedFile,
  AIRecommendation,
  Anamnesis,
} from '../types';

const TOKEN_KEY = 'foco_auth_token';
const LOCAL_DB_KEY = 'foco_local_db_v1';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

// Detecção de ambiente estático como GitHub Pages
const isStaticHost = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.protocol === 'file:'
);

interface LocalDatabase {
  user: User;
  profile: Profile;
  workouts: WorkoutPlan[];
  sessions: WorkoutSession[];
  goals: Goal[];
  measurements: BodyMeasurement[];
  anamnesis: Anamnesis | null;
}

function getInitialLocalDatabase(): LocalDatabase {
  return {
    user: {
      id: 'usr_foco_demo',
      email: 'atleta@foco.app',
      full_name: 'Atleta FOCO',
    },
    profile: {
      id: 'usr_foco_demo',
      full_name: 'Atleta FOCO',
      experience_level: 'avancado',
      current_weight_kg: 84.5,
      height_cm: 182,
      birth_date: '1998-05-15',
    },
    workouts: [
      {
        id: 'plan_foco_push',
        user_id: 'usr_foco_demo',
        name: 'FOCO A — Peito, Ombros & Tríceps',
        version: 1,
        goal: 'Hipertrofia e Força Máxima',
        weekly_frequency: 4,
        status: 'ativo',
        created_at: new Date().toISOString(),
        exercises: [
          {
            id: 'ex_supino_reto',
            exercise_name: 'Supino Reto com Barra',
            muscle_group: 'Peitoral',
            sets: 4,
            reps_min: 6,
            reps_max: 10,
            rest_seconds: 90,
            suggested_load_kg: 85,
            notes: 'Aduzir bem as escápulas e controlar a descida em 3 segundos.',
          },
          {
            id: 'ex_supino_incl',
            exercise_name: 'Supino Inclinado com Halteres',
            muscle_group: 'Peitoral',
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            rest_seconds: 75,
            suggested_load_kg: 32,
            notes: 'Foco na porção clavicular do peitoral.',
          },
          {
            id: 'ex_desenvolvimento',
            exercise_name: 'Desenvolvimento Militar com Halteres',
            muscle_group: 'Ombros',
            sets: 4,
            reps_min: 8,
            reps_max: 12,
            rest_seconds: 60,
            suggested_load_kg: 24,
            notes: 'Prensa vertical sem hiperextender a lombar.',
          },
          {
            id: 'ex_elevacao_lat',
            exercise_name: 'Elevação Lateral na Polia',
            muscle_group: 'Ombros',
            sets: 4,
            reps_min: 12,
            reps_max: 15,
            rest_seconds: 45,
            suggested_load_kg: 12.5,
            notes: 'Cotovelo levemente flexionado, pico de contração de 1s.',
          },
          {
            id: 'ex_triceps_corda',
            exercise_name: 'Tríceps Corda na Polia',
            muscle_group: 'Braços',
            sets: 3,
            reps_min: 10,
            reps_max: 15,
            rest_seconds: 45,
            suggested_load_kg: 25,
            notes: 'Abrir a corda no final do movimento para contrair o tríceps.',
          },
        ],
      },
      {
        id: 'plan_foco_pull',
        user_id: 'usr_foco_demo',
        name: 'FOCO B — Costas, Posterior & Bíceps',
        version: 1,
        goal: 'Densidade Dorsal',
        weekly_frequency: 4,
        status: 'inativo',
        created_at: new Date().toISOString(),
        exercises: [
          {
            id: 'ex_puxada_frente',
            exercise_name: 'Puxada Frontal Pegada Aberta',
            muscle_group: 'Costas',
            sets: 4,
            reps_min: 8,
            reps_max: 12,
            rest_seconds: 75,
            suggested_load_kg: 70,
            notes: 'Puxar com o cotovelo e manter o peito estufado.',
          },
          {
            id: 'ex_remada_curvada',
            exercise_name: 'Remada Curvada com Barra',
            muscle_group: 'Costas',
            sets: 4,
            reps_min: 6,
            reps_max: 10,
            rest_seconds: 90,
            suggested_load_kg: 75,
            notes: 'Tronco a 45 graus, puxada em direção ao umbigo.',
          },
          {
            id: 'ex_rosca_direta',
            exercise_name: 'Rosca Direta Barra W',
            muscle_group: 'Braços',
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            rest_seconds: 60,
            suggested_load_kg: 32,
            notes: 'Sem balanço do tronco, contração máxima no topo.',
          },
        ],
      },
    ],
    sessions: [
      {
        id: 'sess_prev_1',
        user_id: 'usr_foco_demo',
        plan_name: 'FOCO A — Peito, Ombros & Tríceps',
        started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        finished_at: new Date(Date.now() - 86400000 * 2 + 3400000).toISOString(),
        duration_seconds: 3400,
        status: 'completed',
        notes: 'Sessão intensa. Sobrecarga mantida no supino reto.',
        sets: [
          { exercise_name: 'Supino Reto com Barra', set_number: 1, repetitions: 10, load_kg: 85, completed: true },
          { exercise_name: 'Supino Reto com Barra', set_number: 2, repetitions: 9, load_kg: 85, completed: true },
          { exercise_name: 'Supino Reto com Barra', set_number: 3, repetitions: 8, load_kg: 85, completed: true },
        ],
      },
    ],
    goals: [
      {
        id: 'goal_1',
        user_id: 'usr_foco_demo',
        goal_type: 'Carga',
        description: 'Alcançar 100kg no Supino Reto com técnica perfeita',
        priority: 1,
        target_date: '2026-12-31',
        created_at: new Date().toISOString(),
      },
      {
        id: 'goal_2',
        user_id: 'usr_foco_demo',
        goal_type: 'Composição Corporal',
        description: 'Manter 84kg com 11% de gordura corporal',
        priority: 2,
        target_date: '2026-11-30',
        created_at: new Date().toISOString(),
      },
    ],
    measurements: [
      {
        id: 'meas_1',
        user_id: 'usr_foco_demo',
        measurement_type: 'Peso Corporal',
        value: 84.5,
        unit: 'kg',
        measured_at: new Date().toISOString(),
      },
      {
        id: 'meas_2',
        user_id: 'usr_foco_demo',
        measurement_type: 'Braço Contraído',
        value: 41.5,
        unit: 'cm',
        measured_at: new Date().toISOString(),
      },
    ],
    anamnesis: null,
  };
}

function getLocalDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) {
      const initial = getInitialLocalDatabase();
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return { ...getInitialLocalDatabase(), ...parsed, anamnesis: parsed.anamnesis ?? null };
  } catch {
    return getInitialLocalDatabase();
  }
}

function saveLocalDb(db: LocalDatabase): void {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch {
    // Ignore
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiBaseUrl = isStaticHost ? 'https://foco-api-xuj2.onrender.com' : '';
  const requestUrl = endpoint.startsWith('http') ? endpoint : apiBaseUrl + endpoint;

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    return data as T;
  } catch (err: any) {
    // Se a requisição falhar (como em um host estático), propaga para fallback
    throw err;
  }
}

export const api = {
  // Autenticação sempre validada pelo servidor; não criar contas locais falsas em produção.
  async register(payload: { email: string; password: string; full_name: string; experience_level?: string; current_weight_kg?: number; height_cm?: number }) {
    const res = await request<{ token: string; user: User; profile: Profile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(credentials: { email: string; password: string }) {
    const res = await request<{ token: string; user: User; profile: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...credentials, email: credentials.email.trim().toLowerCase() }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe() {
    return await request<{ user: User; profile: Profile }>('/api/auth/me');
  },

  async forgotPassword(_email: string) {
    throw new Error('A recuperação de senha por e-mail ainda não está configurada. Nenhuma senha foi alterada.');
  },

  async resetPassword(_payload: { token: string; new_password: string }) {
    throw new Error('A redefinição de senha só estará disponível após configurar a entrega segura de links por e-mail.');
  },

  async deleteAccount() {
    const result = await request<{ message: string }>('/api/auth/account', { method: 'DELETE' });
    removeStoredToken();
    return result;
  },

  async getProfile() {
    try {
      return await request<Profile>('/api/profile');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return getLocalDb().profile;
    }
  },

  async updateProfile(updates: Partial<Profile>) {
    try {
      return await request<Profile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      db.profile = { ...db.profile, ...updates };
      saveLocalDb(db);
      return db.profile;
    }
  },

  // Athlete anamnesis (server-persisted; demo mode stores only in this browser).
  async getAnamnesis(): Promise<Anamnesis | null> {
    try {
      return await request<Anamnesis | null>('/api/anamnesis');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return getLocalDb().anamnesis ?? null;
    }
  },

  async saveAnamnesis(payload: Omit<Anamnesis, 'updated_at'>): Promise<Anamnesis> {
    try {
      return await request<Anamnesis>('/api/anamnesis', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const saved: Anamnesis = { ...payload, updated_at: new Date().toISOString() };
      const db = getLocalDb();
      db.anamnesis = saved;
      saveLocalDb(db);
      return saved;
    }
  },

  // Goals
  async getGoals() {
    try {
      return await request<Goal[]>('/api/goals');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return getLocalDb().goals;
    }
  },

  async addGoal(goal: { goal_type: string; description: string; priority: number; target_date?: string }) {
    try {
      return await request<Goal>('/api/goals', {
        method: 'POST',
        body: JSON.stringify(goal),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      const newGoal: Goal = {
        id: 'goal_' + Date.now(),
        user_id: db.user.id,
        goal_type: goal.goal_type,
        description: goal.description,
        priority: goal.priority,
        target_date: goal.target_date,
        created_at: new Date().toISOString(),
      };
      db.goals.push(newGoal);
      saveLocalDb(db);
      return newGoal;
    }
  },

  async deleteGoal(id: string) {
    try {
      return await request<{ message: string }>(`/api/goals/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      db.goals = db.goals.filter((g) => g.id !== id);
      saveLocalDb(db);
      return { message: 'Objetivo removido' };
    }
  },

  // Workout Plans
  async getWorkouts() {
    try {
      return await request<WorkoutPlan[]>('/api/workouts');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return getLocalDb().workouts;
    }
  },

  async getActiveWorkout() {
    try {
      return await request<WorkoutPlan | null>('/api/workouts/active');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      return db.workouts.find((w) => w.status === 'ativo') || db.workouts[0] || null;
    }
  },

  async createWorkout(plan: {
    name: string;
    version?: number;
    goal: string;
    weekly_frequency: number;
    status?: 'ativo' | 'inativo' | 'rascunho';
    exercises: WorkoutExercise[];
  }) {
    try {
      return await request<WorkoutPlan>('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(plan),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      const newPlan: WorkoutPlan = {
        id: 'plan_' + Date.now(),
        user_id: db.user.id,
        name: plan.name,
        version: plan.version || 1,
        goal: plan.goal,
        weekly_frequency: plan.weekly_frequency,
        status: plan.status || 'ativo',
        created_at: new Date().toISOString(),
        exercises: plan.exercises,
      };
      if (newPlan.status === 'ativo') {
        db.workouts.forEach((w) => { w.status = 'inativo'; });
      }
      db.workouts.unshift(newPlan);
      saveLocalDb(db);
      return newPlan;
    }
  },

  async activateWorkout(id: string) {
    try {
      return await request<{ message: string }>(`/api/workouts/${id}/activate`, { method: 'PUT' });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      db.workouts.forEach((w) => {
        w.status = w.id === id ? 'ativo' : 'inativo';
      });
      saveLocalDb(db);
      return { message: 'Plano ativado com sucesso' };
    }
  },

  async deleteWorkout(id: string) {
    try {
      return await request<{ message: string }>(`/api/workouts/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      db.workouts = db.workouts.filter((w) => w.id !== id);
      saveLocalDb(db);
      return { message: 'Plano excluído com sucesso' };
    }
  },

  // Sessions
  async getSessions() {
    try {
      return await request<WorkoutSession[]>('/api/sessions');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return getLocalDb().sessions;
    }
  },

  async recordSession(session: {
    plan_id?: string;
    plan_name?: string;
    started_at: string;
    finished_at?: string;
    duration_seconds: number;
    notes?: string;
    status?: 'in_progress' | 'completed' | 'cancelled';
    sets: { exercise_name: string; set_number: number; repetitions: number; load_kg: number; completed: boolean }[];
  }) {
    try {
      return await request<WorkoutSession>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      const newSession: WorkoutSession = {
        id: 'sess_' + Date.now(),
        user_id: db.user.id,
        plan_id: session.plan_id,
        plan_name: session.plan_name || 'Treino Livre',
        started_at: session.started_at,
        finished_at: session.finished_at,
        duration_seconds: session.duration_seconds,
        status: session.status || 'completed',
        notes: session.notes,
        sets: session.sets.map((s, idx) => ({
          id: 'set_' + idx + '_' + Date.now(),
          exercise_name: s.exercise_name,
          set_number: s.set_number,
          repetitions: s.repetitions,
          load_kg: s.load_kg,
          completed: s.completed,
        })),
      };
      db.sessions.unshift(newSession);
      saveLocalDb(db);
      return newSession;
    }
  },

  // Measurements
  async getMeasurements() {
    try {
      return await request<BodyMeasurement[]>('/api/measurements');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return getLocalDb().measurements;
    }
  },

  async addMeasurement(measurement: { measurement_type: string; value: number; unit?: string; measured_at?: string }) {
    try {
      return await request<BodyMeasurement>('/api/measurements', {
        method: 'POST',
        body: JSON.stringify(measurement),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      const newM: BodyMeasurement = {
        id: 'meas_' + Date.now(),
        user_id: db.user.id,
        measurement_type: measurement.measurement_type,
        value: measurement.value,
        unit: measurement.unit || 'kg',
        measured_at: measurement.measured_at || new Date().toISOString(),
      };
      db.measurements.push(newM);
      saveLocalDb(db);
      return newM;
    }
  },

  async deleteMeasurement(id: string) {
    try {
      return await request<{ message: string }>(`/api/measurements/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      const db = getLocalDb();
      db.measurements = db.measurements.filter((m) => m.id !== id);
      saveLocalDb(db);
      return { message: 'Medida removida' };
    }
  },

  // Files
  async getFiles() {
    try {
      return await request<UploadedFile[]>('/api/files');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return [];
    }
  },

  async deleteFile(id: string) {
    try {
      return await request<{ message: string }>(`/api/files/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return { message: 'Arquivo removido' };
    }
  },

  // AI with Gemini 2.5 Flash
  async generateAiWorkout(payload: {
    goal: string;
    experience_level: string;
    weekly_frequency: number;
    focus_muscles?: string;
    equipment_available?: string;
    restrictions?: string;
  }) {
    return await request<{
      name: string;
      goal: string;
      weekly_frequency: number;
      explanation: string;
      exercises: WorkoutExercise[];
    }>('/api/ai/generate-workout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async extractWorkoutFromSheet(payload: {
    base64: string;
    mime_type: string;
    filename?: string;
    notes?: string;
  }) {
    if (!payload.mime_type || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(payload.mime_type)) {
      throw new Error('Formato não suportado. Envie PDF, JPG, PNG ou WebP.');
    }
    if (!payload.base64 || payload.base64.length > 15_000_000) {
      throw new Error('Arquivo vazio ou muito grande. O limite de processamento é 10 MB.');
    }
    return await request<{
      plan_name: string;
      goal: string;
      weekly_frequency: number;
      confidence_notes: string;
      extracted_exercises: WorkoutExercise[];
    }>('/api/ai/extract-sheet', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async analyzeBioimpedanceReport(payload: { base64: string; mime_type: string; context?: string }) {
    if (!payload.mime_type || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(payload.mime_type)) {
      throw new Error('Formato não suportado. Envie PDF, JPG, PNG ou WebP.');
    }
    if (!payload.base64 || payload.base64.length > 15_000_000) {
      throw new Error('Arquivo vazio ou muito grande. O limite é 10 MB.');
    }
    return await request<{
      summary: string;
      metrics: { name: string; value: string; interpretation: string }[];
      strengths: string[];
      attention_points: string[];
      training_recommendations: string[];
      nutrition_discussion: string[];
      questions_for_professional: string[];
      limitations: string;
    }>('/api/ai/analyze-bioimpedance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reviewProgression(payload: { review_interval_days: number; user_feedback?: string }) {
    return await request<{
      recommendation_id: string;
      review_interval_days: number;
      explanation: string;
      progression_summary: {
        strength_delta: string;
        volume_analysis: string;
        focus_adjustments: string;
      };
      proposed_plan: {
        name: string;
        goal: string;
        weekly_frequency: number;
        exercises: WorkoutExercise[];
      };
    }>('/api/ai/review-progression', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRecommendations() {
    try {
      return await request<AIRecommendation[]>('/api/recommendations');
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return [];
    }
  },

  async updateRecommendationStatus(id: string, status: 'approved' | 'rejected') {
    try {
      return await request<{ message: string }>(`/api/recommendations/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      if (!isStaticHost || !getStoredToken()?.startsWith('token_local_demo_')) throw error;
      return { message: 'Status atualizado com sucesso' };
    }
  },

  // System
  async getSystemStatus() {
    if (isStaticHost) {
      return {
        app: 'FOCO Fitness Premium',
        version: '1.0.0-demo',
        ai_status: 'Indisponível: backend não conectado',
        database: 'Armazenamento local deste navegador (demonstração)',
        supabase_sync_available: false,
        timestamp: new Date().toISOString(),
      };
    }
    return await request<{
      app: string;
      version: string;
      ai_status: string;
      database: string;
      supabase_sync_available: boolean;
      timestamp: string;
    }>('/api/system/status');
  },


};
