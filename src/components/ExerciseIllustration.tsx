import React, { useEffect, useState } from 'react';
import { ArrowRight, Dumbbell, Target } from 'lucide-react';
import {
  ExerciseCatalogItem,
  findMatchingExercise,
  getExerciseImageUrl,
  getMuscleLabel,
  loadExerciseCatalog,
} from '../data/exerciseLibrary';

interface ExerciseIllustrationProps {
  exerciseName: string;
  muscleGroup?: string;
  className?: string;
  showCaption?: boolean;
}

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exerciseName,
  muscleGroup,
  className = 'h-32 w-full',
  showCaption = false,
}) => {
  const [match, setMatch] = useState<ExerciseCatalogItem | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    setFailed(false);
    setMatch(null);
    loadExerciseCatalog()
      .then((catalog) => {
        if (current) setMatch(findMatchingExercise(catalog, exerciseName, muscleGroup));
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => { current = false; };
  }, [exerciseName, muscleGroup]);

  const images = match?.images?.slice(0, 2) || [];
  const isAvailable = images.length > 0 && !failed;
  const primaryMuscle = match?.primaryMuscles?.[0] || muscleGroup || '';

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#101010] ${className}`}>
      {isAvailable ? (
        <div className="flex h-full w-full flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_30px_1fr] items-center gap-1 p-2">
            <figure className="flex h-full min-w-0 flex-col items-center justify-center">
              <div className="mb-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-neutral-400">Início</div>
              <img
                src={getExerciseImageUrl(images[0])}
                alt={`Posição inicial do exercício ${exerciseName}`}
                loading="lazy"
                onError={() => setFailed(true)}
                className="max-h-full min-h-0 w-full flex-1 object-contain"
              />
            </figure>
            <div className="flex flex-col items-center justify-center gap-1 text-neutral-400" aria-label="Direção do movimento">
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
              <span className="text-[7px] font-bold uppercase tracking-wider">Mov.</span>
            </div>
            <figure className="flex h-full min-w-0 flex-col items-center justify-center">
              <div className="mb-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-neutral-400">Final</div>
              <img
                src={getExerciseImageUrl(images[1] || images[0])}
                alt={`Posição final do exercício ${exerciseName}`}
                loading="lazy"
                onError={() => setFailed(true)}
                className="max-h-full min-h-0 w-full flex-1 object-contain"
              />
            </figure>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-black/30 px-3 py-1.5">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[9px] font-bold uppercase tracking-wide text-neutral-300">
              <Target className="h-3 w-3 shrink-0 text-neutral-400" />
              <span className="truncate">{primaryMuscle ? getMuscleLabel(primaryMuscle) : 'Grupo muscular'}</span>
            </span>
            {showCaption && <span className="shrink-0 text-[8px] font-semibold text-neutral-500">Guia visual</span>}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center text-neutral-600">
          <Dumbbell className="h-6 w-6" />
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {failed ? 'Figura indisponível' : 'Carregando execução'}
          </span>
        </div>
      )}
    </div>
  );
};
