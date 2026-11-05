import React from 'react';
import {Dumbbell,PlayCircle} from 'lucide-react';

/**
 * Consistent ExerciseDB-only preview surface. Deliberately does NOT load third-party
 * media for list thumbnails: the provider forbids bulk downloads/caching.
 * The GIF is available on request from ExerciseDBPreview in the execution detail.
 * Legacy props are accepted to keep saved workouts and route contracts intact.
 */
interface Props {
 exerciseName:string;exerciseId?:string;muscleGroup?:string;imagePaths?:string[];
 className?:string;showCaption?:boolean;presentation?:'standard'|'editorial';
}
export const ExerciseIllustration:React.FC<Props>=({exerciseName,muscleGroup,className='h-64 w-full',presentation='standard'})=>{
 const compact=presentation==='editorial'||/\bh-(14|16|20)\b/.test(className);
 return <div data-foco-media-source="exercisedb" aria-label={'ExerciseDB: '+exerciseName}
  className={'foco-edb-tile relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#C8F040]/20 bg-[#182317] text-center '+className}>
   <Dumbbell className="foco-edb-tile-icon" size={compact?27:47} strokeWidth={1.35} aria-hidden="true"/>
   {!compact&&<><strong className="foco-edb-tile-name">{exerciseName}</strong>
    {muscleGroup&&<span className="foco-edb-tile-subtitle">{muscleGroup}</span>}</>}
   <span className="foco-edb-tile-credit"><PlayCircle size={compact?11:14} aria-hidden="true"/> EXERCISEDB</span>
 </div>;
};
