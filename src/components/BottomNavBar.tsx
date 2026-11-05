import React from 'react';
import { ChartNoAxesColumnIncreasing, Dumbbell, House, CalendarDays, UserRound } from 'lucide-react';

interface BottomNavBarProps {
  activeTab:string;
  setActiveTab:(tab:string)=>void;
  onStartSession:()=>void;
}
/** Five native-feeling routes matching the approved FOCO mobile navigation. */
export const BottomNavBar:React.FC<BottomNavBarProps>=({activeTab,setActiveTab})=>{
  const tabs=[
    {id:'dashboard',label:'Início',icon:House},
    {id:'sessao',label:'Treinar',icon:Dumbbell},
    {id:'progresso',label:'Evolução',icon:ChartNoAxesColumnIncreasing},
    {id:'treinos',label:'Agenda',icon:CalendarDays},
    {id:'perfil',label:'Perfil',icon:UserRound},
  ] as const;
  const route=(tab:string)=>setActiveTab(tab);
  return <nav aria-label="Navegação principal" className="foco-v4-tabbar foco-motion-nav md:hidden">
    <div className="mx-auto grid max-w-xl grid-cols-5 gap-0.5 px-1">
      {tabs.map(({id,label,icon:Icon})=>{
        const selected=activeTab===id ||
          (id==='sessao'&&['detalhes','biblioteca','novo-treino','cardio'].includes(activeTab))||
          (id==='treinos'&&['revisao'].includes(activeTab))||
          (id==='progresso'&&['arquivos','historico'].includes(activeTab))||
          (id==='perfil'&&['anamnese','configuracoes','objetivos'].includes(activeTab));
        return <button type="button" key={id} onClick={()=>route(id)} aria-current={selected?'page':undefined}
          aria-label={label} className={'foco-v4-tab '+(selected?'foco-v4-tab-active':'')}>
          <Icon strokeWidth={selected?2.4:1.65} aria-hidden="true"/>
          <span>{label}</span>
        </button>;
      })}
    </div>
  </nav>;
};
