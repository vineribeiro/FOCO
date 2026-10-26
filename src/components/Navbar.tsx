import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FocoSymbol, FocoLogoHorizontal } from './FocoBrand';
import { LogOut, Menu, Layers } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeTab, setActiveTab }) => {
  const { user, profile, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Mobile Menu & Official Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#141414] border border-white/20 flex items-center justify-center p-1.5 group-hover:border-white transition-colors">
              <FocoSymbol className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-[0.2em] text-white uppercase block leading-none font-sans">
                FOCO
              </span>
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-neutral-400">
                FITNESS PREMIUM
              </span>
            </div>
          </button>
        </div>

        {/* Center: Brand Manual Shortcut */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setActiveTab('identidade')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'identidade'
                ? 'bg-white text-black shadow-sm'
                : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Identidade Visual</span>
          </button>
        </div>

        {/* Right: User Profile & Logout */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveTab('perfil')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#141414] border border-white/20 flex items-center justify-center text-white font-black text-xs">
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-black uppercase text-white leading-tight truncate max-w-[120px]">
                    {user.full_name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono tabular-nums">
                    {profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : 'Atleta'}
                  </p>
                </div>
              </button>

              <button
                onClick={logout}
                title="Sair da conta"
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
