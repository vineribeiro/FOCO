import React from 'react';
import { ArrowRight, Target } from 'lucide-react';
import { getMuscleLabel } from '../data/exerciseLibrary';

interface ExerciseIllustrationProps {
  exerciseName: string;
  muscleGroup?: string;
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

const muscleForMotion: Record<Motion, string> = {
  press: 'Peitoral e tríceps', squat: 'Quadríceps e glúteos', curl: 'Bíceps',
  pull: 'Dorsais e bíceps', hinge: 'Posteriores e glúteos', raise: 'Deltoides',
  triceps: 'Tríceps', calf: 'Panturrilhas', core: 'Abdômen', generic: 'Músculo-alvo',
};

function Pose({ motion, phase }: { motion: Motion; phase: 'start' | 'end' }) {
  const end = phase === 'end';
  const accent = '#f97316';
  const body = '#d4d4d8';
  const line = '#f4f4f5';
  const isLower = motion === 'squat' || motion === 'hinge' || motion === 'calf';
  const armY = motion === 'curl' ? (end ? 105 : 148) : motion === 'raise' ? (end ? 62 : 142) : motion === 'pull' ? (end ? 100 : 62) : motion === 'triceps' ? (end ? 145 : 90) : motion === 'press' ? (end ? 75 : 120) : 110;
  const torso = isLower
    ? (motion === 'hinge' ? 'M103 112 Q125 105 145 124 L155 164 L119 173 L99 143 Z' : 'M104 102 Q125 94 145 105 L150 153 L101 153 Z')
    : 'M105 92 Q124 82 143 92 L151 139 L99 139 Z';
  return (
    <svg viewBox="0 0 250 245" role="img" aria-label={`Ilustração vetorial ${phase === 'start' ? 'inicial' : 'final'} do movimento`} className="h-full w-full">
      <defs><linearGradient id={`body-${motion}-${phase}`} x1="0" x2="1"><stop offset="0" stopColor="#a1a1aa"/><stop offset="1" stopColor="#e4e4e7"/></linearGradient></defs>
      <ellipse cx="125" cy="216" rx="73" ry="8" fill="#ffffff" opacity=".06"/>
      <path d="M18 215 H232" stroke="#52525b" strokeWidth="1.5"/>
      {/* Technical human silhouette */}
      <circle cx="124" cy="62" r="17" fill={body} stroke="#f4f4f5" strokeWidth="1.5"/>
      <path d={torso} fill={`url(#body-${motion}-${phase})`} stroke={line} strokeWidth="1.5" strokeLinejoin="round"/>
      {isLower ? (
        <>
          <path d={end ? 'M105 148 L119 177 L106 207 L91 207 L96 175 L83 151 Z' : 'M105 148 L99 176 L91 207 L76 207 L81 174 L84 151 Z'} fill={body} stroke={line} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d={end ? 'M145 148 L141 178 L158 207 L174 207 L157 172 L158 150 Z' : 'M145 148 L158 172 L175 195 L190 195 L174 166 L158 148 Z'} fill={body} stroke={line} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d={end ? 'M102 154 Q124 146 149 155 L146 174 Q124 168 99 176 Z' : 'M102 153 Q125 146 149 153 L151 168 Q125 165 99 176 Z'} fill={accent} opacity=".9"/>
        </>
      ) : (
        <>
          <path d={end ? 'M105 130 L110 162 L116 187 L129 187 L127 160 L129 137 Z' : 'M105 130 L100 160 L96 188 L109 188 L119 161 L129 137 Z'} fill={body} stroke={line} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d={end ? 'M129 137 L136 160 L144 187 L157 187 L151 158 L149 130 Z' : 'M129 137 L139 160 L147 188 L160 188 L151 157 L149 130 Z'} fill={body} stroke={line} strokeWidth="1.5" strokeLinejoin="round"/>
        </>
      )}
      {/* Muscle highlight */}
      <path d={motion === 'press' ? 'M105 98 Q124 90 144 98 L141 119 Q124 113 107 119 Z' :
        motion === 'curl' || motion === 'pull' || motion === 'triceps' ? 'M99 103 Q92 112 98 127 L108 132 L113 115 Z M141 103 Q151 111 147 126 L137 132 L132 115 Z' :
        motion === 'raise' ? 'M103 94 Q124 82 145 94 L148 105 Q124 97 100 105 Z' :
        motion === 'core' ? 'M108 111 L140 111 L138 136 L110 136 Z' :
        motion === 'calf' ? 'M89 181 L102 181 L97 204 L84 204 Z M145 181 L158 181 L168 204 L155 204 Z' :
        'M102 148 Q125 139 150 148 L146 166 Q124 160 100 168 Z'} fill={accent} opacity=".92"/>
      {/* Arms adapt to movement */}
      <path d={motion === 'raise' ? (end ? 'M105 98 L82 70 L62 55' : 'M105 98 L87 122 L74 142') :
        motion === 'curl' ? (end ? 'M105 100 L88 122 L103 111' : 'M105 100 L85 129 L78 151') :
        motion === 'pull' ? (end ? 'M105 99 L94 113 L112 125' : 'M105 99 L86 75 L80 42') :
        motion === 'triceps' ? (end ? 'M105 100 L88 123 L87 150' : 'M105 100 L91 88 L104 64') :
        motion === 'press' ? (end ? 'M105 101 L91 80 L88 56' : 'M105 101 L85 118 L70 127') :
        'M105 101 L86 125 L79 150'} fill="none" stroke={body} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={motion === 'raise' ? (end ? 'M143 98 L166 70 L187 55' : 'M143 98 L161 122 L174 142') :
        motion === 'curl' ? (end ? 'M143 100 L160 122 L145 111' : 'M143 100 L163 129 L170 151') :
        motion === 'pull' ? (end ? 'M143 99 L154 113 L136 125' : 'M143 99 L162 75 L168 42') :
        motion === 'triceps' ? (end ? 'M143 100 L160 123 L161 150' : 'M143 100 L157 88 L144 64') :
        motion === 'press' ? (end ? 'M143 101 L157 80 L160 56' : 'M143 101 L163 118 L178 127') :
        'M143 101 L162 125 L169 150'} fill="none" stroke={body} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Free-weight / machine cues */}
      {['press','curl','raise','triceps'].includes(motion) && <g stroke="#a3a3a3" strokeWidth="4" strokeLinecap="round"><path d={motion === 'press' ? (end ? 'M83 49 H165' : 'M65 126 H185') : motion === 'curl' ? (end ? 'M97 108 H153' : 'M68 154 H182') : motion === 'raise' ? (end ? 'M53 55 H77 M173 55 H197' : 'M64 142 H84 M166 142 H186') : (end ? 'M76 154 H164' : 'M94 60 H156')}/></g>}
      {motion === 'pull' && <g stroke="#71717a" strokeWidth="3" fill="none"><path d="M54 24 H196 M66 24 V40 M184 24 V40"/><path d={end ? 'M80 40 V78 M168 40 V78' : 'M80 40 V65 M168 40 V65'} stroke={accent} strokeDasharray="4 4"/></g>}
      {motion === 'squat' && <path d={end ? 'M190 182 V148 M184 155 L190 148 L196 155' : 'M190 148 V182 M184 175 L190 182 L196 175'} stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
      <circle cx="124" cy="62" r="17" fill="none" stroke="#fafafa" strokeWidth="1.5"/>
    </svg>
  );
}

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exerciseName, muscleGroup, className = 'h-64 w-full', showCaption = false,
}) => {
  const motion = getMotion(exerciseName, muscleGroup);
  const target = muscleForMotion[motion] || (muscleGroup ? getMuscleLabel(muscleGroup) : 'Músculo-alvo');
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0c] ${className}`}>
      <div className="grid h-full grid-cols-[1fr_34px_1fr] items-stretch gap-1 p-2 sm:gap-2 sm:p-3">
        <figure className="flex min-w-0 flex-col rounded-xl border border-white/[0.07] bg-white/[0.025]">
          <figcaption className="px-2 pt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">01 · Início</figcaption>
          <div className="min-h-0 flex-1"><Pose motion={motion} phase="start" /></div>
        </figure>
        <div className="flex flex-col items-center justify-center gap-2 text-orange-500">
          <ArrowRight className="h-7 w-7" strokeWidth={2.5} />
          <span className="text-[8px] font-black uppercase [writing-mode:vertical-rl]">Movimento</span>
        </div>
        <figure className="flex min-w-0 flex-col rounded-xl border border-orange-500/20 bg-orange-500/[0.035]">
          <figcaption className="px-2 pt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">02 · Final</figcaption>
          <div className="min-h-0 flex-1"><Pose motion={motion} phase="end" /></div>
        </figure>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-white/10 bg-[#0b0b0c]/95 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 truncate text-[10px] font-black uppercase tracking-wide text-neutral-200"><Target className="h-3.5 w-3.5 shrink-0 text-orange-500" /><span className="truncate">{target}</span></span>
        {showCaption && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-neutral-500">SVG vetorial</span>}
      </div>
    </div>
  );
};
