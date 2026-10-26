import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkoutPlan, WorkoutExercise } from '../types';
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
  Rotate3d,
} from 'lucide-react';

interface ActiveSessionProps {
  setActiveTab: (tab: string) => void;
  onOpenExercise3D?: (exName: string, group: string) => void;
}

interface SetLog {
  set_number: number;
  repetitions: number;
  load_kg: number;
  completed: boolean;
}

interface ExerciseLog {
  exercise_name: string;
  muscle_group: string;
  rest_seconds: number;
  sets: SetLog[];
}

export const ActiveSessionPage: React.FC<ActiveSessionProps> = ({ setActiveTab, onOpenExercise3D }) => {
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rest Timer State
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const [restTimerActive, setRestTimerActive] = useState(false);

  // Exercise state for the session
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionCompletedModal, setSessionCompletedModal] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Stopwatch interval
  useEffect(() => {
    let interval: any = null;
    if (sessionStarted) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted]);

  // Rest Timer interval
  useEffect(() => {
    let interval: any = null;
    if (restTimerActive && restSecondsRemaining !== null && restSecondsRemaining > 0) {
      interval = setInterval(() => {
        setRestSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setRestTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restSecondsRemaining]);

  // Load active plan on mount
  useEffect(() => {
    async function loadPlan() {
      try {
        const plan = await api.getActiveWorkout();
        setActivePlan(plan);
        if (plan && plan.exercises && plan.exercises.length > 0) {
          initExerciseLogs(plan.exercises);
        }
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
      })),
    }));
    setExerciseLogs(logs);
  };

  const handleStartWorkout = () => {
    setSessionStarted(true);
    setSessionStartTime(new Date());
    setElapsedSeconds(0);
  };

  const handleToggleSetComplete = (exIdx: number, setIdx: number) => {
    if (!sessionStarted) {
      handleStartWorkout();
    }

    setExerciseLogs((prev) => {
      const copy = [...prev];
      const targetSet = copy[exIdx].sets[setIdx];
      const nextCompleted = !targetSet.completed;
      targetSet.completed = nextCompleted;

      if (nextCompleted) {
        const restDuration = copy[exIdx].rest_seconds || 60;
        setRestSecondsRemaining(restDuration);
        setRestTimerActive(true);
      }

      return copy;
    });
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, field: 'load_kg' | 'repetitions', value: number) => {
    setExerciseLogs((prev) => {
      const copy = [...prev];
      copy[exIdx].sets[setIdx][field] = value;
      return copy;
    });
  };

  const handleAddSet = (exIdx: number) => {
    setExerciseLogs((prev) => {
      const copy = [...prev];
      const currentSets = copy[exIdx].sets;
      const lastSet = currentSets[currentSets.length - 1];
      currentSets.push({
        set_number: currentSets.length + 1,
        repetitions: lastSet ? lastSet.repetitions : 10,
        load_kg: lastSet ? lastSet.load_kg : 20,
        completed: false,
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
      setRestTimerActive(false);

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

  if (isLoading) {
    return (
      <div className="py-20 text-center text-neutral-400">
        <Clock className="w-8 h-8 animate-spin mx-auto text-white mb-3" />
        <p className="text-xs font-mono">Carregando sessão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-32 max-w-md mx-auto">
      
      {/* Top Controller Header (Monochrome) */}
      <div className="sticky top-12 z-20 p-4 rounded-2xl bg-[#0E1015]/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sessionStarted ? 'bg-white animate-ping' : 'bg-neutral-600'}`} />
              <span className="text-[10px] uppercase font-black tracking-widest text-white">
                {sessionStarted ? 'Treino em Andamento' : 'Sessão Pronta'}
              </span>
            </div>
            <h2 className="text-base font-black text-white truncate max-w-[220px]">
              {activePlan?.name || 'Treino Livre'}
            </h2>
          </div>

          {!sessionStarted ? (
            <button
              onClick={handleStartWorkout}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current text-black" />
              <span>Iniciar</span>
            </button>
          ) : (
            <button
              onClick={handleFinishWorkout}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              <span>{isSaving ? 'Gravando...' : 'Concluir'}</span>
            </button>
          )}
        </div>

        {/* Stopwatch & Rest Timer Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#000000] border border-white/10">
            <Clock className="w-4 h-4 text-neutral-400" />
            <div className="font-mono tabular-nums leading-tight">
              <span className="text-[9px] text-neutral-500 block uppercase font-bold">Tempo</span>
              <span className="text-xs font-black text-white">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>

          <div className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
            restTimerActive && restSecondsRemaining !== null && restSecondsRemaining > 0
              ? 'bg-white text-black border-white'
              : 'bg-[#000000] border-white/10 text-neutral-400'
          }`}>
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <div className="font-mono tabular-nums leading-tight">
                <span className={`text-[9px] block uppercase font-bold ${restTimerActive ? 'text-neutral-700' : 'text-neutral-500'}`}>
                  Descanso
                </span>
                <span className={`text-xs font-black ${restTimerActive ? 'text-black' : 'text-white'}`}>
                  {restSecondsRemaining !== null ? `${restSecondsRemaining}s` : '--'}
                </span>
              </div>
            </div>

            {restTimerActive && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRestSecondsRemaining((prev) => Math.max(0, (prev || 0) + 15))}
                  className="px-1.5 py-0.5 rounded bg-black/10 text-[10px] font-bold text-black"
                >
                  +15s
                </button>
                <button
                  onClick={() => { setRestTimerActive(false); setRestSecondsRemaining(0); }}
                  className="px-1.5 py-0.5 rounded bg-black text-white text-[10px] font-bold"
                >
                  Pular
                </button>
              </div>
            )}
          </div>
        </div>

        {errorAlert && (
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs flex items-center justify-between">
            <span>{errorAlert}</span>
            <button onClick={() => setErrorAlert(null)} className="font-bold text-white ml-2">✕</button>
          </div>
        )}
      </div>

      {/* Exercises Log Grid */}
      <div className="space-y-4">
        {exerciseLogs.map((exercise, exIdx) => {
          const completedCount = exercise.sets.filter((s) => s.completed).length;
          const isAllDone = completedCount === exercise.sets.length;

          return (
            <div
              key={exIdx}
              className={`p-4 rounded-2xl border transition-all ${
                isAllDone
                  ? 'bg-[#0E1015]/70 border-white/30'
                  : 'bg-[#0E1015] border-white/10'
              }`}
            >
              {/* Exercise Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/5 gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span>{exercise.muscle_group}</span>
                    <span>·</span>
                    <span className="font-mono">{exercise.rest_seconds}s descanso</span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-0.5 truncate">
                    {exercise.exercise_name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenExercise3D && (
                    <button
                      onClick={() => onOpenExercise3D(exercise.exercise_name, exercise.muscle_group)}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-white/10"
                    >
                      <Rotate3d className="w-3 h-3" />
                      <span>3D</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleAddSet(exIdx)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Adicionar Série Extra"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
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
                      <th className="py-2 px-1 text-right">FEITO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {exercise.sets.map((set, setIdx) => (
                      <tr
                        key={setIdx}
                        className={`transition-colors ${set.completed ? 'bg-white/5' : ''}`}
                      >
                        <td className="py-2 px-1 font-mono font-bold text-neutral-400">
                          #{set.set_number}
                        </td>
                        <td className="py-2 px-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={set.load_kg}
                              onChange={(e) =>
                                handleUpdateSet(exIdx, setIdx, 'load_kg', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-2 py-1 rounded-lg bg-[#000000] border border-white/10 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white"
                            />
                            <span className="text-neutral-500 text-[10px]">kg</span>
                          </div>
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            value={set.repetitions}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, setIdx, 'repetitions', parseInt(e.target.value) || 0)
                            }
                            className="w-14 px-2 py-1 rounded-lg bg-[#000000] border border-white/10 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white"
                          />
                        </td>
                        <td className="py-2 px-1 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                set.completed
                                  ? 'bg-white text-black font-bold shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            {exercise.sets.length > 1 && (
                              <button
                                onClick={() => handleRemoveSet(exIdx, setIdx)}
                                className="p-1 text-neutral-600 hover:text-white rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Session Notes */}
      <div className="p-4 rounded-2xl bg-[#0E1015] border border-white/10 space-y-2">
        <label className="block text-xs font-black text-white uppercase tracking-wider">
          Anotações do Treino de Hoje
        </label>
        <textarea
          rows={2}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Ex: Carga do supino excelente; boa contração nas escápulas."
          className="w-full px-3 py-2 rounded-xl bg-[#000000] border border-white/10 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
        />
      </div>

      {/* Finalize Button */}
      {sessionStarted && (
        <div className="pt-2">
          <button
            onClick={handleFinishWorkout}
            disabled={isSaving}
            className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-2xl transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-black" />
            <span>{isSaving ? 'Gravando no Banco...' : 'Concluir e Salvar Treino'}</span>
          </button>
        </div>
      )}

      {/* Workout Completed Modal (Monochrome) */}
      {sessionCompletedModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E1015] border border-white/20 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center mx-auto shadow-xl">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Treino Concluído
              </span>
              <h3 className="text-2xl font-black text-white mt-1">Sessão Registrada!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Suas séries e cargas foram salvas no banco de dados e adicionadas ao ciclo de sobrecarga.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-[#000000] border border-white/10 font-mono">
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
                <p className="text-[9px] text-neutral-500 uppercase font-bold">TONELAGEM</p>
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
                className="w-full py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
              >
                Voltar ao Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
