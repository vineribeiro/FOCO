import React from 'react';
import { BookOpen, ChartNoAxesColumnIncreasing, Dumbbell, House, UserRound } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onStartSession: () => void;
}

/** Five-section navigation matching the approved FOCO premium mockups. */
export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: House },
    { id: 'treinos', label: 'Treinos', icon: Dumbbell },
    { id: 'progresso', label: 'Evolução', icon: ChartNoAxesColumnIncreasing },
    { id: 'biblioteca', label: 'Biblioteca', icon: BookOpen },
    { id: 'perfil', label: 'Perfil', icon: UserRound },
  ] as const;

  const navigate = (id: typeof tabs[number]['id']) => setActiveTab(id);

  return (
    <nav aria-label="Navegação principal" className="foco-v4-tabbar md:hidden">
      <div className="mx-auto grid h-[73px] max-w-xl grid-cols-5 gap-0.5 px-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id
            || (id === 'treinos' && ['sessao', 'novo-treino', 'revisao'].includes(activeTab))
            || (id === 'progresso' && ['arquivos', 'historico'].includes(activeTab))
            || (id === 'biblioteca' && ['musculos', 'atlas'].includes(activeTab))
            || (id === 'perfil' && ['configuracoes', 'anamnese', 'objetivos'].includes(activeTab));
          return (
            <button type="button" key={id} aria-current={selected ? 'page' : undefined}
              aria-label={label} onClick={() => navigate(id)}
              className={'foco-v4-tab transition active:scale-[.97] ' + (selected ? 'foco-v4-tab-active' : 'hover:text-white')}>
              <Icon strokeWidth={selected ? 2.5 : 1.7} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
