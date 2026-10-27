export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Profile {
  id: string;
  full_name: string;
  birth_date?: string;
  height_cm?: number;
  current_weight_kg?: number;
  experience_level?: 'iniciante' | 'intermediario' | 'avancado';
  created_at?: string;
  updated_at?: string;
}

export interface Anamnesis {
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
  updated_at?: string;
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
  id?: string;
  plan_id?: string;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  suggested_load_kg: number;
  notes?: string;
  /** Optional weekday assignment; null means this legacy/general exercise can appear on any workout day. */
  training_day?: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo' | null;
  position?: number;
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
  id?: string;
  session_id?: string;
  exercise_name: string;
  set_number: number;
  repetitions: number;
  load_kg: number;
  completed: boolean;
  created_at?: string;
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
  proposed_plan?: Partial<WorkoutPlan> & { exercises?: Partial<WorkoutExercise>[] };
}
