import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, getDatabaseStorageStatus } from './server/db.js';
import { generateAiWorkout, extractWorkoutFromSheet, reviewProgressionCycle, analyzeBioimpedanceReport } from './server/gemini.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET ausente ou fraco. Configure um segredo aleatório de pelo menos 32 caracteres no ambiente do servidor.');
}

// Restrict browser API access to the FOCO frontend and allow JSON/auth headers.
const allowedOrigins = new Set([
  'https://vineribeiro.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// Bound request bodies: sheet processing accepts files up to 10 MB before base64 encoding.
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// When the remote durable store is enabled, do not acknowledge a mutating request
// until its queued snapshot write has completed. Reads stay available for diagnosis.
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  res.json = ((body?: any) => {
    if (!db.isRemoteStorageReady() || req.method === 'GET' || req.method === 'OPTIONS') {
      return originalJson(body);
    }
    void db.flushRemote()
      .then(() => originalJson(body))
      .catch((error) => {
        console.error('[FOCO DB] Could not confirm remote persistence before responding:', error);
        if (res.headersSent) return;
        originalStatus(503);
        originalJson({
          error: 'O banco persistente não confirmou a gravação. Nenhuma confirmação de salvamento foi emitida. ' +
            'Tente novamente em instantes. Detalhe: ' +
            (error instanceof Error ? error.message : String(error)),
        });
      });
    return res;
  }) as Response['json'];
  next();
});

// Extend Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Authentication Middleware
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessão não autorizada ou token ausente' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado no armazenamento do servidor. Verifique a persistência dos dados antes de criar outra conta.',
      });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token de autenticação expirado ou inválido' });
  }
}

// ==============================================================================
// AUTHENTICATION ROUTES
// ==============================================================================

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { password, full_name, experience_level, current_weight_kg, height_cm } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Nome completo, e-mail e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado no FOCO' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = db.createUser({
      email,
      password_hash,
      full_name,
    });

    if (experience_level || current_weight_kg || height_cm) {
      db.updateProfile(user.id, {
        experience_level: experience_level || 'iniciante',
        current_weight_kg: Number(current_weight_kg) || 75,
        height_cm: Number(height_cm) || 175,
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    const profile = db.getProfile(user.id);

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      profile,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Erro ao criar conta no servidor' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    const profile = db.getProfile(user.id);

    return res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      profile,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro ao autenticar usuário' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = db.findUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const profile = db.getProfile(user.id);
  return res.json({
    user: { id: user.id, email: user.email, full_name: user.full_name },
    profile,
  });
});

app.post('/api/auth/forgot-password', (_req: Request, res: Response) => {
  // No token is ever returned to the browser. Until a verified email delivery
  // provider is configured, recovery is intentionally unavailable.
  return res.status(501).json({
    error: 'A recuperação por e-mail ainda não está configurada. Nenhuma senha foi alterada.',
  });
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Token válido e senha de no mínimo 6 dígitos são necessários' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; type?: string };
    if (decoded.type !== 'reset' || !decoded.id) {
      return res.status(400).json({ error: 'Token de recuperação inválido' });
    }
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const updated = db.updateUserPassword(user.id, await bcrypt.hash(new_password, 10));
    if (!updated) {
      return res.status(404).json({ error: 'Não foi possível salvar a nova senha para esta conta.' });
    }
    return res.json({ message: 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.' });
  } catch (err) {
    return res.status(400).json({ error: 'Link de redefinição expirado ou inválido' });
  }
});

app.delete('/api/auth/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const deleted = db.deleteUser(userId);
  if (deleted) {
    return res.json({ message: 'Conta e todos os dados excluídos com sucesso' });
  }
  return res.status(404).json({ error: 'Falha ao excluir conta' });
});

// ==============================================================================
// PROFILES & GOALS
// ==============================================================================

app.get('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = db.getProfile(req.user!.id);
  return res.json(profile || {});
});

app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const updated = db.updateProfile(userId, req.body);
  return res.json(updated);
});

app.get('/api/anamnesis', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getAnamnesis(req.user!.id) || null);
});

