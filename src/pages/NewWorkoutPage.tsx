import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { useAuth } from '../context/AuthContext';
import { WorkoutExercise } from '../types';
import {
  Sparkles,
  Dumbbell,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  Sliders,
  ClipboardList,
  ChevronRight,
  CalendarDays,
  Activity,
  Target,
} from 'lucide-react';

interface NewWorkoutProps {
  setActiveTab: (tab: string) => void;
}

export const NewWorkoutPage: React.FC<NewWorkoutProps> = ({ setActiveTab }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');

  // AI Generator state
  const [aiGoal, setAiGoal] = useState('Hipertrofia Máxima');
  const [aiFrequency, setAiFrequency] = useState(4);
  const [aiExperience, setAiExperience] = useState(profile?.experience_level || 'intermediario');
  const [aiFocus, setAiFocus] = useState<string[]>([]);
  const muscleOptions = [
    { name: 'Glúteos', detail: 'Glúteo máximo e médio' }, { name: 'Quadríceps', detail: 'Parte anterior das coxas' },
    { name: 'Posterior de coxa', detail: 'Isquiotibiais' }, { name: 'Panturrilhas', detail: 'Tríceps sural' },
    { name: 'Costas', detail: 'Dorsais e região média' }, { name: 'Peitoral', detail: 'Peito' },
    { name: 'Ombros', detail: 'Deltoides' }, { name: 'Bíceps', detail: 'Flexores do cotovelo' },
    { name: 'Tríceps', detail: 'Extensores do cotovelo' }, { name: 'Abdômen e core', detail: 'Estabilidade do tronco' },
  ];
  const toggleMuscleFocus = (muscle: string) => setAiFocus((current) =>
    current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]);
  const [aiEquipment, setAiEquipment] = useState('Academia Completa com Polias e Barras');
  const [aiRestrictions, setAiRestrictions] = useState('');
  const [includeBodyMetrics, setIncludeBodyMetrics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated Plan State
  const [generatedPlan, setGeneratedPlan] = useState<{
    name: string;
    goal: string;
    weekly_frequency: number;
    explanation: string;
    exercises: WorkoutExercise[];
  } | null>(null);

  // Manual Builder state
  const [manualName, setManualName] = useState('');
  const [manualGoal, setManualGoal] = useState('Hipertrofia');
  const [manualFrequency, setManualFrequency] = useState(4);
  const [manualExercises, setManualExercises] = useState<WorkoutExercise[]>([
    {
      exercise_name: 'Supino Reto com Barra',
      muscle_group: 'Peito',
      sets: 4,
      reps_min: 8,
      reps_max: 10,
      rest_seconds: 90,
      suggested_load_kg: 0,
      notes: 'Cadência controlada',
    },
    {
      exercise_name: 'Puxada Frontal Aberta',
      muscle_group: 'Costas',
      sets: 4,
      reps_min: 10,
      reps_max: 12,
      rest_seconds: 75,
      suggested_load_kg: 0,
      notes: 'Pico de contração na barra',
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAnamnesis().then((anamnesis) => {
      if (!active || !anamnesis) return;
      setAiGoal(anamnesis.primary_goal || 'Hipertrofia Máxima');
      setAiFrequency(anamnesis.weekly_frequency || 4);
      setAiFocus(anamnesis.priority_muscles || []);
      setAiEquipment(anamnesis.equipment_available?.join(', ') || 'Academia Completa com Polias e Barras');
      const experience = anamnesis.training_age === 'Nunca treinei' || anamnesis.training_age === 'Menos de 6 meses'
        ? 'iniciante'
        : anamnesis.training_age === '3 anos ou mais'
          ? 'avancado'
          : 'intermediario';
      setAiExperience(experience);
      setAiRestrictions(anamnesis.consent_health_data
        ? [anamnesis.pain_or_injuries, anamnesis.health_notes].filter(Boolean).join('; ')
        : '');
    }).catch(() => {
      // Keep defaults if a saved server profile is not available.
    });
    return () => { active = false; };
  }, []);

  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const result = await api.generateAiWorkout({
        goal: aiGoal,
        experience_level: aiExperience,
        weekly_frequency: Number(aiFrequency),
        focus_muscles: aiFocus.length ? aiFocus.join(', ') : 'Corpo inteiro com distribuição equilibrada',
        equipment_available: aiEquipment,
        restrictions: aiRestrictions,
        include_body_metrics: includeBodyMetrics,
      });
      setGeneratedPlan(result);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err || 'Erro desconhecido');
      if (/usuário não encontrado no armazenamento|usuário não encontrado|sessão não autorizada|token de autenticação/i.test(message)) {
        setErrorMsg(
          'Falha de sessão do FOCO: o servidor não encontrou a conta associada a esta sessão. ' +
          'Isso não é um erro do Gemini. Não crie outra conta ainda; é necessário confirmar a persistência dos dados do servidor.'
        );
      } else {
        setErrorMsg('Falha ao gerar treino: ' + message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    if (!generatedPlan) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await api.createWorkout({
        name: generatedPlan.name,
        goal: generatedPlan.goal,
        weekly_frequency: generatedPlan.weekly_frequency,
        status: 'ativo',
        exercises: generatedPlan.exercises,
      });
      setActiveTab('treinos');
    } catch (err: any) {
      setErrorMsg('Erro ao salvar ficha no banco: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManualPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      setErrorMsg('Dê um nome para a sua ficha.');
      return;
    }
    if (manualExercises.length === 0) {
      setErrorMsg('Adicione pelo menos um exercício.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await api.createWorkout({
        name: manualName,
        goal: manualGoal,
        weekly_frequency: Number(manualFrequency),
        status: 'ativo',
        exercises: manualExercises,
      });
      setActiveTab('treinos');
    } catch (err: any) {
      setErrorMsg('Erro ao salvar ficha: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManualExercise = () => {
    setManualExercises((prev) => [
      ...prev,
      {
        exercise_name: '',
        muscle_group: 'Geral',
        sets: 3,
        reps_min: 10,
        reps_max: 12,
        rest_seconds: 60,
        suggested_load_kg: 20,
        notes: '',
      },
    ]);
  };

  const handleRemoveManualExercise = (index: number) => {
    setManualExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateManualExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    setManualExercises((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  return (
    <div className="foco-v4-page space-y-5 text-white">
      <header className="space-y-2">
        <p className="foco-v4-eyebrow">FOCO IA · PERSONALIZAÇÃO</p>
        <h1 className="foco-v4-heading"><span className="font-normal text-neutral-400">Nova</span> ficha</h1>
        <p className="foco-v4-muted max-w-2xl">
          Seu plano é personalizado com base no objetivo, nível, dias disponíveis e, quando autorizado, nos dados da avaliação OKOK.
        </p>
      </header>

      <section className="foco-v4-panel foco-v4-surface-photo relative overflow-hidden p-6 sm:p-8" aria-labelledby="foco-ai-intro">
        <div className="relative z-10 max-w-[460px] space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[.2em] text-neutral-300"><Sparkles className="h-4 w-4" /> FOCO IA</div>
          <h2 id="foco-ai-intro" className="text-[25px] font-semibold leading-tight tracking-[-.04em] sm:text-[32px]">
            Treino recomendado para <strong className="font-extrabold">{aiGoal.toLowerCase()}</strong>
            {includeBodyMetrics ? <> com apoio da <strong className="font-extrabold">avaliação OKOK.</strong></> : '.'}
          </h2>
          <p className="max-w-sm text-[12px] leading-relaxed text-neutral-300">A IA propõe o treino com base no seu perfil. Você revisa tudo antes de salvar.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          {label:'Objetivo',value:aiGoal,icon:Target,target:'foco-ai-goal'},
          {label:'Nível',value:aiExperience,icon:Activity,target:'foco-ai-experience'},
          {label:'Dias',value:aiFrequency+'x por semana',icon:CalendarDays,target:'foco-ai-frequency'},
          {label:'Equipamentos',value:aiEquipment,icon:Dumbbell,target:'foco-ai-equipment'},
        ].map(item => <button type="button" key={item.label} onClick={() => document.getElementById(item.target)?.focus()}
          className="foco-v4-panel flex min-h-[90px] items-center gap-3 overflow-hidden p-3 text-left transition hover:border-white/35">
          <item.icon className="h-5 w-5 shrink-0 text-neutral-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-neutral-400">{item.label}</span>
            <span className="mt-1 block line-clamp-2 text-xs font-extrabold capitalize">{item.value}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />
        </button>)}
      </div>
      <button type="button" onClick={() => setActiveTab('anamnese')} className="foco-v4-secondary w-full sm:w-auto">
        <ClipboardList className="h-4 w-4" /> Atualizar anamnese <ChevronRight className="h-4 w-4" />
      </button>

      {/* Selector Tabs */}
      <div className="flex w-full rounded-2xl border border-white/10 bg-[#171717] p-1 sm:w-fit">
        <button
          onClick={() => { setTab('ai'); setErrorMsg(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            tab === 'ai'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gerar com IA</span>
        </button>

        <button
          onClick={() => { setTab('manual'); setErrorMsg(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            tab === 'manual'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Montador Manual</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/20 text-neutral-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: AI GENERATOR */}
      {tab === 'ai' && (
        <div className="space-y-6">
          <form onSubmit={handleGenerateAi} className="foco-v4-panel space-y-5 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="foco-v4-eyebrow">Preferências e objetivos</p>
                <h2 className="foco-v4-section-title mt-1">Ajustes para sua ficha</h2>
              </div>
              <Sliders className="h-5 w-5 text-neutral-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
                  Objetivo Principal
                </label>
                <select id="foco-ai-goal"
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
                >
                  <option value="Hipertrofia Máxima">Hipertrofia Máxima & Volume Muscular</option>
                  <option value="Força Pura & Cargas">Força Bruta & Cargas Elevadas (Powerbuilding)</option>
                  <option value="Definição & Emagrecimento">Emagrecimento com Preservação de Massa</option>
                  <option value="Condicionamento & Resistência">Condicionamento Metabólico & Saúde</option>
                  <option value="Recomposição corporal">Recomposição corporal</option>
                  <option value="Saúde e qualidade de vida">Saúde e qualidade de vida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
                  Frequência Semanal (Dias)
                </label>
                <select id="foco-ai-frequency"
                  value={aiFrequency}
                  onChange={(e) => setAiFrequency(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
                >
                  <option value={2}>2 dias por semana (corpo inteiro ou superior/inferior)</option>
                  <option value={3}>3 dias por semana (Divisão ABC)</option>
                  <option value={4}>4 dias por semana (Divisão ABCD / Upper-Lower)</option>
                  <option value={5}>5 dias por semana (Divisão ABCDE)</option>
                  <option value={6}>6 dias por semana (Divisão Push-Pull-Legs 2x)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
                  Nível de Experiência
                </label>
                <select id="foco-ai-experience"
                  value={aiExperience}
                  onChange={(e) => setAiExperience(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
                >
                  <option value="iniciante">Iniciante (&lt; 1 ano de treino)</option>
                  <option value="intermediario">Intermediário (1 a 3 anos)</option>
                  <option value="avancado">Avançado (&gt; 3 anos com boa técnica)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div><label className="block text-xs font-black text-white uppercase tracking-wide">Priorize grupos musculares</label><p className="text-[11px] text-neutral-400 mt-1">Toque para selecionar um ou mais grupos.</p></div>
                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">{aiFocus.length} selecionados</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {muscleOptions.map((muscle) => { const selected = aiFocus.includes(muscle.name); return (
                    <button key={muscle.name} type="button" aria-pressed={selected} onClick={() => toggleMuscleFocus(muscle.name)}
                      className={`min-h-[70px] rounded-xl border p-3 text-left transition-all ${selected ? 'bg-white text-black border-white' : 'bg-[#0A0A0A] text-white border-white/10 hover:border-white/40'}`}>
                      <span className="flex items-center justify-between gap-2"><span className="text-xs font-black">{muscle.name}</span>{selected && <CheckCircle2 className="w-4 h-4 shrink-0" />}</span>
                      <span className={`block text-[10px] mt-1 ${selected ? 'text-neutral-700' : 'text-neutral-500'}`}>{muscle.detail}</span>
                    </button>); })}
                </div>
                <p className="text-[10px] text-neutral-500 mt-2">Glúteos, quadríceps, posteriores e panturrilhas são opções de foco para quem quer priorizar inferiores. Sem seleção, a IA distribui o treino de forma equilibrada.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
                  Equipamentos Disponíveis
                </label>
                <input id="foco-ai-equipment"
                  type="text"
                  value={aiEquipment}
                  onChange={(e) => setAiEquipment(e.target.value)}
                  placeholder="Ex: Academia completa, Halteres, Barras"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
                  Restrições ou Lesões
                </label>
                <input
                  type="text"
                  value={aiRestrictions}
                  onChange={(e) => setAiRestrictions(e.target.value)}
                  placeholder="Ex: Evitar impacto na lombar, desconforto no ombro"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-[#090909] p-4 text-sm">
              <input type="checkbox" checked={includeBodyMetrics} onChange={(e) => setIncludeBodyMetrics(e.target.checked)}
                className="mt-1 h-4 w-4 accent-white" />
              <span>
                <strong className="block text-white">Usar meu último relatório corporal (OKOK ou similar)</strong>
                <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                  Opcional. Autoriza o FOCO a considerar apenas as métricas extraídas de um relatório já enviado.
                  A bioimpedância é uma estimativa, não um diagnóstico, e não substitui os teus objetivos, a anamnese ou a recuperação.
                </span>
              </span>
            </label>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="foco-v4-action !w-full disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Montando sua ficha...' : 'Gerar ficha personalizada'}</span>
              </button>
            </div>
          </form>

          {/* Generated Plan Review */}
          {generatedPlan && (
            <div className="foco-v4-panel space-y-5 p-4 animate-in fade-in sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                    <span>Proposta Gerada pelo Gemini</span>
                    <span>·</span>
                    <span>{generatedPlan.weekly_frequency}x por semana</span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase mt-1">
                    {generatedPlan.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">{generatedPlan.explanation}</p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveGeneratedPlan}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0 shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Aprovar e Ativar Ficha'}</span>
                </button>
              </div>

              <p className="text-xs leading-relaxed text-neutral-400">Revise a divisão semanal e cada exercício antes de ativar. Cargas iniciais ficam em aberto até serem ajustadas individualmente.</p>
              <section className="foco-v4-panel-soft p-3 sm:p-4" aria-labelledby="foco-generated-week">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 id="foco-generated-week" className="foco-v4-section-title">Divisão semanal</h4>
                  <span className="text-[11px] text-neutral-400">{generatedPlan.weekly_frequency} dias de treino</span>
                </div>
                {generatedPlan.exercises.some(ex => !!ex.training_day) ? (
                  <div className="foco-v4-week">
                    {[
                      {day:'segunda',short:'Seg'}, {day:'terca',short:'Ter'}, {day:'quarta',short:'Qua'},
                      {day:'quinta',short:'Qui'}, {day:'sexta',short:'Sex'}, {day:'sabado',short:'Sáb'}, {day:'domingo',short:'Dom'},
                    ].map(({day,short}) => {
                      const planned = generatedPlan.exercises.filter(ex => ex.training_day === day);
                      const groups = [...new Set(planned.map(ex => ex.muscle_group).filter(Boolean))];
                      return <div key={day} className="foco-v4-day">
                        <span className="text-xs text-neutral-300">{short}</span>
                        <Dumbbell className="h-6 w-6 text-neutral-400" />
                        <strong className="line-clamp-2 min-h-[30px] text-[11px] leading-tight">{groups.length ? groups.slice(0,2).join(' + ') : 'Descanso'}</strong>
                        <span className="mt-auto text-[10px] text-neutral-400">{planned.length ? planned.length + ' exercícios' : '—'}</span>
                      </div>;
                    })}
                  </div>
                ) : <p className="text-xs text-neutral-400">A IA não atribuiu dias específicos a esta proposta. Revise os exercícios abaixo antes de ativar.</p>}
              </section>
              {includeBodyMetrics && <div className="foco-v4-panel-soft flex items-start gap-3 p-4">
                <Target className="h-5 w-5 shrink-0 text-neutral-300" />
                <div>
                  <h4 className="text-sm font-extrabold">Avaliação OKOK na personalização</h4>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">Você autorizou o uso das métricas existentes nesta geração. A proposta continua sujeita à sua revisão.</p>
                </div>
              </div>}
              {/* Exercises Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-neutral-500 font-bold border-b border-white/10 uppercase text-[10px]">
                      <th className="py-2 px-2">EXERCÍCIO</th>
                      <th className="py-2 px-2">DIA</th>
                      <th className="py-2 px-2">GRUPAMENTO</th>
                      <th className="py-2 px-2">SÉRIES</th>
                      <th className="py-2 px-2">REPETIÇÕES</th>
                      <th className="py-2 px-2">CARGA</th>
                      <th className="py-2 px-2">DESCANSO</th>
                      <th className="py-2 px-2">NOTAS BIOMECÂNICAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {generatedPlan.exercises.map((ex, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-2.5 px-2 font-sans font-bold text-white">
                          <div className="flex min-w-[190px] items-center gap-2.5">
                            <ExerciseIllustration exerciseName={ex.exercise_name} muscleGroup={ex.muscle_group} className="h-16 w-16 shrink-0" />
                            <span>{ex.exercise_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-sans text-white">{ex.training_day || "A definir"}</td>
                        <td className="py-2.5 px-2 font-sans text-neutral-400">
                          {ex.muscle_group}
                        </td>
                        <td className="py-2.5 px-2 text-white font-black">
                          {ex.sets}
                        </td>
                        <td className="py-2.5 px-2 text-neutral-300">
                          {ex.reps_min}-{ex.reps_max}
                        </td>
                        <td className="py-2.5 px-2 text-white font-bold">
                          {ex.suggested_load_kg ? `${ex.suggested_load_kg} kg` : '--'}
                        </td>
                        <td className="py-2.5 px-2 text-neutral-400">
                          {ex.rest_seconds}s
                        </td>
                        <td className="py-2.5 px-2 font-sans text-neutral-400 truncate max-w-[200px]">
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
      )}

      {/* TAB 2: MANUAL BUILDER */}
      {tab === 'manual' && (
        <form onSubmit={handleSaveManualPlan} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">
                Nome da Ficha
              </label>
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ex: Treino ABC Pesado"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">
                Objetivo
              </label>
              <input
                type="text"
                value={manualGoal}
                onChange={(e) => setManualGoal(e.target.value)}
                placeholder="Ex: Hipertrofia de Braços"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">
                Frequência Semanal
              </label>
              <select
                value={manualFrequency}
                onChange={(e) => setManualFrequency(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
              >
                <option value={3}>3 dias por semana</option>
                <option value={4}>4 dias por semana</option>
                <option value={5}>5 dias por semana</option>
                <option value={6}>6 dias por semana</option>
              </select>
            </div>
          </div>

          {/* Exercise Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Exercícios ({manualExercises.length})
              </span>
              <button
                type="button"
                onClick={handleAddManualExercise}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Exercício</span>
              </button>
            </div>

            <div className="space-y-3">
              {manualExercises.map((ex, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0A0A0A] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-400">Exercício #{idx + 1}</span>
                    {manualExercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveManualExercise(idx)}
                        className="text-neutral-500 hover:text-white text-xs p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                    <div className="col-span-2">
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Nome</label>
                      <input
                        type="text"
                        required
                        value={ex.exercise_name}
                        onChange={(e) => handleUpdateManualExercise(idx, 'exercise_name', e.target.value)}
                        placeholder="Ex: Supino Reto"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 text-white text-xs focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Músculo</label>
                      <input
                        type="text"
                        value={ex.muscle_group}
                        onChange={(e) => handleUpdateManualExercise(idx, 'muscle_group', e.target.value)}
                        placeholder="Peito"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 text-white text-xs focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Séries</label>
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => handleUpdateManualExercise(idx, 'sets', parseInt(e.target.value) || 3)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Carga (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={ex.suggested_load_kg}
                        onChange={(e) => handleUpdateManualExercise(idx, 'suggested_load_kg', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Descanso (s)</label>
                      <input
                        type="number"
                        value={ex.rest_seconds}
                        onChange={(e) => handleUpdateManualExercise(idx, 'rest_seconds', parseInt(e.target.value) || 60)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Ficha Manual'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
