import React from 'react';
import {ExerciseDBPreview} from './ExerciseDBPreview';

interface Props {exerciseName:string;muscleGroup:string}

/** The detail view has one media owner: ExerciseDB. No legacy atlas/RepDB gallery. */
export const ExerciseExecutionGuide:React.FC<Props>=({exerciseName,muscleGroup})=><div className="foco-edb-guide space-y-4 p-3 sm:p-4">
 <div className="foco-edb-guide-heading">
  <p className="foco-atlas-kicker">FONTE ÚNICA · EXERCISEDB</p>
  <h3>{exerciseName}</h3>
  <span>{muscleGroup||'Movimento da ficha'}</span>
  <p>Consulta a demonstração quando estiver disponível para exatamente esta variação. A ExerciseDB é externa e pode ter nomes em inglês.</p>
 </div>
 <ExerciseDBPreview exerciseName={exerciseName}/>
 <p className="foco-edb-guide-note">
  Antes de executar, confirma equipamento, trajetória e amplitude com um profissional.
  Se não houver correspondência exata, o FOCO não mostrará um movimento diferente como se fosse o teu.
 </p>
</div>;
