import { FOCO_VISUAL_RELEASE } from '../utils/release';
import React, { useState, useEffect, useRef } from 'react';
import { FocoV6Status, FocoV6Segment } from '../components/FocoV6UI';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { useAuth } from '../context/AuthContext';
import { conciseWorkoutName } from '../utils/workoutTitles';
import { loadWorkoutDraft, saveWorkoutDraft, clearWorkoutDraft } from '../utils/workoutDraft';
import { api } from '../services/api';
import { AccessibleDialog } from '../components/AccessibleDialog';
import { createSessionRequestId, createSessionSubmission } from '../utils/sessionSubmission';
import type { SessionSubmission } from '../utils/sessionSubmission';
import { WorkoutPlan, WorkoutExercise, WorkoutSession } from '../types';
import { useRestTimer } from '../context/RestTimerContext';
import { soundEngine } from '../utils/soundEngine';
import { ExerciseExecutionGuide } from '../components/ExerciseExecutionGuide';
import { getPreferredTrainingDay, getTrainingDayLabel, savePreferredTrainingDay, TRAINING_DAYS, normalizeExerciseText } from '../data/exerciseLibrary';
import {
  Play,
  Pause,
  ArrowLeft,
  Minus,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Award,
  AlertCircle,
  Volume2,
  VolumeX,
  Flame,
  Zap,
  Timer,
  ChevronRight,
  Dumbbell,
  Share2,
  Download,
} from 'lucide-react';

interface ActiveSessionProps {
  setActiveTab: (tab: string) => void;
}

interface SetLog {
  set_number: number;
  repetitions: number;
  load_kg: number;
  completed: boolean;
  rpe?: number;
}

interface ExerciseLog {
  repdb_id?: string | null;
  track_load?: boolean;
  exercise_name: string;
  muscle_group: string;
  rest_seconds: number;
  sets: SetLog[];
}

const defaultTracksLoad = (name: string) => !/(abdominal|crunch|prancha|plank|flexão de braço|flexao de braco|burpee|polichinelo|elevação de pernas|elevacao de pernas|mountain climber)/i.test(name) || /(anilha|halter|peso|carga|máquina|maquina|cabo|polia)/i.test(name);

