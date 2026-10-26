import React from 'react';
import {
  Dumbbell,
  Activity,
  Play,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onStartSession: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  setActiveTab,
  onStartSession,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Treino', icon: Dumbbell },
    { id: 'musculos', label: 'Músculos 3D', icon: Activity },
    { id: 'sessao', label: 'Iniciar', icon: Play, isCenterAction: true },
    { id: 'ia-lab', label: 'IA & Fichas', icon: Sparkles },
    { id: 'progresso', label: 'Evolução', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#000000]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenterAction) {
            return (
              <div key={tab.id} className="flex justify-center -mt-5">
                <button
                  onClick={() => {
                    setActiveTab('sessao');
                    onStartSession();
                  }}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 border-2 border-[#000000] active:scale-95 transition-all cursor-pointer"
                  title="Iniciar Treino Agora"
                >
                  <Play className="w-6 h-6 fill-current ml-0.5 text-black" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-white' : 'stroke-[1.8] text-neutral-500'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-black uppercase tracking-tight ${
                  isActive ? 'text-white' : 'text-neutral-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
