import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from 'lucide-react';
import { findApprovedAnatomyAtlas } from '../data/anatomyAssets';
import { getRepDBIllustrations } from '../data/repdbAssets';
import { findMatchingExercise, getExerciseDisplayName, getExerciseImageUrl, getMuscleLabel, loadExerciseCatalog } from '../data/exerciseLibrary';

interface ExerciseIllustrationProps {
  exerciseName: string;
  exerciseId?: string;
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
  exerciseName, exerciseId, muscleGroup, imagePaths = [], className = 'h-64 w-full', showCaption = false,
}) => {
  const [phase, setPhase] = useState(0);
  const [legacyPaths, setLegacyPaths] = useState<string[]>([]);
  const [atlasUrl, setAtlasUrl] = useState<string | null>(null);
  const [repdbPaths, setRepdbPaths] = useState<string[]>([]);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const compact = /\bh-(14|16|20)\b/.test(className);
  const supplied = useMemo(() => imagePaths.filter(Boolean).slice(0, 2), [imagePaths.join('|')]);

  useEffect(() => {
    let active = true;
    setPhase(0);
    setFailedUrl(null);
    setAtlasUrl(null);
    setRepdbPaths([]);
    setLegacyPaths(supplied);
    getRepDBIllustrations(exerciseName)
      .then(paths => { if (active && paths.length) { setRepdbPaths(paths); setPhase(0); } })
      .catch(() => { if (active) setRepdbPaths([]); });
    findApprovedAnatomyAtlas(exerciseId, exerciseName)
      .then(url => { if (active) { setAtlasUrl(url); if (url) setPhase(0); } })
      .catch(() => { if (active) setAtlasUrl(null); });
    if (!supplied.length) {
      loadExerciseCatalog().then(catalog => {
        if (!active) return;
        const match = findMatchingExercise(catalog, exerciseName, muscleGroup);
        const key = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const aliases = match ? [match.name, getExerciseDisplayName(match.name), ...(match.aliases || [])] : [];
        const exact = aliases.some(name => key(name) === key(exerciseName));
        setLegacyPaths(exact ? (match?.images || []).filter(Boolean).slice(0, 2) : []);
      }).catch(() => { if (active) setLegacyPaths([]); });
    }
    return () => { active = false; };
  }, [exerciseId, exerciseName, muscleGroup, supplied.join('|')]);

  const isAtlas = Boolean(atlasUrl && failedUrl !== atlasUrl);
  const isRepDB = !isAtlas && repdbPaths.length > 0;
  const sources = isAtlas ? [atlasUrl!] : isRepDB ? repdbPaths : legacyPaths.map(getExerciseImageUrl);
  const visible = sources[phase] && failedUrl !== sources[phase];
  const onImageError = () => {
    if (isRepDB) { setRepdbPaths([]); setPhase(0); setFailedUrl(null); }
    else setFailedUrl(sources[phase]);
  };
  const target = muscleGroup ? (muscleTargets[muscleGroup.toLowerCase()] || getMuscleLabel(muscleGroup)) : 'Músculos trabalhados';
  const changePhase = (index: number) => {
    setFailedUrl(null);
    setPhase(index);
  };
  const toggleZoom = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    else dialogRef.current?.showModal();
  };
  return (
    <div className={'relative isolate overflow-hidden rounded-2xl border border-black/10 bg-[#F5F5F5] ' + className}>
      {!compact && <div className="absolute left-3 top-3 z-10 rounded-full border border-black/10 bg-white/95 px-3 py-2 text-[11px] font-bold text-neutral-900 shadow-sm">
        {isAtlas ? 'FOCO · Atlas anatômico' : isRepDB ? 'RepDB · Execução ilustrada' : 'Foto de referência'}
      </div>}
      {visible ? (
        <div className={'absolute inset-0 flex items-center justify-center ' + (compact ? 'p-1' : 'px-2 pb-12 pt-12 sm:px-4')}>
          {compact ? (
            <img src={sources[phase]} loading="lazy" alt={exerciseName + (isAtlas ? ' — atlas anatômico' : ' — referência fotográfica')}
              className="h-full w-full object-contain" style={isAtlas || isRepDB ? undefined : {filter:'grayscale(1)'}}
              onError={onImageError} />
          ) : (
            <button type="button" onClick={toggleZoom}
              aria-label={'Ampliar ' + (isAtlas ? 'atlas' : 'foto') + ' de ' + exerciseName}
              className="group relative flex h-full w-full items-center justify-center outline-offset-2">
              <img src={sources[phase]} loading="lazy" alt={exerciseName + (isAtlas ? ' — duas fases e mapas musculares' : ' — posição ' + (phase+1))}
                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                style={isAtlas || isRepDB ? undefined : {filter:'grayscale(1)'}}
                onError={onImageError} />
              <span className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-sm" aria-hidden="true">
                <Expand className="h-5 w-5" />
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className={'absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-neutral-500 ' + (compact ? 'p-1' : 'px-6 pb-14 pt-12')}>
          <ImageOff className={compact ? 'h-5 w-5' : 'h-8 w-8'} aria-hidden="true" />
          {!compact && <p className="text-sm font-semibold text-neutral-800">Ilustração em preparação</p>}
          {!compact && <p className="text-xs leading-relaxed">Confira o passo a passo do exercício enquanto o atlas é revisado.</p>}
        </div>
      )}
      {!compact && !isAtlas && sources.length > 1 && (
        <div className="absolute inset-x-3 bottom-[52px] z-10 flex items-center justify-between gap-2">
          <button type="button" onClick={() => changePhase((phase + sources.length - 1) % sources.length)}
            aria-label="Mostrar imagem anterior" className="foco-touch rounded-full bg-white/95 text-black shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
          <span className="rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-neutral-900">
            {phase === 0 ? 'Posição 1' : 'Posição 2'} · {phase + 1}/{sources.length}
          </span>
          <button type="button" onClick={() => changePhase((phase + 1) % sources.length)}
            aria-label="Mostrar próxima imagem" className="foco-touch rounded-full bg-white/95 text-black shadow-sm"><ChevronRight className="h-5 w-5" /></button>
        </div>
      )}
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-black/10 bg-white/95 px-3 py-3 text-xs text-neutral-900">
          <strong className="truncate">{target}</strong>
          {showCaption && <span className="shrink-0 text-neutral-500">{isAtlas ? '3D · Anatomia' : isRepDB ? 'RepDB · Ilustração' : 'Arquivo legado'}</span>}
        </div>
      )}
      {isRepDB && !compact && <a href="https://repdb.co" target="_blank" rel="nofollow noreferrer" className="absolute bottom-12 left-3 z-10 rounded-md bg-white/95 px-2 py-1 text-[10px] font-medium text-neutral-700 underline">Exercise data by RepDB (repdb.co)</a>}
      {!compact && (
        <dialog ref={dialogRef} aria-label={'Visualização ampliada de ' + exerciseName}
          className="m-auto max-h-[95dvh] w-[min(96vw,1000px)] max-w-none rounded-2xl border border-white/15 bg-[#101010] p-3 text-white shadow-2xl backdrop:bg-black/90 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="text-xs text-neutral-400">{isAtlas ? 'FOCO Anatomy v3' : isRepDB ? 'RepDB · Ilustrações do movimento' : 'Referência fotográfica'}</p><h2 className="text-lg font-bold">{exerciseName}</h2></div>
            <button type="button" onClick={toggleZoom} aria-label="Fechar visualização" className="foco-touch rounded-xl bg-white/10 hover:bg-white/20">
              <X className="h-5 w-5" /></button>
          </div>
          {visible && <img src={sources[phase]} alt={exerciseName + ' ampliado'}
            style={isAtlas || isRepDB ? undefined : {filter:'grayscale(1)'}}
            className="mx-auto max-h-[70dvh] w-full rounded-xl bg-[#F5F5F5] object-contain" />}
          {!isAtlas && sources.length > 1 && (
            <div className="mt-3 flex justify-end gap-2">
              {sources.map((_, index) => <button key={index} type="button" onClick={() => changePhase(index)}
                aria-pressed={phase === index}
                className={'min-h-11 rounded-xl px-4 text-sm font-semibold ' + (phase === index ? 'bg-white text-black' : 'bg-white/10 text-white')}>
                Posição {index + 1}
              </button>)}
            </div>
          )}
          {isRepDB && <a href="https://repdb.co" target="_blank" rel="nofollow noreferrer" className="mt-3 inline-block text-xs text-neutral-300 underline">Exercise data by RepDB (repdb.co)</a>}
          <p className="mt-3 text-xs text-neutral-400">{isAtlas ? 'Atlas de referência educativa, aprovado para a biblioteca FOCO.' : isRepDB ? 'Ilustração educativa de execução. Observe as duas posições; confira também as instruções escritas.' : 'Foto antiga de referência: a substituição por atlas anatômico está pendente de revisão.'}</p>
        </dialog>
      )}
    </div>
  );
};
