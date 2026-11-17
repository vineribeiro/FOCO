import { conciseWorkoutName } from '../utils/workoutTitles';
import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Activity, ArrowUpRight, BookOpen, Settings2, ArrowRight, Dumbbell, House, ScanLine, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { savePreferredTrainingDay } from '../data/exerciseLibrary';
import type { WorkoutPlan, WorkoutSession } from '../types';
import { FocoV6WeekStrip, FocoV6Segment, V6_IMAGES } from '../components/FocoV6UI';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { isCardioSession } from '../utils/cardio';

const WEEK=[
  {day:'segunda',short:'SEG',label:'Segunda-feira'},
  {day:'terca',short:'TER',label:'Terça-feira'},
  {day:'quarta',short:'QUA',label:'Quarta-feira'},
  {day:'quinta',short:'QUI',label:'Quinta-feira'},
  {day:'sexta',short:'SEX',label:'Sexta-feira'},
  {day:'sabado',short:'SÁB',label:'Sábado'},
  {day:'domingo',short:'DOM',label:'Domingo'},
];
const toMondayIndex=(d:Date)=>(d.getDay()+6)%7;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const DashboardPage: React.FC<{setActiveTab:(tab:string)=>void}> = ({setActiveTab}) => {
  const {user}=useAuth();
  const [plan,setPlan]=useState<WorkoutPlan|null>(null);
  const [sessions,setSessions]=useState<WorkoutSession[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState(false);
  const [planFilter,setPlanFilter]=useState('all');
  useEffect(()=>{
    let mounted=true;
    Promise.all([api.getActiveWorkout(),api.getSessions()]).then(([p,s])=>{
      if(mounted){setPlan(p);setSessions(s);setLoadError(false);}
    }).catch(()=>{if(mounted)setLoadError(true);}).finally(()=>{if(mounted)setLoading(false);});
    return()=>{mounted=false;};
  },[]);
  const now=new Date(),today=WEEK[toMondayIndex(now)];
  const firstName=user?.full_name?.trim().split(/\s+/)[0]||'Atleta';
  const greeting=now.getHours()<12?'Bom dia':now.getHours()<18?'Boa tarde':'Boa noite';
  const exercises=plan?.exercises||[];
  const hasDaySplit=exercises.some(ex=>!!ex.training_day);
  const selectedExercises=hasDaySplit?exercises.filter(ex=>!ex.training_day||ex.training_day===today.day):exercises;
  const muscles=[...new Set(selectedExercises.map(ex=>ex.muscle_group).filter(Boolean))];
  const title=conciseWorkoutName(muscles,plan?.name||'Seu próximo nível começa aqui');
  const weekStart=useMemo(()=>{
    const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-toMondayIndex(start));return start;
  },[]);
  const completed=useMemo(()=>sessions.filter(s=>s.status==='completed'&&new Date(s.started_at)>=weekStart&&!isCardioSession(s)),[sessions,weekStart]);
  const doneDays=useMemo(()=>{
    const result=new Set<string>();
    completed.forEach(s=>{
      const recorded=s.notes?.match(/Treino escolhido da semana:\s*(Segunda-feira|Terça-feira|Quarta-feira|Quinta-feira|Sexta-feira|Sábado|Domingo)/i)?.[1];
      const match=recorded?WEEK.find(d=>normalize(d.label)===normalize(recorded)):undefined;
      if(match)result.add(match.day);
      else result.add(WEEK[toMondayIndex(new Date(s.started_at))].day);
    });
    return result;
  },[completed]);
  const target=plan?.weekly_frequency||0;
  const cardioMins=Math.round(sessions.filter(s=>s.status==='completed'&&new Date(s.started_at)>=weekStart&&isCardioSession(s))
    .reduce((acc,s)=>acc+Math.max(0,Number(s.duration_seconds)||0),0)/60);
  const handleDetail=(day:string)=>{
    savePreferredTrainingDay(day);
    setActiveTab('detalhes');
  };
  const handleStart=()=>{
    if(!plan){setActiveTab('anamnese');return;}
    if(!selectedExercises.length){setActiveTab('cardio');return;}
    savePreferredTrainingDay(today.day);
    setActiveTab('sessao');
  };
  const weekProgress=target?Math.min(100,Math.round(completed.length/target*100)):0;
  const dailyPlans=hasDaySplit?WEEK.map(day=>({day:day.day,label:day.label,exercises:exercises.filter(ex=>!ex.training_day||ex.training_day===day.day)})).filter(day=>day.exercises.length)
    :exercises.length?[{day:'',label:'Ficha geral',exercises}]:[];
  const visiblePlans=dailyPlans.filter(day=>planFilter==='all'||day.exercises.some(ex=>planFilter==='lower'
    ?/quadr|posterior|gl[uú]te|panturr|adutor|abdutor/i.test(ex.muscle_group)
    :/peito|peitoral|costas|ombro|b[ií]cep|tr[ií]cep|trap[eé]z|antebra/i.test(ex.muscle_group)));
  const initials=(user?.full_name||'FOCO').split(/\s+/).slice(0,2).map(part=>part[0]).join('');
  return <div className="foco-v6-dashboard foco-v4-page foco-home">
    <header className="foco-home-greeting">
      <button type="button" className="foco-home-avatar" onClick={()=>setActiveTab('perfil')} aria-label="Meu perfil">{initials}</button>
      <div><h1>Olá, {firstName}</h1><p>{greeting}. Vamos no seu ritmo.</p></div>
      <button type="button" className="foco-v6-icon-button" onClick={()=>setActiveTab('configuracoes')} aria-label="Abrir menu e configurações"><Settings2 size={19}/></button>
    </header>
    {loadError&&<div role="alert" className="foco-v6-glass p-4 text-sm">Não conseguimos consultar seus treinos. <button type="button" onClick={()=>window.location.reload()} className="underline">Recarregar</button></div>}
    <div className="foco-home-layout">
      <div className="foco-home-primary">
        <section className="foco-v6-hero foco-home-hero foco-motion-hero" aria-labelledby="foco-v6-workout-title">
          <div className="foco-home-hero-copy">
            <span className="foco-home-hero-caption">{plan?'Seu treino de hoje':'Seu próximo passo'}</span>
            <h2 id="foco-v6-workout-title">{loading?'Preparando seu treino':plan?(selectedExercises.length?title:'Recuperação ativa'):'Vamos começar?'}</h2>
            <p>{plan?selectedExercises.length+' exercícios · '+target+' dias por semana':'Monte seu plano com suas preferências.'}</p>
            <button type="button" className="foco-v6-primary" disabled={loading||loadError} onClick={handleStart}>{!plan?'Personalizar treino':selectedExercises.length?'Iniciar treino':'Fazer cardio'}<ArrowUpRight size={18}/></button>
          </div>
          <div className="foco-home-hero-art" aria-hidden="true"><img src={V6_IMAGES.athlete} alt="" loading="eager" decoding="async"/></div>
          {target>0&&!loading&&!loadError&&<div className="foco-goal-ring" style={{'--goal-progress':weekProgress+'%'} as React.CSSProperties} aria-label={weekProgress+'% da meta semanal de treinos concluída'}><span>{weekProgress}%<small>da semana</small></span></div>}
        </section>
        <button type="button" className="foco-home-personal" onClick={()=>setActiveTab('personal')}><MessageCircle size={23}/><span><strong>Personal FOCO</strong><small>Tire suas dúvidas sobre treino</small></span><ArrowUpRight size={20}/></button>
        <section className="foco-home-plans" aria-labelledby="foco-home-plan-title">
          <div className="foco-section-heading"><h2 id="foco-home-plan-title">Seu plano</h2><button type="button" onClick={()=>setActiveTab('treinos')} aria-label="Ver todos os treinos"><ArrowUpRight size={22}/></button></div>
          <FocoV6Segment label="Filtrar treinos por região" options={[{value:'all',label:'Todos'},{value:'lower',label:'Inferiores'},{value:'upper',label:'Superiores'}]} value={planFilter} onChange={setPlanFilter}/>
          <div className="foco-home-plan-grid">
            {visiblePlans.slice(0,2).map((day,index)=>{
              const groups=[...new Set(day.exercises.map(ex=>ex.muscle_group).filter(Boolean))];
              const estimate=Math.ceil(6+day.exercises.reduce((sum,ex)=>sum+(ex.sets||0)+Math.max(0,(ex.sets||0)-1)*(ex.rest_seconds||0)/60+1.5,0));
              return <button type="button" key={day.day||'general'} className="foco-plan-card" data-tone={index%2?'rose':'lilac'} onClick={()=>day.day?handleDetail(day.day):setActiveTab('treinos')} aria-label={'Abrir '+day.label+': '+groups.join(', ')}>
                <h3>{conciseWorkoutName(groups,plan?.name||'Meu treino')}</h3>
                <span className="foco-plan-duration" aria-label={'Duração estimada de '+estimate+' minutos'}><strong>~{estimate}</strong><small>min</small></span>
                <span className="foco-plan-card-body">
                  <span className="foco-plan-card-art"><ExerciseIllustration exerciseName={day.exercises[0].exercise_name} exerciseId={day.exercises[0].repdb_id} muscleGroup={day.exercises[0].muscle_group} compact className="h-full w-full"/></span>
                  <span className="foco-plan-card-meta"><span>{day.label}</span><strong>{day.exercises.length} exercícios</strong><small>{groups.slice(0,3).join(' / ')}{groups.length>3?' +'+(groups.length-3):''}</small></span>
                </span>
                <ArrowUpRight size={18} className="foco-plan-open" aria-hidden="true"/>
              </button>;
            })}
          </div>
          {!loading&&!visiblePlans.length&&<p className="foco-empty-note">{plan?'Nenhum treino desta região na ficha atual.':'Sua ficha aparecerá aqui quando você criar um plano.'}</p>}
          {visiblePlans.length>2&&<button type="button" className="foco-inline-link" onClick={()=>setActiveTab('treinos')}>Ver todos os {visiblePlans.length} treinos <ArrowRight size={16}/></button>}
        </section>
      </div>
      <div className="foco-home-support">
        <section className="foco-home-calendar foco-motion-week" aria-label="Frequência dos treinos" aria-busy={loading}>
          <div className="foco-section-heading"><h2>Sua semana</h2><span>{loading?'—':loadError?'Indisponível':target?Math.min(completed.length,target)+'/'+target+' treinos':'Sem meta semanal'}</span></div>
          <FocoV6WeekStrip labels={WEEK.map((day,index)=>{const date=new Date(weekStart);date.setDate(date.getDate()+index);return {...day,date:String(date.getDate()).padStart(2,'0'),done:doneDays.has(day.day),active:today.day===day.day};})} onSelect={loading||loadError?undefined:day=>plan?handleDetail(day):setActiveTab('anamnese')}/>
          <button type="button" className="foco-inline-link" onClick={()=>setActiveTab('treinos')}>Ver semana completa <ArrowRight size={16}/></button>
        </section>
        <section className="foco-home-stat-grid" aria-label="Resumo da atividade desta semana">
          <button type="button" data-tone="rose" onClick={()=>setActiveTab('historico')}><span>Treinos</span><Dumbbell size={24}/><strong>{loading||loadError?'—':completed.length}</strong><small>concluídos na semana</small></button>
          <button type="button" data-tone="lilac" onClick={()=>setActiveTab('cardio')}><span>Cardio</span><Activity size={24}/><strong>{loading||loadError?'—':cardioMins}<small> min</small></strong><small>registrados na semana</small></button>
        </section>
        <section className="foco-home-tools foco-motion-shortcuts" aria-label="Seu FOCO, do seu jeito">
          <h2>Além da musculação</h2>
          <div>
            <button type="button" onClick={()=>setActiveTab('biblioteca')}><BookOpen size={20}/><span>Biblioteca</span><ArrowUpRight size={15}/></button>
            <button type="button" onClick={()=>setActiveTab('novo-treino')}><Sparkles size={20}/><span>Nova ficha</span><ArrowUpRight size={15}/></button>
            <button type="button" onClick={()=>{sessionStorage.setItem('foco_upload_mode','body');setActiveTab('arquivos');}}><ScanLine size={20}/><span>Avaliação OKOK</span><ArrowUpRight size={15}/></button>
            <button type="button" onClick={()=>setActiveTab('em-casa')}><House size={20}/><span>FOCO em Casa</span><ArrowUpRight size={15}/></button>
            <button type="button" onClick={()=>setActiveTab('complementares')}><Dumbbell size={20}/><span>Exercícios complementares</span><ArrowUpRight size={15}/></button>
          </div>
        </section>
      </div>
    </div>
  </div>;
};
