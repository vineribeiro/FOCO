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
} from '../types';

const TOKEN_KEY = 'foco_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
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
      body: JSON.stringify(credentials),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe() {
    return request<{ user: User; profile: Profile }>('/api/auth/me');
  },

  async forgotPassword(email: string) {
    return request<{ message: string; reset_token?: string; demo_instructions?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(payload: { token: string; new_password: string }) {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteAccount() {
    const res = await request<{ message: string }>('/api/auth/account', {
      method: 'DELETE',
    });
    removeStoredToken();
    return res;
  },

  // Profile
  async getProfile() {
    return request<Profile>('/api/profile');
  },

  async updateProfile(updates: Partial<Profile>) {
    return request<Profile>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Goals
  async getGoals() {
    return request<Goal[]>('/api/goals');
  },

  async addGoal(goal: { goal_type: string; description: string; priority: number; target_date?: string }) {
    return request<Goal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  },

  async deleteGoal(id: string) {
    return request<{ message: string }>(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  },

  // Workout Plans
  async getWorkouts() {
    return request<WorkoutPlan[]>('/api/workouts');
  },

  async getActiveWorkout() {
    return request<WorkoutPlan | null>('/api/workouts/active');
  },

  async createWorkout(plan: {
    name: string;
    version?: number;
    goal: string;
    weekly_frequency: number;
    status?: 'ativo' | 'inativo' | 'rascunho';
    exercises: WorkoutExercise[];
  }) {
    return request<WorkoutPlan>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },

  async activateWorkout(id: string) {
    return request<{ message: string }>(`/api/workouts/${id}/activate`, {
      method: 'PUT',
    });
  },

  async deleteWorkout(id: string) {
    return request<{ message: string }>(`/api/workouts/${id}`, {
      method: 'DELETE',
    });
  },

  // Sessions
  async getSessions() {
    return request<WorkoutSession[]>('/api/sessions');
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
    return request<WorkoutSession>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  // Measurements
  async getMeasurements() {
    return request<BodyMeasurement[]>('/api/measurements');
  },

  async addMeasurement(measurement: { measurement_type: string; value: number; unit?: string; measured_at?: string }) {
    return request<BodyMeasurement>('/api/measurements', {
      method: 'POST',
      body: JSON.stringify(measurement),
    });
  },

  async deleteMeasurement(id: string) {
    return request<{ message: string }>(`/api/measurements/${id}`, {
      method: 'DELETE',
    });
  },

  // Files
  async getFiles() {
    return request<UploadedFile[]>('/api/files');
  },

  async deleteFile(id: string) {
    return request<{ message: string }>(`/api/files/${id}`, {
      method: 'DELETE',
    });
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
    return request<{
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
    return request<{
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

  async reviewProgression(payload: { review_interval_days: number; user_feedback?: string }) {
    return request<{
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

  // AI Recommendations
  async getRecommendations() {
    return request<AIRecommendation[]>('/api/recommendations');
  },

  async updateRecommendationStatus(id: string, status: 'approved' | 'rejected') {
    return request<{ message: string }>(`/api/recommendations/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // System
  async getSystemStatus() {
    return request<{
      app: string;
      version: string;
      ai_status: string;
      database: string;
      supabase_sync_available: boolean;
      timestamp: string;
    }>('/api/system/status');
  },
};
