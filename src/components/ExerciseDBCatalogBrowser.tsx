import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Dumbbell,LoaderCircle,Play,Search,X,Plus} from 'lucide-react';
import {AccessibleDialog} from './AccessibleDialog';
import {browseExerciseDB,EXERCISEDB_PAGE_SIZE,type ExternalExercise,type ExternalExercisePage} from '../data/exerciseDbCatalog';
import {candidateExerciseDBNames} from '../data/exerciseDbBeta';

interface Props { onUseExercise:(exercise:ExternalExercise)=>void }
const BODY_PT:Record<string,string>={
  chest:'Peito',back:'Costas',shoulders:'Ombros',waist:'Abdômen','upper arms':'Braços',
  'lower arms':'Antebraços','upper legs':'Pernas','lower legs':'Panturrilhas',
  cardio:'Cardio',neck:'Pescoço'
};
const pt=(name:string)=>BODY_PT[name.toLowerCase()]||name;

/** Sole visual exercise catalogue. Third-party content stays in component memory only. */
export const ExerciseDBCatalogBrowser:React.FC<Props>=({onUseExercise})=>{
  const [search,setSearch]=useState('');
  const [query,setQuery]=useState('');
  const [list,setList]=useState<Extract<ExternalExercisePage,{state:'ok'}>|null>(null);
  const [page,setPage]=useState(1);
  const [cursors,setCursors]=useState<Array<string|null>>([null]);
  const [muscle,setMuscle]=useState('all');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [detail,setDetail]=useState<ExternalExercise|null>(null);
  const [showGif,setShowGif]=useState(false);
  const [gifFailed,setGifFailed]=useState(false);
  const [viewKey,setViewKey]=useState(0);
  const requestId=useRef(0),controller=useRef<AbortController|null>(null);

  useEffect(()=>()=>{requestId.current++;controller.current?.abort();},[]);
  const fetchPage=async(term:string,after:string|null,targetPage:number)=>{
    const id=++requestId.current;
    controller.current?.abort();
    const request=new AbortController();
    controller.current=request;
    setLoading(true);setError('');
    const result=await browseExerciseDB({query:term,after,signal:request.signal});
    if(id!==requestId.current||request.signal.aborted)return;
    setLoading(false);
    if(result.state!=='ok'){
      setError(result.state==='rate_limited'
        ? 'A ExerciseDB atingiu o limite de consultas. Tenta novamente depois.'
        : 'Não foi possível acessar a ExerciseDB agora. Verifica tua conexão ou tenta novamente.');
      return;
    }
    if(targetPage>1&&result.exercises[0]?.exerciseId===list?.exercises[0]?.exerciseId){
      setError('O servidor repetiu a página anterior. A navegação foi interrompida para evitar duplicação.');
      return;
    }
    setList(result);setQuery(term);setPage(targetPage);setMuscle('all');setViewKey(k=>k+1);
    setDetail(null);setShowGif(false);
    setCursors(current=>{
      const next=targetPage===1?[null]:current.slice(0,targetPage);
      next[targetPage]=result.nextCursor;
      return next;
    });
  };
  const submit=(event:React.FormEvent)=>{
    event.preventDefault();
    const term=search.trim();
    const resolved=term?candidateExerciseDBNames(term)[0]||term:'';
    void fetchPage(resolved,null,1);
  };
  const muscles=useMemo(()=>list?[...new Set(list.exercises.flatMap(e=>e.bodyParts))].sort():[],[list]);
  const shown=list?.exercises.filter(e=>muscle==='all'||e.bodyParts.includes(muscle))||[];
  return <section className="foco-atlas-external foco-atlas-single" aria-label="Biblioteca ExerciseDB">
    <div className="foco-atlas-external-top">
      <div><span className="foco-atlas-kicker">CATÁLOGO DE MOVIMENTOS / ASCENDAPI</span>
        <h2>ExerciseDB</h2>
        <p>Uma biblioteca única para consultar execução, músculos e equipamentos. Busca ao vivo, sem duplicar imagens.</p>
      </div>
      <span className="foco-atlas-beta-pill">USO NÃO COMERCIAL</span>
    </div>
    <form className="foco-atlas-search" onSubmit={submit} role="search">
      <Search size={19} aria-hidden="true"/>
      <input aria-label="Buscar exercícios na ExerciseDB" value={search} maxLength={80}
        onChange={e=>setSearch(e.target.value)} placeholder="Ex.: supino reto, leg press, squat..." />
      {search&&<button type="button" onClick={()=>setSearch('')} aria-label="Limpar pesquisa"><X size={17}/></button>}
      <button type="submit" className="foco-atlas-search-submit" disabled={loading}>Buscar</button>
    </form>
    {!list&&!loading&&!error&&<div className="foco-atlas-first">
      <div className="foco-atlas-first-icon"><Dumbbell size={31}/></div>
      <h3>Explore todos os exercícios</h3>
      <p>Consulta o catálogo completo por páginas. Pesquisa por nome, inclusive alguns nomes em português.</p>
      <button type="button" onClick={()=>void fetchPage('',null,1)}>Explorar ExerciseDB <ArrowRight size={17}/></button>
    </div>}
    {error&&<div className="foco-atlas-alert" role="alert"><span>{error}</span>
      <button type="button" onClick={()=>void fetchPage(query,cursors[page-1]||null,page)}>Tentar novamente</button></div>}
    {loading&&<div className="foco-atlas-loading" role="status"><LoaderCircle size={22} className="animate-spin"/> Carregando exercícios...</div>}
    {list&&<>
      <div className="foco-atlas-results-heading">
        <div><strong>{list.total===null?'Catálogo ExerciseDB':list.total.toLocaleString('pt-BR')+' exercícios encontrados'}</strong>
          <span>Página {page} · até {EXERCISEDB_PAGE_SIZE} movimentos</span></div>
        <span className="foco-atlas-remote-label">Dados em tempo real</span>
      </div>
      {muscles.length>1&&<div role="group" aria-label="Filtrar grupo muscular nesta página" className="foco-atlas-filters">
        <button type="button" onClick={()=>setMuscle('all')} aria-pressed={muscle==='all'}>Todos nesta página</button>
        {muscles.map(m=><button type="button" key={m} aria-pressed={muscle===m} onClick={()=>setMuscle(m)}>{pt(m)}</button>)}
      </div>}
      {shown.length===0?<div className="foco-atlas-empty">Nenhum exercício neste filtro. Seleciona outro grupo ou página.</div>:
      <div className="foco-atlas-external-grid" key={viewKey}>
        {shown.map(item=><article key={item.exerciseId} className="foco-atlas-exercise-card">
          <button type="button" className="foco-atlas-card-open"
            onClick={()=>{setDetail(item);setShowGif(false);setGifFailed(false);}}
            aria-label={'Abrir exercício '+item.name}>
            <span className="foco-atlas-media-placeholder"><Dumbbell size={39} strokeWidth={1.35} aria-hidden="true"/>
              <span>GIF DISPONÍVEL NOS DETALHES</span></span>
            <span className="foco-atlas-card-copy"><span>{item.bodyParts.map(pt).join(' · ')||'Exercício'}</span>
              <strong>{item.name}</strong>
              <small>{item.equipments.join(' · ')||'Equipamento não informado'}</small></span>
          </button>
        </article>)}
      </div>}
      <nav className="foco-atlas-pagination" aria-label="Paginação ExerciseDB">
        <button type="button" disabled={loading||page<=1}
          onClick={()=>void fetchPage(query,cursors[page-2]||null,page-1)}><ArrowLeft size={16}/> Anterior</button>
        <span aria-live="polite">Página {page}</span>
        <button type="button" disabled={loading||!list.hasNext}
          onClick={()=>void fetchPage(query,list.nextCursor,page+1)}>Próxima <ArrowRight size={16}/></button>
      </nav>
    </>}
    <p className="foco-atlas-credit">Dados, descrições e mídia: <a href="https://oss.exercisedb.dev/docs" target="_blank" rel="noopener noreferrer">ExerciseDB / AscendAPI</a>. Uso não comercial. GIFs carregados somente por solicitação, sem armazenamento permanente.</p>
    {detail&&<AccessibleDialog size="lg" title={'ExerciseDB: '+detail.name} onClose={()=>{setDetail(null);setShowGif(false);}}>
      <div className="foco-atlas-modal">
        <div className="foco-atlas-modal-head">
          <div><span className="foco-atlas-kicker">EXERCISEDB / MOVIMENTO</span><h2>{detail.name}</h2></div>
          <button type="button" onClick={()=>{setDetail(null);setShowGif(false);}} aria-label="Fechar exercício"><X size={19}/></button>
        </div>
        <div className="foco-atlas-media-detail">
          {!showGif?<button type="button" className="foco-atlas-play" disabled={!detail.gifUrl}
            onClick={()=>{setShowGif(true);setGifFailed(false);}}><Play size={19} fill="currentColor"/>
            {detail.gifUrl?'Carregar GIF de demonstração':'GIF não disponível'}</button>
          :gifFailed?<div role="status">O GIF não carregou.
            <button type="button" onClick={()=>{setShowGif(false);setGifFailed(false);}}>Tentar novamente</button></div>
          :<><img src={detail.gifUrl||''} alt={'Demonstração animada de '+detail.name}
              referrerPolicy="no-referrer" decoding="async" onError={()=>setGifFailed(true)}/>
            <button className="foco-atlas-hide" type="button" onClick={()=>setShowGif(false)}>Ocultar GIF</button></>}
        </div>
        <div className="foco-atlas-meta">
          <div><span>Região</span><strong>{detail.bodyParts.map(pt).join(', ')||'Não informada'}</strong></div>
          <div><span>Músculos</span><strong>{detail.targetMuscles.join(', ')||'Não informados'}</strong></div>
          <div><span>Equipamento</span><strong>{detail.equipments.join(', ')||'Não informado'}</strong></div>
        </div>
        <section className="foco-atlas-steps"><h3>Instruções fornecidas pela ExerciseDB (inglês)</h3>
          {detail.instructions.length?<ol>{detail.instructions.map((line,i)=><li key={i}>{line}</li>)}</ol>
            :<p>Sem instruções disponíveis para este movimento.</p>}
        </section>
        <button type="button" className="foco-atlas-open-foco" onClick={()=>{onUseExercise(detail);setDetail(null);setShowGif(false);}}>
          <Plus size={17}/> Usar como referência para minha ficha
        </button>
        <p className="foco-atlas-credit">Fonte: <a href="https://oss.exercisedb.dev/docs" target="_blank" rel="noopener noreferrer">ExerciseDB / AscendAPI</a> · GIF externo 180p.</p>
      </div>
    </AccessibleDialog>}
  </section>;
};
