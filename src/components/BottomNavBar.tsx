import React from 'react';
import { BookOpen, ChartNoAxesColumnIncreasing, Dumbbell, House } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onStartSession: () => void;
}
export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab, onStartSession }) => {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: House },
    { id: 'sessao', label: 'Treinar', icon: Dumbbell },
    { id: 'biblioteca', label: 'Exercícios', icon: BookOpen },
    { id: 'progresso', label: 'Evolução', icon: ChartNoAxesColumnIncreasing },
  ];
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A0A0A]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] md:hidden">
      <div className="mx-auto grid h-[72px] max-w-xl grid-cols-4 gap-1 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id || (tab.id === 'sessao' && activeTab === 'treinos');
          return (
            <button type="button" key={tab.id} aria-current={selected ? 'page' : undefined}
              aria-label={tab.label} onClick={() => tab.id === 'sessao' ? onStartSession() : setActiveTab(tab.id)}
              className={'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl transition active:scale-[0.97] ' +
                (selected ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white')}>
              <Icon className="h-5 w-5" strokeWidth={selected ? 2.5 : 1.8} aria-hidden="true" />
              <span className={'text-xs ' + (selected ? 'font-bold' : 'font-medium')}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
