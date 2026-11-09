import React, { useEffect, useRef, useState } from 'react';
import { Dumbbell, LoaderCircle, PlayCircle } from 'lucide-react';
import {
  getExerciseDBGifPreview,
  isExerciseDBBetaAllowed,
  type ExerciseDBPreviewResult,
} from '../data/exerciseDbBeta';

/**
 * Cards do not fetch remote media in bulk. The single active workout exercise
 * (editorial presentation) attempts an exact ExerciseDB GIF when it is shown.
 * External URLs are not persisted or cached by FOCO.
 */
interface Props {
  exerciseName: string;
  exerciseId?: string;
  muscleGroup?: string;
  imagePaths?: string[];
  className?: string;
  showCaption?: boolean;
  presentation?: 'standard' | 'editorial';
}
export const ExerciseIllustration: React.FC<Props> = ({
  exerciseName,
  muscleGroup,
  className = 'h-64 w-full',
  presentation = 'standard',
}) => {
  const activeStage = presentation === 'editorial';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(activeStage);
  useEffect(() => {
    if (activeStage) { setVisible(true); return; }
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeStage]);
  const [preview, setPreview] = useState<ExerciseDBPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const allowed = isExerciseDBBetaAllowed();

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setFailedImage(false);
    setLoading(false);

    // Never turn ordinary exercise lists into N simultaneous API/GIF requests.
    // An active session shows only one exercise at a time.
    if (!visible || !allowed || !exerciseName.trim()) return;
    setLoading(true);
    void getExerciseDBGifPreview(exerciseName)
      .then(value => { if (!cancelled) setPreview(value); })
      .catch(() => { if (!cancelled) setPreview({ state: 'unavailable' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [exerciseName, visible, allowed, retryKey]);

  const compact = activeStage || /\bh-(14|16|20)\b/.test(className);
  const gif = !loading && !failedImage && preview?.state === 'matched'
    ? preview.gifUrl : null;

  const status = !allowed ? 'Demonstração não habilitada'
    : loading ? 'Carregando demonstração'
    : failedImage ? 'Imagem externa não carregou'
    : preview?.state === 'no_match' ? 'Sem GIF para esta variação'
    : preview?.state === 'rate_limited' ? 'Limite temporário de consultas'
    : 'Imagem temporariamente indisponível';

  return <div ref={rootRef} data-foco-media-source="exercisedb"
    data-foco-media-status={gif ? 'image' : loading ? 'loading' : 'unavailable'}
    aria-label={'Demonstração do exercício: ' + exerciseName}
    className={'foco-edb-tile relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#C8F040]/20 bg-[#182317] text-center ' + className}>
    {gif ? <>
      <img key={gif} src={gif} alt={'Demonstração de ' + exerciseName + ' — ExerciseDB'}
        className="foco-edb-stage-gif" loading="eager" decoding="async" referrerPolicy="no-referrer"
        onError={() => setFailedImage(true)} />
      <span className="foco-edb-stage-attribution">EXERCISEDB</span>
    </> : (activeStage || visible) ? <div className="foco-edb-stage-status" role="status" aria-live="polite">
      {loading ? <LoaderCircle size={26} className="animate-spin" aria-hidden="true" /> :
        <Dumbbell size={29} strokeWidth={1.35} aria-hidden="true" />}
      <span>{status}</span>
      {!loading && allowed && <button type="button" className="foco-edb-retry"
        onClick={() => setRetryKey(current => current + 1)} aria-label={'Tentar novamente imagem de ' + exerciseName}>
        Tentar imagem novamente
      </button>}
      {!loading && failedImage && preview?.state === 'matched' &&
        <a className="foco-edb-direct" href={preview.gifUrl} target="_blank" rel="noopener noreferrer">
          Ver GIF original no navegador
        </a>}
    </div> : <>
      <Dumbbell className="foco-edb-tile-icon" size={compact ? 27 : 47} strokeWidth={1.35} aria-hidden="true" />
      {!compact && <><strong className="foco-edb-tile-name">{exerciseName}</strong>
        {muscleGroup && <span className="foco-edb-tile-subtitle">{muscleGroup}</span>}</>}
      <span className="foco-edb-tile-credit"><PlayCircle size={compact ? 11 : 14} aria-hidden="true" /> EXERCISEDB</span>
    </>}
  </div>;
};
