import { conciseWorkoutName } from '../utils/workoutTitles';
import React, {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,ChevronRight,Clock3,Dumbbell,Play,RotateCcw,X} from 'lucide-react';
import {api} from '../services/api';
import {getPreferredTrainingDay,getTrainingDayLabel,savePreferredTrainingDay} from '../data/exerciseLibrary';
import {ExerciseIllustration} from '../components/ExerciseIllustration';
import {ExerciseExecutionGuide} from '../components/ExerciseExecutionGuide';
import {FocoV6Segment,FocoV6Status,V6_IMAGES} from '../components/FocoV6UI';
import type {WorkoutPlan,WorkoutExercise} from '../types';

export const WorkoutDetailPage:React.FC<{setActiveTab:(tab:string)=>void}>=({setActiveTab})=>{
  const [plan,setPlan]=useState<WorkoutPlan|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [tab,setTab]=useState('exercises');
  const [chosen,setChosen]=useState<WorkoutExercise|null>(null);
  const [preview,setPreview]=useState<WorkoutExercise|null>(null);
  const previewDialogRef=useRef<HTMLDialogElement|null>(null);
  useEffect(()=>{if(preview&&!previewDialogRef.current?.open)previewDialogRef.current?.showModal();},[preview]);
  const closePreview=()=>{previewDialogRef.current?.close();setPreview(null);};
  const day=getPreferredTrainingDay();
  useEffect(()=>{let alive=true;api.getActiveWorkout().then(value=>{if(alive)setPlan(value);}).catch(()=>{if(alive)setError(true);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
  const exercises=plan?.exercises||[];
  const isSplit=exercises.some(ex=>!!ex.training_day);
  const today=isSplit?exercises.filter(ex=>!ex.training_day||ex.training_day===day):exercises;
  const muscles=[...new Set(today.map(ex=>ex.muscle_group).filter(Boolean))];
  const title=conciseWorkoutName(muscles,plan?.name||'Seu treino');
  const start=()=>{savePreferredTrainingDay(day);setActiveTab('sessao');};
  return <div className="foco-v6-detail foco-v4-page">
    <div className="md:hidden"><FocoV6Status/></div>
    <div className="foco-v6-mobile-title">
      <div className="foco-v6-title-left">
        <button type="button" className="foco-v6-icon-button" onClick={()=>setActiveTab('dashboard')} aria-label="Voltar"><ArrowLeft size={18}/></button>
        <div><h1>{loading?'Carregando...':title}</h1><p>{getTrainingDayLabel(day)} · {today.length} exercícios</p></div>
      </div>
      <button type="button" className="foco-v6-icon-button" onClick={()=>setActiveTab('treinos')} aria-label="Trocar o dia do treino"><CalendarDays size={19}/></button>
    </div>
    <div className="foco-v6-muscle-hero">
      <img src={V6_IMAGES.muscle} alt="" loading="lazy"/>
      <div className="foco-v6-muscle-hero-content">
        <p className="text-[10px] font-bold tracking-[.12em] text-[#C8F040] uppercase">{getTrainingDayLabel(day)}</p>
        <h1 className="mt-3 max-w-[67%]">{title}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#C8F040]/10 px-3 py-1.5 text-[11px] text-[#C8F040]"><Clock3 size={13}/> {today.length} exercícios</p>
      </div>
    </div>
    <FocoV6Segment label="Informações do treino" options={[{value:'exercises',label:'Exercícios'},{value:'details',label:'Detalhes'},{value:'substitutions',label:'Substituições'}]} value={tab} onChange={setTab}/>
    {error && <p role="alert" className="foco-v6-glass rounded-xl p-4 text-sm">Não foi possível consultar o treino. Tente novamente.</p>}
    {!loading&&!error&&tab==='exercises'&&<div className="foco-v6-exercise-list">
      {today.length ? today.map((ex,i)=>
        <div key={ex.id||ex.exercise_name+i} className="foco-v6-exercise-row foco-v8-exercise-row">
          <button type="button" className="foco-v8-exercise-thumb"
            aria-label={'Ver demonstração de '+ex.exercise_name} onClick={()=>setPreview(ex)}>
            <ExerciseIllustration exerciseName={ex.exercise_name} muscleGroup={ex.muscle_group}
              className="h-full w-full !rounded-[13px]" presentation="editorial"/>
            <span className="foco-v8-exercise-play" aria-hidden="true"><Play size={15} fill="currentColor"/></span>
          </button>
          <button type="button" className="foco-v8-exercise-info"
            aria-expanded={chosen?.exercise_name===ex.exercise_name}
            onClick={()=>setChosen(chosen?.exercise_name===ex.exercise_name?null:ex)}>
            <span className="foco-v6-exercise-row-text">
              <small className="foco-v8-exercise-number">EXERCÍCIO {String(i+1).padStart(2,'0')}</small>
              <strong>{ex.exercise_name}</strong>
              <span>{ex.sets} séries · {ex.reps_min}{ex.reps_max&&ex.reps_max!==ex.reps_min?'-'+ex.reps_max:''} repetições</span>
            </span><ChevronRight size={17}/>
          </button>
        </div>
      ):<p className="foco-v6-glass rounded-xl p-4 text-sm">Dia sem exercícios programados. Escolhe outro treino na semana ou faz cardio livre.</p>}
      {chosen&&<section className="foco-v6-glass mt-1 rounded-2xl p-4">
        <h3 className="font-bold">{chosen.exercise_name}</h3>
        <p className="mt-2 text-xs text-[#BDC3B9]">{chosen.muscle_group} · {chosen.sets} séries · descanso {chosen.rest_seconds||60}s</p>
        {chosen.notes&&<p className="mt-3 text-xs leading-5 text-white/80">{chosen.notes}</p>}
        <button type="button" className="foco-v6-glass-button mt-4 w-full" onClick={start}>Abrir no treino <ArrowRight size={15}/></button>
      </section>}
    </div>}
    {tab==='details'&&<div className="foco-v6-glass rounded-2xl p-4">
      <h2 className="font-bold">Sobre o treino</h2>
      <p className="mt-3 text-sm leading-6 text-[#C2C8BE]">{plan?.goal||'Plano adaptado às suas metas e disponibilidade.'}</p>
      <div className="foco-v6-subtle-divider"/><p className="text-xs">Músculos: {muscles.join(' · ')||'Não definidos'}</p>
      <p className="mt-2 text-xs">Frequência: {plan?.weekly_frequency||'—'} dias por semana</p>
      <button type="button" className="foco-v6-glass-button mt-4 w-full" onClick={()=>setActiveTab('treinos')}>Trocar treino da semana <CalendarDays size={15}/></button>
    </div>}
    {tab==='substitutions'&&<div className="foco-v6-glass rounded-2xl p-4">
      <RotateCcw size={23} className="text-[#C8F040]"/>
      <h2 className="mt-2 font-bold">Substituir um exercício</h2>
      <p className="mt-2 text-xs leading-5 text-[#C2C8BE]">Consulte equipamentos alternativos e personalize sua ficha sem perder seu histórico.</p>
      <button type="button" onClick={()=>setActiveTab('biblioteca')} className="foco-v6-glass-button mt-4 w-full">Abrir biblioteca <ChevronRight size={15}/></button>
    </div>}
    {preview&&<dialog ref={previewDialogRef} onClose={()=>setPreview(null)}
      aria-label={'Demonstração do exercício '+preview.exercise_name}
      className="foco-v8-demo-dialog m-auto w-[min(96vw,650px)] max-w-none rounded-[25px] border border-white/20 bg-[#121812] p-0 text-white shadow-2xl backdrop:bg-black/90">
      <header className="foco-v8-demo-header">
        <div><p>GUIA DO MOVIMENTO</p><h2>{preview.exercise_name}</h2></div>
        <button type="button" onClick={closePreview} aria-label="Fechar demonstração"><X size={21}/></button>
      </header>
      <div className="foco-v8-demo-content">
        <ExerciseExecutionGuide exerciseName={preview.exercise_name} muscleGroup={preview.muscle_group}/>
      </div>
    </dialog>}
    <div className="sticky bottom-[78px] z-10 rounded-3xl bg-[#080A07]/80 p-2 backdrop-blur-2xl">
      <button type="button" onClick={today.length?start:()=>setActiveTab('cardio')} className="foco-v6-primary" disabled={loading||error}>
        {today.length?'Iniciar treino':'Fazer cardio'} <Play size={15} fill="currentColor"/>
      </button>
    </div>
  </div>;
};
