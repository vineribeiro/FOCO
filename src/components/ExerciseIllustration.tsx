import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { getExerciseImageUrl, getMuscleLabel } from '../data/exerciseLibrary';

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
  const images = imagePaths.filter(Boolean).slice(0, 2);
  const target = muscleGroup ? (muscleTargets[muscleGroup.toLowerCase()] || getMuscleLabel(muscleGroup)) : 'Músculos trabalhados';

  React.useEffect(() => setPose(0), [exerciseName, imagePaths.join('|')]);

  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#f7f7f5] ${className}`}>
      <div className="absolute left-3 top-3 z-10 rounded-full border border-black/10 bg-white/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-neutral-700 shadow-sm">
        Referência anatômica
      </div>
      <div className="absolute right-3 top-3 z-10 rounded-full bg-[#171717]/90 px-2.5 py-1.5 text-[9px] font-bold text-white">
        {images.length > 1 ? `${pose + 1} / ${images.length}` : 'FOCO • EXERCÍCIO'}
      </div>
      {images.length > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-3 pb-12 pt-11 sm:px-5 sm:pb-14 sm:pt-12">
          <img
            key={images[pose]}
            src={getExerciseImageUrl(images[pose])}
            alt={`${exerciseName} — demonstração anatômica`}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden';
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 pb-14 pt-12 text-center text-neutral-500">
          <Target className="h-8 w-8 text-orange-600" />
          <p className="text-sm font-bold text-neutral-800">Imagem de execução indisponível</p>
          <p className="text-xs leading-relaxed">Consulte o passo a passo abaixo para executar o movimento com segurança.</p>
        </div>
      )}
      {images.length > 1 && (
        <div className="absolute bottom-[52px] right-3 z-10 flex items-center gap-1.5">
          <button type="button" onClick={() => setPose((pose + images.length - 1) % images.length)} aria-label="Imagem anterior" className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm hover:bg-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setPose((pose + 1) % images.length)} aria-label="Próxima imagem" className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/95 text-neutral-800 shadow-sm hover:bg-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-black/[0.08] bg-white/95 px-3 py-2.5 backdrop-blur-sm sm:px-4">
        <span className="flex min-w-0 items-center gap-2 truncate text-[10px] font-black uppercase tracking-wide text-neutral-800 sm:text-[11px]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-orange-600" />
          <span className="truncate">{target}</span>
        </span>
        {showCaption && <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.13em] text-neutral-500">Execução</span>}
      </div>
    </div>
  );
};
