import React from 'react';
import {ExerciseIllustration} from './ExerciseIllustration';
import {REPDB_CREDIT_URL,REPDB_CREDIT_TEXT} from '../data/repdbAssets';

interface Props{exerciseName:string;muscleGroup:string;exerciseId?:string|null}
export const ExerciseExecutionGuide:React.FC<Props>=({exerciseName,muscleGroup,exerciseId})=>
 <div className="foco-repdb-guide space-y-4 p-3 sm:p-4">
  <div className="foco-repdb-guide-heading">
   <p className="foco-atlas-kicker">FOCO / GUIA DE MOVIMENTO</p>
   <h3>{exerciseName}</h3>
   <span>{muscleGroup||'Exercício da ficha'}</span>
   <p>Veja o início e o final do movimento. As duas poses são ilustrações estáticas, não uma animação de execução.</p>
  </div>
  <ExerciseIllustration exerciseName={exerciseName} exerciseId={exerciseId} muscleGroup={muscleGroup}
    presentation="editorial" interactive className="foco-repdb-guide-visual w-full"/>
  <p className="foco-repdb-guide-note">Confirma equipamento, postura, amplitude e carga com um profissional. O FOCO não substitui acompanhamento especializado.</p>
  <p className="foco-atlas-credit"><a href={REPDB_CREDIT_URL} target="_blank" rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a></p>
 </div>;
