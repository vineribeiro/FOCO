import React from 'react';
import { ArrowRight, Target } from 'lucide-react';
import { getExerciseImageUrl, getMuscleLabel } from '../data/exerciseLibrary';

interface ExerciseIllustrationProps {
  exerciseName: string;
  muscleGroup?: string;
  imagePaths?: string[];
  className?: string;
  showCaption?: boolean;
}

type Motion = 'press' | 'squat' | 'curl' | 'pull' | 'hinge' | 'raise' | 'triceps' | 'calf' | 'core' | 'generic';

function getMotion(name: string, muscleGroup = ''): Motion {
  const n = name.toLowerCase();
  const m = muscleGroup.toLowerCase();
  if (/agach|squat|leg press|extensora|flexora|panturrilha|calf|hip thrust/.test(n)) return /panturrilha|calf/.test(n) ? 'calf' : 'squat';
  if (/terra|deadlift|romeno|remada curvada/.test(n)) return 'hinge';
  if (/rosca|curl/.test(n) || /bíceps|biceps/.test(m)) return 'curl';
  if (/puxada|pulldown|barra fixa|pull.?up|remada baixa|seated cable row/.test(n) || /costas|dorsais|lats/.test(m)) return 'pull';
  if (/tríceps|triceps/.test(n) || /tríceps|triceps/.test(m)) return 'triceps';
  if (/elevação lateral|elevação frontal|lateral raise|front raise/.test(n) || /ombros|shoulders/.test(m)) return 'raise';
  if (/abdominal|crunch|sit.?up|prancha/.test(n) || /abdômen|abdominals/.test(m)) return 'core';
  if (/supino|bench press|flexão|push.?up|desenvolvimento|shoulder press/.test(n) || /peito|chest/.test(m)) return 'press';
  return 'generic';
}

const targetByMotion: Record<Motion, string> = {
  press: 'Peitoral e tríceps', squat: 'Quadríceps e glúteos', curl: 'Bíceps',
  pull: 'Dorsais e bíceps', hinge: 'Posteriores e glúteos', raise: 'Deltoides',
  triceps: 'Tríceps', calf: 'Panturrilhas', core: 'Abdômen', generic: 'Músculo-alvo',
};

