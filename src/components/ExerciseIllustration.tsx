import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { findMatchingExercise, getExerciseImageUrl, getMuscleLabel, loadExerciseCatalog } from '../data/exerciseLibrary';

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
      setFallbackImages(match?.images?.filter(Boolean).slice(0, 2) || []);
    }).catch(() => {
      if (mounted) setFallbackImages([]);
    });
    return () => { mounted = false; };
  }, [exerciseName, muscleGroup, imagePaths.join('|')]);

  const selectPose = (next: number) => {
    setImageFailed(false);
    setPose(next);
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
          <img key={images[pose]} src={getExerciseImageUrl(images[pose])}
            alt={exerciseName + ' — ' + (pose === 0 ? 'posição inicial' : 'posição final')}
            loading="lazy" className="h-full w-full object-contain"
            onError={() => setImageFailed(true)} />
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
    </div>
  );
};
