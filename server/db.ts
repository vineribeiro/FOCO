import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'foco_persistent_store.json');

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
};

class FocoDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        if (parsed.users.length === 0) {
          this.seedDemoData(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading persistent db, creating fresh store:', err);
    }
    this.persist(INITIAL_DB);
    const db = JSON.parse(JSON.stringify(INITIAL_DB));
    this.seedDemoData(db);
    return db;
  }

  private seedDemoData(data: DatabaseSchema) {
    if (data.users.length > 0) return;
    const demoId = 'foco-user-demo-001';
    const passHash = bcrypt.hashSync('foco1234', 8);

    const now = new Date();
    const createdDate = new Date(now.getTime() - 25 * 86400000).toISOString();

    data.users.push({
      id: demoId,
      email: 'atleta@foco.app',
      password_hash: passHash,
      full_name: 'Vinícius Oliveira',
      created_at: createdDate,
    });

    data.profiles.push({
      id: demoId,
      full_name: 'Vinícius Oliveira',
      birth_date: '1998-05-15',
      height_cm: 180,
      current_weight_kg: 82.5,
      experience_level: 'intermediario',
      created_at: createdDate,
      updated_at: new Date().toISOString(),
    });

    data.goals.push(
      {
        id: crypto.randomUUID(),
        user_id: demoId,
        goal_type: 'Hipertrofia',
        description: 'Ganho de massa magra com ênfase em peitoral e dorsais',
        priority: 1,
        target_date: new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0],
        created_at: createdDate,
      },
      {
        id: crypto.randomUUID(),
        user_id: demoId,
        goal_type: 'Força Máxima',
        description: 'Bater 100kg no Supino Reto para 8 repetições limpas',
        priority: 2,
        target_date: new Date(now.getTime() + 45 * 86400000).toISOString().split('T')[0],
        created_at: createdDate,
      }
    );

    // Initial weight progression
    data.body_measurements.push(
      { id: crypto.randomUUID(), user_id: demoId, measurement_type: 'peso', value: 80.2, unit: 'kg', measured_at: new Date(now.getTime() - 25 * 86400000).toISOString() },
      { id: crypto.randomUUID(), user_id: demoId, measurement_type: 'peso', value: 81.0, unit: 'kg', measured_at: new Date(now.getTime() - 18 * 86400000).toISOString() },
      { id: crypto.randomUUID(), user_id: demoId, measurement_type: 'peso', value: 81.8, unit: 'kg', measured_at: new Date(now.getTime() - 10 * 86400000).toISOString() },
      { id: crypto.randomUUID(), user_id: demoId, measurement_type: 'peso', value: 82.5, unit: 'kg', measured_at: new Date().toISOString() }
    );

    // Initial Workout Plan
    const planId = 'foco-plan-demo-001';
    data.workout_plans.push({
      id: planId,
      user_id: demoId,
      name: 'FOCO Hipertrofia ABC - Cargas Pesadas',
      version: 1,
      goal: 'Hipertrofia e Densidade Muscular',
      weekly_frequency: 4,
      status: 'ativo',
      created_at: createdDate,
      approved_at: createdDate,
    });

    const exercises = [
      { name: 'Supino Reto com Barra', group: 'Peito', sets: 4, rMin: 6, rMax: 10, rest: 90, load: 84, notes: 'Manter escápulas retraídas' },
      { name: 'Supino Inclinado com Halteres', group: 'Peito', sets: 3, rMin: 8, rMax: 12, rest: 75, load: 30, notes: 'Banco a 30 graus' },
      { name: 'Crucifixo na Polia Média', group: 'Peito', sets: 3, rMin: 12, rMax: 15, rest: 60, load: 17.5, notes: 'Foco no pico de contração' },
      { name: 'Tríceps Testa com Barra W', group: 'Tríceps', sets: 3, rMin: 8, rMax: 10, rest: 60, load: 32, notes: 'Cotovelos fechados' },
      { name: 'Tríceps Corda na Polia', group: 'Tríceps', sets: 3, rMin: 10, rMax: 12, rest: 45, load: 25, notes: 'Abrir a corda no final' },
      { name: 'Puxada Frontal Aberta', group: 'Costas', sets: 4, rMin: 8, rMax: 12, rest: 75, load: 65, notes: 'Depressão escapular firme' },
      { name: 'Remada Curvada com Barra', group: 'Costas', sets: 4, rMin: 6, rMax: 8, rest: 90, load: 75, notes: 'Tronco a 45 graus' },
      { name: 'Rosca Direta com Barra W', group: 'Bíceps', sets: 3, rMin: 8, rMax: 10, rest: 60, load: 30, notes: 'Sem balanço lombar' },
      { name: 'Agachamento Livre com Barra', group: 'Quadríceps', sets: 4, rMin: 6, rMax: 8, rest: 120, load: 100, notes: 'Profundidade paralela' },
      { name: 'Leg Press 45º', group: 'Quadríceps', sets: 3, rMin: 10, rMax: 12, rest: 90, load: 220, notes: 'Pés alinhados na largura dos ombros' },
      { name: 'Mesa Flexora', group: 'Posterior de Coxa', sets: 4, rMin: 10, rMax: 12, rest: 60, load: 50, notes: 'Controlar a descida em 3 segundos' },
      { name: 'Desenvolvimento com Halteres', group: 'Ombros', sets: 4, rMin: 8, rMax: 10, rest: 75, load: 24, notes: 'Não bater os halteres no topo' },
      { name: 'Elevação Lateral na Polia', group: 'Ombros', sets: 4, rMin: 12, rMax: 15, rest: 45, load: 10, notes: 'Cotovelo levemente flexionado' },
    ];

    exercises.forEach(ex => {
      data.workout_exercises.push({
        id: crypto.randomUUID(),
        plan_id: planId,
        exercise_name: ex.name,
        muscle_group: ex.group,
        sets: ex.sets,
        reps_min: ex.rMin,
        reps_max: ex.rMax,
        rest_seconds: ex.rest,
        suggested_load_kg: ex.load,
        notes: ex.notes,
      });
    });

    // Seed a couple completed sessions
    const s1Id = crypto.randomUUID();
    data.workout_sessions.push({
      id: s1Id,
      user_id: demoId,
      plan_id: planId,
      plan_name: 'Treino A - Peito e Tríceps',
      started_at: new Date(now.getTime() - 4 * 86400000).toISOString(),
      finished_at: new Date(now.getTime() - 4 * 86400000 + 3600000).toISOString(),
      duration_seconds: 3600,
      status: 'completed',
      notes: 'Ótima contração no supino. Carga subiu para 84kg sem falha prematura.',
    });
    data.exercise_sets.push(
      { id: crypto.randomUUID(), session_id: s1Id, exercise_name: 'Supino Reto com Barra', set_number: 1, repetitions: 10, load_kg: 80, completed: true, created_at: createdDate },
      { id: crypto.randomUUID(), session_id: s1Id, exercise_name: 'Supino Reto com Barra', set_number: 2, repetitions: 8, load_kg: 84, completed: true, created_at: createdDate },
      { id: crypto.randomUUID(), session_id: s1Id, exercise_name: 'Supino Inclinado com Halteres', set_number: 1, repetitions: 10, load_kg: 30, completed: true, created_at: createdDate }
    );

    const s2Id = crypto.randomUUID();
    data.workout_sessions.push({
      id: s2Id,
      user_id: demoId,
      plan_id: planId,
      plan_name: 'Treino B - Costas e Bíceps',
      started_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      finished_at: new Date(now.getTime() - 2 * 86400000 + 3400000).toISOString(),
      duration_seconds: 3400,
      status: 'completed',
      notes: 'Remada curvada muito sólida.',
    });

    // Seed recommendation for cycle review
    data.ai_recommendations.push({
      id: crypto.randomUUID(),
      user_id: demoId,
      previous_plan_id: planId,
      review_interval_days: 15,
      explanation: 'Ciclo de 15 dias concluído com sucesso. Análise biomecânica indica ganhos expressivos de força no peitoral (+4kg no Supino) e alta aderência semanal. Proposta de micro-ciclo com aumento de 2.5kg a 5kg e variação de ângulo nos isoladores para maximizar a hipertrofia miofibrilar.',
      status: 'pending',
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      proposed_plan: {
        name: 'FOCO Hipertrofia ABC - Evolução Ciclo 2',
        goal: 'Hipertrofia Acentuada com Sobrecarga Progressiva',
        weekly_frequency: 4,
        exercises: [
          { exercise_name: 'Supino Reto com Barra', muscle_group: 'Peito', sets: 4, reps_min: 6, reps_max: 8, rest_seconds: 90, suggested_load_kg: 88, notes: 'Sobrecarga +4kg' },
          { exercise_name: 'Supino Inclinado com Halteres', muscle_group: 'Peito', sets: 3, reps_min: 8, reps_max: 10, rest_seconds: 75, suggested_load_kg: 32, notes: 'Progressão de halteres' },
          { exercise_name: 'Remada Curvada com Barra', muscle_group: 'Costas', sets: 4, reps_min: 6, reps_max: 8, rest_seconds: 90, suggested_load_kg: 80, notes: 'Sobrecarga +5kg' },
          { exercise_name: 'Agachamento Livre com Barra', muscle_group: 'Quadríceps', sets: 4, reps_min: 6, reps_max: 8, rest_seconds: 120, suggested_load_kg: 105, notes: 'Sobrecarga +5kg' },
        ],
      },
    });

    this.persist(data);
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
      throw new Error('Não foi possível persistir os dados. A operação não pode ser confirmada.', { cause: err });
    }
  }

  // --- Users & Profiles ---
  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
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

  deleteUser(userId: string): boolean {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.data.profiles = this.data.profiles.filter(p => p.id !== userId);
    this.data.goals = this.data.goals.filter(g => g.user_id !== userId);
    
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