app.put('/api/anamnesis', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const body: any = req.body || {};
  const asText = (value: unknown, max = 500): string =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';
  const asList = (value: unknown, max = 10): string[] =>
    Array.isArray(value)
      ? value.filter((item: unknown): item is string => typeof item === 'string')
          .slice(0, max).map((item: string) => item.trim().slice(0, 80)).filter(Boolean)
      : [];

  const primary_goal = asText(body.primary_goal, 120);
  const weekly_frequency = Number(body.weekly_frequency);
  const session_minutes = Number(body.session_minutes);
  const pain_or_injuries = asText(body.pain_or_injuries, 1200);
  const health_notes = asText(body.health_notes, 1200);
  const consent_health_data = body.consent_health_data === true;

  if (!primary_goal) {
    return res.status(400).json({ error: 'Selecione o objetivo principal.' });
  }
  if (!Number.isInteger(weekly_frequency) || weekly_frequency < 2 || weekly_frequency > 7) {
    return res.status(400).json({ error: 'A frequência deve ser de 2 a 7 dias por semana.' });
  }
  if (!Number.isInteger(session_minutes) || session_minutes < 20 || session_minutes > 180) {
    return res.status(400).json({ error: 'O tempo por sessão deve ficar entre 20 e 180 minutos.' });
  }
  if ((pain_or_injuries || health_notes) && !consent_health_data) {
    return res.status(400).json({ error: 'Para salvar informações de saúde, autorize explicitamente seu uso para personalizar o treino.' });
  }

  const saved = db.saveAnamnesis(req.user!.id, {
    primary_goal,
    goal_details: asText(body.goal_details, 1200),
    training_age: asText(body.training_age, 80),
    activity_level: asText(body.activity_level, 80),
    weekly_frequency,
    session_minutes,
    preferred_days: asList(body.preferred_days, 7),
    priority_muscles: asList(body.priority_muscles, 10),
    equipment_available: asList(body.equipment_available, 12),
    current_routine: asText(body.current_routine, 1200),
    exercise_preferences: asText(body.exercise_preferences, 1200),
    pain_or_injuries,
    health_notes,
    sleep_quality: asText(body.sleep_quality, 80),
    cardio_habits: asText(body.cardio_habits, 500),
    consent_health_data,
  });
  return res.json(saved);
});

app.get('/api/goals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const goals = db.getGoals(req.user!.id);
  return res.json(goals);
});

app.post('/api/goals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { goal_type, description, priority, target_date } = req.body;
  if (!goal_type) {
    return res.status(400).json({ error: 'Tipo de meta é obrigatório' });
  }
  const newGoal = db.addGoal({
    user_id: req.user!.id,
    goal_type,
    description: description || '',
    priority: Number(priority) || 1,
    target_date,
  });
  return res.status(201).json(newGoal);
});

app.delete('/api/goals/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteGoal(req.user!.id, req.params.id);
  if (success) {
    return res.json({ message: 'Meta removida com sucesso' });
  }
  return res.status(404).json({ error: 'Meta não encontrada' });
});

// ==============================================================================
// WORKOUT PLANS & EXERCISES
// ==============================================================================

app.get('/api/workouts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const plans = db.getWorkoutPlans(req.user!.id);
  return res.json(plans);
});

app.get('/api/workouts/active', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const activePlan = db.getActiveWorkoutPlan(req.user!.id);
  return res.json(activePlan || null);
});

app.post('/api/workouts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, version, goal, weekly_frequency, status, exercises } = req.body;
  if (!name || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'Nome do plano e lista de exercícios são obrigatórios' });
  }

  const newPlan = db.createWorkoutPlan(
    req.user!.id,
    {
      name,
      version: Number(version) || 1,
      goal: goal || 'Hipertrofia',
      weekly_frequency: Number(weekly_frequency) || 4,
      status: status || 'ativo',
    },
    exercises.map((e: any) => ({
      exercise_name: e.exercise_name || 'Exercício',
      muscle_group: e.muscle_group || 'Geral',
      sets: Number(e.sets) || 3,
      reps_min: Number(e.reps_min) || 8,
      reps_max: Number(e.reps_max) || 12,
      rest_seconds: Number(e.rest_seconds) || 60,
      suggested_load_kg: Number(e.suggested_load_kg) || 0,
      notes: e.notes || '',
    }))
  );

  return res.status(201).json(newPlan);
});

app.put('/api/workouts/:id/activate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.activateWorkoutPlan(req.user!.id, req.params.id);
  if (success) {
    return res.json({ message: 'Ficha de treino ativada com sucesso!' });
  }
  return res.status(404).json({ error: 'Ficha de treino não encontrada' });
});

app.delete('/api/workouts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteWorkoutPlan(req.user!.id, req.params.id);
  if (success) {
    return res.json({ message: 'Ficha excluída com sucesso' });
  }
  return res.status(404).json({ error: 'Ficha não encontrada' });
});

// ==============================================================================
// WORKOUT SESSIONS & EXERCISE SETS
// ==============================================================================

app.get('/api/sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessions = db.getWorkoutSessions(req.user!.id);
  return res.json(sessions);
});

app.post('/api/sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { plan_id, plan_name, started_at, finished_at, duration_seconds, notes, status, sets } = req.body;

  const session = db.createWorkoutSession(
    req.user!.id,
    {
      plan_id,
      plan_name,
      started_at: started_at || new Date().toISOString(),
      finished_at: finished_at || new Date().toISOString(),
      duration_seconds: Number(duration_seconds) || 0,
      status: status || 'completed',
      notes: notes || '',
    },
    Array.isArray(sets)
      ? sets.map((s: any) => ({
          exercise_name: s.exercise_name,
          set_number: Number(s.set_number) || 1,
          repetitions: Number(s.repetitions) || 10,
          load_kg: Number(s.load_kg) || 0,
          completed: s.completed !== undefined ? Boolean(s.completed) : true,
        }))
      : []
  );

  return res.status(201).json(session);
});

