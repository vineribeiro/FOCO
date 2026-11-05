import React, { useEffect, useState } from 'react';
import { EyeOff, LoaderCircle, PlayCircle, RefreshCcw } from 'lucide-react';
import {
  getExerciseDBGifPreview, isExerciseDBBetaAllowed,
  type ExerciseDBPreviewResult,
} from '../data/exerciseDbBeta';

type Props = { exerciseName: string; compact?: boolean };

/** External animated preview is always OPT-IN, never loaded by a list thumbnail.
 * Show for EVERY exercise with a detail view, but only display a GIF after
 * an exact validated match. The FOCO instructions remain the source of truth.
 */
export const ExerciseDBPreview: React.FC<Props> = ({ exerciseName, compact = false }) => {
  const [state, setState] = useState<ExerciseDBPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const allowed = isExerciseDBBetaAllowed();
  useEffect(() => {
    setState(null);
    setLoading(false);
    setImgFailed(false);
  }, [exerciseName]);
  const request = async () => {
    setState(null);
    setImgFailed(false);
    setLoading(true);
    try { setState(await getExerciseDBGifPreview(exerciseName)); }
    finally { setLoading(false); }
  };
  if (!allowed) return null;
  const message = imgFailed ? 'GIF indisponível no servidor externo. Consulta outro exercício ou tenta novamente depois.'
    : state?.state === 'no_match' ? 'Não encontramos um GIF com correspondência exata para esta variação. Não exibimos substituições imprecisas.'
    : state?.state === 'rate_limited' ? 'A API gratuita limitou as consultas. Tenta novamente depois de alguns segundos.'
    : state?.state === 'unavailable' ? 'A API gratuita está indisponível, bloqueada no navegador ou demorou demais. Consulta outro exercício ou tenta novamente depois.'
    : state?.state === 'disabled' ? 'Esta demonstração não está habilitada para uso comercial.'
    : null;

  return <section className="foco-edb-preview mt-3 rounded-[20px] border border-[#C8F040]/20 bg-[#111A10] p-3 text-white" aria-label={'Demonstração animada experimental de '+exerciseName}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#C8F040]">EXERCISEDB · BETA NÃO COMERCIAL</p>
        <p className="mt-1 text-xs leading-5 text-neutral-300">
          GIF externo de 180p, carregado somente quando solicitado.
        </p>
      </div>
      <button type="button" onClick={()=>{if(state?.state==='matched'&&!imgFailed)setState(null);else void request();}} disabled={loading}
        aria-busy={loading}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#C8F040]/40 bg-[#25371C] px-3 py-2 text-xs font-extrabold text-[#D8FF81] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F040] disabled:opacity-60">
        {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> :
          state?.state === 'matched' && !imgFailed ? <EyeOff size={17} aria-hidden="true" /> : imgFailed ? <RefreshCcw size={17} aria-hidden="true" /> :
          <PlayCircle size={17} aria-hidden="true" />}
        {loading ? 'Consultando...' : state?.state === 'matched' && !imgFailed ? 'Ocultar GIF' : imgFailed ? 'Tentar outro carregamento' : compact ? 'Ver GIF' : 'Ver demonstração GIF'}
      </button>
    </div>
    {state?.state === 'matched' && !imgFailed &&
      <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-[#0A0E0A] p-2">
        <img src={state.gifUrl} alt={'GIF experimental de '+exerciseName+' — fonte externa ExerciseDB'}
          loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setImgFailed(true)}
          className="mx-auto aspect-square max-h-[320px] w-full max-w-[320px] object-contain" />
        <p className="mt-2 text-center text-[11px] text-neutral-300">Exercício identificado: {state.name}. Confira se equipamento e variação coincidem com sua ficha.</p>
      </div>}
    {message && <p className="mt-3 rounded-lg border border-amber-200/20 bg-amber-950/20 p-2 text-xs leading-5 text-amber-100" role="status">{message}</p>}
    <p className="mt-3 text-[10px] leading-4 text-[#AFBEA7]">
      Mídia de terceiros para testes, não substitui orientação profissional.
      {' '}<a href="https://oss.exercisedb.dev/docs" rel="noopener noreferrer" target="_blank" className="font-semibold text-[#C8F040] underline underline-offset-2">Créditos: AscendAPI / ExerciseDB</a>.
      {' '}Uso exclusivamente não comercial.
    </p>
  </section>;
};
