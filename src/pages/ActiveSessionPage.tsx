import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkoutPlan, WorkoutExercise } from '../types';
import { useRestTimer } from '../context/RestTimerContext';
import { soundEngine } from '../utils/soundEngine';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { getPreferredTrainingDay, getTrainingDayLabel, savePreferredTrainingDay, TRAINING_DAYS } from '../data/exerciseLibrary';
import {
  Play,
  Pause,
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
  exercise_name: string;
  muscle_group: string;
  rest_seconds: number;
  sets: SetLog[];
}

export const ActiveSessionPage: React.FC<ActiveSessionProps> = ({ setActiveTab }) => {
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
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
  const [selectedTrainingDay, setSelectedTrainingDay] = useState<string>(() => getPreferredTrainingDay());
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionCompletedModal, setSessionCompletedModal] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Stopwatch interval for entire workout
  useEffect(() => {
    let interval: any = null;
    if (sessionStarted) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted]);

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

  const initExerciseLogs = (exercises: WorkoutExercise[]) => {
    const logs: ExerciseLog[] = exercises.map((ex) => ({
      exercise_name: ex.exercise_name,
      muscle_group: ex.muscle_group,
      rest_seconds: ex.rest_seconds || 60,
      sets: Array.from({ length: ex.sets || 3 }).map((_, idx) => ({
        set_number: idx + 1,
        repetitions: ex.reps_min || 10,
        load_kg: ex.suggested_load_kg || 0,
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

  const handleStartWorkout = () => {
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
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
    soundEngine.initContext();

    if (!sessionStarted) {
      handleStartWorkout();
    }

    setExerciseLogs((prev) => {
      const copy = [...prev];
      const targetSet = copy[exIdx].sets[setIdx];
      const nextCompleted = !targetSet.completed;
      targetSet.completed = nextCompleted;

      if (nextCompleted) {
        soundEngine.playCheckmarkClick();
        if (autoRestEnabled) {
          const restDuration = copy[exIdx].rest_seconds || 60;
          startTimer(restDuration, copy[exIdx].exercise_name, targetSet.set_number);
        }
      }

      return copy;
    });
  };

  const handleUpdateSet = (
    exIdx: number,
    setIdx: number,
    field: 'load_kg' | 'repetitions' | 'rpe',
    value: number
  ) => {
    setExerciseLogs((prev) => {
      const copy = [...prev];
      copy[exIdx].sets[setIdx][field] = value;
      return copy;
    });
  };

  const handleQuickAddLoad = (exIdx: number, setIdx: number, delta: number) => {
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    setExerciseLogs((prev) => {
      const copy = [...prev];
      const current = Number(copy[exIdx].sets[setIdx].load_kg) || 0;
      copy[exIdx].sets[setIdx].load_kg = Math.max(0, current + delta);
      return copy;
    });
  };

  const handleChangeExerciseRest = (exIdx: number, seconds: number) => {
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    setExerciseLogs((prev) => {
      const copy = [...prev];
      copy[exIdx].rest_seconds = seconds;
      return copy;
    });
  };

  const handleAddSet = (exIdx: number) => {
    soundEngine.initContext();
    soundEngine.playCheckmarkClick();
    setExerciseLogs((prev) => {
      const copy = [...prev];
      const currentSets = copy[exIdx].sets;
      const lastSet = currentSets[currentSets.length - 1];
      currentSets.push({
        set_number: currentSets.length + 1,
        repetitions: lastSet ? lastSet.repetitions : 10,
        load_kg: lastSet ? lastSet.load_kg : 20,
        completed: false,
        rpe: 8,
      });
      return copy;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExerciseLogs((prev) => {
      const copy = [...prev];
      if (copy[exIdx].sets.length > 1) {
        copy[exIdx].sets.splice(setIdx, 1);
        copy[exIdx].sets.forEach((s, i) => {
          s.set_number = i + 1;
        });
      }
      return copy;
    });
  };

  const handleFinishWorkout = async () => {
    if (!sessionStarted && elapsedSeconds === 0) {
      setErrorAlert('Inicie o treino antes de finalizar.');
      return;
    }

    setIsSaving(true);
    try {
      const flatSets: { exercise_name: string; set_number: number; repetitions: number; load_kg: number; completed: boolean }[] = [];
      let totalTonnage = 0;
      let completedSetsCount = 0;

      exerciseLogs.forEach((ex) => {
        ex.sets.forEach((s) => {
          flatSets.push({
            exercise_name: ex.exercise_name,
            set_number: s.set_number,
            repetitions: Number(s.repetitions) || 0,
            load_kg: Number(s.load_kg) || 0,
            completed: s.completed,
          });
          if (s.completed) {
            completedSetsCount++;
            totalTonnage += (Number(s.repetitions) || 0) * (Number(s.load_kg) || 0);
          }
        });
      });

      const res = await api.recordSession({
        plan_id: activePlan?.id,
        plan_name: activePlan?.name || 'Treino Livre',
        started_at: (sessionStartTime || new Date()).toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: elapsedSeconds,
        notes: sessionNotes,
        status: 'completed',
        sets: flatSets,
      });

      setSessionStarted(false);
      skipTimer();

      // Som e vibração festiva de conclusão
      soundEngine.playWorkoutCompletedChime();

      setSessionCompletedModal({
        duration: elapsedSeconds,
        tonnage: totalTonnage,
        setsDone: completedSetsCount,
        session: res,
      });
    } catch (err: any) {
      setErrorAlert('Erro ao gravar treino no banco: ' + err.message);
    } finally {
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
    return acc + ex.sets.reduce((setAcc, s) => (s.completed ? setAcc + (s.load_kg * s.repetitions) : setAcc), 0);
  }, 0);

  const currentTotalSetsDone = exerciseLogs.reduce((acc, ex) => {
    return acc + ex.sets.filter((s) => s.completed).length;
  }, 0);

  const currentTotalSets = exerciseLogs.reduce((acc, ex) => acc + ex.sets.length, 0);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-neutral-400">
        <Clock className="w-8 h-8 animate-spin mx-auto text-white mb-3" />
        <p className="text-xs font-mono">Carregando sessão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-36 max-w-md mx-auto">
      
      {/* Top Controller Header (Monochrome Luxury) */}
      <div className="sticky top-12 z-20 p-4 rounded-2xl bg-[#0A0A0A]/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sessionStarted ? 'bg-white animate-ping' : 'bg-neutral-600'}`} />
              <span className="text-[10px] uppercase font-black tracking-widest text-white">
                {sessionStarted ? 'Treino em Andamento' : 'Sessão Pronta'}
              </span>
            </div>
            <h2 className="text-base font-black text-white truncate max-w-[200px] sm:max-w-[240px]">
              {activePlan?.name || 'Treino Livre'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!sessionStarted ? (
              <button
                onClick={handleStartWorkout}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current text-black" />
                <span>Iniciar</span>
              </button>
            ) : (
              <button
                onClick={handleFinishWorkout}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                <span>{isSaving ? 'Gravando...' : 'Concluir'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="foco-training-day" className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">Dia do treino</label>
            <p className="mt-1 text-[10px] text-neutral-600">{sessionStarted ? 'Dia bloqueado durante a sessão' : 'A sessão mostra os exercícios atribuídos a este dia.'}</p>
          </div>
          <select
            id="foco-training-day"
            value={selectedTrainingDay}
            disabled={sessionStarted}
            onChange={(event) => { setSelectedTrainingDay(event.target.value); savePreferredTrainingDay(event.target.value); }}
            className="w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {TRAINING_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
        </div>

        {/* Real-time stats bar (Duração, Séries Feitas, Carga Total) */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#141414] border border-white/10">
            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="font-mono tabular-nums leading-tight min-w-0">
              <span className="text-[9px] text-neutral-500 block uppercase font-bold">Tempo</span>
              <span className="text-xs font-black text-white">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#141414] border border-white/10">
            <Flame className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="font-mono tabular-nums leading-tight min-w-0">
              <span className="text-[9px] text-neutral-500 block uppercase font-bold">Volume</span>
              <span className="text-xs font-black text-white truncate">{Math.round(currentTotalTonnage)} kg</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#141414] border border-white/10">
            <Zap className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="font-mono tabular-nums leading-tight min-w-0">
              <span className="text-[9px] text-neutral-500 block uppercase font-bold">Séries</span>
              <span className="text-xs font-black text-white">{currentTotalSetsDone}/{currentTotalSets}</span>
            </div>
          </div>
        </div>

        {/* Sound & Auto-Rest Settings bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
          <button
            onClick={() => setAutoRestEnabled(!autoRestEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
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
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
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
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-[10px] font-bold cursor-pointer transition-colors"
              title="Testar som do cronômetro no fone/alto-falante"
            >
              Testar Beep
            </button>
          </div>
        </div>

        {errorAlert && (
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs flex items-center justify-between">
            <span>{errorAlert}</span>
            <button onClick={() => setErrorAlert(null)} className="font-bold text-white ml-2">✕</button>
          </div>
        )}
      </div>

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
          const isAllDone = completedCount === exercise.sets.length;

          return (
            <div
              key={exIdx}
              className={`p-4 rounded-2xl border transition-all ${
                isAllDone
                  ? 'bg-[#121212]/90 border-white/30'
                  : 'bg-[#141414] border-white/10'
              }`}
            >
              {/* Exercise Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span>{exercise.muscle_group}</span>
                    <span>·</span>
                    <span className="font-mono">{completedCount}/{exercise.sets.length} séries feitas</span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-0.5 truncate">
                    {exercise.exercise_name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
<ExerciseIllustration exerciseName={exercise.exercise_name} muscleGroup={exercise.muscle_group} className="h-14 w-14 shrink-0" />
                  <button
                    onClick={() => handleAddSet(exIdx)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Adicionar Série Extra"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Rest Selector for this Exercise */}
              <div className="flex items-center justify-between py-2 border-b border-white/5 text-[10px] font-mono">
                <span className="text-neutral-500 uppercase font-bold flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Descanso Padrão:
                </span>
                <div className="flex items-center gap-1">
                  {[45, 60, 90, 120].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleChangeExerciseRest(exIdx, sec)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        exercise.rest_seconds === sec
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-neutral-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Sets Table */}
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-neutral-500 font-semibold border-b border-white/5 text-[10px]">
                      <th className="py-2 px-1 w-12">SÉRIE</th>
                      <th className="py-2 px-1">CARGA</th>
                      <th className="py-2 px-1">REPS</th>
                      <th className="py-2 px-1">1RM EST.</th>
                      <th className="py-2 px-1 text-right">FEITO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {exercise.sets.map((set, setIdx) => {
                      const estimated1RM = calculateEstimated1RM(set.load_kg, set.repetitions);

                      return (
                        <tr
                          key={setIdx}
                          className={`transition-colors ${set.completed ? 'bg-white/5' : ''}`}
                        >
                          {/* Set number */}
                          <td className="py-2.5 px-1 font-mono font-bold text-neutral-400">
                            #{set.set_number}
                          </td>

                          {/* Load with quick +/- buttons */}
                          <td className="py-2.5 px-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                value={set.load_kg === 0 ? '' : set.load_kg}
                                placeholder="0"
                                onChange={(e) =>
                                  handleUpdateSet(exIdx, setIdx, 'load_kg', parseFloat(e.target.value) || 0)
                                }
                                className="w-14 px-2 py-1.5 rounded-lg bg-[#0A0A0A] border border-white/10 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white text-center"
                              />
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddLoad(exIdx, setIdx, 2.5)}
                                  className="px-1 py-0.2 rounded bg-white/5 hover:bg-white/15 text-[8px] font-mono text-neutral-400 hover:text-white border border-white/5"
                                  title="+2.5kg"
                                >
                                  +2.5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddLoad(exIdx, setIdx, -2.5)}
                                  className="px-1 py-0.2 rounded bg-white/5 hover:bg-white/15 text-[8px] font-mono text-neutral-400 hover:text-white border border-white/5"
                                  title="-2.5kg"
                                >
                                  -2.5
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Repetitions */}
                          <td className="py-2.5 px-1">
                            <input
                              type="number"
                              value={set.repetitions === 0 ? '' : set.repetitions}
                              placeholder="0"
                              onChange={(e) =>
                                handleUpdateSet(exIdx, setIdx, 'repetitions', parseInt(e.target.value) || 0)
                              }
                              className="w-12 px-2 py-1.5 rounded-lg bg-[#0A0A0A] border border-white/10 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white text-center"
                            />
                          </td>

                          {/* Estimated 1RM */}
                          <td className="py-2.5 px-1 font-mono text-[11px] tabular-nums text-neutral-400">
                            {estimated1RM > 0 ? (
                              <span className="text-white font-bold">~{estimated1RM}kg</span>
                            ) : (
                              <span className="text-neutral-600">--</span>
                            )}
                          </td>

                          {/* Completion Checkmark (Ergonomic 44x44px Touch Target) */}
                          <td className="py-2.5 px-1 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                                  set.completed
                                    ? 'bg-white text-black font-black shadow-lg ring-2 ring-white/50'
                                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/15'
                                }`}
                                title={set.completed ? 'Série concluída! (Clique para desmarcar)' : 'Marcar série e disparar descanso'}
                              >
                                <CheckCircle2 className={`w-5 h-5 ${set.completed ? 'text-black' : ''}`} />
                              </button>
                              {exercise.sets.length > 1 && (
                                <button
                                  onClick={() => handleRemoveSet(exIdx, setIdx)}
                                  className="p-1.5 text-neutral-600 hover:text-white rounded transition-colors"
                                  title="Remover série"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Notes */}
      <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
        <label className="block text-xs font-black text-white uppercase tracking-wider">
          Anotações do Treino de Hoje
        </label>
        <textarea
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

      {/* Workout Completed Modal (Monochrome Luxury) */}
      {sessionCompletedModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/20 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl">
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

            <div className="flex flex-col gap-2">
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
        </div>
      )}
    </div>
  );
};
