import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, CheckCircle2, ChevronDown, Dumbbell, Filter,
  LoaderCircle, Plus, Search, X
} from 'lucide-react';
import { api } from '../services/api';
import { WorkoutExercise, WorkoutPlan } from '../types';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import {
  ExerciseCatalogItem, getEquipmentLabel, getExerciseDisplayName, getMuscleLabel,
  getPreferredTrainingDay, getTrainingDayLabel, loadExerciseCatalog, MUSCLE_FILTERS, savePreferredTrainingDay, TRAINING_DAYS
} from '../data/exerciseLibrary';

interface ExerciseLibraryPageProps {
  setActiveTab: (tab: string) => void;
}

export const ExerciseLibraryPage: React.FC<ExerciseLibraryPageProps> = ({ setActiveTab }) => {
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(36);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseCatalogItem | null>(null);
  const [selectedTrainingDay, setSelectedTrainingDay] = useState<string>(() => getPreferredTrainingDay());
  const [detailExercise, setDetailExercise] = useState<ExerciseCatalogItem | null>(null);
  const [addingPlanId, setAddingPlanId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([loadExerciseCatalog(), api.getWorkouts()])
      .then(([exerciseResult, plansResult]) => {
        if (!active) return;
        if (exerciseResult.status === 'fulfilled') {
          setCatalog(exerciseResult.value);
        } else {
          setLoadError(exerciseResult.reason instanceof Error ? exerciseResult.reason.message : 'Não foi possível carregar a biblioteca.');
        }
        if (plansResult.status === 'fulfilled') {
          setPlans(plansResult.value);
        } else {
          setActionMessage({ type: 'error', text: 'Não foi possível carregar suas fichas. Tente atualizar a página antes de adicionar exercícios.' });
        }
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const equipmentOptions = useMemo(() => {
    const unique = Array.from(new Set(catalog.map((exercise) => exercise.equipment).filter(Boolean)));
    return unique.sort((a, b) => getEquipmentLabel(a).localeCompare(getEquipmentLabel(b), 'pt-BR'));
  }, [catalog]);

  const filteredExercises = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catalog.filter((exercise) => {
      const name = getExerciseDisplayName(exercise.name);
      const searchable = [
        exercise.name, name, ...exercise.primaryMuscles.map(getMuscleLabel),
        ...exercise.secondaryMuscles.map(getMuscleLabel), getEquipmentLabel(exercise.equipment),
        ...exercise.instructions.slice(0, 2)
      ].join(' ').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matchesSearch = !term || searchable.includes(term);
      const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
      const matchesMuscle = muscleFilter === 'all' || (muscleFilter === 'back'
        ? muscles.some((muscle) => ['lats', 'middle back', 'lower back', 'traps'].includes(muscle))
        : muscles.includes(muscleFilter));
      const matchesEquipment = equipmentFilter === 'all' || exercise.equipment === equipmentFilter;
      return matchesSearch && matchesMuscle && matchesEquipment;
    });
  }, [catalog, search, muscleFilter, equipmentFilter]);

  useEffect(() => { setVisibleCount(36); }, [search, muscleFilter, equipmentFilter]);

  const addExercise = async (plan: WorkoutPlan, exercise: ExerciseCatalogItem) => {
    setAddingPlanId(plan.id);
    setActionMessage(null);
    const displayName = getExerciseDisplayName(exercise.name);
    const workoutExercise: WorkoutExercise = {
      exercise_name: displayName,
      muscle_group: getMuscleLabel(exercise.primaryMuscles[0] || 'general'),
      sets: 3,
      reps_min: 8,
      reps_max: 12,
      rest_seconds: 60,
      suggested_load_kg: 0,
      notes: '',
      training_day: selectedTrainingDay as WorkoutExercise['training_day'],
    };
    try {
      const saved = await api.addExerciseToWorkout(plan.id, workoutExercise);
      setPlans((current) => current.map((item) =>
        item.id === plan.id ? { ...item, exercises: [...(item.exercises || []), saved] } : item
      ));
      setSelectedExercise(null);
      setActionMessage({ type: 'success', text: `${displayName} foi adicionado à ${getTrainingDayLabel(selectedTrainingDay)} de “${plan.name}”.` });
    } catch (error: unknown) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível adicionar o exercício.',
      });
    } finally {
      setAddingPlanId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-32 text-white">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Catálogo de exercícios</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Biblioteca FOCO</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
              Explore exercícios de todos os grupos musculares, veja a execução ilustrada e adicione movimentos às suas fichas como quem monta uma playlist.
            </p>
          </div>
          <span className="shrink-0 rounded-xl border border-white/10 bg-[#141414] px-3 py-2 text-right">
            <strong className="block text-xl tabular-nums">{catalog.length || '—'}</strong>
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">exercícios</span>
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar exercício, músculo ou equipamento..."
            className="w-full rounded-xl border border-white/10 bg-[#141414] py-3.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-white/30"
            aria-label="Buscar exercícios"
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-white"><X className="h-4 w-4" /></button>}
        </div>
      </header>

      {actionMessage && (
        <div className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${actionMessage.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-rose-500/30 bg-rose-500/10 text-rose-100'}`} role="status">
          <span>{actionMessage.text}</span>
          <button type="button" onClick={() => setActionMessage(null)} aria-label="Fechar aviso"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500"><Filter className="h-3.5 w-3.5" /> Grupo muscular</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MUSCLE_FILTERS.map((filter) => (
            <button key={filter.value} type="button" onClick={() => setMuscleFilter(filter.value)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${muscleFilter === filter.value ? 'border-white bg-white text-black' : 'border-white/10 bg-[#141414] text-neutral-400 hover:text-white'}`}>
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">{isLoading ? 'Carregando catálogo...' : `${filteredExercises.length} exercícios encontrados`}</p>
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          Equipamento
          <select value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)} className="max-w-[190px] rounded-lg border border-white/10 bg-[#141414] px-3 py-2 text-white outline-none">
            <option value="all">Todos</option>
            {equipmentOptions.map((equipment) => <option key={equipment} value={equipment}>{getEquipmentLabel(equipment)}</option>)}
          </select>
        </label>
      </section>

      {loadError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <p className="text-sm font-bold">Não foi possível carregar a biblioteca.</p>
          <p className="mt-1 text-xs text-neutral-300">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-black text-black">Tentar novamente</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((key) => <div key={key} className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#141414]" />)}
        </div>
      ) : !loadError && filteredExercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141414] px-5 py-14 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-neutral-600" />
          <p className="mt-3 text-sm font-bold">Nenhum exercício encontrado</p>
          <p className="mt-1 text-xs text-neutral-500">Tente outro termo ou remova um filtro.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.slice(0, visibleCount).map((exercise) => (
              <article key={exercise.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition hover:border-white/25">
                <div className="grid grid-cols-[112px_1fr] gap-3 p-3">
                  <ExerciseIllustration exerciseName={exercise.name} muscleGroup={getMuscleLabel(exercise.primaryMuscles[0] || '')} className="h-28 w-full" showCaption />
                  <div className="min-w-0 py-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{getMuscleLabel(exercise.primaryMuscles[0] || 'Geral')}</p>
                    <h2 className="mt-1 line-clamp-2 text-sm font-black leading-snug">{getExerciseDisplayName(exercise.name)}</h2>
                    <p className="mt-2 text-[10px] text-neutral-500">{getEquipmentLabel(exercise.equipment)} · {exercise.level === 'beginner' ? 'Iniciante' : exercise.level === 'intermediate' ? 'Intermediário' : exercise.level === 'expert' ? 'Avançado' : exercise.level}</p>
                    <button type="button" onClick={() => setDetailExercise(exercise)} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-neutral-300 hover:text-white">
                      Ver execução e instruções <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-3">
                  <p className="truncate text-[10px] text-neutral-500">{exercise.secondaryMuscles.length ? `Também trabalha ${exercise.secondaryMuscles.slice(0,2).map(getMuscleLabel).join(', ')}` : 'Exercício principal'}</p>
                  <button type="button" onClick={() => { setSelectedExercise(exercise); setActionMessage(null); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-black transition hover:bg-neutral-200">
                    <Plus className="h-3.5 w-3.5" /> Adicionar ao meu plano
                  </button>
                </div>
              </article>
            ))}
          </div>
          {visibleCount < filteredExercises.length && (
            <button type="button" onClick={() => setVisibleCount((count) => count + 36)} className="mx-auto flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10">
              Carregar mais exercícios <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      <footer className="rounded-xl border border-white/5 bg-[#101010] p-3 text-[10px] leading-relaxed text-neutral-500">
        Demonstrações e metadados do catálogo Free Exercise DB (licença Unlicense / domínio público). As figuras são imagens de referência em duas posições; quando disponível, alternam para ajudar a visualizar o movimento.
      </footer>

      {selectedExercise && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Adicionar exercício à ficha">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Adicionar à minha ficha</p>
                <h2 className="mt-1 text-lg font-black">{getExerciseDisplayName(selectedExercise.name)}</h2>
                <p className="mt-1 text-xs text-neutral-400">Escolha o dia da semana e depois a ficha de destino — como adicionar uma música a uma playlist.</p>
              </div>
              <button type="button" onClick={() => setSelectedExercise(null)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-[104px_1fr] gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <ExerciseIllustration exerciseName={selectedExercise.name} muscleGroup={getMuscleLabel(selectedExercise.primaryMuscles[0] || '')} className="h-28 w-full" showCaption />
              <div className="py-1">
                <p className="text-xs font-bold">{getMuscleLabel(selectedExercise.primaryMuscles[0] || 'Geral')}</p>
                <p className="mt-1 text-[10px] text-neutral-500">{getEquipmentLabel(selectedExercise.equipment)}</p>
                <p className="mt-3 text-[10px] leading-relaxed text-neutral-400">Configuração inicial: 3 séries · 8–12 repetições · 60 s de descanso. Você pode ajustar a ficha depois.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Adicionar ao dia</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TRAINING_DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={selectedTrainingDay === day.value}
                    onClick={() => { setSelectedTrainingDay(day.value); savePreferredTrainingDay(day.value); }}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${selectedTrainingDay === day.value ? 'border-white bg-white text-black' : 'border-white/10 bg-[#171717] text-neutral-400 hover:border-white/30 hover:text-white'}`}
                  >
                    <span className="block">{day.shortLabel}</span>
                    <span className={`mt-0.5 block text-[9px] ${selectedTrainingDay === day.value ? 'text-neutral-600' : 'text-neutral-600'}`}>{selectedTrainingDay === day.value ? 'Selecionado' : 'Escolher dia'}</span>
                  </button>
                ))}
              </div>
            </div>
            {plans.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-center">
                <p className="text-sm font-bold">Você ainda não tem fichas</p>
                <p className="mt-1 text-xs text-neutral-500">Monte um treino primeiro; depois volte para adicionar exercícios como em uma playlist.</p>
                <button type="button" onClick={() => setActiveTab('novo-treino')} className="mt-4 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-black">Criar minha primeira ficha</button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {plans.map((plan) => (
                  <button key={plan.id} type="button" disabled={addingPlanId !== null} onClick={() => addExercise(plan, selectedExercise)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#171717] p-3 text-left transition hover:border-white/30 hover:bg-white/[0.06] disabled:opacity-60">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${plan.status === 'ativo' ? 'bg-white text-black' : 'bg-white/5 text-neutral-300'}`}>{plan.status === 'ativo' ? <CheckCircle2 className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{plan.name}</span>
                      <span className="mt-1 block text-[10px] text-neutral-500">
                        {plan.exercises?.length || 0} exercícios · {(plan.exercises || []).filter((item) => !item.training_day || item.training_day === selectedTrainingDay).length} disponíveis neste dia {plan.status === 'ativo' ? '· ficha ativa' : ''}
                      </span>
                    </span>
                    {addingPlanId === plan.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setSelectedExercise(null)} className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-neutral-400 hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {detailExercise && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Detalhes do exercício">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Execução do exercício</p><h2 className="mt-1 text-lg font-black">{getExerciseDisplayName(detailExercise.name)}</h2></div>
              <button type="button" onClick={() => setDetailExercise(null)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X className="h-4 w-4" /></button>
            </div>
            <ExerciseIllustration exerciseName={detailExercise.name} muscleGroup={getMuscleLabel(detailExercise.primaryMuscles[0] || '')} className="mt-4 h-64 w-full sm:h-72" showCaption />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Músculo principal</p><p className="mt-1 text-sm font-bold">{getMuscleLabel(detailExercise.primaryMuscles[0] || 'Geral')}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Equipamento</p><p className="mt-1 text-sm font-bold">{getEquipmentLabel(detailExercise.equipment)}</p></div>
            </div>
            <div className="mt-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-300">Passo a passo</h3>
              <ol className="mt-3 space-y-2">
                {detailExercise.instructions.map((instruction, index) => <li key={index} className="flex gap-3 text-xs leading-relaxed text-neutral-400"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white">{index + 1}</span><span>{instruction}</span></li>)}
              </ol>
            </div>
            <button type="button" onClick={() => { setDetailExercise(null); setSelectedExercise(detailExercise); }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-black"><Plus className="h-4 w-4" /> Adicionar ao meu plano</button>
          </div>
        </div>
      )}
    </div>
  );
};
