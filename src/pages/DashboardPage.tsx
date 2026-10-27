import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { WorkoutPlan, WorkoutSession, Goal, AIRecommendation } from '../types';
import {
  Play,
  Dumbbell,
  Sparkles,
  TrendingUp,
  Clock3,
  ArrowRight,
  Activity,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Target,
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user, profile } = useAuth();
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [plan, userSessions, userGoals, userRecs] = await Promise.all([
          api.getActiveWorkout(),
          api.getSessions(),
          api.getGoals(),
          api.getRecommendations(),
        ]);
        if (!active) return;
        setActivePlan(plan);
        setSessions(userSessions);
        setGoals(userGoals);
        setRecommendations(userRecs);
      } catch (error) {
        console.error('Não foi possível carregar o painel FOCO:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  const completedSessions = sessions.filter((session) => session.status === 'completed');
  const pendingRec = recommendations.find((recommendation) => recommendation.status === 'pending');
  const exercises = activePlan?.exercises || [];
  const muscleChips = Array.from(new Set(exercises.map((exercise) => exercise.muscle_group)))
    .slice(0, 5)
    .map((name) => ({
      name,
      count: exercises.filter((exercise) => exercise.muscle_group === name).length,
    }));
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'atleta';

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5 pb-32">
        <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-[#141414]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[#141414]" />
          <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[#141414]" />
          <div className="hidden h-24 animate-pulse rounded-2xl border border-white/10 bg-[#141414] sm:block" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-32 text-white">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">Seu espaço de evolução</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {'Olá, ' + firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
            {activePlan
              ? 'Sua evolução começa no próximo treino. Confira sua ficha e registre cada série.'
              : 'Vamos configurar seu perfil para criar uma ficha de treino feita para sua rotina e seus objetivos.'}
          </p>
        </div>
        {activePlan && (
          <button type="button" onClick={() => setActiveTab('treinos')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black transition hover:bg-white/10">
            <Dumbbell className="h-4 w-4" /> Minhas fichas
          </button>
        )}
      </header>

      {activePlan && (
        <section aria-labelledby="foco-workout-today" className="overflow-hidden rounded-3xl border border-white/15 bg-[#171717] p-5 shadow-lg sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <p className="foco-eyebrow">Seu treino disponível</p>
              <h2 id="foco-workout-today" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{activePlan.name}</h2>
              <p className="text-sm text-neutral-300">{exercises.length} exercícios · {activePlan.weekly_frequency} treinos por semana</p>
            </div>
            <button type="button" onClick={() => setActiveTab('sessao')} className="foco-action w-full shrink-0 sm:w-auto">
              <Play className="h-5 w-5 fill-current" aria-hidden="true" /> Iniciar treino <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {pendingRec && (
        <section className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-[#141414] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2 text-black"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h2 className="text-sm font-black">Sua revisão de treino está pronta</h2>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">{pendingRec.explanation}</p>
            </div>
          </div>
          <button type="button" onClick={() => setActiveTab('revisao')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-black hover:bg-neutral-200">
            Revisar proposta <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {!activePlan ? (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
          <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 sm:p-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                <Target className="h-6 w-6" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Primeiro passo</p>
              <h2 className="mt-2 max-w-xl text-2xl font-black tracking-tight sm:text-3xl">Seu treino começa com você.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">
                Conte ao FOCO seus objetivos, sua experiência, os grupos musculares que quer priorizar e quanto tempo tem disponível. A IA usa essas respostas como contexto para sugerir a primeira ficha.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setActiveTab('anamnese')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-xs font-black uppercase tracking-wide text-black transition hover:bg-neutral-200">
                  <ClipboardList className="h-4 w-4" /> Preencher anamnese
                </button>
                <button type="button" onClick={() => setActiveTab('arquivos')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10">
                  <FileUp className="h-4 w-4" /> Importar ficha existente
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-4 border-t border-white/10 bg-white/[0.025] p-6 sm:p-8 md:border-l md:border-t-0">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-black p-2"><Target className="h-4 w-4" /></div>
                <div><h3 className="text-sm font-bold">Objetivos reais</h3><p className="mt-1 text-xs leading-relaxed text-neutral-500">Defina o que quer alcançar e o que importa mais para você.</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-black p-2"><Activity className="h-4 w-4" /></div>
                <div><h3 className="text-sm font-bold">Treino que cabe na sua rotina</h3><p className="mt-1 text-xs leading-relaxed text-neutral-500">Use seus dias, tempo disponível e equipamentos.</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-black p-2"><Sparkles className="h-4 w-4" /></div>
                <div><h3 className="text-sm font-bold">Sugestão personalizada</h3><p className="mt-1 text-xs leading-relaxed text-neutral-500">Revise a ficha antes de ativá-la e comece a registrar seus treinos.</p></div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <Dumbbell className="mb-3 h-4 w-4 text-neutral-400" />
              <p className="text-2xl font-black tabular-nums">{exercises.length}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Exercícios na ficha</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <Activity className="mb-3 h-4 w-4 text-neutral-400" />
              <p className="text-2xl font-black tabular-nums">{activePlan.weekly_frequency}x</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Por semana</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <CheckCircle2 className="mb-3 h-4 w-4 text-neutral-400" />
              <p className="text-2xl font-black tabular-nums">{completedSessions.length}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Sessões concluídas</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <Clock3 className="mb-3 h-4 w-4 text-neutral-400" />
              <p className="text-2xl font-black tabular-nums">{goals.length}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Metas ativas</p>
            </div>
          </div>

          {muscleChips.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400">Grupos musculares da ficha</h2>
                <button type="button" onClick={() => setActiveTab('biblioteca')} className="text-[11px] font-bold text-white hover:underline">Biblioteca de exercícios</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {muscleChips.map((muscle) => (
                  <button key={muscle.name} type="button" onClick={() => setActiveTab('biblioteca')} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141414] p-3 text-left transition hover:border-white/30">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><Activity className="h-4 w-4" /></div>
                    <div className="min-w-0"><p className="truncate text-xs font-bold">{muscle.name}</p><p className="mt-1 text-[10px] text-neutral-500">{muscle.count} {muscle.count === 1 ? 'exercício' : 'exercícios'}</p></div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-neutral-300">Sua ficha</h2>
              <button type="button" onClick={() => setActiveTab('treinos')} className="text-[11px] font-bold text-white hover:underline">Ver todas as fichas</button>
            </div>
            {exercises.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 text-sm text-neutral-400">
                Esta ficha ainda não tem exercícios cadastrados.
                <button type="button" onClick={() => setActiveTab('novo-treino')} className="mt-3 block font-bold text-white hover:underline">Editar ou gerar ficha</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {exercises.map((exercise, index) => (
                  <article key={exercise.id || exercise.exercise_name + index} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#141414] p-4 transition hover:border-white/25">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black text-sm font-bold text-neutral-300">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold">{exercise.exercise_name}</h3>
                      <p className="mt-1 text-[11px] text-neutral-500">{exercise.muscle_group}</p>
                      <p className="mt-2 text-xs text-neutral-300">
                        <strong>{exercise.sets} séries</strong> · {exercise.reps_min}–{exercise.reps_max} repetições · {exercise.rest_seconds}s descanso
                      </p>
                      {exercise.notes && <p className="mt-2 text-xs leading-relaxed text-neutral-500">{exercise.notes}</p>}
                    </div>
                    <ExerciseIllustration exerciseName={exercise.exercise_name} muscleGroup={exercise.muscle_group} className="h-16 w-16 shrink-0" />
                  </article>
                ))}
              </div>
            )}
          </section>


        </>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => setActiveTab('anamnese')} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414] p-4 text-left transition hover:border-white/30">
          <span><span className="block text-sm font-bold">Anamnese</span><span className="mt-1 block text-xs text-neutral-500">Atualize prioridades e rotina</span></span><ClipboardList className="h-5 w-5 shrink-0 text-neutral-400" />
        </button>
        <button type="button" onClick={() => setActiveTab('arquivos')} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414] p-4 text-left transition hover:border-white/30">
          <span><span className="block text-sm font-bold">Arquivos e avaliações</span><span className="mt-1 block text-xs text-neutral-500">Importe uma ficha ou avaliação corporal</span></span><FileUp className="h-5 w-5 shrink-0 text-neutral-400" />
        </button>
        <button type="button" onClick={() => setActiveTab('progresso')} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414] p-4 text-left transition hover:border-white/30">
          <span><span className="block text-sm font-bold">Minha evolução</span><span className="mt-1 block text-xs text-neutral-500">Acompanhe seus registros</span></span><TrendingUp className="h-5 w-5 shrink-0 text-neutral-400" />
        </button>
      </section>
    </div>
  );
};
