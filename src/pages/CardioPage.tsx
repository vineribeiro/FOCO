import React, { useEffect, useState } from 'react';
import { Activity, ArrowLeft, Bike, CheckCircle2, Clock3, Footprints, Pause, Play, RotateCcw, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CARDIO_TYPES } from '../utils/cardio';
import type { CardioEffort, CardioMachine } from '../utils/cardio';

interface CardioPageProps { setActiveTab: (tab: string) => void }
interface CardioDraft {
  version: 1;
  machine: CardioMachine;
  effort: CardioEffort;
  startedAt: number;
  runningSince: number | null;
  accumulatedSeconds: number;
  metric: string;
  notes: string;
}
const storageKey = (userId: string) => 'foco:cardio-draft:v1:' + encodeURIComponent(userId);
function readDraft(userId?: string): CardioDraft | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as CardioDraft;
    if (draft.version !== 1 || !CARDIO_TYPES.some(type => type.id === draft.machine)
      || !Number.isFinite(draft.startedAt) || draft.startedAt > Date.now()
      || draft.startedAt < Date.now() - 7 * 86400000
      || !Number.isFinite(draft.accumulatedSeconds)
      || (draft.runningSince !== null && !Number.isFinite(draft.runningSince))) return null;
    return draft;
  } catch { return null; }
}
function currentSeconds(draft: CardioDraft): number {
  return Math.max(0, Math.floor(draft.accumulatedSeconds
    + (draft.runningSince === null ? 0 : (Date.now() - draft.runningSince) / 1000)));
}
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
  const [draft, setDraft] = useState<CardioDraft | null>(() => readDraft(user?.id));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [metric, setMetric] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const restored = readDraft(user?.id);
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
    const update = () => setElapsedSeconds(currentSeconds(draft));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [draft]);

  const saveDraft = (next: CardioDraft | null) => {
    setDraft(next);
    if (!user?.id) return;
    try {
      if (next) localStorage.setItem(storageKey(user.id), JSON.stringify(next));
      else localStorage.removeItem(storageKey(user.id));
    } catch {
      setMessage('Armazenamento local indisponível. Evita fechar o aplicativo durante o cardio.');
    }
  };

  const start = () => {
    if (draft) return;
    const now = Date.now();
    const next: CardioDraft = { version: 1, machine, effort, startedAt: now,
      runningSince: now, accumulatedSeconds: 0, metric: '', notes: '' };
    setSaved(false);
    setMessage('');
    saveDraft(next);
  };
  const pause = () => {
    if (!draft || draft.runningSince === null) return;
    saveDraft({ ...draft, accumulatedSeconds: currentSeconds(draft), runningSince: null });
  };
  const resume = () => {
    if (!draft || draft.runningSince !== null) return;
    saveDraft({ ...draft, runningSince: Date.now() });
  };
  const discard = () => {
    if (!window.confirm('Descartar o cardio não salvo?')) return;
    saveDraft(null);
    setMetric('');
    setNotes('');
    setMessage('');
  };
  const finish = async () => {
    if (!draft || isSaving) return;
    const seconds = currentSeconds(draft);
    if (seconds < 5) { setMessage('Registra pelo menos cinco segundos antes de concluir.'); return; }
    const selected = CARDIO_TYPES.find(item => item.id === draft.machine)!;
    const trimmed = metric.trim();
    const value = trimmed ? Number(trimmed.replace(',', '.')) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 10000)) {
      setMessage('Confere a distância ou os andares: informa um número válido.');
      return;
    }
    // A distância é opcional: algumas máquinas não mostram quilômetros ou andares.
    const metricLabel = value === null ? 'Não informado' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${selected.metric}`;
    const notesText = [
      '[FOCO_CARDIO_V1]',
      'Equipamento: ' + selected.label,
      'Métrica: ' + metricLabel,
      'Intensidade: ' + effort,
      'Escolha livre: cardio realizado sem mudar a ficha semanal.',
      notes.trim() ? 'Observações: ' + notes.trim() : '',
    ].filter(Boolean).join('\n').slice(0, 1200);
    setIsSaving(true);
    setMessage('');
    try {
      await api.recordSession({
        plan_name: 'Cardio · ' + selected.label,
        started_at: new Date(draft.startedAt).toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: seconds,
        notes: notesText,
        status: 'completed',
        sets: [],
      });
      saveDraft(null);
      setMetric('');
      setNotes('');
      setSaved(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gravar o cardio. Tenta novamente; o registro local foi preservado.');
    } finally {
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
      {saved && (
        <div role="status" className="foco-v4-panel flex flex-wrap items-center gap-3 p-4">
          <CheckCircle2 className="h-6 w-6" />
          <div className="flex-1"><p className="font-bold">Cardio registrado no histórico.</p>
            <p className="text-xs text-neutral-400">Teus dados estão salvos no FOCO.</p></div>
          <button type="button" className="foco-v4-secondary" onClick={() => setActiveTab('historico')}>Ver histórico</button>
        </div>
      )}
      <section className="foco-v4-panel space-y-5 p-4 sm:p-6">
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
        <div className="rounded-3xl border border-white/15 bg-[#080808] px-4 py-7 text-center">
          <Clock3 className="mx-auto mb-4 h-6 w-6 text-neutral-400" />
          <p className="foco-v4-eyebrow">Tempo de atividade</p>
          <p role="timer" className="mt-2 font-mono text-5xl font-black tracking-tighter tabular-nums sm:text-6xl">{clock(elapsedSeconds)}</p>
          <p className="mt-3 text-xs text-neutral-400">{draft ? draft.runningSince !== null ? 'Cronômetro em andamento' : 'Cronômetro pausado' : 'Pronto para começar'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!draft ? (
              <button type="button" onClick={start} className="foco-v4-action min-w-48 justify-center">
                <Play className="h-4 w-4" /> Iniciar cardio
              </button>
            ) : (
              <>
                <button type="button" onClick={draft.runningSince === null ? resume : pause}
                  className="foco-v4-action min-w-36 justify-center">
                  {draft.runningSince === null ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {draft.runningSince === null ? 'Continuar' : 'Pausar'}
                </button>
                <button type="button" onClick={discard} className="foco-v4-secondary justify-center">
                  <RotateCcw className="h-4 w-4" /> Descartar
                </button>
              </>
            )}
          </div>
        </div>
        {draft && (
          <div className="space-y-4 border-t border-white/10 pt-5">
            <div>
              <label htmlFor="cardio-metric" className="mb-2 block text-sm font-bold">
                {chosen.metric === 'andares' ? 'Andares percorridos' : 'Distância percorrida (km)'} <span className="font-normal text-neutral-400">opcional</span>
              </label>
              <input id="cardio-metric" type="text" inputMode="decimal" value={metric}
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
                  <button type="button" key={value} aria-pressed={effort === value}
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
              <textarea id="cardio-notes" rows={2} maxLength={400} value={notes}
                onChange={event => {
                  setNotes(event.target.value);
                  if (draft) saveDraft({ ...draft, notes: event.target.value });
                }}
                className="w-full rounded-xl border border-white/20 bg-[#101010] p-3 text-sm text-white outline-none focus:border-white"
                placeholder="Inclinação, velocidade média, como te sentiu..." />
            </div>
            <button type="button" disabled={isSaving} onClick={finish}
              className="foco-v4-action w-full justify-center disabled:opacity-50">
              <Save className="h-4 w-4" /> {isSaving ? 'Salvando...' : 'Finalizar e registrar cardio'}
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
