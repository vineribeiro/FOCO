import React, {useEffect,useRef,useState} from 'react';
import {Dumbbell} from 'lucide-react';
import {resolveRepDBExercise,repdbImageUrls} from '../data/repdbAssets';

interface Props {
  exerciseName:string;
  /** Stable RepDB slug. When present, renaming the exercise never changes its image. */
  exerciseId?:string|null;
  muscleGroup?:string;
  imagePaths?:string[];
  className?:string;
  showCaption?:boolean;
  presentation?:'standard'|'editorial';
  interactive?:boolean;
}

/** One illustration owner for the entire app: licensed RepDB Free WebP poses.
 * Lazy loading and a shared catalogue request avoid per-card external API calls.
 */
export const ExerciseIllustration:React.FC<Props>=({
  exerciseName,exerciseId,muscleGroup,className='h-64 w-full',
  presentation='standard',interactive=false,
})=>{
  const rootRef=useRef<HTMLDivElement|null>(null);
  const [visible,setVisible]=useState(false);
  const [urls,setUrls]=useState<string[]>([]);
  const [loading,setLoading]=useState(false);
  const [sourceFailed,setSourceFailed]=useState<string[]>([]);
  const [pose,setPose]=useState(0);
  const compact=/\bh-(?:14|16|20)\b|h-\[100px\]|w-\[112px\]/.test(className);
  useEffect(()=>{
    setVisible(false);
    const node=rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver==='undefined') {setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
    },{rootMargin:'220px'});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[exerciseName,exerciseId]);
  useEffect(()=>{
    let cancelled=false;
    setUrls([]);setSourceFailed([]);setPose(0);setLoading(false);
    if(!visible||!exerciseName.trim())return;
    setLoading(true);
    void resolveRepDBExercise(exerciseName,exerciseId).then(result=>{
      if (!cancelled) setUrls(result?repdbImageUrls(result):[]);
    }).catch(()=>{if(!cancelled)setUrls([]);})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[visible,exerciseName,exerciseId]);
  const working=urls.filter(url=>!sourceFailed.includes(url));
  const activeUrl=working[Math.min(pose,working.length-1)]||null;
  const hasPair=working.length>1;
  const markBroken=(url:string)=>{setSourceFailed(prev=>prev.includes(url)?prev:[...prev,url]);setPose(0);};
  return <div ref={rootRef} data-foco-media-source="repdb"
    data-foco-media-status={activeUrl?'image':loading?'loading':'unavailable'}
    aria-label={'Ilustração do exercício '+exerciseName}
    className={'foco-repdb-media relative isolate overflow-hidden rounded-2xl '+(compact?'foco-repdb-media-compact ':'')+className}>
    {activeUrl ? <>
      <img key={activeUrl} src={activeUrl} alt={exerciseName+' — '+(pose===1?'posição final':'posição inicial')}
        className="foco-repdb-pose" loading={compact?'lazy':'eager'} decoding="async"
        onError={()=>markBroken(activeUrl)}/>
      {!compact&&<span className="foco-repdb-image-shade" aria-hidden="true"/>}
      {!compact&&<span className="foco-repdb-source">RE P DB <span>·</span> ILUSTRAÇÃO</span>}
      {interactive&&hasPair&&<div className="foco-repdb-pose-switch" role="group" aria-label="Posições do exercício">
        <button type="button" aria-pressed={pose===0} onClick={()=>setPose(0)}>01 INÍCIO</button>
        <button type="button" aria-pressed={pose===1} onClick={()=>setPose(1)}>02 FINAL</button>
      </div>}
      {!compact&&!interactive&&hasPair&&<span className="foco-repdb-two-poses">2 POSIÇÕES DISPONÍVEIS</span>}
    </> : <div className="foco-repdb-fallback" role={loading?'status':undefined}>
      <span className="foco-repdb-fallback-glyph"><Dumbbell size={compact?22:40} strokeWidth={1.4}/></span>
      {!compact&&<><strong>{exerciseName}</strong><small>{loading?'CARREGANDO ILUSTRAÇÃO':muscleGroup||'EXERCÍCIO FOCO'}</small></>}
    </div>}
  </div>;
};
