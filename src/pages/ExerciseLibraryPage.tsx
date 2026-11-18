import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle2,Dumbbell,Plus,RotateCcw,X} from 'lucide-react';
import {api} from '../services/api';
import {AccessibleDialog} from '../components/AccessibleDialog';
import {RepDBCatalogBrowser} from '../components/RepDBCatalogBrowser';
import {repdbDisplayName,REPDB_CREDIT_TEXT,REPDB_CREDIT_URL,type RepDBExercise} from '../data/repdbAssets';
import {repdbWorkoutGroup} from '../data/repdbLocale';
import {getPreferredTrainingDay,getTrainingDayLabel,savePreferredTrainingDay,TRAINING_DAYS} from '../data/exerciseLibrary';
import type {WorkoutExercise,WorkoutPlan} from '../types';
import {useAuth} from '../context/AuthContext';
import {readWorkoutReplacement,clearWorkoutReplacement,replacementOriginal,buildWorkoutReplacement} from '../utils/workoutReplacement';

interface Props {setActiveTab:(tab:string)=>void}

/** Single-source library. Historic user workouts are not deleted or migrated. */
export const ExerciseLibraryPage:React.FC<Props>=({setActiveTab})=>{
  const {user}=useAuth();
  const [replacement,setReplacement]=useState(()=>readWorkoutReplacement(user?.id));
  const [plans,setPlans]=useState<WorkoutPlan[]>([]);
  const [plansLoaded,setPlansLoaded]=useState(false);
  const [plansError,setPlansError]=useState('');
  const [selected,setSelected]=useState<RepDBExercise|null>(null);
  const [ownName,setOwnName]=useState('');
  const [ownGroup,setOwnGroup]=useState('Geral');
  const [ownDay,setOwnDay]=useState(getPreferredTrainingDay);
  const [saving,setSaving]=useState<string|null>(null);
  const replacementSaving=useRef(false);
  const mounted=useRef(true);
  const currentOwner=useRef(user?.id);
  currentOwner.current=user?.id;
  const [notice,setNotice]=useState<{type:'error'|'success';text:string}|null>(null);

  useEffect(()=>{
    let active=true;
    api.getWorkouts().then(value=>{if(active){setPlans(value);setPlansLoaded(true);}})
      .catch(()=>{if(active){setPlansLoaded(true);setPlansError('Não foi possível carregar suas fichas. Tente abrir a biblioteca novamente.');}});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>()=>{if(replacement)clearWorkoutReplacement(replacement.ownerId,replacement.key);},[replacement]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const replacementPlan=replacement?plans.find(plan=>plan.id===replacement.planId):null;
  const original=replacementOriginal(replacementPlan,replacement,user?.id);
  const cancelReplacement=()=>{
    if(replacement)clearWorkoutReplacement(replacement.ownerId,replacement.key);
    setReplacement(null);setSelected(null);setNotice(null);
  };
  const startAdd=(remote:RepDBExercise)=>{
    if(replacement&&!original){setNotice({type:'error',text:'Sua ficha mudou ou a escolha expirou. Volte ao treino e selecione novamente o exercício.'});return;}
    // The canonical ID survives user-controlled display-name changes.
    setSelected(remote);setOwnName(repdbDisplayName(remote));
    setOwnGroup(repdbWorkoutGroup(remote));setNotice(null);
  };
  const confirmReplacement=async()=>{
    if(!replacement||!selected||!user?.id||!replacementPlan||replacementSaving.current)return;
    replacementSaving.current=true;
    setSaving(replacement.planId);setNotice(null);
    try{
      // Re-read before approval: an edited/activated plan must not be overwritten
      // using the older catalog navigation snapshot.
      const current=await api.getActiveWorkout();
      if(!mounted.current||currentOwner.current!==replacement.ownerId)return;
      if(!current){setNotice({type:'error',text:'Abra sua ficha ativa e escolha novamente o exercício que deseja substituir.'});return;}
      let proposal;
      try{proposal=buildWorkoutReplacement(current,replacement,user.id,{exercise_name:ownName,
        muscle_group:repdbWorkoutGroup(selected),repdb_id:selected.id});}
      catch(error){setNotice({type:'error',text:error instanceof Error?error.message:'Volte ao treino e selecione novamente o exercício.'});return;}
      await api.createWorkout(proposal);
      clearWorkoutReplacement(user.id,replacement.key);
      if(!mounted.current||currentOwner.current!==replacement.ownerId)return;
      savePreferredTrainingDay(original?.training_day||getPreferredTrainingDay());
      setActiveTab('detalhes');
    }catch{
      if(mounted.current&&currentOwner.current===replacement.ownerId)setNotice({type:'error',text:'Não foi possível confirmar a substituição. Confira sua ficha e tente novamente se a troca não aparecer.'});
    }finally{replacementSaving.current=false;if(mounted.current)setSaving(null);}
  };
  const addToPlan=async(plan:WorkoutPlan)=>{
    const typed=ownName.trim().replace(/\s+/g,' ');
    if(typed.length<3||typed.length>100){setNotice({type:'error',text:'Escreva um nome próprio de 3 a 100 caracteres para usar na sua ficha.'});return;}
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
    }catch{
      setNotice({type:'error',text:'Não foi possível adicionar o exercício. Confira sua conexão e tente novamente.'});
    }finally{setSaving(null);}
  };
  return <div className="foco-v4-page foco-atlas-library-page">
    <header className="foco-atlas-library-header">
      <div><p className="foco-v4-eyebrow">FOCO / BIBLIOTECA</p><h1>Exercícios</h1>
        <p>Encontre seu movimento em português. Ilustrações humanas FOCO e coleção RepDB, com cada variação identificada.</p></div>
      <span className="foco-atlas-library-source"><Dumbbell size={16}/> FOCO + RepDB</span>
    </header>
    {notice&&<div role="status" className="foco-atlas-alert">
      <span>{notice.text}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Fechar aviso"><X size={17}/></button></div>}
    {replacement&&<section className="foco-v4-panel-soft p-4 space-y-3" aria-labelledby="foco-replacement-title">
      <h2 id="foco-replacement-title">Escolha o novo exercício</h2>
      {original?<p>Substituir <strong>{original.exercise_name}</strong> em {original.training_day?getTrainingDayLabel(original.training_day):'todos os dias da ficha'}.</p>
        :<p role={plansLoaded?'alert':'status'}>{plansLoaded?'A ficha mudou ou a escolha expirou. Volte ao treino e selecione novamente o exercício.':'Carregando o exercício da sua ficha…'}</p>}
      <p className="text-sm">A troca cria uma nova versão da ficha. Você confere antes de ativar.</p>
      <button type="button" className="foco-v6-glass-button" onClick={()=>{cancelReplacement();setActiveTab('detalhes');}}>Cancelar substituição</button>
    </section>}
    <RepDBCatalogBrowser onUseExercise={startAdd} useExerciseLabel={replacement?'Usar na substituição':undefined}/>
    {selected&&<AccessibleDialog title={replacement?'Confirmar substituição do exercício':'Adicionar exercício à ficha'} dismissible={saving===null} onClose={()=>{if(saving===null){setSelected(null);setNotice(null);}}}>
      <div className="foco-atlas-add-modal">
        <div className="flex items-start justify-between gap-3">
          <div><p className="foco-atlas-kicker">{replacement?'SUA FICHA / SUBSTITUIÇÃO':'SUA FICHA'}</p>
            <h2>{replacement?'Revisar a substituição':'Adicionar um movimento'}</h2></div>
          <button type="button" disabled={saving!==null} onClick={()=>setSelected(null)} aria-label="Fechar"><X size={20}/></button>
        </div>
        <p>{replacement?'Confira o movimento escolhido. O grupo muscular acompanha o novo exercício.':'Personalize o nome usado na ficha. A imagem continuará vinculada ao movimento escolhido.'}</p>
        <label className="foco-atlas-form-field">Nome que você escolheu
          <input value={ownName} onChange={e=>setOwnName(e.target.value)} maxLength={100} autoComplete="off"
            placeholder="Ex.: supino reto com barra" aria-label="Nome personalizado do exercício"/>
        </label>
        {replacement?<p className="text-sm">Grupo muscular: <strong>{repdbWorkoutGroup(selected)}</strong></p>:<label className="foco-atlas-form-field">Grupo muscular da sua ficha
          <select value={ownGroup} onChange={e=>setOwnGroup(e.target.value)} aria-label="Grupo muscular">
            {['Geral','Peito','Costas','Ombros','Braços','Bíceps','Tríceps','Antebraços','Pernas','Quadríceps','Posteriores','Glúteos','Panturrilhas','Abdômen','Cardio'].map(group=><option key={group} value={group}>{group}</option>)}
          </select>
        </label>}
        {!replacement&&<fieldset className="foco-atlas-days"><legend>Dia do treino</legend>
          <div>{TRAINING_DAYS.map(day=><button key={day.value} type="button"
            aria-pressed={ownDay===day.value} onClick={()=>{setOwnDay(day.value);savePreferredTrainingDay(day.value);}}>
            {day.shortLabel}</button>)}</div>
        </fieldset>}
        {notice?.type==='error'&&<p role="alert" className="foco-atlas-form-error">{notice.text}</p>}
        {plansError&&<p role="alert" className="foco-atlas-form-error">{plansError}</p>}
        {replacement?<div className="foco-atlas-plan-list">
          <p><strong>Atual:</strong> {original?.exercise_name||'Exercício indisponível'}</p>
          <p><strong>Novo:</strong> {ownName}</p>
          {original&&<p>Dia: {original.training_day?getTrainingDayLabel(original.training_day):'todos os dias'} · {original.sets} séries · {original.reps_min}–{original.reps_max} repetições · {original.rest_seconds}s de pausa.</p>}
          <p>A carga inicial do novo movimento será zero para você ajustar. Confira se as séries, repetições e pausas são adequadas ao exercício escolhido.</p>
          <p>Ao confirmar, a nova versão fica ativa. A ficha anterior e os registros de treino permanecem no histórico.</p>
          <button type="button" disabled={saving!==null||!original} onClick={()=>void confirmReplacement()}>
            <RotateCcw size={18}/><span>{saving?'Salvando nova versão…':'Substituir e ativar nova versão'}</span>
          </button>
        </div>:plans.length?<div className="foco-atlas-plan-list">
          <h3>Escolha a ficha</h3>
          {plans.map(plan=><button key={plan.id} type="button" disabled={saving!==null}
            onClick={()=>void addToPlan(plan)}><CheckCircle2 size={18}/><span>{plan.name}
              <small>{plan.exercises?.length||0} exercícios · {plan.status==='ativo'?'Ficha ativa':'Ficha salva'}</small></span>
              <Plus size={18}/></button>)}
        </div>:<div className="foco-atlas-plan-list"><p>Ainda não tem uma ficha disponível.</p>
          <button type="button" onClick={()=>{setSelected(null);setActiveTab('novo-treino');}}>Criar ficha <Plus size={18}/></button>
        </div>}
        <p className="foco-atlas-credit">O nome, o grupo e o identificador da mídia são salvos na sua ficha. <a href={REPDB_CREDIT_URL} target="_blank" rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a>.</p>
      </div>
    </AccessibleDialog>}
  </div>;
};
