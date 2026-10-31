import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { getTrainingDayLabel, getCurrentTrainingDay, TRAINING_DAYS } from '../data/exerciseLibrary';
import { useAuth } from '../context/AuthContext';
import { loadWorkoutDraft } from '../utils/workoutDraft';
import { WorkoutExercise, WorkoutPlan, WorkoutSession } from '../types';
import {
  Dumbbell,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';

interface WorkoutsPageProps {
  setActiveTab: (tab: string) => void;
}

export const WorkoutsPage: React.FC<WorkoutsPageProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expandedWeekDay, setExpandedWeekDay] = useState<string>(() => getCurrentTrainingDay());
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [savingDayKey, setSavingDayKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWorkouts();
      setPlans(data);
      void api.getSessions().then(setSessions).catch(() => setSessions([]));
      if (data.length > 0 && !expandedPlanId) {
        setExpandedPlanId(data[0].id);
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: 'Erro ao carregar fichas: ' + e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      await api.activateWorkout(id);
      setActionMsg({ type: 'success', text: 'Ficha ativada com sucesso!' });
      loadPlans();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: 'Falha ao ativar ficha: ' + e.message });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm('Excluir a ficha “' + name + '”? Esta ação não pode ser desfeita.')) return;
    try {
      await api.deleteWorkout(id);
      setActionMsg({ type: 'success', text: 'Ficha excluída com sucesso.' });
      loadPlans();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: 'Falha ao excluir ficha: ' + e.message });
    }
  };

  const handleTrainingDayChange = async (
    planId: string,
    exerciseId: string,
    value: string
  ) => {
    const savingKey = `${planId}:${exerciseId}`;
    const trainingDay = (value || null) as WorkoutExercise['training_day'];
    setSavingDayKey(savingKey);
    setActionMsg(null);
    try {
      const saved = await api.updateExerciseTrainingDay(planId, exerciseId, trainingDay);
      setPlans((current) => current.map((plan) => plan.id !== planId ? plan : {
        ...plan,
        exercises: (plan.exercises || []).map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, training_day: saved.training_day || null } : exercise
        ),
      }));
      setActionMsg({
        type: 'success',
        text: trainingDay
          ? `${saved.exercise_name} foi atribuído a ${getTrainingDayLabel(trainingDay)}.`
          : `${saved.exercise_name} ficará disponível em qualquer dia.`,
      });
    } catch (e: unknown) {
      setActionMsg({
        type: 'error',
        text: e instanceof Error ? e.message : 'Não foi possível atualizar o dia do exercício.',
      });
    } finally {
      setSavingDayKey(null);
    }
  };

  // Escolher um treino para esta sessão não altera os dias cadastrados da ficha.
  const activePlan = plans.find(plan => plan.status === 'ativo');
  const planExercises = activePlan?.exercises || [];
  const usesWeekdays = planExercises.some(ex => Boolean(ex.training_day));
  const weeklyCards = usesWeekdays
    ? TRAINING_DAYS.map(day => ({
        ...day,
        exercises: planExercises.filter(ex => ex.training_day === day.value || !ex.training_day),
        assigned: planExercises.filter(ex => ex.training_day === day.value).length,
      })).filter(day => day.assigned > 0)
    : planExercises.length > 0
      ? [{ ...TRAINING_DAYS[0], value: 'segunda', label: 'Treino flexível', exercises: planExercises, assigned: planExercises.length }]
      : [];

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  const completedPlannedDays = new Set<string>();
  sessions.forEach(session => {
    const date = new Date(session.started_at);
    if (session.status !== 'completed' || session.plan_id !== activePlan?.id
      || date < weekStart || date >= nextWeekStart) return;
    const matched = session.notes?.match(/\[FOCO:TREINO_DIA=(segunda|terca|quarta|quinta|sexta|sabado|domingo)\]/);
    if (matched?.[1]) completedPlannedDays.add(matched[1]);
  });

  const selectSession = (day: string) => {
    // Preserve an unfinished workout rather than replacing its exercise log.
    if (user?.id && loadWorkoutDraft(user.id)) {
      setActionMsg({ type: 'error', text: 'Existe um treino em andamento. Conclui a sessão atual antes de escolher outra ficha.' });
      return;
    }
    try { sessionStorage.setItem('foco_next_training_day', day); } catch {
      setActionMsg({ type: 'error', text: 'Não foi possível selecionar o treino neste navegador. Abre a sessão e usa o seletor de dia.' });
      return;
    }
    setActiveTab('sessao');
  };

  return (
    <div className="foco-v4-page space-y-5 text-white">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <><p className="foco-v4-eyebrow mb-2">FOCO / SEU PLANEJAMENTO</p><h1 className="foco-v4-heading">Meus treinos</h1></>
          <p className="text-xs text-neutral-400 mt-0.5">
            Consulte seus planos, escolha a ficha ativa e inicie o próximo treino.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('biblioteca')}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer border border-white/15 transition-all"
          >
            Biblioteca de exercícios
          </button>
          <button
            onClick={() => setActiveTab('novo-treino')}
            className="foco-v4-action !rounded-2xl"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Ficha</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}


      {/* Galeria de treinos da semana — escolha manual, sem remanejamento automático. */}
      {!isLoading && activePlan && (
        <section className="foco-v4-panel space-y-4 p-4 sm:p-5" aria-labelledby="foco-weekly-heading">
          <div>
            <p className="foco-v4-eyebrow">Escolha livre</p>
            <h2 id="foco-weekly-heading" className="mt-2 text-xl font-black tracking-tight">Treinos da semana</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Escolhe qualquer treino para fazer hoje. O FOCO não muda os outros dias nem inicia a sessão automaticamente.
            </p>
          </div>
          {weeklyCards.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {weeklyCards.map(day => {
                const expanded = expandedWeekDay === day.value;
                const groups = [...new Set(day.exercises.map(ex => ex.muscle_group).filter(Boolean))];
                const completed = completedPlannedDays.has(day.value);
                return (
                  <article key={day.value} className={'min-w-0 overflow-hidden rounded-2xl border bg-[#101010] ' + (expanded ? 'border-white/45' : 'border-white/15')}>
                    <button type="button" aria-expanded={expanded} onClick={() => setExpandedWeekDay(expanded ? '' : day.value)}
                      className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-white/5">
                      {day.exercises[0] && <ExerciseIllustration exerciseName={day.exercises[0].exercise_name}
                        muscleGroup={day.exercises[0].muscle_group} className="h-16 w-16 shrink-0" />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          <CalendarDays className="h-3.5 w-3.5" /> {day.label}
                        </span>
                        <span className="mt-1 block break-words text-base font-black leading-snug">
                          {groups.length ? groups.join(' + ') : activePlan.name}
                        </span>
                        <span className="mt-1 block text-xs text-neutral-400">
                          {day.exercises.length} exercícios {completed ? '· Realizado nesta semana' : ''}
                        </span>
                      </span>
                      {completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-white" /> : expanded ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
                    </button>
                    {expanded && (
                      <div className="border-t border-white/10 p-3.5">
                        <ol className="space-y-2">
                          {day.exercises.map((ex, index) => (
                            <li key={ex.id || ex.exercise_name + index} className="rounded-xl border border-white/10 bg-white/[.035] p-3">
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">{index + 1}</span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold">{ex.exercise_name}</span>
                                  <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                                    {ex.sets || 3} séries · {ex.reps_min || 10}{ex.reps_max && ex.reps_max !== ex.reps_min ? '–' + ex.reps_max : ''} repetições · {ex.rest_seconds || 60}s descanso
                                  </span>
                                </span>
                              </div>
                            </li>
                          ))}
                        </ol>
                        <button type="button" onClick={() => selectSession(day.value)}
                          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black active:scale-[.98]">
                          <Play className="h-4 w-4 fill-current" /> Escolher este treino
                        </button>
                        <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-400">
                          Tu confere a sessão antes de tocar em Iniciar. Os outros treinos permanecem como estão.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : <p className="rounded-xl border border-white/10 p-4 text-sm text-neutral-300">A ficha ativa ainda não tem exercícios cadastrados.</p>}
        </section>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="py-16 text-center text-neutral-500 text-xs font-mono">
          Carregando fichas de treino...
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#141414] border border-dashed border-white/10 space-y-4">
          <Dumbbell className="w-12 h-12 text-neutral-500 mx-auto" />
          <div>
            <h3 className="text-base font-black uppercase text-white">Nenhuma ficha cadastrada</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
              Gere uma ficha personalizada usando o Gemini 2.5 Flash ou faça upload de fotos da sua ficha de academia.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveTab('novo-treino')}
              className="px-4 py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Montar com IA
            </button>
            <button
              onClick={() => setActiveTab('arquivos')}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
            >
              Digitalizar Ficha
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const isActive = plan.status === 'ativo';

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-[#141414] border-white/40 shadow-lg'
                    : 'bg-[#141414]/70 border-white/10'
                }`}
              >
                {/* Plan Card Summary Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white text-black font-black'
                          : 'bg-white/5 text-neutral-400 border border-white/10'
                      }`}
                    >
                      <Dumbbell className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white uppercase">{plan.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-white text-black text-[10px] font-black uppercase tracking-wider">
                            Ativa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 font-mono">
                        <span>Frequência: {plan.weekly_frequency}x/sem</span>
                        <span>·</span>
                        <span>Objetivo: {plan.goal}</span>
                        <span>·</span>
                        <span>{plan.exercises?.length || 0} exercícios</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleActivate(plan.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-colors cursor-pointer"
                      >
                        Tornar Ficha Ativa
                      </button>
                    )}

                    {isActive && (
                      <button
                        onClick={() => setActiveTab('sessao')}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Treinar Agora</span>
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white cursor-pointer"
                      title={isExpanded ? 'Recolher' : 'Ver Exercícios'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDelete(plan.id, plan.name)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title="Excluir Ficha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Exercises Detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/10">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">
                      Grade de Exercícios e Séries
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-neutral-500 border-b border-white/10 font-bold uppercase text-[10px]">
                            <th className="py-2 px-2">EXERCÍCIO</th>
                            <th className="py-2 px-2">GRUPAMENTO</th>
                            <th className="py-2 px-2">DIA</th>
                            <th className="py-2 px-2">SÉRIES</th>
                            <th className="py-2 px-2">FAIXA DE REPS</th>
                            <th className="py-2 px-2">CARGA</th>
                            <th className="py-2 px-2">DESCANSO</th>
                            <th className="py-2 px-2">OBSERVAÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {(plan.exercises || []).map((ex, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-2 font-sans font-bold text-white">
                                <div className="flex min-w-[190px] items-center gap-2.5">
                                  <ExerciseIllustration exerciseName={ex.exercise_name} muscleGroup={ex.muscle_group} className="h-16 w-16 shrink-0" />
                                  <span>
                                    <span className="block">{ex.exercise_name}</span>
                                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-neutral-500">{getTrainingDayLabel(ex.training_day)}</span>
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400 font-sans">
                                {ex.muscle_group}
                              </td>
                              <td className="py-2.5 px-2">
                                <select
                                  aria-label={`Dia de treino para ${ex.exercise_name}`}
                                  value={ex.training_day || ''}
                                  disabled={!ex.id || savingDayKey !== null}
                                  onChange={(event) => ex.id && handleTrainingDayChange(plan.id, ex.id, event.target.value)}
                                  className="min-w-[130px] rounded-lg border border-white/10 bg-[#101010] px-2.5 py-2 text-[10px] font-bold text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="">Qualquer dia</option>
                                  {TRAINING_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                                </select>
                                {savingDayKey === `${plan.id}:${ex.id}` && <span className="mt-1 block text-[9px] text-neutral-500">Salvando...</span>}
                              </td>
                              <td className="py-2.5 px-2 text-white font-black">
                                {ex.sets}
                              </td>
                              <td className="py-2.5 px-2 text-neutral-300">
                                {ex.reps_min} - {ex.reps_max}
                              </td>
                              <td className="py-2.5 px-2 text-white font-bold">
                                {ex.suggested_load_kg ? `${ex.suggested_load_kg} kg` : '--'}
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400">
                                {ex.rest_seconds}s
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400 font-sans truncate max-w-[200px]">
                                {ex.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
