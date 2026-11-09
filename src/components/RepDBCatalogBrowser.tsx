import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Dumbbell,Search,X,Plus,SlidersHorizontal,Image as ImageIcon} from 'lucide-react';
import {AccessibleDialog} from './AccessibleDialog';
import {ExerciseIllustration} from './ExerciseIllustration';
import {
  loadRepDBCatalog,repdbDisplayName,repdbImageUrls,normalizeRepDBName,
  REPDB_CREDIT_TEXT,REPDB_CREDIT_URL,type RepDBExercise,
} from '../data/repdbAssets';

const PER_PAGE=24;
const GROUPS:Record<string,string>={
 chest:'Peito',back:'Costas',shoulders:'Ombros',arms:'Braços',biceps:'Bíceps',
 triceps:'Tríceps',legs:'Pernas',quadriceps:'Quadríceps',hamstrings:'Posteriores',
 glutes:'Glúteos',calves:'Panturrilhas',abs:'Abdômen',core:'Core',abdominals:'Abdômen',
 forearms:'Antebraços',cardio:'Cardio',full_body:'Corpo inteiro','full body':'Corpo inteiro',
 stretching:'Alongamento',neck:'Pescoço',lower_back:'Lombar'
};
const label=(value:string|undefined)=>value ? GROUPS[value.toLowerCase()] || value.replace(/_/g,' ') : 'Geral';
interface Props{onUseExercise:(exercise:RepDBExercise)=>void}

/** One library: 701 original RepDB Free records, filtered locally, no GIF/API paging. */
export const RepDBCatalogBrowser:React.FC<Props>=({onUseExercise})=>{
 const [catalog,setCatalog]=useState<RepDBExercise[]>([]);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [term,setTerm]=useState('');
 const [group,setGroup]=useState('all');
 const [page,setPage]=useState(1);
 const [detail,setDetail]=useState<RepDBExercise|null>(null);
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
    if(group!=='all'&&item.body_part!==group)return false;
    if(!q)return true;
    return [item.name_en,repdbDisplayName(item),item.id,item.body_part||'',item.equipment||'',
      ...(item.primary_muscles||[])].some(value=>normalizeRepDBName(value).includes(q));
  }).sort((a,b)=>repdbDisplayName(a).localeCompare(repdbDisplayName(b),'pt-BR'));
 },[catalog,term,group]);
 const totalPages=Math.max(1,Math.ceil(matches.length/PER_PAGE));
 const visible=matches.slice((page-1)*PER_PAGE,page*PER_PAGE);
 const changeSearch=(value:string)=>{setTerm(value);setPage(1)};
 const changeGroup=(value:string)=>{setGroup(value);setPage(1)};
 return <section className="foco-atlas-external foco-atlas-single foco-repdb-library" aria-label="Biblioteca RepDB">
  <div className="foco-atlas-external-top foco-repdb-library-head">
    <div><span className="foco-atlas-kicker">FOCO ATLAS / MOVIMENTOS</span>
      <h2>Movimento.<br/><span>Com precisão.</span></h2>
      <p>Ilustrações uniformes, posição inicial e final. Encontra o movimento certo sem depender de GIFs ou consultas por exercício.</p>
    </div>
    <span className="foco-atlas-beta-pill">RE P DB / FREE</span>
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
      <span className="foco-atlas-remote-label">IMAGENS WEBP</span>
    </div>
    <div className="foco-atlas-filters" role="group" aria-label="Filtrar grupo muscular">
      <button type="button" onClick={()=>changeGroup('all')} aria-pressed={group==='all'}>Todos</button>
      {groups.map(g=><button type="button" key={g} onClick={()=>changeGroup(g)}
        aria-pressed={group===g}>{label(g)}</button>)}
    </div>
    {!visible.length?<div className="foco-atlas-empty" role="status">
      Nenhum movimento corresponde à pesquisa. Tenta outro nome ou grupo muscular.
    </div>:<div className="foco-atlas-external-grid foco-repdb-grid">
      {visible.map((item,index)=>{
        const image=repdbImageUrls(item)[0];
        return <article key={item.id} className="foco-atlas-exercise-card foco-repdb-exercise-card">
          <button type="button" className="foco-atlas-card-open"
            onClick={()=>setDetail(item)} aria-label={'Ver '+repdbDisplayName(item)}>
            <span className="foco-atlas-media-placeholder foco-repdb-card-image">
              {image?<img loading="lazy" decoding="async" src={image}
                alt={'Posição inicial de '+repdbDisplayName(item)}
                onError={event=>{event.currentTarget.style.display='none';}}/>:
                <Dumbbell size={30} strokeWidth={1.25}/>}
              <span className="foco-repdb-card-index">{String((page-1)*PER_PAGE+index+1).padStart(3,'0')}</span>
            </span>
            <span className="foco-atlas-card-copy">
              <span>{label(item.body_part)}</span>
              <strong>{repdbDisplayName(item)}</strong>
              <small>{label(item.equipment)||'Peso corporal'}</small>
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
  <p className="foco-atlas-credit">Imagens e dados: <a href={REPDB_CREDIT_URL} target="_blank"
    rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a>. Biblioteca gratuita, com atribuição. As duas poses são estáticas e não substituem orientação profissional.</p>
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
        <div><span>Equipamento</span><strong>{label(detail.equipment)}</strong></div>
        <div><span>Músculos</span><strong>{(detail.primary_muscles||[]).map(label).join(', ')||'Não informado'}</strong></div>
      </div>
      {Boolean(detail.instructions_en?.length)&&<section className="foco-atlas-steps">
        <h3>Instruções da fonte (inglês)</h3>
        <ol>{detail.instructions_en!.map((line,i)=><li key={i}>{line}</li>)}</ol>
      </section>}
      <button type="button" className="foco-atlas-open-foco" onClick={()=>{onUseExercise(detail);setDetail(null);}}>
        <Plus size={17}/> Adicionar à minha ficha
      </button>
      <p className="foco-atlas-credit"><a href={REPDB_CREDIT_URL} target="_blank" rel="noopener noreferrer">{REPDB_CREDIT_TEXT}</a>. Poses estáticas sem animações artificiais.</p>
    </div>
  </AccessibleDialog>}
 </section>;
};