function FallbackFigure({ motion, phase }: { motion: Motion; phase: 'start' | 'end' }) {
  const end = phase === 'end';
  const lower = ['squat', 'hinge', 'calf'].includes(motion);
  const arm = motion === 'raise' ? (end ? 'M103 95 L75 65 L55 47 M145 95 L175 65 L195 47' : 'M103 95 L82 125 L68 145 M145 95 L165 125 L180 145')
    : motion === 'curl' ? (end ? 'M103 95 L88 120 L105 105 M145 95 L160 120 L143 105' : 'M103 95 L84 125 L75 150 M145 95 L164 125 L173 150')
    : motion === 'pull' ? (end ? 'M103 95 L92 110 L112 124 M145 95 L156 110 L136 124' : 'M103 95 L84 70 L78 40 M145 95 L164 70 L170 40')
    : motion === 'press' ? (end ? 'M103 95 L90 70 L90 48 M145 95 L158 70 L158 48' : 'M103 95 L82 118 L68 130 M145 95 L166 118 L180 130')
    : 'M103 95 L84 125 L76 150 M145 95 L164 125 L172 150';
  return <svg viewBox="0 0 250 230" className="h-full w-full" aria-label="Diagrama esquemático do movimento" role="img">
    <defs><linearGradient id="figure-fill" x1="0" x2="1"><stop offset="0" stopColor="#a3a3a3"/><stop offset="1" stopColor="#f5f5f5"/></linearGradient></defs>
    <path d="M18 205 H232" stroke="#404040" strokeWidth="1.5"/>
    <circle cx="124" cy="45" r="16" fill="url(#figure-fill)"/>
    <path d={lower ? (end ? 'M104 76 Q124 68 144 76 L150 125 L100 125 Z' : 'M104 76 Q124 68 144 76 L150 125 L100 125 Z') : 'M104 76 Q124 68 144 76 L150 125 L100 125 Z'} fill="url(#figure-fill)"/>
    <path d={arm} fill="none" stroke="#d4d4d4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
    <path d={lower ? (end ? 'M103 125 L111 158 L103 194 L88 194 L92 157 L84 125 Z M145 125 L140 158 L158 194 L173 194 L155 154 L158 125 Z' : 'M103 125 L95 157 L87 194 L102 194 L115 158 L125 125 Z M145 125 L158 157 L177 190 L192 190 L174 153 L158 125 Z') : 'M108 123 L111 157 L113 187 L127 187 L129 156 L132 123 Z M132 123 L136 157 L145 187 L159 187 L151 154 L148 123 Z'} fill="#bdbdbd" stroke="#ededed" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d={motion === 'press' ? 'M106 83 Q124 76 143 83 L140 103 Q124 97 108 103 Z' : motion === 'curl' || motion === 'pull' || motion === 'triceps' ? 'M99 88 L110 98 L112 117 L101 119 Z M140 88 L132 98 L130 117 L141 119 Z' : motion === 'raise' ? 'M104 79 Q124 69 144 79 L146 89 Q124 83 102 89 Z' : motion === 'core' ? 'M108 96 H140 L138 121 H110 Z' : 'M101 125 Q124 117 149 125 L145 145 Q124 139 99 145 Z'} fill="#f97316" opacity=".95"/>
  </svg>;
}

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exerciseName, muscleGroup, imagePaths = [], className = 'h-64 w-full', showCaption = false,
}) => {
  const motion = getMotion(exerciseName, muscleGroup);
  const target = muscleGroup ? getMuscleLabel(muscleGroup) : targetByMotion[motion];
  const images = imagePaths.slice(0, 2);
  const hasPhotos = images.length > 0;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#090a0c] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,0.12),transparent_62%)]" />
      <div className="relative grid h-full grid-cols-[1fr_30px_1fr] gap-1.5 p-2.5 sm:grid-cols-[1fr_42px_1fr] sm:gap-2.5 sm:p-3">
        {[0, 1].map((index) => (
          <figure key={index} className={`relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border ${index === 1 ? 'border-orange-500/30 bg-orange-500/[0.045]' : 'border-white/[0.08] bg-white/[0.025]'}`}>
            <figcaption className={`flex items-center justify-between gap-1 px-2.5 pt-2.5 text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px] ${index === 1 ? 'text-orange-400' : 'text-neutral-400'}`}>
              <span>{index === 0 ? '01 / Início' : '02 / Final'}</span>
              {index === 1 && <span className="rounded bg-orange-500/15 px-1 py-0.5 text-[8px]">AÇÃO</span>}
            </figcaption>
            <div className="min-h-0 flex-1 p-1.5 sm:p-2">
              {hasPhotos ? (
                <img
                  src={getExerciseImageUrl(images[Math.min(index, images.length - 1)])}
                  alt={`${exerciseName} — posição ${index === 0 ? 'inicial' : 'final'}`}
                  loading="lazy"
                  className="h-full w-full object-contain mix-blend-screen"
                  onError={(event) => { event.currentTarget.style.opacity = '0'; }}
                />
              ) : <FallbackFigure motion={motion} phase={index === 0 ? 'start' : 'end'} />}
            </div>
          </figure>
        ))}
        <div className="flex flex-col items-center justify-center gap-2 text-orange-500">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/10 sm:h-10 sm:w-10">
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
          </div>
          <span className="text-center text-[7px] font-black uppercase tracking-[0.12em] text-neutral-500 [writing-mode:vertical-rl]">Movimento</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-white/[0.08] bg-[#090a0c]/95 px-3 py-2.5 backdrop-blur">
        <span className="flex min-w-0 items-center gap-2 truncate text-[10px] font-black uppercase tracking-wide text-neutral-200"><Target className="h-3.5 w-3.5 shrink-0 text-orange-500" /><span className="truncate">{target}</span></span>
        {showCaption && <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.13em] text-neutral-600">Guia visual</span>}
      </div>
    </div>
  );
};
