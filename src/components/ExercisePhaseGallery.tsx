import React, { useEffect, useState } from 'react';
import { Expand, Images, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRepDBIllustrations } from '../data/repdbAssets';
import { findApprovedAnatomyAtlas } from '../data/anatomyAssets';
import { ExerciseIllustration } from './ExerciseIllustration';

interface Props {
  exerciseId?: string;
  exerciseName: string;
  muscleGroup?: string;
  fallbackPaths?: string[];
}

/** Read-only instructional imagery. A match must be exact in the curated RepDB table.
 * Prefer an approved FOCO atlas when one exists, and fallback to existing visual sources.
 */
export const ExercisePhaseGallery: React.FC<Props> = ({ exerciseId, exerciseName, muscleGroup, fallbackPaths = [] }) => {
  const [phases, setPhases] = useState<string[]>([]);
  const [showAtlas, setShowAtlas] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewIndex,setPreviewIndex]=useState<number|null>(null);
  const galleryRef=useRef<HTMLDialogElement|null>(null);
  useEffect(()=>{if(previewIndex!==null && !galleryRef.current?.open)galleryRef.current?.showModal();},[previewIndex]);
  const closeGallery=()=>{galleryRef.current?.close();setPreviewIndex(null);};

  useEffect(() => {
    let live = true;
    setPhases([]);
    setFailed(false);
    setShowAtlas(false);
    setLoading(true);
    void Promise.all([
      getRepDBIllustrations(exerciseName).catch(() => []),
      findApprovedAnatomyAtlas(exerciseId, exerciseName).catch(() => null),
    ]).then(([images, atlas]) => {
      if (!live) return;
      setShowAtlas(Boolean(atlas));
      setPhases(images.slice(0, 2));
      setLoading(false);
    });
    return () => { live = false; };
  }, [exerciseId, exerciseName]);

  if (loading) return <div className="grid h-60 grid-cols-2 gap-2" role="status" aria-label="Carregando ilustrações">
    <div className="animate-pulse rounded-[18px] bg-[#242424]" />
    <div className="animate-pulse rounded-[18px] bg-[#242424]" />
  </div>;

  if (showAtlas || failed || phases.length === 0) {
    return <ExerciseIllustration exerciseId={exerciseId} exerciseName={exerciseName} muscleGroup={muscleGroup}
      imagePaths={fallbackPaths} className="h-64 w-full sm:h-80" showCaption />;
  }

  const labels = phases.length === 1 ? ['Posição demonstrativa'] : ['Posição inicial', 'Posição final'];
  return <div className="space-y-2">
    <div className={'grid gap-2.5 ' + (phases.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {phases.map((url, index) => <button type="button" onClick={()=>setPreviewIndex(index)}
        key={url} aria-label={'Ampliar ' + labels[index] + ' de ' + exerciseName + ' dentro do FOCO'}
        className="group relative overflow-hidden rounded-[18px] border border-white/10 bg-[#e9e9e9] focus-visible:outline-2 focus-visible:outline-offset-2">
        <div className="aspect-square">
          <img src={url} alt={exerciseName + ' — ' + labels[index]}
            loading={index === 0 ? 'eager' : 'lazy'}
            className="h-full w-full object-contain grayscale contrast-105 transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setFailed(true)} />
        </div>
        <span className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-xl bg-black/85 px-2.5 py-2 text-[11px] font-bold text-white">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">{index + 1}</span>
          <span className="truncate">{labels[index]}</span>
          <Expand className="ml-auto h-3.5 w-3.5 shrink-0" />
        </span>
      </button>)}
    </div>
    <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
      <span className="flex items-center gap-1"><Images className="h-3.5 w-3.5" /> Ilustração educativa de execução</span>
      <a href="https://repdb.co" target="_blank" rel="nofollow noreferrer" className="text-right underline hover:text-white">
        Exercise data by RepDB (repdb.co)
      </a>
    </div>
    {previewIndex!==null&&<dialog ref={galleryRef} onClose={()=>setPreviewIndex(null)}
      aria-label={'Visualização ampliada da execução de '+exerciseName}
      className="foco-v8-gallery-dialog m-auto w-[min(96vw,720px)] max-w-none rounded-[22px] border border-white/20 bg-[#101610] p-4 text-white shadow-2xl backdrop:bg-black/90">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-extrabold tracking-wider text-[#C8F040]">EXECUÇÃO ILUSTRADA · {previewIndex+1}/{phases.length}</p>
          <h3 className="mt-1 text-lg font-bold">{exerciseName}</h3></div>
        <button type="button" className="foco-v8-dialog-close" onClick={closeGallery} aria-label="Fechar imagem ampliada"><X size={19}/></button>
      </header>
      <img src={phases[previewIndex]} alt={exerciseName + ' — ' + labels[previewIndex]}
        className="mx-auto block max-h-[65dvh] w-full rounded-xl bg-[#EAEAEA] object-contain"/>
      {phases.length>1&&<div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" className="foco-v8-dialog-step" onClick={()=>setPreviewIndex(i=>(i===null?0:(i+phases.length-1)%phases.length))}><ChevronLeft size={17}/> Anterior</button>
        <span className="text-xs text-neutral-300">{labels[previewIndex]}</span>
        <button type="button" className="foco-v8-dialog-step" onClick={()=>setPreviewIndex(i=>(i===null?0:(i+1)%phases.length))}>Próxima <ChevronRight size={17}/></button>
      </div>}
      <p className="mt-3 text-xs text-[#AEBBA5]">Ilustrações estáticas da RepDB: início e fim do movimento, não vídeo 3D.</p>
      <a href="https://repdb.co" target="_blank" rel="nofollow noreferrer" className="mt-2 inline-block text-xs text-[#C8F040] underline">Exercise data by RepDB (repdb.co)</a>
    </dialog>}
  </div>;
};
