import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { generateAiWorkout, extractWorkoutFromSheet, reviewProgressionCycle } from './server/gemini.js';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'foco_super_secret_jwt_key_musculacao_2026';

// Allow payload sizes up to 50MB for uploading workout sheet images / PDF base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
      return res.status(401).json({ error: 'Usuário não encontrado' });
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
    const { email, password, full_name, experience_level, current_weight_kg, height_cm } = req.body;

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
    const { email, password } = req.body;

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

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    // Return friendly generic message for security
    return res.json({ message: 'Se o e-mail estiver cadastrado, as instruções de redefinição foram emitidas.' });
  }
  // Simulated token for password recovery
  const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
  return res.json({
    message: 'Código de recuperação gerado com sucesso.',
    reset_token: resetToken,
    demo_instructions: 'Utilize este código para redefinir sua senha com segurança.',
  });
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Token válido e senha de no mínimo 6 dígitos são necessários' });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    user.password_hash = await bcrypt.hash(new_password, 10);
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

app.post('/api/files', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { filename, storage_path, mime_type, processing_status, extracted_data } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
  }

  const newFile = db.addUploadedFile({
    user_id: req.user!.id,
    filename,
    storage_path: storage_path || 'uploads/' + filename,
    mime_type: mime_type || 'application/octet-stream',
    processing_status: processing_status || 'processed',
    extracted_data,
  });

  return res.status(201).json(newFile);
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
    const profile = db.getProfile(req.user!.id);
    const { goal, experience_level, weekly_frequency, focus_muscles, equipment_available, restrictions } = req.body;

    const plan = await generateAiWorkout({
      goal: goal || 'Hipertrofia Máxima',
      experience_level: experience_level || profile?.experience_level || 'intermediario',
      weekly_frequency: Number(weekly_frequency) || 4,
      focus_muscles,
      equipment_available,
      restrictions,
      current_weight_kg: profile?.current_weight_kg,
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
    if (!base64) {
      return res.status(400).json({ error: 'Arquivo base64 não fornecido' });
    }

    const extracted = await extractWorkoutFromSheet(base64, mime_type || 'image/jpeg', notes);

    // Save record to uploaded_files
    db.addUploadedFile({
      user_id: req.user!.id,
      filename: filename || 'ficha_treino.jpg',
      storage_path: 'uploads/' + (filename || 'ficha_treino.jpg'),
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

app.get('/api/system/status', (req: Request, res: Response) => {
  return res.json({
    app: 'FOCO',
    version: '1.0.0',
    ai_status: Boolean(process.env.GEMINI_API_KEY) ? 'configured' : 'missing_key',
    database: 'persistent_relational_engine',
    supabase_sync_available: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// VITE DEV SERVER MIDDLEWARE & STATIC ASSET SERVING
// ==============================================================================

async function startServer() {
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
