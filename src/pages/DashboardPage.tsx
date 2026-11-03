import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, CalendarDays, ChevronRight, Clock3, Dumbbell, Menu, Play, ScanLine, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { savePreferredTrainingDay } from '../data/exerciseLibrary';
import type { WorkoutPlan, WorkoutSession } from '../types';
import { FocoV6Lockup, FocoV6Status, FocoV6WeekStrip, V6_IMAGES } from '../components/FocoV6UI';
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
const prettyTitle=(str:string)=>str.replace(/\s+/g,' ').trim().replace(/(^|\s)\S/g,l=>l.toUpperCase());
const conciseWorkoutName=(groups:string[],fallback:string)=>{
  if(!groups.length)return fallback;
  const normalized=groups.map(normalize);
  const upper=normalized.some(g=>/(peit|cost|dorsa|omb|bicep|tricep|deltoid|braco)/.test(g));
  const lower=normalized.some(g=>/(quadr|perna|glute|posterior|panturr|coxa|adutor|abdutor)/.test(g));
  const core=normalized.some(g=>/(core|abd[oô]m|abdom|lombar)/.test(g));
  if(upper&&lower)return 'Corpo inteiro';
  if(upper)return 'Superiores';
  if(lower)return 'Inferiores';
  if(core)return 'Core e mobilidade';
  return prettyTitle(groups.slice(0,2).join(' + '));
};

export const DashboardPage: React.FC<{setActiveTab:(tab:string)=>void}> = ({setActiveTab}) => {
  const {user}=useAuth();
  const [plan,setPlan]=useState<WorkoutPlan|null>(null);
  const [sessions,setSessions]=useState<WorkoutSession[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState(false);
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
  return <div className="foco-v6-dashboard foco-v4-page">
    <div className="md:hidden"><FocoV6Status/></div>
    <header className="foco-v6-home-header">
      <button type="button" className="foco-v6-icon-button" onClick={()=>setActiveTab('configuracoes')} aria-label="Abrir menu e configurações"><Menu size={20}/></button>
      <FocoV6Lockup compact />
      <span aria-hidden="true" className="block h-[42px] w-[42px] shrink-0"/>
    </header>
    <div className="foco-v6-home-intro">
      <div><p>{greeting},</p><h1>{firstName}<span className="text-[#C8F040]">.</span></h1></div>
      {plan && <button type="button" className="foco-v6-icon-button" onClick={()=>setActiveTab('treinos')} aria-label="Ver meu calendário"><CalendarDays size={18}/></button>}
    </div>
    {loadError && <div role="alert" className="foco-v6-glass rounded-2xl p-4 text-sm">
      Não conseguimos consultar seus treinos. Os dados não foram alterados.
      <button type="button" onClick={()=>window.location.reload()} className="ml-2 text-[#C8F040] underline">Recarregar</button>
    </div>}
    <section className="foco-v6-hero" aria-labelledby="foco-v6-workout-title">
      <img src={V6_IMAGES.athlete} alt="" loading="eager" decoding="async"/>
      {plan && selectedExercises.length>0&&<button type="button" onClick={()=>handleDetail(today.day)}
        aria-label="Visualizar os exercícios do dia" title="Visualizar os exercícios do dia"
        className="foco-v6-hero-detail"><ArrowRight size={17}/></button>}
      <div className="foco-v6-hero-body">
        <p className="foco-v6-hero-eyebrow">{plan?'TREINO DO DIA':'SEU TREINO, SUA JORNADA'}</p>
        <h2 id="foco-v6-workout-title">{loading?'Preparando sua jornada':plan?(selectedExercises.length?title:'Recuperação ativa'):'Sua evolução começa aqui.'}</h2>
        <div className="foco-v6-pills">
          {plan&&<span className="foco-v6-pill"><Dumbbell size={12}/>{selectedExercises.length} exercícios</span>}
          {plan&&<span className="foco-v6-pill"><CalendarDays size={12}/>{target} dias/semana</span>}
          {plan&&muscles.length>0&&<span className="foco-v6-pill"><strong>FOCO:</strong> {muscles.join(' · ')}</span>}
          {!plan&&<span className="foco-v6-pill"><Sparkles size={12}/>Programa individual</span>}
        </div>
        <button type="button" className="foco-v6-primary" disabled={loading||loadError} onClick={handleStart}>
          {!plan?'Personalizar treino':selectedExercises.length?'Iniciar treino':'Fazer cardio'}<Play size={15} fill="currentColor"/>
        </button>
      </div>
    </section>
    <section aria-label="Frequência dos treinos" className="space-y-2">
      <div className="foco-v6-week-heading">
        <h2>Sua semana</h2>
        <p>{loading?'—':loadError?'Indisponível':target?Math.min(completed.length,target)+'/'+target+' treinos':'Sem meta semanal'}</p>
      </div>
      <FocoV6WeekStrip
        labels={WEEK.slice(0,5).map(d=>({day:d.day,short:d.short,done:doneDays.has(d.day),active:today.day===d.day}))}
        onSelect={day=>plan?handleDetail(day):setActiveTab('anamnese')}
      />
    </section>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={()=>setActiveTab('cardio')} className="foco-v6-mini-panel foco-v6-glass text-left">
        <span><strong>Cardio livre</strong><p>{cardioMins} min nesta semana</p></span><Activity size={20}/>
      </button>
      <button type="button" onClick={()=>{sessionStorage.setItem('foco_upload_mode','body');setActiveTab('arquivos');}} className="foco-v6-mini-panel foco-v6-glass text-left">
        <span><strong>Avaliação OKOK</strong><p>Atualizar medidas</p></span><ScanLine size={20}/>
      </button>
    </div>
    <button type="button" onClick={()=>setActiveTab('progresso')} className="foco-v6-glass-button w-full justify-between">
      <span className="flex items-center gap-2"><Clock3 size={15} className="text-[#C8F040]"/> Ver minha evolução</span><ChevronRight size={17}/>
    </button>
  </div>;
};
