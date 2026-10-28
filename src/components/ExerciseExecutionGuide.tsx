import React, { useEffect, useState } from 'react';
import { ExercisePhaseGallery } from './ExercisePhaseGallery';
import {
  getExerciseDisplayName, getMuscleLabel,
  loadExerciseCatalog, normalizeExerciseText, type ExerciseCatalogItem,
} from '../data/exerciseLibrary';

interface Props {
  exerciseName: string;
  muscleGroup: string;
}

/** Never show instructions or images borrowed from a merely similar movement. */
export const ExerciseExecutionGuide: React.FC<Props> = ({ exerciseName, muscleGroup }) => {
  const [exercise, setExercise] = useState<ExerciseCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setExercise(null);
    loadExerciseCatalog().then(catalog => {
      if (!active) return;
      const key = normalizeExerciseText(exerciseName);
      const exact = catalog.filter(item => [item.name, getExerciseDisplayName(item.name), ...(item.aliases || [])]
        .some(name => normalizeExerciseText(name) === key));
      const group = normalizeExerciseText(muscleGroup);
      const grouped = exact.filter(item => normalizeExerciseText(item.sourceGroup || '') === group);
      // Same movement can appear in multiple muscle groups; never show an arbitrary variant.
      const match = grouped.length === 1 ? grouped[0] : exact.length === 1 ? exact[0] : null;
      setExercise(match);
    }).catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [exerciseName, muscleGroup]);

  if (loading) return <p className="p-4 text-sm text-neutral-400" role="status">Carregando orientação de execução...</p>;
  if (!exercise) return <p className="p-4 text-sm leading-relaxed text-neutral-300" role="status">
    {loadError ? 'Não foi possível carregar o guia agora.' : 'Ainda não há orientação técnica conferida para esta variação exata.'}
    {' '}Não substituímos por imagens ou instruções de um exercício parecido. Peça orientação ao profissional da academia.
  </p>;

  const primaries = exercise.primaryMuscleDisplay?.length
    ? exercise.primaryMuscleDisplay : exercise.primaryMuscles.map(getMuscleLabel);
  const secondaries = exercise.secondaryMuscleDisplay?.length
    ? exercise.secondaryMuscleDisplay : exercise.secondaryMuscles.map(getMuscleLabel);
  const breath = Object.entries(exercise.respiration || {}).filter(([, value]) => value).map(([phase, value]) => phase + ': ' + value);

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <ExercisePhaseGallery
        exerciseName={exercise.name}
        exerciseId={exercise.id}
        muscleGroup={muscleGroup}
        fallbackPaths={exercise.images}
      />
      <p className="text-[11px] leading-relaxed text-neutral-400">
        Guia educativo: confira técnica, amplitude e ajuste de carga com um profissional. As imagens não substituem avaliação individual.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="foco-v4-panel-soft p-4">
          <h4 className="text-xs font-black uppercase tracking-wider">Músculos trabalhados</h4>
          <p className="mt-2 text-sm text-white"><strong>Principais:</strong> {primaries.join(', ') || 'Não especificados'}</p>
          {secondaries.length > 0 && <p className="mt-1.5 text-xs text-neutral-300">Auxiliares: {secondaries.join(', ')}</p>}
        </section>
        <section className="foco-v4-panel-soft p-4">
          <h4 className="text-xs font-black uppercase tracking-wider">Equipamento e respiração</h4>
          <p className="mt-2 text-sm">{exercise.equipmentDisplay || 'Consultar orientação do exercício'}</p>
          {breath.map(line => <p key={line} className="mt-1 text-xs text-neutral-300">{line}</p>)}
        </section>
      </div>
      <section className="foco-v4-panel-soft p-4">
        <h4 className="foco-v4-section-title">Como executar</h4>
        {exercise.instructions.length ? (
          <ol className="foco-v4-steps mt-3">
            {exercise.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}
          </ol>
        ) : <p className="mt-2 text-sm text-neutral-400">Passo a passo ainda indisponível para esta variante.</p>}
      </section>
      {!!exercise.commonErrors?.length && <section className="foco-v4-panel-soft p-4">
        <h4 className="text-xs font-black uppercase tracking-wider">Erros comuns</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-300">
          {exercise.commonErrors.map((error, index) => <li key={index}>{error}</li>)}
        </ul>
      </section>}
      {!!exercise.safetyNotes?.length && <section className="foco-v4-panel-soft p-4">
        <h4 className="text-xs font-black uppercase tracking-wider">Cuidados</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-300">
          {exercise.safetyNotes.map((note, index) => <li key={index}>{note}</li>)}
        </ul>
      </section>}
    </div>
  );
};