// ==============================================================================
// BODY MEASUREMENTS & CHARTS
// ==============================================================================

app.get('/api/measurements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const measurements = db.getMeasurements(req.user!.id);
  return res.json(measurements);
});

app.post('/api/measurements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { measurement_type, value, unit, measured_at } = req.body;
  if (!measurement_type || value === undefined) {
    return res.status(400).json({ error: 'Tipo e valor da medida são obrigatórios' });
  }

  const measurement = db.addMeasurement({
    user_id: req.user!.id,
    measurement_type,
    value: Number(value),
    unit: unit || 'kg',
    measured_at: measured_at || new Date().toISOString(),
  });

  return res.status(201).json(measurement);
});

app.delete('/api/measurements/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteMeasurement(req.user!.id, req.params.id);
  if (success) {
    return res.json({ message: 'Medida removida' });
  }
  return res.status(404).json({ error: 'Medida não encontrada' });
});

// ==============================================================================
// UPLOADED FILES & OCR / PDF PARSING
// ==============================================================================

app.get('/api/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const files = db.getUploadedFiles(req.user!.id);
  return res.json(files);
});

app.post('/api/files', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  // This endpoint previously saved metadata only, not the uploaded file bytes.
  // Do not claim a file is stored until private object storage is configured.
  return res.status(501).json({
    error: 'Armazenamento de arquivos não está configurado. Use a análise de ficha, que processa o arquivo sem prometer armazenamento do original.',
  });
});

app.delete('/api/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteUploadedFile(req.user!.id, req.params.id);
  if (success) {
    return res.json({ message: 'Arquivo removido' });
  }
  return res.status(404).json({ error: 'Arquivo não encontrado' });
});

// ==============================================================================
// ARTIFICIAL INTELLIGENCE (GEMINI 2.5 FLASH)
// ==============================================================================

app.post('/api/ai/generate-workout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = db.getProfile(userId);
    const anamnesis = db.getAnamnesis(userId);
    const { goal, experience_level, weekly_frequency, focus_muscles, equipment_available, restrictions } = req.body || {};
    const healthContext = anamnesis?.consent_health_data
      ? [anamnesis.pain_or_injuries, anamnesis.health_notes].filter(Boolean).join('; ')
      : '';
    const trainingAgeExperience = anamnesis?.training_age === 'Nunca treinei' || anamnesis?.training_age === 'Menos de 6 meses'
      ? 'iniciante'
      : anamnesis?.training_age === '3 anos ou mais'
        ? 'avancado'
        : 'intermediario';

    const plan = await generateAiWorkout({
      goal: goal || anamnesis?.primary_goal || 'Hipertrofia Máxima',
      experience_level: experience_level || profile?.experience_level || trainingAgeExperience,
      weekly_frequency: Number(weekly_frequency) || anamnesis?.weekly_frequency || 4,
      focus_muscles: focus_muscles || anamnesis?.priority_muscles?.join(', ') || 'Corpo inteiro com distribuição equilibrada',
      equipment_available: equipment_available || anamnesis?.equipment_available?.join(', ') || 'Academia completa',
      restrictions: [restrictions, healthContext].filter(Boolean).join('; ') || undefined,
      current_weight_kg: profile?.current_weight_kg,
      anamnesis: anamnesis ? {
        goal_details: anamnesis.goal_details,
        training_age: anamnesis.training_age,
        activity_level: anamnesis.activity_level,
        preferred_days: anamnesis.preferred_days,
        session_minutes: anamnesis.session_minutes,
        priority_muscles: anamnesis.priority_muscles,
        equipment_available: anamnesis.equipment_available,
        current_routine: anamnesis.current_routine,
        exercise_preferences: anamnesis.exercise_preferences,
        pain_or_injuries: anamnesis.consent_health_data ? anamnesis.pain_or_injuries : '',
        health_notes: anamnesis.consent_health_data ? anamnesis.health_notes : '',
        sleep_quality: anamnesis.sleep_quality,
        cardio_habits: anamnesis.cardio_habits,
      } : undefined,
    });

    return res.json(plan);
  } catch (error: any) {
    console.error('Error in AI workout generation:', error);
    return res.status(500).json({ error: error.message || 'Erro ao gerar ficha com inteligência artificial' });
  }
});