export const ActiveSessionPage: React.FC<ActiveSessionProps> = ({ setActiveTab }) => {
  const { user, profile } = useAuth();
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [v6SessionMode,setV6SessionMode]=useState('register');
  const [v7ManualExerciseIndex,setV7ManualExerciseIndex]=useState<number | null>(null);
  const [previousLoads, setPreviousLoads] = useState<Record<string, number>>({});
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Global Rest Timer Context
  const {
    isActive: restTimerActive,
    timeRemaining: restSecondsRemaining,
    totalDuration: restTotalDuration,
    isPaused: restIsPaused,
    isMuted,
    autoRestEnabled,
    setAutoRestEnabled,
    startTimer,
    pauseTimer,
    resumeTimer,
    skipTimer,
    addSeconds,
    toggleMute,
    testSound,
  } = useRestTimer();

  // Exercise state for the session
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [selectedTrainingDay, setSelectedTrainingDay] = useState<string>(() => {
    try {
      const chosen = sessionStorage.getItem('foco_next_training_day');
      if (chosen && TRAINING_DAYS.some(day => day.value === chosen)) return chosen;
    } catch { /* Preserve the existing selector when storage is restricted. */ }
    return getPreferredTrainingDay();
  });
  const [sessionNotes, setSessionNotes] = useState('');
  const [perceivedEffort, setPerceivedEffort] = useState('');
  const [sessionPerformance, setSessionPerformance] = useState('');
  const [sessionCompletedModal, setSessionCompletedModal] = useState<any | null>(null);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<SessionSubmission | null>(null);
  const submissionRef = useRef<SessionSubmission | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const sessionPlanIdRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);

  // Consumir a escolha somente depois da montagem evita perder o valor no
  // segundo render de inicialização do React StrictMode.
  useEffect(() => {
    try { sessionStorage.removeItem('foco_next_training_day'); } catch { /* Sem armazenamento persistente. */ }
  }, []);

  useEffect(() => {
    setDraftHydrated(false);
    if (!user?.id) return;
    submissionRef.current = null;
    requestIdRef.current = null;
    sessionPlanIdRef.current = null;
    setPendingSubmission(null);
    setSessionStarted(false);
    setSessionStartTime(null);
    setExerciseLogs([]);
    const draft = loadWorkoutDraft(user.id);
    if (draft) {
      requestIdRef.current = draft.clientRequestId;
      sessionPlanIdRef.current = draft.planId;
      submissionRef.current = draft.pendingSubmission || null;
      setPendingSubmission(draft.pendingSubmission || null);
      setSessionStarted(true);
      setSessionStartTime(new Date(draft.sessionStartedAt));
      setSelectedTrainingDay(draft.selectedTrainingDay);
      setSessionNotes(draft.sessionNotes);
      setPerceivedEffort(draft.perceivedEffort || '');
      setSessionPerformance(draft.sessionPerformance || '');
      setExerciseLogs(draft.exerciseLogs);
      setRestoredDraft(true);
    }
    setDraftHydrated(true);
  }, [user?.id]);

  // Rascunho local vinculado ao usuário; o registro final continua na API.
  useEffect(() => {
    if (!draftHydrated || !user?.id || !sessionStarted || !sessionStartTime || sessionCompletedModal) return;
    const ok = saveWorkoutDraft(user.id, {
      sessionStartedAt: sessionStartTime.toISOString(),
      clientRequestId: requestIdRef.current!,
      pendingSubmission: submissionRef.current || undefined,
      selectedTrainingDay,
      planId: sessionPlanIdRef.current,
      sessionNotes,
      perceivedEffort,
      sessionPerformance,
      exerciseLogs,
    });
    setDraftError(ok ? null : 'Não foi possível salvar o rascunho neste aparelho.');
  }, [draftHydrated, user?.id, sessionStarted, sessionStartTime, selectedTrainingDay, activePlan?.id, sessionNotes, perceivedEffort, sessionPerformance, exerciseLogs, sessionCompletedModal, pendingSubmission]);

  // Relógio real: o cronômetro continua correto depois de trocar de aba.
  useEffect(() => {
    if (!sessionStarted || !sessionStartTime) return;
    const tick = () => setElapsedSeconds(pendingSubmission?.duration_seconds
      ?? Math.max(0, Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [sessionStarted, sessionStartTime, pendingSubmission]);

  // Load active plan on mount
  useEffect(() => {
    async function loadPlan() {
      try {
        const plan = await api.getActiveWorkout();
        setActivePlan(plan);
      } catch (e) {
        console.error('Error fetching active plan for session:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlan();
  }, []);

  // Optional history shortcut: only actually saved, completed series.
  useEffect(() => {
    let mounted = true;
    api.getSessions().then((history: WorkoutSession[]) => {
      if (!mounted) return;
      const loads: Record<string, number> = {};
      const ordered = [...history].filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      for (const session of ordered) {
        for (const set of (session.sets || []).filter(s => s.completed)) {
          const key = normalizeExerciseText(set.exercise_name || '');
          const kg = Number(set.load_kg);
          if (key && !Object.prototype.hasOwnProperty.call(loads, key) && Number.isFinite(kg) && kg > 0) loads[key] = kg;
        }
      }
      setPreviousLoads(loads);
    }).catch(() => { if (mounted) setPreviousLoads({}); });
    return () => { mounted = false; };
  }, [user?.id]);

  const initExerciseLogs = (exercises: WorkoutExercise[]) => {
    const logs: ExerciseLog[] = exercises.map((ex) => ({
      exercise_name: ex.exercise_name,
      repdb_id: ex.repdb_id,
      track_load: defaultTracksLoad(ex.exercise_name),
      muscle_group: ex.muscle_group,
      rest_seconds: ex.rest_seconds || 60,
      sets: Array.from({ length: ex.sets || 3 }).map((_, idx) => ({
        set_number: idx + 1,
        repetitions: ex.reps_min || 10,
        load_kg: defaultTracksLoad(ex.exercise_name) ? (ex.suggested_load_kg || 0) : 0,
        completed: false,
        rpe: 8,
      })),
    }));
    setExerciseLogs(logs);
  };

  // Refresh the planned exercises when the athlete chooses another weekday.
  // Exercises without a weekday are legacy/general items and remain available every day.
  useEffect(() => {
    if (!activePlan || sessionStarted) return;
    const todaysExercises = (activePlan.exercises || []).filter(
      (exercise) => !exercise.training_day || exercise.training_day === selectedTrainingDay
    );
    initExerciseLogs(todaysExercises);
  }, [activePlan, selectedTrainingDay]);

  const tracksLoad = (ex: ExerciseLog) => ex.track_load ?? defaultTracksLoad(ex.exercise_name);
  const toggleExerciseLoad = (index: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    setExerciseLogs(prev => prev.map((ex, i) => i === index ? { ...ex, track_load: !tracksLoad(ex) } : ex));
  };


  // Story FOCO / PERFORMANCE: editorial 9:16, 100% vetorial e exportável offline.
  // Não inclui mídia de terceiros; apenas métricas da sessão concluída.
  const createStoryImage = async (): Promise<Blob | null> => {
    const completed = sessionCompletedModal;
    if (!completed) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const W = 1080, H = 1920;
    const lime = '#D5FF40', white = '#F6F7F3', muted = '#A6ADA5';
    const minutes = Math.max(0, Math.round(Number(completed.duration || 0) / 60));
    const date = new Date(completed.finishedAt || Date.now());
    const dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();
    const timeLabel = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const workoutName = String(completed.planName || 'TREINO LIVRE').trim().toLocaleUpperCase('pt-BR') || 'TREINO LIVRE';
    const setsDone = Math.max(0, Number(completed.setsDone) || 0);
    const exercisesDone = Math.max(0, Number(completed.exercisesDone) || 0);
    const kcal = Number(completed.caloriesEstimate);
    const hasKcal = completed.caloriesEstimate !== null && completed.caloriesEstimate !== undefined && Number.isFinite(kcal) && kcal >= 0;

    // Background com profundidade controlada, sem efeitos externos ou imagens pixeladas.
    ctx.fillStyle = '#080B09'; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(760, 610, 80, 760, 610, 890);
    glow.addColorStop(0, 'rgba(114,160,40,.19)');
    glow.addColorStop(.48, 'rgba(38,65,26,.09)');
    glow.addColorStop(1, 'rgba(8,11,9,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    // Linhas de movimento originais, em vez de uma ilustração genérica de halteres.
    ctx.save(); ctx.translate(640, 780); ctx.rotate(-.27);
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 118;
      ctx.strokeStyle = i === 4 ? 'rgba(213,255,64,.35)' : 'rgba(213,255,64,.075)';
      ctx.lineWidth = i === 4 ? 4 : 2;
      ctx.beginPath(); ctx.moveTo(x, -380); ctx.lineTo(x + 175, 380); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(213,255,64,.22)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(775, 730, 350, -2.25, .65); ctx.stroke();
    ctx.beginPath(); ctx.arc(775, 730, 415, -2.1, .3); ctx.stroke();
    // Marca vetorial compartilhada com o app.
    ctx.save(); ctx.translate(78, 104); ctx.scale(.95, .95);
    ctx.fillStyle = lime;
    ctx.fill(new Path2D('M7 47L19 17H35L22 47H7Z'));
    ctx.fill(new Path2D('M28 69L53 6H69L44 69H28Z'));
    ctx.fill(new Path2D('M57 43L65 23H78L70 43H57Z'));
    ctx.restore();
    const text = (value: string, x: number, y: number, font: string, color = white) => {
      ctx.fillStyle = color; ctx.font = font; ctx.textAlign = 'left'; ctx.fillText(value, x, y);
    };
    const line = (y: number) => { ctx.fillStyle = 'rgba(246,247,243,.16)'; ctx.fillRect(78, y, 924, 2); };
    text('FOCO', 174, 153, '900 74px Arial, sans-serif');
    ctx.textAlign = 'right'; ctx.fillStyle = muted; ctx.font = '700 25px Arial, sans-serif';
    ctx.fillText('TRAINING SYSTEM', 1000, 139); ctx.textAlign = 'left';
    line(210);
    text('SESSÃO FINALIZADA', 80, 292, '700 29px Arial, sans-serif', lime);
    text('FEITO.', 67, 490, '900 202px Arial, sans-serif');
    text('MAIS UM DIA', 79, 570, '800 55px Arial, sans-serif');
    text('DE EVOLUÇÃO.', 79, 638, '800 55px Arial, sans-serif');
    // Área central com nome do treino, quebrado por largura e não por caracteres.
    ctx.fillStyle = 'rgba(9,14,9,.83)';
    ctx.fillRect(77, 825, 926, 280);
    ctx.strokeStyle = 'rgba(213,255,64,.34)'; ctx.lineWidth = 2;
    ctx.strokeRect(77, 825, 926, 280);
    ctx.fillStyle = lime; ctx.fillRect(77, 825, 10, 280);
    text('TREINO CONCLUÍDO', 113, 885, '700 25px Arial, sans-serif', lime);
    const maxWidth = 838;
    const fontSize = workoutName.length > 38 ? 57 : workoutName.length > 22 ? 67 : 83;
    ctx.font = '900 ' + fontSize + 'px Arial, sans-serif';
    const words = workoutName.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? current + ' ' + word : word;
      if (current && ctx.measureText(next).width > maxWidth) { lines.push(current); current = word; }
      else current = next;
    }
    if (current) lines.push(current);
    const visibleLines = lines.slice(0, 2);
    if (lines.length > 2) {
      let last = visibleLines[1];
      while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      visibleLines[1] = last + '…';
    }
    ctx.fillStyle = white;
    visibleLines.forEach((value, index) => ctx.fillText(value, 111, 974 + index * 88, maxWidth));
    // Números de maior interesse, com hierarquia forte e espaçamento generoso.
    line(1170);
    text('DURAÇÃO', 81, 1243, '700 26px Arial, sans-serif', muted);
    text('SÉRIES', 574, 1243, '700 26px Arial, sans-serif', muted);
    text(String(minutes), 73, 1384, '900 144px Arial, sans-serif');
    text('MIN', 317, 1381, '700 36px Arial, sans-serif', lime);
    text(String(setsDone), 567, 1384, '900 144px Arial, sans-serif');
    line(1434);
    text('EXERCÍCIOS', 81, 1510, '700 26px Arial, sans-serif', muted);
    text('GASTO ESTIMADO', 574, 1510, '700 26px Arial, sans-serif', muted);
    text(String(exercisesDone), 76, 1616, '900 91px Arial, sans-serif');
    text(hasKcal ? '~' + Math.round(kcal) + ' KCAL' : 'NÃO DISP.', 570, 1612,
      hasKcal ? '900 67px Arial, sans-serif' : '700 47px Arial, sans-serif', white);
    if (hasKcal) text('VALOR APROXIMADO', 574, 1661, '600 22px Arial, sans-serif', muted);
    line(1720);
    text(dateLabel + '  /  ' + timeLabel, 81, 1792, '700 28px Arial, sans-serif', muted);
    ctx.textAlign = 'right'; ctx.fillStyle = lime; ctx.font = '800 30px Arial, sans-serif';
    ctx.fillText('CONTINUA.', 998, 1792);
    ctx.textAlign = 'left';
    text('SEU PROGRESSO. SEU RITMO.', 81, 1852, '700 24px Arial, sans-serif', white);
    return new Promise<Blob | null>(resolve => {
      try { canvas.toBlob(resolve, 'image/png'); } catch { resolve(null); }
    });
  };

  // Mostra exatamente a imagem que será salva ou compartilhada.
  useEffect(() => {
    if (!sessionCompletedModal) {
      setStoryPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    void createStoryImage().then(blob => {
      if (!blob || cancelled) return;
      url = URL.createObjectURL(blob);
      setStoryPreviewUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sessionCompletedModal]);

  const shareStory = async (download = false) => {
    const blob = await createStoryImage(); if (!blob) { setErrorAlert('Não foi possível gerar o card.'); return; }
    const file = new File([blob], 'foco-treino-story.png', { type: 'image/png' });
    if (!download && navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Meu treino FOCO' }); return; }
      catch (err) { if ((err as Error).name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleStartWorkout = () => {
    if (sessionStarted || saveInFlightRef.current || submissionRef.current) return;
    if (exerciseLogs.length === 0) {
      setErrorAlert('Adicione exercícios à sua ficha antes de iniciar a sessão.');
      return;
    }
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    requestIdRef.current = createSessionRequestId();
    sessionPlanIdRef.current = activePlan?.id || null;
    setErrorAlert(null);
    setSessionStarted(true);
    setSessionStartTime(new Date());
    setElapsedSeconds(0);
  };

  /**
   * Cálculo estimado de 1RM (One Rep Max) baseado na fórmula de Brzycki
   */
  const calculateEstimated1RM = (load: number, reps: number): number => {
    if (load <= 0 || reps <= 0) return 0;
    if (reps === 1) return load;
    // Fórmula de Brzycki: Carga / (1.0278 - 0.0278 * reps)
    const factor = 1.0278 - 0.0278 * Math.min(reps, 20);
    return factor > 0 ? Math.round(load / factor) : Math.round(load * (1 + reps / 30));
  };

  const handleToggleSetComplete = (exIdx: number, setIdx: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    const exercise = exerciseLogs[exIdx];
    const current = exercise?.sets[setIdx];
    if (!current) return;
    soundEngine.initContext();
    if (!sessionStarted) handleStartWorkout();
    if (!current.completed) {
      soundEngine.playCheckmarkClick();
      if (autoRestEnabled) startTimer(exercise.rest_seconds || 60, exercise.exercise_name, current.set_number);
    }
    setExerciseLogs((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((set, j) => j !== setIdx ? set : { ...set, completed: !set.completed }),
    }));
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, field: 'load_kg' | 'repetitions' | 'rpe', value: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    setExerciseLogs((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((set, j) => j !== setIdx ? set : { ...set, [field]: value }),
    }));
  };

  const handleQuickAddLoad = (exIdx: number, setIdx: number, delta: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    setExerciseLogs((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((set, j) => j !== setIdx ? set : {
        ...set, load_kg: Math.max(0, (Number(set.load_kg) || 0) + delta),
      }),
    }));
  };

  const handleChangeExerciseRest = (exIdx: number, seconds: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    setExerciseLogs((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, rest_seconds: seconds } : ex));
  };

  const handleAddSet = (exIdx: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    setExerciseLogs((prev) => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, {
        set_number: ex.sets.length + 1, repetitions: last?.repetitions ?? 10,
        load_kg: last?.load_kg ?? 0, completed: false, rpe: 8,
      }] };
    }));
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    if (submissionRef.current || saveInFlightRef.current) return;
    setExerciseLogs((prev) => prev.map((ex, i) => i !== exIdx || ex.sets.length <= 1 ? ex : {
      ...ex, sets: ex.sets.filter((_, j) => j !== setIdx).map((set, j) => ({ ...set, set_number: j + 1 })),
    }));
  };

  const currentWorkoutTitle = [...new Set(exerciseLogs.map(ex => ex.muscle_group).filter(Boolean))].join(' + ')
    || activePlan?.name || 'Treino Livre';

  const handleFinishWorkout = async () => {
    if (saveInFlightRef.current) return;
    if (!sessionStarted || !sessionStartTime || !user?.id || !requestIdRef.current) {
      setErrorAlert('Inicie o treino antes de finalizar.');
      return;
    }
    if (!submissionRef.current && !exerciseLogs.some((ex) => ex.sets.some((set) => set.completed))
      && !window.confirm('Nenhuma série foi concluída. Salvar a sessão mesmo assim?')) return;
    saveInFlightRef.current = true;
    setIsSaving(true);
    setErrorAlert(null);
    try {
      let submission = submissionRef.current;
      if (!submission) {
        const finishedAt = new Date();
        submission = createSessionSubmission(requestIdRef.current, {
          plan_id: sessionPlanIdRef.current || undefined,
          plan_name: currentWorkoutTitle,
          started_at: sessionStartTime.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_seconds: Math.max(0, Math.floor((finishedAt.getTime() - sessionStartTime.getTime()) / 1000)),
          notes: [
            sessionNotes.trim(),
            'Treino escolhido da semana: ' + getTrainingDayLabel(selectedTrainingDay),
            perceivedEffort || sessionPerformance
              ? '[Feedback FOCO — esforço percebido: ' + (perceivedEffort || 'não informado') +
                '; desempenho: ' + (sessionPerformance || 'não informado') + ']' : '',
          ].filter(Boolean).join('\n').slice(0, 1200),
          status: 'completed',
          sets: exerciseLogs.flatMap(ex => ex.sets.map(set => ({
            exercise_name: ex.exercise_name,
            set_number: set.set_number,
            repetitions: Number(set.repetitions) || 0,
            load_kg: tracksLoad(ex) ? (Number(set.load_kg) || 0) : 0,
            completed: set.completed,
          }))),
        });
        submissionRef.current = submission;
        setPendingSubmission(submission);
        setElapsedSeconds(submission.duration_seconds);
        skipTimer();
      }
      // Persist before the POST: a reload after a lost response must replay the
      // original identity, finish time and sets instead of creating another row.
      const preserved = saveWorkoutDraft(user.id, {
        clientRequestId: submission.client_request_id,
        pendingSubmission: submission,
        sessionStartedAt: submission.started_at,
        planId: submission.plan_id || null,
        selectedTrainingDay,
        sessionNotes,
        perceivedEffort,
        sessionPerformance,
        exerciseLogs,
      });
      if (!preserved) {
        setDraftError('Não foi possível preservar o registro neste aparelho.');
        throw new Error('Libere espaço ou habilite o armazenamento do navegador e tente salvar novamente. O treino ainda não foi enviado.');
      }
      setDraftError(null);
      const res = await api.recordSession(submission);
      if (!res?.id) throw new Error('O servidor não confirmou o registro. Tente salvar novamente.');
      const completedSets = submission.sets.filter(set => set.completed);
      const completedExerciseNames = [...new Set(completedSets.map(set => set.exercise_name))];
      const totalTonnage = completedSets.reduce((sum, set) => sum + set.repetitions * set.load_kg, 0);
      setSessionStarted(false);
      clearWorkoutDraft(user.id);
      setRestoredDraft(false);
      soundEngine.playWorkoutCompletedChime();
      setSessionCompletedModal({
        duration: submission.duration_seconds,
        planName: submission.plan_name,
        finishedAt: submission.finished_at,
        exerciseNames: completedExerciseNames,
        caloriesEstimate: (() => {
          const weightKg = Number(profile?.current_weight_kg);
          const minutes = submission.duration_seconds / 60;
          if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 350 || minutes < 1) return null;
          const met = perceivedEffort.startsWith('leve') ? 3.5
            : perceivedEffort.startsWith('muito alto') ? 6
            : perceivedEffort.startsWith('alto') ? 5.5 : 4.5;
          return Math.round((met * 3.5 * weightKg / 200 * minutes) / 10) * 10;
        })(),
        tonnage: totalTonnage,
        setsDone: completedSets.length,
        exercisesDone: completedExerciseNames.length,
        session: res,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o treino.';
      setErrorAlert(message + ' Seu registro foi mantido para tentar novamente.');
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Resumo de tonelagem e séries concluídas em tempo real
  const currentTotalTonnage = exerciseLogs.reduce((acc, ex) => {
    return acc + ex.sets.reduce((setAcc, s) => (s.completed && tracksLoad(ex) ? setAcc + (s.load_kg * s.repetitions) : setAcc), 0);
  }, 0);

  const currentTotalSetsDone = exerciseLogs.reduce((acc, ex) => {
    return acc + ex.sets.filter((s) => s.completed).length;
  }, 0);

  const currentTotalSets = exerciseLogs.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completionRate = currentTotalSets ? Math.round(100 * currentTotalSetsDone / currentTotalSets) : 0;
  const completedExercisesCount = exerciseLogs.filter(ex => ex.sets.length > 0 && ex.sets.every(s => s.completed)).length;
  const focusedExerciseIndex = exerciseLogs.findIndex(ex => ex.sets.some(s => !s.completed));

  if (isLoading) {
    return (
      <div className="py-20 text-center text-neutral-400">
        <Clock className="w-8 h-8 animate-spin mx-auto text-white mb-3" />
        <p className="text-xs font-mono">Carregando sessão...</p>
      </div>
    );
  }

  const suggestedExerciseIndex=focusedExerciseIndex>=0?focusedExerciseIndex:Math.max(0,exerciseLogs.length-1);
  const v6ExIndex=v7ManualExerciseIndex===null ? suggestedExerciseIndex : Math.max(0,Math.min(exerciseLogs.length-1,v7ManualExerciseIndex));
  const v6CurrentExercise=exerciseLogs[v6ExIndex];
  const v6SetIndex=v6CurrentExercise?Math.max(0,v6CurrentExercise.sets.findIndex(set=>!set.completed)):0;
  const v6CurrentSet=v6CurrentExercise?.sets[v6SetIndex];
  const v6TracksLoad=v6CurrentExercise?tracksLoad(v6CurrentExercise):false;
  const v6RestRatio=restTimerActive&&restTotalDuration>0?Math.max(0,Math.min(100,100*(restSecondsRemaining/restTotalDuration))):0;
  const v7CompletedInExercise=v6CurrentExercise?.sets.filter(set=>set.completed).length||0;
  const v7WorkoutTitle=conciseWorkoutName([...new Set(exerciseLogs.map(ex=>ex.muscle_group).filter(Boolean))],activePlan?.name||'Meu treino');
  const v7ActiveRestSeconds=restTimerActive?restSecondsRemaining:(v6CurrentExercise?.rest_seconds||90);
  const priorRecordedLoad=v6CurrentExercise?previousLoads[normalizeExerciseText(v6CurrentExercise.exercise_name)]:undefined;
  const v7GoExercise=(offset:number)=>{
    if(!exerciseLogs.length)return;
    setV7ManualExerciseIndex(Math.max(0,Math.min(exerciseLogs.length-1,v6ExIndex+offset)));
    setV6SessionMode('register');
  };
  return (
    <div className="foco-v6-session-screen foco-v4-page foco-21-session">
      <p role="status" className="sr-only">{isSaving ? 'Salvando treino.' : ''}</p>
      <div className="md:hidden"><FocoV6Status/></div>
      <header className="foco-v7-session-heading">
        <button type="button" className="foco-v6-icon-button" onClick={()=>setActiveTab('treinos')} aria-label="Voltar aos treinos"><ArrowLeft size={19}/></button>
        <div className="foco-v7-session-heading-text">
          <p>{pendingSubmission && sessionStarted?'AGUARDANDO SALVAMENTO':sessionStarted?'TREINO EM ANDAMENTO':'PRONTO PARA TREINAR'} <span className="foco-21-session-mark">FOCO {FOCO_VISUAL_RELEASE}</span></p>
          <h1>{v7WorkoutTitle}</h1>
        </div>
        <div className="foco-v7-session-stopwatch" aria-label={'Tempo de treino '+formatTime(elapsedSeconds)}>
          <Clock size={15}/><strong>{formatTime(elapsedSeconds)}</strong>
        </div>
      </header>
      <nav className="foco-v7-exercise-progress" aria-label="Navegar entre exercícios">
        {exerciseLogs.map((ex,index)=><button key={index} type="button" aria-label={'Ver exercício '+(index+1)+': '+ex.exercise_name}
          aria-current={index===v6ExIndex?'step':undefined}
          onClick={()=>{setV7ManualExerciseIndex(index);setV6SessionMode('register');}}
          className={(ex.sets.length>0&&ex.sets.every(set=>set.completed)?'is-complete ':'')+(index===v6ExIndex?'is-current':'')} />)}
      </nav>
      {v6CurrentExercise&&<section className="foco-v7-session-stage" aria-label={'Exercício atual: '+v6CurrentExercise.exercise_name}>
        <div className="foco-21-art-surface" aria-hidden="true"/>
        <div className="foco-21-exercise-media">
        <ExerciseIllustration key={v6CurrentExercise.exercise_name} exerciseName={v6CurrentExercise.exercise_name} exerciseId={v6CurrentExercise.repdb_id}
          muscleGroup={v6CurrentExercise.muscle_group} presentation="editorial" className="foco-v7-stage-illustration h-full w-full" />
        </div>
        <span className="foco-v7-stage-tag">EXERCÍCIO {String(v6ExIndex+1).padStart(2,'0')} / {String(exerciseLogs.length).padStart(2,'0')}</span>
        <div className="foco-v7-stage-footer">
          <span className="foco-21-art-kicker">SEU MOVIMENTO</span>
          <h2>{v6CurrentExercise.exercise_name}</h2>
          <span>{v6CurrentExercise.muscle_group || 'Treinamento'} · {v6CurrentExercise.sets.length} séries</span>
        </div>
        <button type="button" className="foco-v7-stage-expand" aria-label="Ver demonstração completa"
          onClick={()=>setV6SessionMode('execution')}><ChevronRight size={20}/><span>Execução</span></button>
      </section>}
      {v6CurrentExercise&&<section className="foco-v7-session-series foco-21-series" aria-label="Progresso das séries">
        <div className="foco-v7-series-copy">
          <div><span>SÉRIE ATUAL</span><strong>Série {Math.min(v6SetIndex+1,v6CurrentExercise.sets.length)} de {v6CurrentExercise.sets.length}</strong></div>
          <div className="foco-v7-series-percentage"><strong>{completionRate}%</strong><small>da sessão</small></div>
        </div>
        <div className="foco-v7-series-dots" aria-label={v7CompletedInExercise+' séries concluídas neste exercício'}>
          {v6CurrentExercise.sets.map((set,index)=><span key={index} className={(set.completed?'is-complete ':'')+(index===v6SetIndex?'is-current':'')}/>)}
        </div>
      </section>}
      {!pendingSubmission && <>
      <FocoV6Segment label="Modo do exercício" options={[{value:'register',label:'Registro'},{value:'execution',label:'Execução'},{value:'tips',label:'Dicas'}]} value={v6SessionMode} onChange={setV6SessionMode}/>
      {v6CurrentExercise&&v6SessionMode==='register'&&v6CurrentSet&&<>
        <section className={'foco-v7-session-adjusters foco-21-adjusters '+(!v6TracksLoad?'single-control':'')} aria-label="Registrar série">
          {v6TracksLoad&&<label className="foco-v7-adjuster">
            <span><Dumbbell size={16}/> CARGA <small>kg</small></span>
            <div>
              <button type="button" onClick={()=>handleQuickAddLoad(v6ExIndex,v6SetIndex,-2.5)} aria-label="Diminuir carga em 2,5 kg"><Minus size={19}/></button>
              <input type="number" inputMode="decimal" min="0" step="0.5" value={v6CurrentSet.load_kg}
                aria-label="Carga atual em quilogramas"
                onChange={e=>handleUpdateSet(v6ExIndex,v6SetIndex,'load_kg',Math.max(0,Number(e.target.value)||0))}/>
              <button type="button" onClick={()=>handleQuickAddLoad(v6ExIndex,v6SetIndex,2.5)} aria-label="Aumentar carga em 2,5 kg">+</button>
            </div>
          </label>}
          <label className="foco-v7-adjuster">
            <span><CheckCircle2 size={16}/> REPETIÇÕES</span>
            <div>
              <button type="button" onClick={()=>handleUpdateSet(v6ExIndex,v6SetIndex,'repetitions',Math.max(0,v6CurrentSet.repetitions-1))}
                aria-label="Diminuir repetições"><Minus size={19}/></button>
              <input type="number" inputMode="numeric" min="0" value={v6CurrentSet.repetitions}
                aria-label="Repetições da série atual"
                onChange={e=>handleUpdateSet(v6ExIndex,v6SetIndex,'repetitions',Math.max(0,Number(e.target.value)||0))}/>
              <button type="button" onClick={()=>handleUpdateSet(v6ExIndex,v6SetIndex,'repetitions',v6CurrentSet.repetitions+1)}
                aria-label="Aumentar repetições">+</button>
            </div>
          </label>
        </section>
        {v6TracksLoad && typeof priorRecordedLoad === 'number' && <div className="foco-v2-prior-load">
          <span>Última carga registrada: <strong>{priorRecordedLoad.toLocaleString('pt-BR')} kg</strong></span>
          <button type="button" onClick={()=>handleUpdateSet(v6ExIndex,v6SetIndex,'load_kg',priorRecordedLoad)} aria-label={'Usar carga anterior de '+priorRecordedLoad.toLocaleString('pt-BR')+' quilogramas'}>
            Usar carga anterior
          </button>
        </div>}
        <section className={'foco-v7-rest-panel foco-21-rest '+(restTimerActive?'is-running':'')} aria-label="Controle de descanso">
          <span className="foco-v7-rest-ring" style={{'--v6-rest-progress':v6RestRatio+'%'} as React.CSSProperties}>
            <Clock size={17}/>
          </span>
          <div className="foco-v7-rest-info"><span>{restTimerActive?'DESCANSO EM ANDAMENTO':'DESCANSO PROGRAMADO'}</span>
            <strong>{formatTime(v7ActiveRestSeconds)}</strong></div>
          <button type="button" className="foco-v7-rest-control"
            aria-label={restTimerActive?(restIsPaused?'Retomar descanso':'Pausar descanso'):'Iniciar descanso'}
            onClick={()=>restTimerActive?(restIsPaused?resumeTimer:pauseTimer) : startTimer(v7ActiveRestSeconds,v6CurrentExercise.exercise_name,Math.min(v6SetIndex+1,v6CurrentExercise.sets.length))}>
            {!restTimerActive||restIsPaused?<Play size={18} fill="currentColor"/>:<Pause size={18} fill="currentColor"/>}
          </button>
        </section>
        {!sessionStarted?<button type="button" className="foco-v6-primary foco-v7-session-start" onClick={handleStartWorkout}>
          Iniciar treino <Play size={17} fill="currentColor"/>
        </button>:
        <div className="foco-v7-session-actions">
          <button type="button" className="foco-v7-previous" disabled={v6ExIndex===0} onClick={()=>v7GoExercise(-1)}>
            <ArrowLeft size={16}/> Anterior
          </button>
          <button type="button" className="foco-v6-primary" disabled={v6CurrentSet.completed}
            onClick={()=>{handleToggleSetComplete(v6ExIndex,v6SetIndex);setV7ManualExerciseIndex(null);}}>
            Concluir série <CheckCircle2 size={18}/>
          </button>
        </div>}
        <button type="button" className="foco-v7-next-exercise" onClick={()=>v7GoExercise(1)}
          disabled={v6ExIndex>=exerciseLogs.length-1}>Próximo exercício <ChevronRight size={17}/></button>
      </>}
      {v6CurrentExercise&&v6SessionMode==='execution'&&<section className="foco-v7-guide-panel">
        <div className="foco-v7-guide-heading"><span>EXECUÇÃO CORRETA</span><button type="button" onClick={()=>setV6SessionMode('register')}>Voltar ao registro</button></div>
        <ExerciseExecutionGuide exerciseName={v6CurrentExercise.exercise_name} exerciseId={v6CurrentExercise.repdb_id} muscleGroup={v6CurrentExercise.muscle_group}/>
      </section>}
      {v6CurrentExercise&&v6SessionMode==='tips'&&<section className="foco-v7-guide-panel p-5">
        <p className="foco-v7-guide-label">DICA DO FOCO</p>
        <h3 className="mt-3 text-xl font-bold">Controle antes de carga.</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#B8C1B4]">Execute com amplitude confortável, postura estável e movimento controlado. Ajuste a carga às suas condições.</p>
        <button type="button" className="foco-v6-glass-button mt-5 w-full" onClick={()=>setV6SessionMode('execution')}>Ver execução completa <ChevronRight size={16}/></button>
      </section>}
      </>}
      {pendingSubmission && sessionStarted && <p role="status" className="foco-v6-glass rounded-xl p-3 text-sm">
        Treino encerrado. O registro está preservado neste aparelho; tente salvar novamente para confirmar o envio.
      </p>}
      {sessionStarted&&<button type="button" className="foco-v7-finish" disabled={isSaving} onClick={handleFinishWorkout}>
        <CheckCircle2 size={17}/>{isSaving?'Salvando sessão...':pendingSubmission?'Tentar salvar o mesmo treino':'Finalizar e salvar treino'}
      </button>}
      {errorAlert&&<p role="alert" className="foco-v6-glass rounded-xl p-3 text-sm">{errorAlert}</p>}
      {!pendingSubmission && <details className="foco-v6-glass rounded-2xl p-3">
        <summary className="cursor-pointer p-2 text-xs font-bold text-[#C8F040]">Ficha completa e ajustes avançados</summary>
      <div className="foco-v5-session foco-v4-page max-w-3xl space-y-4 pb-8">
      <header className="space-y-1">
        <p className="foco-v4-eyebrow">{sessionStarted ? 'Sessão ativa' : 'Sua sessão'}</p>
        <h1 className="foco-v4-heading">{sessionStarted ? 'Treino em andamento' : 'Pronto para treinar?'}</h1>
        <p className="foco-v4-muted">Mantenha o foco. Cada série conta.</p>
      </header>


      <section className="foco-v5-session-poster" aria-label="Resumo da sessão de treinamento">
        <div className="min-w-0">
          <p className="foco-v5-kicker mb-3">{sessionStarted ? 'SÉRIES CONCLUÍDAS' : 'SEU PRÓXIMO TREINO'}</p>
          <div className="foco-v5-session-poster-number">
            {sessionStarted ? currentTotalSetsDone : '00'}<span className="foco-v5-session-poster-total">/{currentTotalSets}</span>
          </div>
          <p className="mt-3 max-w-[240px] text-xs leading-relaxed text-[#B6C0AD]">
            {sessionStarted ? 'Registre cada série. O progresso é atualizado durante a sessão.' : 'Confira a ficha e inicie quando estiver pronto.'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Clock className="ml-auto mb-3 h-6 w-6 text-[#C8F040]" aria-hidden="true"/>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#A7B39D]">Tempo</span>
          <span className="foco-v5-session-poster-clock">{formatTime(elapsedSeconds)}</span>
        </div>
      </section>

      {/* Controller: progress, pause/resume and rest status remain fully functional. */}
      <section className="foco-v4-panel space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sessionStarted ? 'bg-[#C8F040] animate-ping' : 'bg-neutral-600'}`} />
              <span className="text-xs uppercase font-extrabold tracking-wider text-white">
                {sessionStarted ? 'Treino em Andamento' : 'Sessão Pronta'}
              </span>
            </div>
            <h2 className="mt-1 line-clamp-2 text-lg font-extrabold leading-tight text-white sm:max-w-[420px]">
              {currentWorkoutTitle}
            </h2>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            {!sessionStarted ? (
              <button
                onClick={handleStartWorkout}
                className="foco-v4-action w-full !min-h-12 !rounded-xl !px-5 !py-3 !text-sm sm:w-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current text-black" />
                <span>Iniciar</span>
              </button>
            ) : (
              <button
                onClick={handleFinishWorkout}
                disabled={isSaving}
                className="foco-v4-action w-full !min-h-12 !rounded-xl !px-5 !py-3 !text-sm disabled:opacity-50 sm:w-auto"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                <span>{isSaving ? 'Gravando...' : 'Concluir'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-xs text-neutral-300">Séries concluídas: {currentTotalSetsDone} de {currentTotalSets} <span className="float-right font-mono">{completionRate}%</span></p>
            <div className="foco-v4-progress-track mt-3" role="progressbar" aria-label="Progresso de séries concluídas" aria-valuemin={0} aria-valuemax={Math.max(1, currentTotalSets)} aria-valuenow={currentTotalSetsDone}><div className="foco-v4-progress-fill"
              style={{ width: completionRate + '%' }} /></div>
          </div>
          <div className="flex items-center gap-3 border-l border-white/10 pl-3">
            <Timer className="h-5 w-5 text-neutral-400" />
            <div><span className="block text-xs text-neutral-300">Descanso</span>
              <strong className="font-mono text-base tabular-nums">{restTimerActive ? formatTime(restSecondsRemaining) : '—'}</strong></div>
            {restTimerActive && <button type="button" onClick={restIsPaused ? resumeTimer : pauseTimer}
              className="foco-v4-secondary !min-h-11 !min-w-11 !rounded-xl !px-3" aria-label={restIsPaused ? 'Retomar descanso' : 'Pausar descanso'}>
              {restIsPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="foco-training-day" className="block text-xs font-bold uppercase tracking-wider text-neutral-300">Dia do treino</label>
            <p className="mt-1 text-xs text-neutral-300">{sessionStarted ? 'Dia bloqueado durante a sessão' : 'A sessão mostra os exercícios atribuídos a este dia.'}</p>
          </div>
          <select
            id="foco-training-day"
            value={selectedTrainingDay}
            disabled={sessionStarted}
            onChange={(event) => { setSelectedTrainingDay(event.target.value); savePreferredTrainingDay(event.target.value); }}
            className="foco-v4-field w-full min-h-12 rounded-xl px-3 py-2.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-sm"
          >
            {TRAINING_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
        </div>

        {/* Real-time stats bar (Duração, Séries Feitas, Carga Total) */}
        <div className="grid grid-cols-3 gap-1.5 border-t border-white/10 pt-3 sm:gap-2">
          <div className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#141414] px-1.5 py-3 sm:justify-start sm:px-3">
            <Clock className="hidden h-4 w-4 shrink-0 text-neutral-300 sm:block" />
            <div className="font-mono tabular-nums leading-tight min-w-0">
              <span className="block text-[11px] font-bold uppercase text-neutral-300">Tempo</span>
              <span className="text-sm font-black text-white">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#141414] px-1.5 py-3 sm:justify-start sm:px-3">
            <Flame className="hidden h-4 w-4 shrink-0 text-neutral-300 sm:block" />
            <div className="font-mono tabular-nums leading-tight min-w-0">
              <span className="block text-[11px] font-bold uppercase text-neutral-300">Volume</span>
              <span className="block max-w-full truncate text-sm font-black text-white">{Math.round(currentTotalTonnage)} kg</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#141414] px-1.5 py-3 sm:justify-start sm:px-3">
            <Zap className="hidden h-4 w-4 shrink-0 text-neutral-300 sm:block" />
            <div className="font-mono tabular-nums leading-tight min-w-0">
              <span className="block text-[11px] font-bold uppercase text-neutral-300">Séries</span>
              <span className="text-sm font-black text-white">{currentTotalSetsDone}/{currentTotalSets}</span>
            </div>
          </div>
        </div>

        {/* Sound & Auto-Rest Settings bar */}
        <details className="border-t border-white/10 pt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-neutral-200">Preferências de descanso e som</summary>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1 pt-2 text-xs">
          <button
            onClick={() => setAutoRestEnabled(!autoRestEnabled)}
            className={`flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 transition-all cursor-pointer ${
              autoRestEnabled
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-black text-neutral-500 border-white/5'
            }`}
            title="Ativar ou desativar o início automático do cronômetro ao concluir séries"
          >
            <Timer className="w-3 h-3" />
            <span>Descanso Automático: <strong className="text-white">{autoRestEnabled ? 'ON' : 'OFF'}</strong></span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className={`foco-touch rounded-lg border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-black text-neutral-500 border-white/5'
                  : 'bg-white/10 text-white border-white/20'
              }`}
              title={isMuted ? 'Áudio Mudo (Clique para ligar)' : 'Áudio Ativo (Bips 3-2-1 e final)'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={testSound}
              className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
              title="Testar som do cronômetro no fone/alto-falante"
            >
              Testar Beep
            </button>
          </div>
          </div>
        </details>

        {errorAlert && (
          <div role="alert" className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs flex items-center justify-between">
            <span>{errorAlert}</span>
            <button onClick={() => setErrorAlert(null)} aria-label="Fechar aviso" className="font-bold text-white ml-2">✕</button>
          </div>
        )}
      </section>

      {sessionStarted && (
        <p role="status" className="px-1 text-xs text-neutral-400">
          {draftError || (restoredDraft ? 'Treino recuperado. Alterações salvas neste aparelho até a conclusão.' : 'Rascunho salvo automaticamente neste aparelho durante o treino.')}
        </p>
      )}

      {sessionStarted && focusedExerciseIndex >= 0 && <a href={"#foco-exercise-card-" + focusedExerciseIndex} className="foco-v4-quick !min-h-[76px]">
        <span className="foco-v4-info-icon"><Dumbbell className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">Continuar: {exerciseLogs[focusedExerciseIndex].exercise_name}</strong><span className="mt-1 block text-xs text-neutral-400">Ir para a próxima série pendente</span></span>
        <ChevronRight className="h-5 w-5 text-neutral-400" />
      </a>}

      {/* Exercises Log Cards */}
      {exerciseLogs.length === 0 && activePlan && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-[#141414] p-6 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-neutral-500" />
          <h3 className="mt-3 text-sm font-black">Nenhum exercício para {getTrainingDayLabel(selectedTrainingDay).toLowerCase()}</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">Abra a biblioteca e adicione exercícios a este dia para montar a sessão.</p>
          <button type="button" onClick={() => setActiveTab('biblioteca')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-black">
            <Plus className="h-4 w-4" /> Adicionar exercícios
          </button>
        </div>
      )}
      <div className="space-y-4">
        {exerciseLogs.map((exercise, exIdx) => {
          const completedCount = exercise.sets.filter((s) => s.completed).length;
          const showLoad = tracksLoad(exercise);
          const isAllDone = completedCount === exercise.sets.length;

          return (
            <section
              id={'foco-exercise-card-' + exIdx}
              key={exIdx}
              className={'foco-v4-panel scroll-mt-24 p-4 transition-all sm:p-5 ' + (isAllDone ? 'border-white/30' : exIdx === focusedExerciseIndex ? 'border-white/25' : '')}
            >
              {/* Exercise Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                    <span>{exIdx === focusedExerciseIndex ? 'Exercício atual' : exercise.muscle_group}</span>
                    <span>·</span>
                    <span className="font-mono">{completedCount}/{exercise.sets.length} séries feitas</span>
                  </div>
                  <h3 className="mt-1 text-[clamp(21px,5vw,27px)] font-extrabold leading-tight tracking-[-.04em] text-white">
                    {exercise.exercise_name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">

                  <button
                    onClick={() => handleAddSet(exIdx)}
                    className="foco-touch rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    aria-label={'Adicionar série ao exercício ' + exercise.exercise_name}
                    title="Adicionar Série Extra"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-neutral-300">
                <input type="checkbox" checked={showLoad} onChange={() => toggleExerciseLoad(exIdx)} /> Registrar carga (kg) neste exercício
              </label>
              {exIdx === focusedExerciseIndex ? (
                <section className="mt-4 overflow-hidden rounded-[19px] border border-white/10 bg-[#111]" aria-label={'Guia de execução de ' + exercise.exercise_name}>
                  <p className="foco-v4-eyebrow px-4 pt-4">Execução do exercício</p>
                  <ExerciseExecutionGuide exerciseName={exercise.exercise_name} exerciseId={exercise.repdb_id} muscleGroup={exercise.muscle_group} />
                </section>
              ) : (
                <details className="mt-3 overflow-hidden rounded-[19px] border border-white/10 bg-[#111]">
                  <summary className="foco-touch cursor-pointer px-4 py-3 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                    <span className="flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Execução, músculos e cuidados</span>
                  </summary>
                  <ExerciseExecutionGuide exerciseName={exercise.exercise_name} exerciseId={exercise.repdb_id} muscleGroup={exercise.muscle_group} />
                </details>
              )}

              {/* Sets Table */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-semibold text-neutral-300">
                      <th className="py-2 px-1 w-12">SÉRIE</th>
                      {showLoad && <th className="py-2 px-1">CARGA</th>}
                      <th className="py-2 px-1">REPS</th>
                      <th className="py-2 px-1 text-right">FEITO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {exercise.sets.map((set, setIdx) => {
                      return (
                        <tr
                          key={setIdx}
                          className={`transition-colors ${set.completed ? 'bg-white/5' : ''}`}
                        >
                          {/* Set number */}
                          <td className="py-2.5 px-1 font-mono font-bold text-neutral-400">
                            #{set.set_number}
                          </td>

                          {showLoad && <td className="py-2 px-1">
                            <input type="number" min="0" step="0.5" inputMode="decimal"
                              aria-label={'Carga da série ' + set.set_number + ' de ' + exercise.exercise_name + ' em quilogramas'}
                              value={set.load_kg === 0 ? '' : set.load_kg} placeholder="0"
                              onChange={(e) => handleUpdateSet(exIdx, setIdx, 'load_kg', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="foco-field !w-[84px] !min-h-12 !px-2 text-center font-mono text-base tabular-nums" />
                          </td>}

                          {/* Repetitions */}
                          <td className="py-2.5 px-1">
                            <input
                              type="number" min="0" step="1" inputMode="numeric"
                              aria-label={'Repetições da série ' + set.set_number + ' de ' + exercise.exercise_name}
                              value={set.repetitions === 0 ? '' : set.repetitions}
                              placeholder="0"
                              onChange={(e) =>
                                handleUpdateSet(exIdx, setIdx, 'repetitions', parseInt(e.target.value) || 0)
                              }
                              className="foco-field !w-[70px] !min-h-12 !px-2 text-center font-mono text-base tabular-nums"
                            />
                          </td>

                          {/* Completion Checkmark (Ergonomic 44x44px Touch Target) */}
                          <td className="py-2.5 px-1 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                                aria-label={set.completed ? 'Desmarcar série ' + set.set_number : 'Concluir série ' + set.set_number}
                                aria-pressed={set.completed}
                                className={`foco-touch rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                  set.completed
                                    ? 'bg-white text-black font-black shadow-lg ring-2 ring-white/50'
                                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/15'
                                }`}
                                title={set.completed ? 'Série concluída! (Clique para desmarcar)' : 'Marcar série e disparar descanso'}
                              >
                                <CheckCircle2 className={`w-5 h-5 ${set.completed ? 'text-black' : ''}`} />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {exIdx === focusedExerciseIndex && <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => handleToggleSetComplete(exIdx, exercise.sets.findIndex(set => !set.completed))}
                  className="foco-v4-action flex-1"><CheckCircle2 className="h-5 w-5" /> Concluir série</button>
                {exIdx < exerciseLogs.length - 1 && <button type="button"
                  onClick={() => document.getElementById('foco-exercise-card-' + (exIdx + 1))?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
                  className="foco-v4-secondary flex-1"><ChevronRight className="h-4 w-4" /> Ver próximo exercício</button>}
              </div>}
              <details className="mt-3 rounded-xl border border-white/10 bg-black/20">
                <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold text-neutral-300">
                  Mais ajustes · descanso, séries e métricas
                </summary>
                <div className="space-y-4 border-t border-white/10 p-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-neutral-400">Descanso entre séries</p>
                    <div className="flex flex-wrap gap-2">
                      {[45, 60, 90, 120].map((sec) => (
                        <button type="button" key={sec} onClick={() => handleChangeExerciseRest(exIdx, sec)}
                          aria-pressed={exercise.rest_seconds === sec}
                          className={'min-h-11 rounded-xl border px-4 text-sm font-semibold ' + (exercise.rest_seconds === sec
                            ? 'border-white bg-white text-black' : 'border-white/15 bg-white/5 text-neutral-300')}>
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-400">Ajustar carga, remover e visualizar estimativas</p>
                    {exercise.sets.map((set, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-2">
                        <span className="text-sm font-semibold">Série {set.set_number}</span>
                        {showLoad && <span className="text-xs text-neutral-400">1RM estimado: {calculateEstimated1RM(set.load_kg, set.repetitions) || '—'} kg</span>}
                        <div className="flex items-center gap-1">
                          {showLoad && <button type="button" onClick={() => handleQuickAddLoad(exIdx, idx, -2.5)}
                            className="foco-touch rounded-lg border border-white/15 text-sm" aria-label={'Diminuir 2,5 kg da série ' + set.set_number}>−2,5</button>}
                          {showLoad && <button type="button" onClick={() => handleQuickAddLoad(exIdx, idx, 2.5)}
                            className="foco-touch rounded-lg border border-white/15 text-sm" aria-label={'Aumentar 2,5 kg da série ' + set.set_number}>+2,5</button>}
                          {exercise.sets.length > 1 && (
                            <button type="button" onClick={() => handleRemoveSet(exIdx, idx)}
                              className="foco-touch rounded-lg border border-white/15" aria-label={'Remover série ' + set.set_number}><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-neutral-500">Estimativas de 1RM são aproximadas e não devem determinar cargas automaticamente.</p>
                  </div>
                </div>
              </details>

            </section>
          );
        })}
      </div>

      {/* Feedback opcional ajuda o motor a ajustar progressão por resposta individual. */}
      {sessionStarted && (
        <section className="foco-v4-panel space-y-3 p-4 sm:p-5" aria-labelledby="foco-perception-title">
          <div>
            <h2 id="foco-perception-title" className="text-sm font-extrabold">Como foi o treino?</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">Opcional. Seu feedback ajuda a IA a interpretar o histórico e ajustar a próxima ficha.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-neutral-300">Esforço percebido
              <select value={perceivedEffort} onChange={(event) => setPerceivedEffort(event.target.value)}
                className="foco-v4-field mt-2 w-full">
                <option value="">Não informar</option>
                <option value="leve (RPE 3-4)">Leve</option>
                <option value="moderado (RPE 5-6)">Moderado</option>
                <option value="alto (RPE 7-8)">Alto</option>
                <option value="muito alto (RPE 9-10)">Muito alto</option>
              </select>
            </label>
            <label className="text-xs font-bold text-neutral-300">Desempenho
              <select value={sessionPerformance} onChange={(event) => setSessionPerformance(event.target.value)}
                className="foco-v4-field mt-2 w-full">
                <option value="">Não informar</option>
                <option value="acima do esperado">Acima do esperado</option>
                <option value="dentro do esperado">Dentro do esperado</option>
                <option value="abaixo do esperado">Abaixo do esperado</option>
              </select>
            </label>
          </div>
        </section>
      )}
      {/* Session Notes */}
      <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
        <label htmlFor="workout-session-notes" className="block text-xs font-black text-white uppercase tracking-wider">
          Anotações do Treino de Hoje
        </label>
        <textarea
          id="workout-session-notes"
          rows={2}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Ex: Carga do supino excelente; boa contração nas escápulas."
          className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-white/10 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
        />
      </div>

      {/* Finalize Button */}
      {sessionStarted && (
        <div className="pt-2">
          <button
            onClick={handleFinishWorkout}
            disabled={isSaving}
            className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-2xl active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-black" />
            <span>{isSaving ? 'Gravando no Banco...' : 'Concluir e Salvar Treino'}</span>
          </button>
        </div>
      )}

      </div>
      </details>}

      {/* Workout Completed Modal (Monochrome Luxury) */}
      {sessionCompletedModal && (
        <AccessibleDialog title="Treino concluído e registrado" onClose={() => { setSessionCompletedModal(null); setActiveTab('dashboard'); }}>
          <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl border border-white/20 bg-[#141414] p-5 text-center shadow-2xl sm:p-6">
            <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center mx-auto shadow-xl">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Treino Concluído
              </span>
              <h3 className="text-2xl font-black text-white mt-1">Sessão Registrada!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Suas séries e cargas foram salvas no banco de dados e adicionadas ao ciclo de sobrecarga progressiva.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-[#0A0A0A] border border-white/10 font-mono">
              <div>
                <p className="text-[9px] text-neutral-500 uppercase font-bold">DURAÇÃO</p>
                <p className="text-xs font-black text-white mt-0.5">
                  {Math.round(sessionCompletedModal.duration / 60)} min
                </p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-500 uppercase font-bold">SÉRIES</p>
                <p className="text-xs font-black text-white mt-0.5">
                  {sessionCompletedModal.setsDone}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-500 uppercase font-bold">VOLUME</p>
                <p className="text-xs font-black text-white mt-0.5 tabular-nums">
                  {Math.round(sessionCompletedModal.tonnage)} kg
                </p>
              </div>
            </div>

            {storyPreviewUrl && (
              <a href={storyPreviewUrl} target="_blank" rel="noopener noreferrer" className="mx-auto block w-[112px] overflow-hidden rounded-xl border border-white/20 shadow-2xl" aria-label="Abrir prévia do Story em tamanho completo">
                <img src={storyPreviewUrl} alt="Prévia do Story de treino FOCO — toque para ampliar" className="block h-auto w-full" />
              </a>
            )}
            {errorAlert && <p role="alert" className="text-sm text-white">{errorAlert}</p>}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => shareStory(false)} className="w-full py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2"><Share2 className="w-4 h-4" /> Compartilhar Story</button>
              <button type="button" onClick={() => shareStory(true)} className="w-full py-3 rounded-xl border border-white/20 text-white font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Salvar imagem 1080 × 1920</button>
              <button
                onClick={() => {
                  setSessionCompletedModal(null);
                  setActiveTab('dashboard');
                }}
                className="w-full py-3.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors shadow-lg active:scale-95"
              >
                Voltar ao Painel Principal
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
};
