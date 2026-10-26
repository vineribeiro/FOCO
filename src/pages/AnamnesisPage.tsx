import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { api } from '../services/api';
import { Anamnesis } from '../types';

interface AnamnesisPageProps {
  setActiveTab: (tab: string) => void;
}

const initialAnamnesis: Anamnesis = {
  primary_goal: 'Hipertrofia Máxima',
  goal_details: '',
  training_age: '6–12 meses',
  activity_level: 'Moderadamente ativo',
  weekly_frequency: 4,
  session_minutes: 60,
  preferred_days: ['Segunda', 'Quarta', 'Sexta', 'Sábado'],
  priority_muscles: [],
  equipment_available: ['Academia completa'],
  current_routine: '',
  exercise_preferences: '',
  pain_or_injuries: '',
  health_notes: '',
  sleep_quality: 'Regular',
  cardio_habits: '',
  consent_health_data: false,
};

const goalOptions = [
  'Hipertrofia Máxima',
  'Força Pura & Cargas',
  'Definição & Emagrecimento',
  'Condicionamento & Resistência',
  'Recomposição corporal',
  'Saúde e qualidade de vida',
];

const muscleOptions = [
  'Glúteos',
  'Quadríceps',
  'Posterior de coxa',
  'Panturrilhas',
  'Costas',
  'Peitoral',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen e core',
];

const dayOptions = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const equipmentOptions = [
  'Academia completa',
  'Máquinas e polias',
  'Barras e anilhas',
  'Halteres',
  'Elásticos',
  'Peso corporal',
  'Treino em casa',
];

const inputClass = 'w-full rounded-xl border border-white/10 bg-[#090909] px-3.5 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-white/50';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-300';
const panelClass = 'rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-6';

