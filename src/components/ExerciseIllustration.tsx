import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Expand, X } from 'lucide-react';
import { findMatchingExercise, getExerciseDisplayName, getExerciseImageUrl, getMuscleLabel, loadExerciseCatalog } from '../data/exerciseLibrary';

interface ExerciseIllustrationProps {
  exerciseName: string;
  muscleGroup?: string;
  imagePaths?: string[];
  className?: string;
  showCaption?: boolean;
}
const muscleTargets: Record<string, string> = {
  chest: 'Peitoral', shoulders: 'Deltoides', biceps: 'Bíceps', triceps: 'Tríceps',
  quadriceps: 'Quadríceps', hamstrings: 'Posteriores de coxa', glutes: 'Glúteos',
  lats: 'Dorsais', 'middle back': 'Costas médias', abdominals: 'Abdômen',
  calves: 'Panturrilhas', traps: 'Trapézio', forearms: 'Antebraços',
};

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exerciseName, muscleGroup, imagePaths = [], className = 'h-64 w-full', showCaption = false,
}) => {
  const [pose, setPose] = useState(0);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [fallbackImages, setFallbackImages] = useState<string[]>([]);
  const [imageFailed, setImageFailed] = useState(false);
  const compact = /\bh-(14|16|20)\b/.test(className);
  const suppliedImages = imagePaths.filter(Boolean).slice(0, 2);
  const images = suppliedImages.length ? suppliedImages : fallbackImages;
  const hasImage = images.length > 0 && !imageFailed;
  const target = muscleGroup ? (muscleTargets[muscleGroup.toLowerCase()] || getMuscleLabel(muscleGroup)) : 'Músculos trabalhados';

  // Fichas criadas manualmente ou por IA carregam o nome do exercício, mas não
  // o caminho da imagem. Resolver pelo catálogo evita cartões vazios na sessão.
  useEffect(() => {
    let mounted = true;
    setPose(0);
    setImageFailed(false);
    setFallbackImages([]);
    if (suppliedImages.length) return () => { mounted = false; };
    loadExerciseCatalog().then((catalog) => {
      if (!mounted) return;
      const match = findMatchingExercise(catalog, exerciseName, muscleGroup);
      const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');
      const keys = match ? [match.name, getExerciseDisplayName(match.name), ...(match.aliases || [])] : [];
      // Não usar imagens de um exercício parecido quando o nome não coincide.
      const exactMatch = keys.some((name) => normalize(name) === normalize(exerciseName));
      setFallbackImages(exactMatch ? match?.images?.filter(Boolean).slice(0, 2) || [] : []);
    }).catch(() => {
      if (mounted) setFallbackImages([]);
    });
    return () => { mounted = false; };
  }, [exerciseName, muscleGroup, imagePaths.join('|')]);

  const selectPose = (next: number) => {
    setImageFailed(false);
    setPose(next);
  };

  const toggleZoom = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    else dialogRef.current?.showModal();
  };

  return (
    <div className={'relative isolate overflow-hidden rounded-2xl border border-black/10 bg-[#F4F4F4] ' + className}>
      {!compact && (
        <div className="absolute left-3 top-3 z-10 rounded-full border border-black/10 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-neutral-800">
          Execução ilustrada
        </div>
      )}
      {hasImage ? (
        <div className={'absolute inset-0 flex items-center justify-center ' + (compact ? 'p-1' : 'px-3 pb-12 pt-12 sm:px-5')}>
          {compact ? (
            <img key={images[pose]} src={getExerciseImageUrl(images[pose])}
              alt={exerciseName + ' — imagem ilustrativa'}
              loading="lazy" className="foco-anatomy-image h-full w-full object-contain"
              onError={() => setImageFailed(true)} />
          ) : (
            <button type="button" onClick={toggleZoom}
              className="group flex h-full w-full items-center justify-center outline-offset-2"
              aria-label={'Ampliar imagem de ' + exerciseName + (pose === 0 ? ' na posição inicial' : ' na posição final')}>
              <img key={images[pose]} src={getExerciseImageUrl(images[pose])}
                alt={exerciseName + ' — ' + (pose === 0 ? 'posição inicial' : 'posição final')}
                loading="lazy" className="foco-anatomy-image h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.025]"
                onError={() => setImageFailed(true)} />
              <span className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-black shadow-sm"
                aria-hidden="true"><Expand className="h-5 w-5" /></span>
            </button>
          )}
        </div>
      ) : (
        <div className={'absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-neutral-600 ' + (compact ? 'p-2' : 'px-6 pb-12 pt-14')}>
          <ImageOff className={compact ? 'h-5 w-5' : 'h-8 w-8'} aria-hidden="true" />
          {!compact && <p className="text-sm font-semibold">Imagem não disponível</p>}
          {!compact && <p className="text-xs leading-relaxed">Consulte as instruções de execução do exercício.</p>}
        </div>
      )}
      {!compact && images.length > 1 && (
        <div className="absolute bottom-[54px] inset-x-3 z-10 flex items-center justify-between gap-2">
          <button type="button" onClick={() => selectPose((pose + images.length - 1) % images.length)}
            aria-label="Ver posição anterior" className="foco-touch rounded-full border border-black/10 bg-white/95 text-neutral-900 shadow-sm hover:bg-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-neutral-900">
            {pose === 0 ? 'Início' : 'Final'} · {pose + 1}/{images.length}
          </span>
          <button type="button" onClick={() => selectPose((pose + 1) % images.length)}
            aria-label="Ver próxima posição" className="foco-touch rounded-full border border-black/10 bg-white/95 text-neutral-900 shadow-sm hover:bg-white">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-black/10 bg-white/95 px-3 py-3 sm:px-4">
          <span className="flex min-w-0 items-center gap-2 truncate text-xs font-bold text-neutral-900">
            <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-900" aria-hidden="true" />
            <span className="truncate">{target}</span>
          </span>
          {showCaption && <span className="shrink-0 text-[11px] font-medium text-neutral-600">FOCO</span>}
        </div>
      )}
      {!compact && (
        <dialog ref={dialogRef} aria-label={'Visualização ampliada de ' + exerciseName}
          className="m-auto max-h-[95dvh] w-[min(96vw,900px)] max-w-none rounded-2xl border border-white/15 bg-[#101010] p-3 text-white shadow-2xl backdrop:bg-black/90 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-400">EXECUÇÃO · {pose === 0 ? 'INÍCIO' : 'FINAL'}</p>
              <h2 className="text-lg font-bold">{exerciseName}</h2>
            </div>
            <button type="button" onClick={toggleZoom} aria-label="Fechar imagem ampliada"
              className="foco-touch rounded-xl bg-white/10 hover:bg-white/20"><X className="h-5 w-5" /></button>
          </div>
          {hasImage && <img src={getExerciseImageUrl(images[pose])} alt={exerciseName + ' ampliado'} className="foco-anatomy-image mx-auto max-h-[65dvh] w-full rounded-xl bg-[#F4F4F4] object-contain" />}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-400">Imagem de referência do exercício</span>
            {images.length > 1 && <div className="flex gap-2">
              <button type="button" onClick={() => selectPose(0)} aria-pressed={pose === 0}
                className={'min-h-11 rounded-xl px-4 text-sm font-semibold ' + (pose === 0 ? 'bg-white text-black' : 'bg-white/10 text-white')}>Início</button>
              <button type="button" onClick={() => selectPose(1)} aria-pressed={pose === 1}
                className={'min-h-11 rounded-xl px-4 text-sm font-semibold ' + (pose === 1 ? 'bg-white text-black' : 'bg-white/10 text-white')}>Final</button>
            </div>}
          </div>
        </dialog>
      )}
    </div>
  );
};
