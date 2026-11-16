import React,{useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,Trash2,ArrowLeft,BookOpen} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {api} from '../services/api';
import {clearPersonalConversation,readPersonalConversation,savePersonalConversation,type PersonalMessage} from '../utils/personalConversation';

export const PersonalCoachPage:React.FC<{setActiveTab:(tab:string)=>void}>=({setActiveTab})=>{
 const {user}=useAuth();
 const [messages,setMessages]=useState<PersonalMessage[]>(()=>user?.id?readPersonalConversation(user.id):[]);
 const [question,setQuestion]=useState('');const [share,setShare]=useState(false);
 const [sending,setSending]=useState(false);const [error,setError]=useState('');const [storageWarning,setStorageWarning]=useState(false);
 const mounted=useRef(true);const input=useRef<HTMLTextAreaElement>(null);const answer=useRef<HTMLDivElement>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(messages.length)answer.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[messages.length]);
 const ask=async(event:React.FormEvent)=>{
  event.preventDefault();if(sending||!question.trim()||!user?.id)return;
  const text=question.trim();setSending(true);setError('');
  try{
   const result=await api.askPersonal({message:text,history:messages.slice(-8).map(m=>({role:m.role,content:m.content})),share_training_context:share});
   if(!mounted.current)return;
   const next:PersonalMessage[]=[...messages,{role:'user',content:text},{role:'assistant',content:result.answer,references:result.references,provider:result.ai_generation?.provider}];
   setMessages(next.slice(-24));setQuestion('');setStorageWarning(!savePersonalConversation(user.id,next));
  }catch(err){if(mounted.current)setError(err instanceof Error?err.message:'Não foi possível responder agora. Sua pergunta foi mantida.');}
  finally{if(mounted.current)setSending(false);}
 };
 return <div className="foco-v4-page foco-personal">
  <header className="foco-v6-mobile-title"><div className="foco-v6-title-left"><button type="button" className="foco-v6-icon-button" aria-label="Voltar ao início" onClick={()=>setActiveTab('dashboard')}><ArrowLeft size={18}/></button><h1>Personal FOCO</h1></div><MessageCircle aria-hidden="true"/></header>
  <section className="foco-personal-intro" data-tone="lilac"><h2>Qual é a sua dúvida?</h2><p>Pergunte sobre exercícios, descanso, progressão ou seus registros. Seu assistente usa o método FOCO para explicar e orientar sua revisão.</p><small>Assistente de IA. A avaliação presencial continua sendo necessária para ajustar técnica ou condições clínicas.</small></section>
  {!messages.length&&<div className="foco-personal-suggestions" aria-label="Ideias de perguntas">{['O que significa RIR no meu treino?','Como saber quando aumentar a carga?','Como está minha evolução nos registros?'].map(text=><button type="button" key={text} onClick={()=>{setQuestion(text);input.current?.focus();}}>{text}</button>)}</div>}
  <div className="foco-personal-conversation" role="log" aria-live="polite" aria-label="Conversa com o Personal FOCO" aria-relevant="additions">
   {messages.map((message,index)=><article key={index} className={'foco-personal-message is-'+message.role}>
    <strong>{message.role==='user'?'Você':'Personal FOCO'}</strong><p>{message.content}</p>
    {!!message.references?.length&&<details><summary><BookOpen size={14}/> Base FOCO · {message.references.map(r=>r.id).join(', ')}</summary>{message.references.map(ref=><p key={ref.id}><strong>{ref.id} · página {ref.page}</strong><br/>{ref.rule}</p>)}</details>}
    {message.provider&&<small>Resposta com {message.provider==='groq'?'Groq':'Gemini'}</small>}
   </article>)}
   <div ref={answer}/>
  </div>
  <form onSubmit={ask} className="foco-personal-form" aria-busy={sending}>
   <label className="foco-personal-share"><input type="checkbox" checked={share} disabled={sending} onChange={e=>setShare(e.target.checked)}/><span>Usar minha ficha ativa e os últimos treinos nesta pergunta</span></label>
   <label htmlFor="foco-personal-question">Sua pergunta</label>
   <textarea id="foco-personal-question" ref={input} value={question} maxLength={1200} rows={4} disabled={sending} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: preciso aumentar a carga se completei todas as repetições?" aria-describedby="foco-personal-cost"/>
   <div className="foco-personal-send"><small>{question.length}/1200</small><button type="submit" className="foco-v6-primary" disabled={sending||!question.trim()}><Send size={17}/>{sending?'Preparando resposta...':'Perguntar ao Personal'}</button></div>
   <p id="foco-personal-cost">Perguntas usam a cota de IA. Montar a ficha automática não consome créditos de IA.</p>
   {sending&&<p role="status">O Personal está preparando a resposta.</p>}
   {error&&<p role="alert">{error} Sua pergunta foi mantida.</p>}
   {storageWarning&&<p role="status">A resposta está na tela, mas este navegador não conseguiu guardar a conversa.</p>}
  </form>
  <footer className="foco-personal-footer"><span>Conversa salva nesta aba por até 24 horas.</span><button type="button" disabled={sending||!messages.length} onClick={()=>{if(user?.id)clearPersonalConversation(user.id);setMessages([]);setError('');}}><Trash2 size={15}/> Limpar conversa</button></footer>
 </div>;
};
