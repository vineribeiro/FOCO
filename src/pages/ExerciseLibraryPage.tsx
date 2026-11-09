import React,{useEffect,useState} from 'react';
import {CheckCircle2,Dumbbell,Plus,X} from 'lucide-react';
import {api} from '../services/api';
import {AccessibleDialog} from '../components/AccessibleDialog';
import {RepDBCatalogBrowser} from '../components/RepDBCatalogBrowser';
import {repdbDisplayName,REPDB_CREDIT_TEXT,REPDB_CREDIT_URL,type RepDBExercise} from '../data/repdbAssets';
import {getPreferredTrainingDay,getTrainingDayLabel,savePreferredTrainingDay,TRAINING_DAYS} from '../data/exerciseLibrary';
import type {WorkoutExercise,WorkoutPlan} from '../types';

interface Props {setActiveTab:(tab:string)=>void}

/** Single-source library. Historic user workouts are not deleted or migrated. */
export const ExerciseLibraryPage:React.FC<Props>=({setActiveTab})=>{
  const [plans,setPlans]=useState<WorkoutPlan[]>([]);
  const [plansError,setPlansError]=useState('');
  const [selected,setSelected]=useState<RepDBExercise|null>(null);
  const [ownName,setOwnName]=useState('');
  const [ownGroup,setOwnGroup]=useState('Geral');
  const [ownDay,setOwnDay]=useState(getPreferredTrainingDay);
  const [saving,setSaving]=useState<string|null>(null);
  const [notice,setNotice]=useState<{type:'error'|'success';text:string}|null>(null);

  useEffect(()=>{
    let active=true;
    api.getWorkouts().then(value=>{if(active)setPlans(value);})
      .catch(()=>{if(active)setPlansError('Não foi possível carregar tuas fichas. A biblioteca externa continua acessível.');});
    return ()=>{active=false;};
  },[]);
  const startAdd=(remote:RepDBExercise)=>{
    // The canonical ID survives user-controlled display-name changes.
    const groupNames:Record<string,string>={chest:'Peito',back:'Costas',shoulders:'Ombros',biceps:'Bíceps',triceps:'Tríceps',legs:'Pernas',quadriceps:'Quadríceps',glutes:'Glúteos',calves:'Panturrilhas',abdominals:'Abdômen'};
    setSelected(remote);setOwnName(repdbDisplayName(remote));
    setOwnGroup(groupNames[remote.body_part||'']||'Geral');setNotice(null);
  };
  const addToPlan=async(plan:WorkoutPlan)=>{
    const typed=ownName.trim().replace(/\s+/g,' ');
    if(typed.length<3||typed.length>100){setNotice({type:'error',text:'Escreve um nome próprio de 3 a 100 caracteres para usar na tua ficha.'});return;}
    if(plans.some(p=>p.id===plan.id&&p.exercises?.some(e=>
      e.exercise_name.trim().toLocaleLowerCase('pt-BR')===typed.toLocaleLowerCase('pt-BR')
      &&(e.training_day||'')===ownDay))){
      setNotice({type:'error',text:'Já existe um exercício com esse nome neste dia da ficha.'});return;
    }
    setSaving(plan.id);setNotice(null);
    const exercise:WorkoutExercise={
      exercise_name:typed,muscle_group:ownGroup,repdb_id:selected?.id,sets:3,reps_min:8,reps_max:12,
      rest_seconds:60,suggested_load_kg:0,notes:'',training_day:ownDay as WorkoutExercise['training_day'],
    };
    try{
      const saved=await api.addExerciseToWorkout(plan.id,exercise);
      setPlans(current=>current.map(p=>p.id===plan.id?{...p,exercises:[...(p.exercises||[]),saved]}:p));
      setSelected(null);setOwnName('');
      setNotice({type:'success',text:typed+' foi adicionado à '+getTrainingDayLabel(ownDay)+' de '+plan.name+'.'});
    }catch(error){
      setNotice({type:'error',text:'Não foi possível salvar o exercício: '+(error instanceof Error?error.message:'tenta novamente.')});
    }finally{setSaving(null);}
  };
  return <div className="foco-v4-page foco-atlas-library-page">
    <header className="foco-atlas-library-header">
      <div><p className="foco-v4-eyebrow">FOCO / BIBLIOTECA</p><h1>Exercícios</h1>
        <p>Explore movimentos ilustrados pela RepDB. Uma fonte visual, poses precisas e fichas preservadas.</p></div>
      <span className="foco-atlas-library-source"><Dumbbell size={16}/> REPDB</span>
    </header>
    {notice&&<div role="status" className="foco-atlas-alert">
      <span>{notice.text}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Fechar aviso"><X size={17}/></button></div>}
    <RepDBCatalogBrowser onUseExercise={startAdd}/>
    {selected&&<AccessibleDialog title="Adicionar exercício à ficha" onClose={()=>{setSelected(null);setNotice(null);}}>
      <div className="foco-atlas-add-modal">
        <div className="flex items-start justify-between gap-3">
          <div><p className="foco-atlas-kicker">TUA FICHA / NOME PERSONALIZADO</p>
            <h2>Adicionar um movimento</h2></div>
          <button type="button" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={20}/></button>
        </div>
        <p>O nome pode ser personalizado. O identificador RepDB permanece associado ao exercício para não perder a imagem ao renomeá-lo.</p>
        <label className="foco-atlas-form-field">Nome que tu escolheste
          <input value={ownName} onChange={e=>setOwnName(e.target.value)} maxLength={100} autoComplete="off"
            placeholder="Ex.: supino reto com barra" aria-label="Nome personalizado do exercício"/>
        </label>
        <label className="foco-atlas-form-field">Grupo muscular da tua ficha
          <select value={ownGroup} onChange={e=>setOwnGroup(e.target.value)} aria-label="Grupo muscular">
            {['Geral','Peito','Costas','Ombros','Bíceps','Tríceps','Pernas','Quadríceps','Posteriores','Glúteos','Panturrilhas','Abdômen','Cardio'].map(group=><option key={group} value={group}>{group}</option>)}
          </select>
        </label>
        <fieldset className="foco-atlas-days"><legend>Dia do treino</legend>
          <div>{TRAINING_DAYS.map(day=><button key={day.value} type="button"
            aria-pressed={ownDay===day.value} onClick={()=>{setOwnDay(day.value);savePreferredTrainingDay(day.value);}}>
            {day.shortLabel}</button>)}</div>
        </fieldset>
        {notice?.type==='error'&&<p role="alert" className="foco-atlas-form-error">{notice.text}</p>}
        {plansError&&<p role="alert" className="foco-atlas-form-error">{plansError}</p>}
        {plans.length?<div className="foco-atlas-plan-list">
          <h3>Escolhe a ficha</h3>
          {plans.map(plan=><button key={plan.id} type="button" disabled={saving!==null}
            onClick={()=>void addToPlan(plan)}><CheckCircle2 size={18}/><span>{plan.name}
              <small>{plan.exercises?.length||0} exercícios · {plan.status==='ativo'?'Ficha ativa':'Ficha salva'}</small></span>
              <Plus size={18}/></button>)}
        </div>:<div className="foco-atlas-plan-list"><p>Ainda não tens uma ficha disponível.</p>
          <button type="button" onClick={()=>{setSelected(null);setActiveTab('novo-treino');}}>Criar ficha <Plus size={18}/></button>
        </div>}
        <p className="foco-atlas-credit">O nome, o grupo e o identificador da mídia são salvos na tua ficha. <a href={REPDB_CREDIT_URL} target="_blank" rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a>.</p>
      </div>
    </AccessibleDialog>}
  </div>;
};
