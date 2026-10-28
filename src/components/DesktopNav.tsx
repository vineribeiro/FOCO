import React from 'react';
import { BookOpen, ChartNoAxesColumnIncreasing, ClipboardList, Dumbbell, FileUp, House, ScanLine, Settings2, Sparkles, Target, UserRound } from 'lucide-react';
import { FocoLogoVertical } from './FocoBrand';

interface DesktopNavProps {
  activeTab: string;
  navigate: (tab: string) => void;
}
const primary = [
  { id: 'dashboard', label: 'Início', icon: House },
  { id: 'sessao', label: 'Treinar', icon: Dumbbell },
  { id: 'progresso', label: 'Minha evolução', icon: ChartNoAxesColumnIncreasing },
  { id: 'biblioteca', label: 'Biblioteca', icon: BookOpen },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
];
const tools = [
  { id: 'treinos', label: 'Minhas fichas', icon: ClipboardList },
  { id: 'novo-treino', label: 'Nova ficha com IA', icon: Sparkles },
  { id: 'arquivos', label: 'Avaliação OKOK', icon: ScanLine },
  { id: 'anamnese', label: 'Anamnese', icon: FileUp },
  { id: 'objetivos', label: 'Meus objetivos', icon: Target },
];

export const DesktopNav: React.FC<DesktopNavProps> = ({ activeTab, navigate }) => (
  <aside aria-label="Navegação do FOCO" className="hidden md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto w-60 shrink-0 flex-col border-r border-white/10 bg-[#0D0D0D] px-4 py-6 lg:w-64">
    <div className="mb-10 px-2"><FocoLogoVertical symbolSize="w-11 h-10" showSlogan /></div>
    <nav aria-label="Principal" className="space-y-1">
      {primary.map(({ id, label, icon: Icon }) => {
        const selected = activeTab === id
          || (id === 'sessao' && ['treinos', 'novo-treino', 'revisao'].includes(activeTab))
          || (id === 'progresso' && ['arquivos', 'historico'].includes(activeTab))
          || (id === 'biblioteca' && ['musculos', 'atlas'].includes(activeTab))
          || (id === 'perfil' && ['configuracoes', 'anamnese', 'objetivos'].includes(activeTab));
        return <button key={id} type="button" onClick={() => navigate(id)} aria-current={selected ? 'page' : undefined}
          className={'foco-nav-item ' + (selected ? 'foco-nav-item-active' : '')}>
          <Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span>
        </button>;
      })}
    </nav>
    <p className="foco-eyebrow mt-8 mb-2 px-3">Seu planejamento</p>
    <nav aria-label="Planejamento" className="space-y-1">
      {tools.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => { if (id === 'arquivos') { try { sessionStorage.setItem('foco_upload_mode', 'body'); } catch { /* no storage */ } } navigate(id); }} aria-current={activeTab === id ? 'page' : undefined}
          className={'foco-nav-item ' + (activeTab === id ? 'foco-nav-item-active' : '')}>
          <Icon className="h-4 w-4" aria-hidden="true" /><span>{label}</span>
        </button>
      ))}
    </nav>
    <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
      <button type="button" onClick={() => navigate('perfil')} className="foco-nav-item">
        <UserRound className="h-4 w-4" aria-hidden="true" />Meu perfil
      </button>
      <button type="button" onClick={() => navigate('configuracoes')} className="foco-nav-item">
        <Settings2 className="h-4 w-4" aria-hidden="true" />Configurações
      </button>
    </div>
  </aside>
);
