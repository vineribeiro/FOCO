import React, { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import {
  ExerciseCatalogItem,
  findMatchingExercise,
  getExerciseImageUrl,
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

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#101010] ${className}`}>
      {isAvailable ? (
        <>
          <img
            src={getExerciseImageUrl(images[0])}
            alt={`Início da execução: ${exerciseName}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`exercise-pose exercise-pose-a absolute inset-0 h-full w-full object-contain p-1 ${images.length > 1 ? 'motion-safe:animate-[exercisePoseA_3s_ease-in-out_infinite]' : ''}`}
          />
          {images[1] && (
            <img
              src={getExerciseImageUrl(images[1])}
              alt={`Final da execução: ${exerciseName}`}
              loading="lazy"
              onError={() => setFailed(true)}
              className="exercise-pose exercise-pose-b absolute inset-0 h-full w-full object-contain p-1 motion-safe:animate-[exercisePoseB_3s_ease-in-out_infinite]"
            />
          )}
          {showCaption && (
            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-1 text-[8px] font-black uppercase tracking-wider text-neutral-300">
              Demonstração ilustrada
            </span>
          )}
        </>
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
