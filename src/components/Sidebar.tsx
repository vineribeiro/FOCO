import React from 'react';
import {
  LayoutDashboard,
  PlayCircle,
  Dumbbell,
  Sparkles,
  History,
  RotateCcw,
  FileUp,
  LineChart,
  Target,
  User,
  Settings,
  Layers,
  X,
} from 'lucide-react';
import { FocoSymbol } from './FocoBrand';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sessao', label: 'Sessão Ativa', icon: PlayCircle },
    { id: 'identidade', label: 'Identidade da Marca', icon: Layers, highlight: true },
    { id: 'treinos', label: 'Fichas & Planos', icon: Dumbbell },
    { id: 'novo-treino', label: 'Montar com IA', icon: Sparkles },
    { id: 'revisao', label: 'Ciclo 15 / 30 Dias', icon: RotateCcw },
    { id: 'arquivos', label: 'Digitalizar Ficha', icon: FileUp },
    { id: 'historico', label: 'Histórico de Treinos', icon: History },
    { id: 'progresso', label: 'Evolução & Gráficos', icon: LineChart },
    { id: 'objetivos', label: 'Metas & Foco', icon: Target },
    { id: 'perfil', label: 'Perfil do Atleta', icon: User },
    { id: 'configuracoes', label: 'Configurações & BD', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 z-50 md:z-30 h-screen md:h-[calc(100vh-4rem)] w-64 bg-[#0A0A0A] border-r border-white/10 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-4 space-y-6">
          
          {/* Mobile Header */}
          <div className="flex items-center justify-between md:hidden pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FocoSymbol className="w-5 h-5 text-white" />
              <span className="font-black text-white tracking-[0.2em] uppercase text-sm">FOCO</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black shadow-sm font-black'
                      : item.highlight
                      ? 'text-white bg-white/5 border border-white/10 hover:bg-white/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-black' : 'text-neutral-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Training Engine Status Footer */}
          <div className="pt-4 border-t border-white/10 mt-auto">
            <div className="p-3.5 rounded-xl bg-[#141414] border border-white/10 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">
                  FOCO EM EVOLUIR.
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
                PostgreSQL persistente & Gemini 2.5 Flash.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
