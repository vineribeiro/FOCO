import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Dumbbell,Search,X,Plus,SlidersHorizontal,Image as ImageIcon} from 'lucide-react';
import {AccessibleDialog} from './AccessibleDialog';
import {ExerciseIllustration} from './ExerciseIllustration';
import {repdbLabel as label,repdbEquipmentLabel} from '../data/repdbLocale';
import {repdbMediaReview} from '../data/repdbMediaReview';
import {FOCO_HUMAN_MEDIA} from '../data/focoHumanMedia';
import type {RepDBPortugueseCopy} from '../data/repdbInstructionsPtBR';
import {
  loadRepDBCatalog,repdbDisplayName,repdbImagePoses,normalizeRepDBName,repdbSearchTerms,loadRepDBPortugueseCopy,
  REPDB_CREDIT_TEXT,REPDB_CREDIT_URL,type RepDBExercise,
} from '../data/repdbAssets';

const PER_PAGE=24;
interface Props{onUseExercise:(exercise:RepDBExercise)=>void}

/** One library, locally filtered, with versioned PT-BR and exact media IDs. */
export const RepDBCatalogBrowser:React.FC<Props>=({onUseExercise})=>{
 const [catalog,setCatalog]=useState<RepDBExercise[]>([]);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [term,setTerm]=useState('');
 const [group,setGroup]=useState('all');
 const [page,setPage]=useState(1);
 const [humanOnly,setHumanOnly]=useState(()=>new URLSearchParams(window.location.search).get('media')==='foco');
 const [detail,setDetail]=useState<RepDBExercise|null>(null);
 const [copy,setCopy]=useState<RepDBPortugueseCopy|null>(null);
 const [copyStatus,setCopyStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [copyRetry,setCopyRetry]=useState(0);
 useEffect(()=>{
  let active=true;setCopy(null);setCopyStatus('loading');
  if(detail)void loadRepDBPortugueseCopy(detail.id).then(value=>{if(active){setCopy(value);setCopyStatus('ready');}}).catch(()=>{if(active)setCopyStatus('error');});
  return()=>{active=false;};
 },[detail?.id,copyRetry]);
 const load=()=>{
  setStatus('loading');
  void loadRepDBCatalog().then(items=>{setCatalog(items);setStatus('ready');})
   .catch(()=>setStatus('error'));
 };
 useEffect(()=>{let active=true;loadRepDBCatalog().then(items=>{
   if(active){setCatalog(items);setStatus('ready');}
 }).catch(()=>{if(active)setStatus('error');});
 return ()=>{active=false};},[]);
 const groups=useMemo(()=>[...new Set(catalog.map(item=>item.body_part||'Geral'))]
   .sort((a,b)=>label(a).localeCompare(label(b),'pt-BR')),[catalog]);
 const matches=useMemo(()=>{
  const q=normalizeRepDBName(term.trim());
  return catalog.filter(item=>{
    if(humanOnly&&!FOCO_HUMAN_MEDIA[item.id])return false;
    if(group!=='all'&&item.body_part!==group)return false;
    if(!q)return true;
    return repdbSearchTerms(item).some(value=>normalizeRepDBName(value).includes(q));
  }).sort((a,b)=>repdbDisplayName(a).localeCompare(repdbDisplayName(b),'pt-BR'));
 },[catalog,term,group,humanOnly]);
 const totalPages=Math.max(1,Math.ceil(matches.length/PER_PAGE));
 const visible=matches.slice((page-1)*PER_PAGE,page*PER_PAGE);
 const changeSearch=(value:string)=>{setTerm(value);setPage(1)};
 const changeGroup=(value:string)=>{setGroup(value);setPage(1)};
 return <section className="foco-atlas-external foco-atlas-single foco-repdb-library" aria-label="Biblioteca RepDB">
  <div className="foco-atlas-external-top foco-repdb-library-head">
    <div><span className="foco-atlas-kicker">FOCO ATLAS / MOVIMENTOS</span>
      <h2>Movimento.<br/><span>Com precisão.</span></h2>
      <p>Movimentos em português, com posições para conferir. Explore as ilustrações humanas do FOCO e a coleção RepDB.</p>
    </div>
    <span className="foco-atlas-beta-pill">FOCO / MOVIMENTOS</span>
  </div>
  <div className="foco-repdb-search-row">
    <label className="foco-atlas-search">
      <Search size={19} aria-hidden="true"/>
      <input aria-label="Pesquisar exercícios" value={term} maxLength={90}
        onChange={e=>changeSearch(e.target.value)} placeholder="Busque por nome, grupo ou equipamento"/>
      {term&&<button type="button" onClick={()=>changeSearch('')} aria-label="Limpar pesquisa"><X size={17}/></button>}
    </label>
    <div className="foco-repdb-search-visual" aria-hidden="true"><SlidersHorizontal size={19}/></div>
  </div>
  {status==='loading'&&<div className="foco-atlas-loading" role="status">
    <ImageIcon size={21}/> Preparando o catálogo de exercícios...
  </div>}
  {status==='error'&&<div className="foco-atlas-alert" role="alert"><span>Não foi possível consultar as imagens RepDB. As fichas e o histórico continuam preservados.</span>
    <button type="button" onClick={load}>Tentar novamente</button></div>}
  {status==='ready'&&<>
    <div className="foco-atlas-results-heading">
      <div><strong>{matches.length.toLocaleString('pt-BR')} movimentos</strong>
        <span>{catalog.length.toLocaleString('pt-BR')} exercícios na coleção • 24 por página</span></div>
      <button type="button" className="foco-human-filter" aria-pressed={humanOnly}
        onClick={()=>{setHumanOnly(value=>!value);setPage(1);}}>Imagens FOCO · {Object.keys(FOCO_HUMAN_MEDIA).length}</button>
    </div>
    <div className="foco-atlas-filters" role="group" aria-label="Filtrar grupo muscular">
      <button type="button" onClick={()=>changeGroup('all')} aria-pressed={group==='all'}>Todos</button>
      {groups.map(g=><button type="button" key={g} onClick={()=>changeGroup(g)}
        aria-pressed={group===g}>{label(g)}</button>)}
    </div>
    {!visible.length?<div className="foco-atlas-empty" role="status">
      Nenhum movimento corresponde à pesquisa. Tente outro nome ou grupo muscular.
    </div>:<div className="foco-atlas-external-grid foco-repdb-grid">
      {visible.map((item,index)=>{
        const pose=repdbImagePoses(item)[0];
        return <article key={item.id} className="foco-atlas-exercise-card foco-repdb-exercise-card">
          <button type="button" className="foco-atlas-card-open"
            onClick={()=>setDetail(item)} aria-label={'Ver '+repdbDisplayName(item)}>
            <span className="foco-atlas-media-placeholder foco-repdb-card-image">
              {FOCO_HUMAN_MEDIA[item.id]?<ExerciseIllustration exerciseName={repdbDisplayName(item)} exerciseId={item.id} compact className="foco-human-library-thumb h-full w-full"/>:pose?<img loading="lazy" decoding="async" src={pose.url}
                alt={(pose.phase==='reference'?'Posição de referência':pose.phase==='peak'?'Posição final':'Posição inicial')+' de '+repdbDisplayName(item)}
                onError={event=>{event.currentTarget.style.display='none';}}/>:
                <Dumbbell size={30} strokeWidth={1.25}/>}
              <span className="foco-repdb-card-index">{String((page-1)*PER_PAGE+index+1).padStart(3,'0')}</span>
            </span>
            <span className="foco-atlas-card-copy">
              <span>{label(item.body_part)}</span>
              <strong>{repdbDisplayName(item)}</strong>
              <small>{repdbEquipmentLabel(item)}</small>
            </span>
          </button>
        </article>;
      })}
    </div>}
    <nav className="foco-atlas-pagination" aria-label="Páginas da biblioteca">
      <button type="button" disabled={page===1} onClick={()=>setPage(x=>Math.max(1,x-1))}>
        <ArrowLeft size={16}/> Anterior</button>
      <span aria-live="polite">{page} / {totalPages}</span>
      <button type="button" disabled={page===totalPages} onClick={()=>setPage(x=>Math.min(totalPages,x+1))}>
        Próxima <ArrowRight size={16}/></button>
    </nav>
  </>}
  <p className="foco-atlas-credit">Ilustrações FOCO criadas com IA, identificadas por exercício. Dados e demais imagens: <a href={REPDB_CREDIT_URL} target="_blank"
    rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a>. Biblioteca gratuita, com atribuição. As posições disponíveis são estáticas e não substituem orientação profissional.</p>
  {detail&&<AccessibleDialog size="lg" title={'Exercício: '+repdbDisplayName(detail)} onClose={()=>setDetail(null)}>
    <div className="foco-atlas-modal foco-repdb-detail">
      <div className="foco-atlas-modal-head">
        <div><span className="foco-atlas-kicker">FOCO / EXECUÇÃO</span>
          <h2>{repdbDisplayName(detail)}</h2></div>
        <button type="button" aria-label="Fechar" onClick={()=>setDetail(null)}><X size={19}/></button>
      </div>
      <ExerciseIllustration exerciseName={repdbDisplayName(detail)} exerciseId={detail.id}
        presentation="editorial" interactive className="foco-repdb-dialog-art w-full"/>
      <div className="foco-atlas-meta">
        <div><span>Região</span><strong>{label(detail.body_part)}</strong></div>
        <div><span>Equipamento</span><strong>{repdbEquipmentLabel(detail)}</strong></div>
        <div><span>Músculos</span><strong>{(detail.primary_muscles||[]).map(label).join(', ')||'Não informado'}</strong></div>
      </div>
      {!FOCO_HUMAN_MEDIA[detail.id]&&repdbMediaReview(detail.id)&&<p className="foco-atlas-alert" role="status">{repdbMediaReview(detail.id)}</p>}
      {copyStatus==='loading'&&<p role="status">Carregando orientações em português...</p>}
      {copyStatus==='error'&&<div className="foco-atlas-alert" role="alert">Não foi possível abrir as orientações. <button type="button" onClick={()=>setCopyRetry(n=>n+1)}>Tentar novamente</button></div>}
      {copy&&<>
        <p className="text-sm leading-relaxed">{copy.description}</p>
        <section className="foco-atlas-steps" lang="pt-BR"><h3>Como executar</h3>
          <ol>{copy.instructions.map((line,i)=><li key={i}>{line}</li>)}</ol>
        </section>
        {copy.tips.length>0&&<section className="foco-atlas-steps"><h3>Cuidados e dicas</h3>
          <ul>{copy.tips.map((line,i)=><li key={i}>{line}</li>)}</ul>
        </section>}
      </>}
      {copyStatus==='ready'&&!copy&&<p role="status">As orientações desta variação estão em revisão de idioma.</p>}
      <button type="button" className="foco-atlas-open-foco" onClick={()=>{onUseExercise(detail);setDetail(null);}}>
        <Plus size={17}/> Adicionar à minha ficha
      </button>
      <p className="foco-atlas-credit">{detail.source==='foco'?'Exercício e ilustração de autoria FOCO.':<a href={REPDB_CREDIT_URL} target="_blank" rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a>} Posições estáticas.</p>
    </div>
  </AccessibleDialog>}
 </section>;
};
