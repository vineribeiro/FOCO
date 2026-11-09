import React, { useEffect, useState, useRef } from 'react';
import { Activity, ArrowLeft, Bike, CheckCircle2, Clock3, Footprints, Pause, Play, RotateCcw, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CARDIO_TYPES } from '../utils/cardio';
import type { CardioEffort, CardioMachine } from '../utils/cardio';
import { loadCardioDraft, saveCardioDraft, currentCardioSeconds } from '../utils/cardioDraft';
import type { CardioDraft } from '../utils/cardioDraft';
import { createSessionRequestId, createSessionSubmission } from '../utils/sessionSubmission';

interface CardioPageProps { setActiveTab: (tab: string) => void }
function clock(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  return [hours, minutes, secs].map(n => String(n).padStart(2, '0')).join(':');
}

export const CardioPage: React.FC<CardioPageProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [machine, setMachine] = useState<CardioMachine>('esteira');
  const [effort, setEffort] = useState<CardioEffort>('leve');
  const [draft, setDraft] = useState<CardioDraft | null>(() => loadCardioDraft(user?.id));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [metric, setMetric] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    const restored = loadCardioDraft(user?.id);
    setDraft(restored);
    if (restored) {
      setMachine(restored.machine);
      setEffort(restored.effort);
      setMetric(restored.metric || '');
      setNotes(restored.notes || '');
    }
  }, [user?.id]);

  useEffect(() => {
    if (!draft) { setElapsedSeconds(0); return; }
    const update = () => setElapsedSeconds(currentCardioSeconds(draft));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [draft]);

  const saveDraft = (next: CardioDraft | null): boolean => {
    setDraft(next);
    if (!user?.id) return false;
    const preserved = saveCardioDraft(user.id, next);
    if (!preserved) setMessage('Armazenamento local indisponível. Libere espaço ou habilite o armazenamento do navegador e tente novamente.');
    return preserved;
  };

  const start = () => {
    if (draft) return;
    const now = Date.now();
    const next: CardioDraft = { version: 1, clientRequestId: createSessionRequestId(), machine, effort, startedAt: now,
      runningSince: now, accumulatedSeconds: 0, metric: '', notes: '' };
    setSaved(false);
    setMessage('');
    saveDraft(next);
  };
  const pause = () => {
    if (!draft || draft.runningSince === null || draft.finalizing) return;
    saveDraft({ ...draft, accumulatedSeconds: currentCardioSeconds(draft), runningSince: null });
  };
  const resume = () => {
    if (!draft || draft.runningSince !== null || draft.finalizing) return;
    saveDraft({ ...draft, runningSince: Date.now() });
  };
  const stopActivity = () => {
    if (!draft || draft.finalizing) return;
    saveDraft({ ...draft, accumulatedSeconds: currentCardioSeconds(draft), runningSince: null, finalizing: true, finishedAt: Date.now() });
  };
  const continueActivity = () => {
    if (!draft || !draft.finalizing || draft.pendingSubmission || isSaving) return;
    saveDraft({ ...draft, finalizing: false, finishedAt: undefined, runningSince: Date.now() });
  };
  const discard = () => {
    if (draft?.pendingSubmission || saveInFlightRef.current) return;
    if (!window.confirm('Descartar o cardio não salvo?')) return;
    saveDraft(null);
    setMetric('');
    setNotes('');
    setMessage('');
  };
  const finish = async () => {
    if (!draft || !draft.finalizing || saveInFlightRef.current || !user?.id) return;
    const seconds = currentCardioSeconds(draft);
    if (seconds < 5) { setMessage('Registre pelo menos cinco segundos antes de concluir.'); return; }
    const selected = CARDIO_TYPES.find(item => item.id === draft.machine)!;
    const trimmed = metric.trim();
    const value = trimmed ? Number(trimmed.replace(',', '.')) : null;
    if (!draft.pendingSubmission && value !== null && (!Number.isFinite(value) || value < 0 || value > 10000)) {
      setMessage('Confira a distância ou os andares: informe um número válido.');
      return;
    }
    const metricLabel = value === null ? 'Não informado' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${selected.metric}`;
    const notesText = [
      '[FOCO_CARDIO_V1]',
      'Equipamento: ' + selected.label,
      'Métrica: ' + metricLabel,
      'Intensidade: ' + effort,
      'Escolha livre: cardio realizado sem mudar a ficha semanal.',
      notes.trim() ? 'Observações: ' + notes.trim() : '',
    ].filter(Boolean).join('\n').slice(0, 1200);
    saveInFlightRef.current = true;
    setIsSaving(true);
    setMessage('');
    try {
      const submission = draft.pendingSubmission || createSessionSubmission(draft.clientRequestId, {
        plan_name: 'Cardio · ' + selected.label,
        started_at: new Date(draft.startedAt).toISOString(),
        finished_at: new Date(draft.finishedAt || Date.now()).toISOString(),
        duration_seconds: seconds,
        notes: notesText,
        status: 'completed',
        sets: [],
      });
      const frozenDraft: CardioDraft = { ...draft, pendingSubmission: submission, runningSince: null };
      if (!saveDraft(frozenDraft)) {
        throw new Error('Não foi possível preservar o registro neste aparelho. Libere espaço ou habilite o armazenamento e tente salvar novamente. O cardio ainda não foi enviado.');
      }
      const response = await api.recordSession(submission);
      if (!response?.id) throw new Error('O servidor não confirmou o registro do cardio. Tente salvar novamente.');
      saveDraft(null);
      setMetric('');
      setNotes('');
      setSaved(true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Não foi possível gravar o cardio.';
      setMessage(reason + ' O registro foi mantido para tentar novamente.');
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const chosen = CARDIO_TYPES.find(item => item.id === (draft?.machine || machine))!;
  return (
    <div className="foco-v4-page mx-auto max-w-3xl space-y-5 pb-16 text-white">
      <button type="button" className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-300"
        onClick={() => setActiveTab('treinos')}><ArrowLeft className="h-4 w-4" /> Voltar aos treinos</button>
      <header>
        <p className="foco-v4-eyebrow">FOCO / ATIVIDADE LIVRE</p>
        <h1 className="foco-v4-heading mt-2">Meu cardio</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">
          Escolhe uma atividade para hoje, inclusive num dia de descanso. A ficha original não muda.
        </p>
      </header>
      <p className="sr-only" role="status">{saved ? 'Cardio registrado no histórico. Teus dados estão salvos no FOCO.' : isSaving ? 'Salvando cardio.' : ''}</p>
      {saved && (
        <div className="foco-v4-panel foco-motion-confirmation flex flex-wrap items-center gap-3 p-4">
          <CheckCircle2 className="h-6 w-6" />
          <div className="flex-1"><p className="font-bold">Cardio registrado no histórico.</p>
            <p className="text-xs text-neutral-400">Teus dados estão salvos no FOCO.</p></div>
          <button type="button" className="foco-v4-secondary" onClick={() => setActiveTab('historico')}>Ver histórico</button>
        </div>
      )}
      <section className="foco-v4-panel foco-motion-cardio space-y-5 p-4 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Equipamento</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CARDIO_TYPES.map(type => (
              <button key={type.id} type="button" disabled={!!draft}
                aria-pressed={chosen.id === type.id}
                onClick={() => setMachine(type.id)}
                className={`min-h-16 rounded-2xl border p-3 text-left text-sm font-bold transition ${chosen.id === type.id
                  ? 'border-white bg-white text-black' : 'border-white/15 bg-[#101010] text-white'} disabled:cursor-not-allowed`}>
                {type.id === 'bicicleta' ? <Bike className="mb-1.5 h-5 w-5" /> : type.id === 'esteira' ? <Footprints className="mb-1.5 h-5 w-5" /> : <Activity className="mb-1.5 h-5 w-5" />}
                {type.label}
              </button>
            ))}
          </div>
        </div>
        <div className="foco-motion-cardio-timer rounded-3xl border border-white/15 bg-[#080808] px-4 py-7 text-center" data-running={!!draft && draft.runningSince !== null && !draft.finalizing}>
          <Clock3 className="mx-auto mb-4 h-6 w-6 text-neutral-400" />
          <p className="foco-v4-eyebrow">Tempo de atividade</p>
          <p role="timer" className="mt-2 font-mono text-5xl font-black tracking-tighter tabular-nums sm:text-6xl">{clock(elapsedSeconds)}</p>
          <p className="mt-3 text-xs text-neutral-400">{draft ? draft.pendingSubmission ? 'Atividade encerrada · Registro preservado para reenvio' : draft.finalizing ? 'Atividade encerrada · Preencha os dados abaixo' : draft.runningSince !== null ? 'Cronômetro em andamento' : 'Cronômetro pausado' : 'Pronto para começar'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!draft ? (
              <button type="button" onClick={start} className="foco-v4-action min-w-48 justify-center">
                <Play className="h-4 w-4" /> Iniciar cardio
              </button>
            ) : draft.finalizing ? (
              <button type="button" onClick={continueActivity} disabled={isSaving || !!draft.pendingSubmission} className="foco-v4-secondary justify-center">
                <RotateCcw className="h-4 w-4" /> Retomar atividade
              </button>
            ) : (
              <>
                <button type="button" onClick={draft.runningSince === null ? resume : pause}
                  className="foco-v4-action min-w-36 justify-center">
                  {draft.runningSince === null ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {draft.runningSince === null ? 'Continuar' : 'Pausar'}
                </button>
                <button type="button" onClick={stopActivity} className="foco-v4-secondary justify-center">
                  <CheckCircle2 className="h-4 w-4" /> Encerrar atividade
                </button>
                <button type="button" onClick={discard} className="foco-v4-secondary justify-center">
                  <RotateCcw className="h-4 w-4" /> Descartar
                </button>
              </>
            )}
          </div>
        </div>
        {draft?.finalizing && (
          <div className="space-y-4 border-t border-white/10 pt-5">
            {draft.pendingSubmission && <p role="status" className="text-sm text-neutral-200">Registro encerrado e preservado. Tente salvar novamente para confirmar o envio, sem criar outro cardio.</p>}
            <div>
              <label htmlFor="cardio-metric" className="mb-2 block text-sm font-bold">
                {chosen.metric === 'andares' ? 'Andares percorridos' : 'Distância percorrida (km)'} <span className="font-normal text-neutral-400">opcional</span>
              </label>
              <input id="cardio-metric" type="text" inputMode="decimal" value={metric} disabled={isSaving || !!draft.pendingSubmission}
                placeholder={chosen.metric === 'andares' ? 'Ex.: 18' : 'Ex.: 3,50'}
                onChange={event => {
                  setMetric(event.target.value);
                  if (draft) saveDraft({ ...draft, metric: event.target.value });
                }}
                className="min-h-12 w-full rounded-xl border border-white/20 bg-[#101010] px-4 text-white outline-none focus:border-white" />
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Como foi o esforço?</p>
              <div className="grid grid-cols-3 gap-2">
                {(['leve', 'moderado', 'intenso'] as CardioEffort[]).map(value => (
                  <button type="button" key={value} disabled={isSaving || !!draft.pendingSubmission} aria-pressed={effort === value}
                    onClick={() => {
                      setEffort(value);
                      if (draft) saveDraft({ ...draft, effort: value });
                    }}
                    className={`min-h-12 rounded-xl border text-xs font-bold capitalize ${effort === value
                      ? 'border-white bg-white text-black' : 'border-white/20 bg-[#101010] text-neutral-200'}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="cardio-notes" className="mb-2 block text-sm font-bold">Observações <span className="font-normal text-neutral-400">opcional</span></label>
              <textarea id="cardio-notes" rows={2} maxLength={400} value={notes} disabled={isSaving || !!draft.pendingSubmission}
                onChange={event => {
                  setNotes(event.target.value);
                  if (draft) saveDraft({ ...draft, notes: event.target.value });
                }}
                className="w-full rounded-xl border border-white/20 bg-[#101010] p-3 text-sm text-white outline-none focus:border-white"
                placeholder="Inclinação, velocidade média, como te sentiu..." />
            </div>
            <button type="button" disabled={isSaving} onClick={finish}
              className="foco-v4-action w-full justify-center disabled:opacity-50">
              <Save className="h-4 w-4" /> {isSaving ? 'Salvando...' : draft.pendingSubmission ? 'Tentar salvar o mesmo cardio' : 'Finalizar e registrar cardio'}
            </button>
          </div>
        )}
      </section>
      {message && <p role="alert" className="rounded-xl border border-white/25 bg-white/10 p-3 text-sm text-white">{message}</p>}
      <p className="text-xs leading-relaxed text-neutral-400">
        Recuperação ativa deve ser leve e opcional. Dor muscular incomum ou intensa, fraqueza importante ou urina escura não são sinais para insistir no cardio: interrompe a atividade e procura avaliação médica.
      </p>
    </div>
  );
};