app.post('/api/ai/extract-sheet', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { base64, mime_type, filename, notes } = req.body;
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (typeof base64 !== 'string' || base64.length === 0 || base64.length > 15_000_000) {
      return res.status(413).json({ error: 'Arquivo ausente ou acima do limite de 10 MB.' });
    }
    if (!allowedMimeTypes.includes(mime_type)) {
      return res.status(415).json({ error: 'Formato não suportado. Envie PDF, JPG, PNG ou WebP.' });
    }
    if (!/^data:(application\/pdf|image\/(jpeg|png|webp));base64,/.test(base64)) {
      return res.status(400).json({ error: 'Conteúdo do arquivo inválido.' });
    }

    const extracted = await extractWorkoutFromSheet(base64, mime_type, notes);

    // Save record to uploaded_files
    db.addUploadedFile({
      user_id: req.user!.id,
      filename: filename || 'ficha_treino.jpg',
      storage_path: 'processed-data-only/' + path.basename(String(filename || 'ficha_treino.jpg')),
      mime_type: mime_type || 'image/jpeg',
      processing_status: 'processed',
      extracted_data: extracted,
    });

    return res.json(extracted);
  } catch (error: any) {
    console.error('Error in AI sheet extraction:', error);
    return res.status(500).json({ error: error.message || 'Falha ao processar a ficha de treino enviada' });
  }
});

app.post('/api/ai/analyze-bioimpedance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { base64, mime_type, context } = req.body;
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (typeof base64 !== 'string' || base64.length === 0 || base64.length > 15_000_000) {
      return res.status(413).json({ error: 'Arquivo ausente ou acima do limite de 10 MB.' });
    }
    if (!allowedMimeTypes.includes(mime_type) || !new RegExp('^data:(application/pdf|image/(jpeg|png|webp));base64,').test(base64)) {
      return res.status(415).json({ error: 'Formato inválido. Envie PDF, JPG, PNG ou WebP.' });
    }
    const report = await analyzeBioimpedanceReport(base64, mime_type, context);
    return res.json(report);
  } catch (error: any) {
    console.error('Error analyzing bioimpedance report:', error);
    return res.status(500).json({ error: error.message || 'Falha ao analisar relatório metabólico.' });
  }
});

app.post('/api/ai/review-progression', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { review_interval_days = 15, user_feedback } = req.body;

    const currentPlan = db.getActiveWorkoutPlan(userId);
    if (!currentPlan) {
      return res.status(400).json({ error: 'Você precisa ter uma ficha ativa para realizar o ciclo de revisão de 15/30 dias.' });
    }

    const sessions = db.getWorkoutSessions(userId);

    const review = await reviewProgressionCycle({
      current_plan: currentPlan,
      workout_sessions: sessions,
      review_interval_days: Number(review_interval_days),
      user_feedback,
    });

    // Save recommendation to database
    const rec = db.addRecommendation({
      user_id: userId,
      previous_plan_id: currentPlan.id,
      review_interval_days: Number(review_interval_days),
      explanation: review.explanation,
      status: 'pending',
      proposed_plan: review.proposed_plan,
    });

    return res.json({
      recommendation_id: rec.id,
      ...review,
    });
  } catch (error: any) {
    console.error('Error in progression review:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar ciclo de revisão de treino' });
  }
});

// ==============================================================================
// AI RECOMMENDATIONS
// ==============================================================================

app.get('/api/recommendations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const recommendations = db.getRecommendations(req.user!.id);
  return res.json(recommendations);
});

app.post('/api/recommendations/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status deve ser approved ou rejected' });
  }

  const success = db.updateRecommendationStatus(req.user!.id, req.params.id, status);
  if (success) {
    return res.json({ message: status === 'approved' ? 'Plano aprovado e ativado com sucesso!' : 'Proposta recusada' });
  }
  return res.status(404).json({ error: 'Recomendação não encontrada' });
});

// ==============================================================================
// SYSTEM & CONFIG STATUS
// ==============================================================================

app.get('/api/system/status', (_req: Request, res: Response) => {
  const storage = getDatabaseStorageStatus();
  return res.json({
    app: 'FOCO',
    version: '1.2.0',
    ai_status: process.env.GEMINI_API_KEY ? 'configured' : 'missing_key',
    database: storage.engine,
    storage_persistent: storage.remoteStorageReady || storage.persistentDiskConfigured,
    storage_file_exists: storage.fileExists,
    remote_storage_configured: storage.remoteStorageConfigured,
    remote_storage_ready: storage.remoteStorageReady,
    remote_storage_error: storage.remoteStorageError,
    supabase_sync_available: storage.remoteStorageReady,
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// VITE DEV SERVER MIDDLEWARE & STATIC ASSET SERVING
// ==============================================================================

async function startServer() {
  await db.initializeRemote();
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FOCO Engine] Servidor ativo e pronto na porta ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha crítica ao iniciar servidor FOCO:', err);
  process.exit(1);
});
