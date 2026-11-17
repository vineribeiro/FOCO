import React,{useEffect,useId,useRef,useState} from 'react';
import {Dumbbell} from 'lucide-react';
import {repdbMediaReview} from '../data/repdbMediaReview';
import {resolveRepDBExercise,repdbImagePoses} from '../data/repdbAssets';
import {humanMediaForExercise,type FocoHumanMedia,type HumanPoseFrame} from '../data/focoHumanMedia';
interface Props {
 exerciseName:string;
 exerciseId?:string|null;
 muscleGroup?:string;
 imagePaths?:string[];
 className?:string;
 showCaption?:boolean;
 presentation?:'standard'|'editorial';
 interactive?:boolean;
 compact?:boolean;
}
type Pose={url:string;phase:'start'|'peak'|'reference';frame?:HumanPoseFrame;media?:FocoHumanMedia};
/** Own exact-ID illustrations first; licensed RepDB is the reversible fallback. */
export const ExerciseIllustration:React.FC<Props>=({
 exerciseName,exerciseId,muscleGroup,className='h-64 w-full',interactive=false,compact:compactProp,
})=>{
 const rootRef=useRef<HTMLDivElement|null>(null);
 const clipId='foco-pose-'+useId().replace(/:/g,'');
 const [visible,setVisible]=useState(false);
 const [poses,setPoses]=useState<Pose[]>([]);
 const [source,setSource]=useState<'foco-ai'|'repdb'>('repdb');
 const [mediaReview,setMediaReview]=useState<string|null>(null);
 const [loading,setLoading]=useState(false);
 const [sourceFailed,setSourceFailed]=useState<string[]>([]);
 const [ownFailed,setOwnFailed]=useState(false);
 const [pose,setPose]=useState(0);
 const compact=compactProp??/\bh-(?:14|16|20)\b|h-\[100px\]|w-\[112px\]/.test(className);
 useEffect(()=>{setOwnFailed(false);},[exerciseName,exerciseId]);
 useEffect(()=>{
  setVisible(false);
  const node=rootRef.current;if(!node)return;
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
  },{rootMargin:'220px'});
  observer.observe(node);return()=>observer.disconnect();
 },[exerciseName,exerciseId]);
 useEffect(()=>{
  let cancelled=false;
  setPoses([]);setMediaReview(null);setSourceFailed([]);setPose(0);setLoading(false);
  if(!visible||!exerciseName.trim())return;
  const own=!ownFailed?humanMediaForExercise(exerciseName,exerciseId):null;
  if(own){
   setSource('foco-ai');
   setPoses(own.poses.map(frame=>({url:import.meta.env.BASE_URL+own.asset,phase:frame.phase,frame,media:own})));
   return;
  }
  setSource('repdb');setLoading(true);
  void resolveRepDBExercise(exerciseName,exerciseId).then(result=>{
   if(!cancelled){setPoses(result?repdbImagePoses(result):[]);setMediaReview(repdbMediaReview(result?.id));}
  }).catch(()=>{if(!cancelled)setPoses([]);}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[visible,exerciseName,exerciseId,ownFailed]);
 const working=poses.filter(p=>!sourceFailed.includes(p.url));
 const activePose=working[Math.min(pose,working.length-1)]||null;
 const activeUrl=activePose?.url||null;
 const hasPair=working.length>1;
 const phaseLabel=activePose?.phase==='peak'?'posição final':activePose?.phase==='reference'?'posição de referência':'posição inicial';
 const markBroken=(url:string)=>{
  if(source==='foco-ai'){setOwnFailed(true);return;}
  setSourceFailed(prev=>prev.includes(url)?prev:[...prev,url]);setPose(0);
 };
 return <div ref={rootRef} data-foco-media-source={source}
  data-foco-media-status={activeUrl?'image':loading?'loading':'unavailable'}
  data-foco-media-phase={activePose?.phase}
  role="group" aria-label={'Ilustração do exercício '+exerciseName}
  className={'foco-repdb-media relative isolate overflow-hidden rounded-2xl '+(compact?'foco-repdb-media-compact ':'')+(interactive&&hasPair?'has-pose-controls ':'')+className}>
  {activeUrl?<>
   <div className="foco-exercise-visual">
    {activePose?.frame&&activePose.media?<svg className="foco-human-pose" role="img"
      aria-label={exerciseName+' — '+phaseLabel}
      viewBox={'0 0 '+activePose.frame.width+' '+activePose.frame.height} preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id={clipId}><rect width={activePose.frame.width} height={activePose.frame.height}/></clipPath></defs>
      <image href={activeUrl} width={activePose.media.width} height={activePose.media.height}
       x={-activePose.frame.x} y={-activePose.frame.y} clipPath={'url(#'+clipId+')'}
       onError={()=>markBroken(activeUrl)}/>
     </svg>:<img key={activeUrl} src={activeUrl} alt={exerciseName+' — '+phaseLabel}
      className="foco-repdb-pose" loading={compact?'lazy':'eager'} decoding="async"
      onError={()=>markBroken(activeUrl)}/>}
   </div>
   {!compact&&<span className="foco-repdb-source">{source==='foco-ai'?'FOCO · IMAGEM DE IA':'RE P DB · ILUSTRAÇÃO'}</span>}
   {interactive&&hasPair&&<div className="foco-repdb-pose-switch" role="group" aria-label="Posições do exercício">
    <button type="button" aria-pressed={pose===0} onClick={()=>setPose(0)}>01 INÍCIO</button>
    <button type="button" aria-pressed={pose===1} onClick={()=>setPose(1)}>02 FINAL</button>
   </div>}
   {!compact&&!interactive&&hasPair&&<span className="foco-repdb-two-poses">2 POSIÇÕES DISPONÍVEIS</span>}
  </>:<div className="foco-repdb-fallback" role={loading?'status':undefined}>
   <span className="foco-repdb-fallback-glyph"><Dumbbell size={compact?22:40} strokeWidth={1.4}/></span>
   {!compact&&<><strong>{exerciseName}</strong><small>{loading?'CARREGANDO ILUSTRAÇÃO':mediaReview?'ILUSTRAÇÃO EM REVISÃO':muscleGroup||'EXERCÍCIO FOCO'}</small></>}
  </div>}
 </div>;
};