export const AnamnesisPage: React.FC<AnamnesisPageProps> = ({ setActiveTab }) => {
  const [form, setForm] = useState<Anamnesis>(initialAnamnesis);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAnamnesis()
      .then((saved) => {
        if (active && saved) setForm({ ...initialAnamnesis, ...saved });
      })
      .catch((error: any) => {
        if (active) setErrorMsg('Não foi possível carregar a anamnese salva: ' + error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateField = (field: keyof Anamnesis, value: any) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccessMsg(null);
  };

  const toggleList = (
    field: 'preferred_days' | 'priority_muscles' | 'equipment_available',
    value: string,
  ) => {
    const currentValues = form[field];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    updateField(field, nextValues);
  };

  const sensitiveDataFilled = Boolean(form.pain_or_injuries.trim() || form.health_notes.trim());

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (sensitiveDataFilled && !form.consent_health_data) {
      setErrorMsg('Você informou dados de saúde. Marque o consentimento específico para usá-los na personalização, ou apague esses campos.');
      setStep(2);
      return;
    }

    setIsSaving(true);
    try {
      const { updated_at: _updatedAt, ...payload } = form;
      const saved = await api.saveAnamnesis(payload);
      setForm({ ...initialAnamnesis, ...saved });
      setSuccessMsg('Anamnese salva. A geração de treino vai usar essas respostas como contexto.');
    } catch (error: any) {
      setErrorMsg('Não foi possível salvar a anamnese: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const stepTitles = ['Perfil e objetivo', 'Prioridades e rotina', 'Saúde e recuperação'];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-32 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-neutral-400">
            <ClipboardList className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Perfil inteligente FOCO</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Anamnese de treino</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Responda para a IA considerar sua rotina, objetivos, prioridades musculares, equipamentos e limites individuais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('novo-treino')}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-bold transition hover:bg-white/10"
        >
          <Dumbbell className="h-4 w-4" /> Voltar ao criador de treinos
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stepTitles.map((title, index) => (
          <button
            key={title}
            type="button"
            onClick={() => { if (index <= step) setStep(index); }}
            className={`rounded-xl border px-3 py-3 text-left transition ${step === index ? 'border-white bg-white text-black' : index < step ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 bg-[#111] text-neutral-500'}`}
            aria-current={step === index ? 'step' : undefined}
          >
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest">Etapa 0{index + 1}</span>
            <span className="block text-xs font-bold">{title}</span>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-950/30 p-3.5 text-sm text-red-200">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-4 text-sm text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}</span>
          <button type="button" onClick={() => setActiveTab('novo-treino')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black">
            Gerar treino <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className={`${panelClass} flex items-center gap-3 text-sm text-neutral-400`}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          Carregando suas respostas...
        </div>
      ) : (
        <>
          {step === 0 && (
            <section className={`${panelClass} space-y-5`}>
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black"><Target className="h-5 w-5" /></div>
                <div><h2 className="font-black">Seu objetivo e seu histórico</h2><p className="mt-0.5 text-xs text-neutral-400">A base para dimensionar o treino.</p></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Objetivo principal</label>
                  <select className={inputClass} value={form.primary_goal} onChange={(e) => updateField('primary_goal', e.target.value)}>
                    {goalOptions.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tempo de experiência com musculação</label>
                  <select className={inputClass} value={form.training_age} onChange={(e) => updateField('training_age', e.target.value)}>
                    {['Nunca treinei', 'Menos de 6 meses', '6–12 meses', '1–3 anos', '3 anos ou mais'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Dias disponíveis por semana</label>
                  <select className={inputClass} value={form.weekly_frequency} onChange={(e) => updateField('weekly_frequency', Number(e.target.value))}>
                    {[2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>{value} dias</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tempo por sessão</label>
                  <select className={inputClass} value={form.session_minutes} onChange={(e) => updateField('session_minutes', Number(e.target.value))}>
                    {[30, 45, 60, 75, 90, 120].map((value) => <option key={value} value={value}>{value} minutos</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Meta mais específica (opcional)</label>
                  <textarea rows={3} className={inputClass} value={form.goal_details} onChange={(e) => updateField('goal_details', e.target.value)} placeholder="Ex.: desenvolver inferiores, aumentar força nos básicos, voltar a treinar com consistência..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Como é sua rotina hoje?</label>
                  <textarea rows={3} className={inputClass} value={form.current_routine} onChange={(e) => updateField('current_routine', e.target.value)} placeholder="Ex.: trabalho sentado, caminho bastante, treino no fim do dia, estou retomando após uma pausa..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nível de atividade fora da academia</label>
                  <select className={inputClass} value={form.activity_level} onChange={(e) => updateField('activity_level', e.target.value)}>
                    {['Pouco ativo', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className={`${panelClass} space-y-5`}>
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black"><Dumbbell className="h-5 w-5" /></div>
                <div><h2 className="font-black">Treino que cabe na sua vida</h2><p className="mt-0.5 text-xs text-neutral-400">A ordem em que você escolhe músculos define a prioridade.</p></div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <label className={labelClass}>Músculos prioritários</label>
                  <span className="text-[10px] text-neutral-500">{form.priority_muscles.length ? `Prioridades em ordem: ${form.priority_muscles.join(' → ')}` : 'Sem prioridade: distribuição equilibrada'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {muscleOptions.map((muscle) => {
                    const index = form.priority_muscles.indexOf(muscle);
                    const selected = index >= 0;
                    return (
                      <button key={muscle} type="button" aria-pressed={selected} onClick={() => toggleList('priority_muscles', muscle)} className={`flex min-h-[58px] items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${selected ? 'border-white bg-white text-black' : 'border-white/10 bg-[#090909] text-neutral-300 hover:border-white/35'}`}>
                        <span className="text-xs font-bold">{muscle}</span>
                        {selected ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">{index + 1}</span> : <span className="h-4 w-4 rounded-full border border-white/20" />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-neutral-500">Você pode escolher vários grupos, inclusive glúteos, quadríceps e posteriores. Toque novamente para remover. A IA manterá equilíbrio e recuperação.</p>
              </div>

              <div>
                <label className={labelClass}>Dias preferidos</label>
                <div className="flex flex-wrap gap-2">
                  {dayOptions.map((day) => {
                    const selected = form.preferred_days.includes(day);
                    return <button key={day} type="button" aria-pressed={selected} onClick={() => toggleList('preferred_days', day)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? 'border-white bg-white text-black' : 'border-white/10 bg-[#090909] text-neutral-400'}`}>{selected && <Check className="mr-1 inline h-3 w-3" />}{day}</button>;
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass}>Equipamentos disponíveis</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {equipmentOptions.map((equipment) => {
                    const selected = form.equipment_available.includes(equipment);
                    return <button key={equipment} type="button" aria-pressed={selected} onClick={() => toggleList('equipment_available', equipment)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${selected ? 'border-white bg-white text-black' : 'border-white/10 bg-[#090909] text-neutral-300'}`}>{selected ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded border border-white/20" />}{equipment}</button>;
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass}>Exercícios ou estilos de treino que prefere (opcional)</label>
                <textarea rows={3} className={inputClass} value={form.exercise_preferences} onChange={(e) => updateField('exercise_preferences', e.target.value)} placeholder="Ex.: gosto de pesos livres, prefiro máquinas, não gosto de correr..." />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className={`${panelClass} space-y-5`}>
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black"><ShieldCheck className="h-5 w-5" /></div>
                <div><h2 className="font-black">Limites e recuperação</h2><p className="mt-0.5 text-xs text-neutral-400">Responda apenas o que se sentir confortável em compartilhar.</p></div>
              </div>

              <div>
                <label className={labelClass}>Dores, lesões ou movimentos que precisa evitar (opcional)</label>
                <textarea rows={3} className={inputClass} value={form.pain_or_injuries} onChange={(e) => updateField('pain_or_injuries', e.target.value)} placeholder="Ex.: desconforto no ombro ao elevar o braço, lesão anterior já avaliada..." />
              </div>

              <div>
                <label className={labelClass}>Outras limitações relevantes (opcional)</label>
                <textarea rows={3} className={inputClass} value={form.health_notes} onChange={(e) => updateField('health_notes', e.target.value)} placeholder="Informe somente algo que realmente deva ser considerado para escolher exercícios com mais segurança." />
              </div>

              {(sensitiveDataFilled || form.consent_health_data) && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3.5">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-white" checked={form.consent_health_data} onChange={(e) => updateField('consent_health_data', e.target.checked)} />
                  <span className="text-xs leading-relaxed text-neutral-300">Autorizo o uso das informações de saúde e limitações que registrei para personalizar sugestões de treino. Entendo que posso revisar ou apagar essas respostas e que a IA não substitui avaliação profissional.</span>
                </label>
              )}
              {!sensitiveDataFilled && !form.consent_health_data && <p className="text-xs text-neutral-500">O consentimento de saúde só será solicitado se você preencher os campos sensíveis acima.</p>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Como está seu sono em geral?</label>
                  <select className={inputClass} value={form.sleep_quality} onChange={(e) => updateField('sleep_quality', e.target.value)}>
                    {['Ruim', 'Regular', 'Bom', 'Muito bom', 'Variável'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cardio ou outros esportes (opcional)</label>
                  <input className={inputClass} value={form.cardio_habits} onChange={(e) => updateField('cardio_habits', e.target.value)} placeholder="Ex.: corrida 2x/semana, futebol no domingo..." />
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/15 bg-amber-200/5 p-3.5 text-xs leading-relaxed text-neutral-300">
                <strong className="text-white">Importante:</strong> se houver dor persistente, lesão recente ou orientação clínica para evitar esforço, procure avaliação profissional. A anamnese ajuda a contextualizar a ficha, mas não permite diagnóstico.
              </div>
            </section>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" disabled={step === 0 || isSaving} onClick={() => { setErrorMsg(null); setStep((current) => Math.max(0, current - 1)); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-neutral-300 transition hover:bg-white/5 disabled:opacity-30">
              <ArrowLeft className="h-4 w-4" /> Etapa anterior
            </button>
            {step < 2 ? (
              <button type="button" onClick={() => { setErrorMsg(null); setStep((current) => Math.min(2, current + 1)); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-black transition hover:bg-neutral-200">
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" disabled={isSaving} onClick={handleSave} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-black transition hover:bg-neutral-200 disabled:opacity-50">
                {isSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <Sparkles className="h-4 w-4" />}
                {isSaving ? 'Salvando perfil...' : 'Salvar anamnese'}
              </button>
            )}
          </div>

          <p className="flex items-center justify-center gap-2 text-center text-[10px] leading-relaxed text-neutral-500">
            <Clock3 className="h-3.5 w-3.5 shrink-0" /> Leva cerca de 3 minutos. Você pode voltar e atualizar suas respostas quando sua rotina mudar.
          </p>
        </>
      )}
    </div>
  );
};
