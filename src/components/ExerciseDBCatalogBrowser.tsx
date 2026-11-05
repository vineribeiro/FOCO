import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Dumbbell, LoaderCircle, Play, Search, X } from 'lucide-react';
import { AccessibleDialog } from './AccessibleDialog';
import { browseExerciseDB, EXERCISEDB_PAGE_SIZE, type ExternalExercise, type ExternalExercisePage } from '../data/exerciseDbCatalog';
import { candidateExerciseDBNames, normalizeExerciseDBName } from '../data/exerciseDbBeta';
import type { ExerciseCatalogItem } from '../data/exerciseLibrary';

type Props = { curated: ExerciseCatalogItem[]; onOpenCurated: (exercise: ExerciseCatalogItem) => void };
const BODY_PT: Record<string,string> = {
  chest:'Peito', back:'Costas', shoulders:'Ombros', waist:'Abdômen',
  'upper arms':'Braços', 'lower arms':'Antebraços', 'upper legs':'Pernas',
  'lower legs':'Panturrilhas', cardio:'Cardio', neck:'Pescoço',
};
const pt = (name: string) => BODY_PT[name.toLowerCase()] || name;

export const ExerciseDBCatalogBrowser: React.FC<Props> = ({ curated, onOpenCurated }) => {
  const [search,setSearch] = useState('');
  const [query,setQuery] = useState('');
  const [list,setList] = useState<Extract<ExternalExercisePage,{state:'ok'}>|null>(null);
  const [page,setPage] = useState(1);
  const [muscle,setMuscle] = useState('all');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [detail,setDetail] = useState<ExternalExercise|null>(null);
  const [showGif,setShowGif] = useState(false);
  const [gifFailed,setGifFailed] = useState(false);
  const seq=useRef(0), active=useRef<AbortController|null>(null);

  useEffect(()=>()=>{seq.current++;active.current?.abort();},[]);
  const fetchPage = async (term: string, requestedPage: number) => {
    const id=++seq.current;
    active.current?.abort();
    const controller=new AbortController();
    active.current=controller;
    setLoading(true);setError('');
    const result=await browseExerciseDB({query:term,page:requestedPage,signal:controller.signal});
    if(id!==seq.current||controller.signal.aborted)return;
    setLoading(false);
    if(result.state!=='ok'){
      setError(result.state==='rate_limited'
        ? 'O limite da API gratuita foi atingido. Aguarde antes de consultar novamente.'
        : 'Não foi possível consultar a ExerciseDB. A biblioteca do FOCO permanece disponível.');
      return;
    }
    if(requestedPage>1&&result.exercises.length>0&&result.exercises[0].exerciseId===list?.exercises[0]?.exerciseId){
      setError('O servidor repetiu a página anterior; a navegação foi interrompida para evitar resultados duplicados.');
      return;
    }
    setList(result);setPage(requestedPage);setQuery(term);setMuscle('all');setDetail(null);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const term=search.trim();
    // Only well-reviewed names from the FOCO catalogue get an English alias.
    const resolved=term ? candidateExerciseDBNames(term)[0]||term : '';
    void fetchPage(resolved,1);
  };
  const muscles=useMemo(()=>list?[...new Set(list.exercises.flatMap(e=>e.bodyParts))]
    .sort((a,b)=>a.localeCompare(b)):[],[list]);
  const filtered=list?.exercises.filter(e=>muscle==='all'||e.bodyParts.includes(muscle))||[];
  const matchingFOCO=useMemo(()=>{
    if(!detail)return null;
    const target=normalizeExerciseDBName(detail.name);
    const matches=curated.filter(x=>candidateExerciseDBNames(x.name)
      .some(name=>normalizeExerciseDBName(name)===target));
    return matches.length===1?matches[0]:null;
  },[detail,curated]);

  return <section className="foco-atlas-external" aria-label="Explorar catálogo ExerciseDB">
    <div className="foco-atlas-external-top">
      <div>
        <span className="foco-atlas-kicker">EXERCISEDB / ASCENDAPI</span>
        <h2>Explore novos movimentos</h2>
        <p>Catálogo externo em inglês. Consultas ao vivo, sem copiar GIFs ou alterar o histórico do FOCO.</p>
      </div>
      <span className="foco-atlas-beta-pill">BETA PESSOAL</span>
    </div>
    <form className="foco-atlas-search" onSubmit={submit} role="search">
      <Search size={18} aria-hidden="true"/>
      <input aria-label="Buscar exercícios na ExerciseDB" value={search} maxLength={80}
        onChange={event=>setSearch(event.target.value)} placeholder="Ex.: leg press, barbell curl..."/>
      {search&&<button type="button" onClick={()=>setSearch('')} aria-label="Limpar pesquisa"><X size={17}/></button>}
      <button className="foco-atlas-search-submit" disabled={loading} type="submit">Buscar</button>
    </form>
    {!list&&!loading&&!error&&<div className="foco-atlas-first">
      <div className="foco-atlas-first-icon"><Dumbbell size={31}/></div>
      <h3>Uma biblioteca inteira para explorar</h3>
      <p>Toque em explorar para consultar a primeira página. Use a busca para encontrar exercícios específicos.</p>
      <button type="button" onClick={()=>void fetchPage('',1)}>Explorar ExerciseDB <ArrowRight size={16}/></button>
    </div>}
    {error&&<div role="alert" className="foco-atlas-alert"><span>{error}</span><button type="button" onClick={()=>void fetchPage(query,page)}>Tentar novamente</button></div>}
    {loading&&<div role="status" className="foco-atlas-loading"><LoaderCircle size={23} className="animate-spin"/> Consultando a ExerciseDB...</div>}
    {list&&<>
      <div className="foco-atlas-results-heading">
        <div><strong>{list.total===null?'Resultados da página':list.total.toLocaleString('pt-BR')+' exercícios no resultado'}</strong>
          <span>Página {page} · até {EXERCISEDB_PAGE_SIZE} por consulta</span></div>
        <span className="foco-atlas-remote-label">Fonte externa</span>
      </div>
      {muscles.length>1&&<div className="foco-atlas-filters" role="group" aria-label="Filtrar resultados da página por região corporal">
        <button type="button" aria-pressed={muscle==='all'} onClick={()=>setMuscle('all')}>Todos nesta página</button>
        {muscles.map(part=><button type="button" key={part} aria-pressed={muscle===part} onClick={()=>setMuscle(part)}>{pt(part)}</button>)}
      </div>}
      {filtered.length===0?<div className="foco-atlas-empty">Não há exercícios neste filtro. Escolha outro grupo ou página.</div>:
      <div className="foco-atlas-external-grid">
        {filtered.map(item=><article key={item.exerciseId} className="foco-atlas-exercise-card">
          <button type="button" onClick={()=>{setDetail(item);setShowGif(false);setGifFailed(false);}}
            className="foco-atlas-card-open" aria-label={'Abrir exercício '+item.name}>
            <span className="foco-atlas-media-placeholder"><Dumbbell size={39} strokeWidth={1.4} aria-hidden="true"/><span>DEMONSTRAÇÃO DISPONÍVEL NO DETALHE</span></span>
            <span className="foco-atlas-card-copy"><span>{item.bodyParts.map(pt).join(' · ')||'Exercício'}</span>
              <strong>{item.name}</strong><small>{item.equipments.join(' · ')||'Equipamento não informado'}</small>
            </span>
          </button>
        </article>)}
      </div>}
      <div className="foco-atlas-pagination">
        <button type="button" disabled={loading||page<=1} onClick={()=>void fetchPage(query,page-1)}><ArrowLeft size={16}/> Anterior</button>
        <span aria-live="polite">Página {page}</span>
        <button type="button" disabled={loading||!list.hasNext} onClick={()=>void fetchPage(query,page+1)}>Próxima <ArrowRight size={16}/></button>
      </div>
    </>}
    <p className="foco-atlas-credit">Exercícios e GIFs por <a href="https://oss.exercisedb.dev/docs" target="_blank" rel="noreferrer noopener">ExerciseDB / AscendAPI</a>. Uso pessoal não comercial. A qualidade técnica das demonstrações deve ser conferida antes do treino.</p>
    {detail&&<AccessibleDialog size="lg" title={'ExerciseDB: '+detail.name} onClose={()=>setDetail(null)}>
      <div className="foco-atlas-modal">
        <div className="foco-atlas-modal-head"><div><span className="foco-atlas-kicker">EXERCISEDB / DEMONSTRAÇÃO</span><h2>{detail.name}</h2></div>
          <button type="button" onClick={()=>setDetail(null)} aria-label="Fechar exercício"><X size={20}/></button></div>
        <div className="foco-atlas-media-detail">
          {!showGif?<button type="button" className="foco-atlas-play" disabled={!detail.gifUrl}
            onClick={()=>{setShowGif(true);setGifFailed(false);}}><Play size={20} fill="currentColor"/>
            {detail.gifUrl?'Carregar GIF de demonstração':'GIF não disponível'}</button>
            :gifFailed?<div role="status">O GIF não carregou. <button type="button" onClick={()=>{setShowGif(false);setGifFailed(false);}}>Tentar novamente</button></div>
            :<><img src={detail.gifUrl||''} alt={'Animação da ExerciseDB: '+detail.name}
              referrerPolicy="no-referrer" decoding="async" onError={()=>setGifFailed(true)}/>
              <button type="button" className="foco-atlas-hide" onClick={()=>setShowGif(false)}>Ocultar GIF</button></>}
        </div>
        <div className="foco-atlas-meta">
          <div><span>Região</span><strong>{detail.bodyParts.map(pt).join(', ')||'Não informada'}</strong></div>
          <div><span>Músculos</span><strong>{detail.targetMuscles.join(', ')||'Não informados'}</strong></div>
          <div><span>Equipamento</span><strong>{detail.equipments.join(', ')||'Não informado'}</strong></div>
        </div>
        <section className="foco-atlas-steps"><h3>Orientações originais (inglês)</h3>
          {detail.instructions.length>0?<ol>{detail.instructions.map((s,i)=><li key={i}>{s}</li>)}</ol>
            :<p>O fornecedor não forneceu instruções para este exercício.</p>}
        </section>
        {matchingFOCO?<button type="button" className="foco-atlas-open-foco" onClick={()=>{onOpenCurated(matchingFOCO);setDetail(null);}}>
          Ver versão revisada no FOCO <ArrowRight size={16}/></button>
          :<p className="foco-atlas-no-import">Este movimento ainda não foi incorporado ao catálogo curado do FOCO. Para respeitar os termos do fornecedor, não armazenamos nomes, GIFs ou instruções externas nas fichas.</p>}
        <p className="foco-atlas-credit">Fonte: <a href="https://oss.exercisedb.dev/docs" target="_blank" rel="noreferrer noopener">ExerciseDB / AscendAPI</a> · GIF externo de 180p.</p>
      </div>
    </AccessibleDialog>}
  </section>;
};
