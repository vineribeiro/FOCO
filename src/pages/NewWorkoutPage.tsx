import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
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
      suggested_load_kg: 80,
      notes: 'Cadência controlada',
    },
    {
      exercise_name: 'Puxada Frontal Aberta',
      muscle_group: 'Costas',
      sets: 4,
      reps_min: 10,
      reps_max: 12,
      rest_seconds: 75,
      suggested_load_kg: 60,
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
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-32 text-white">
      
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Criador de Fichas de Treino</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Gere uma ficha individualizada com base na sua anamnese ou monte sua divisão manualmente.
          </p>
        </div>
        <button type="button" onClick={() => setActiveTab('anamnese')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black transition hover:bg-white/10">
          <ClipboardList className="h-4 w-4" />
          <span>Preencher / editar anamnese</span>
        </button>
      </div>

      {/* Selector Tabs */}
      <div className="flex p-1 rounded-xl bg-[#141414] border border-white/10 w-fit">
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
          <form onSubmit={handleGenerateAi} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
                  Objetivo Principal
                </label>
                <select
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
                <select
                  value={aiFrequency}
                  onChange={(e) => setAiFrequency(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
                >
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
                <select
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
                <input
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Montando sua ficha...' : 'Gerar ficha personalizada'}</span>
              </button>
            </div>
          </form>

          {/* Generated Plan Review */}
          {generatedPlan && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/20 space-y-5 animate-in fade-in">
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
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {generatedPlan.explanation}
                  </p>
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

              {/* Exercises Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-neutral-500 font-bold border-b border-white/10 uppercase text-[10px]">
                      <th className="py-2 px-2">EXERCÍCIO</th>
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
                          {ex.exercise_name}
                        </td>
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
