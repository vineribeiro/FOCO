/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DesktopNav } from './components/DesktopNav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestTimerProvider } from './context/RestTimerContext';
import { BottomNavBar } from './components/BottomNavBar';
import { RestTimerHUD } from './components/RestTimerHUD';
import { FocoSymbol, FocoLettering } from './components/FocoBrand';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ActiveSessionPage } from './pages/ActiveSessionPage';
import { AiLabPage } from './pages/AiLabPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { NewWorkoutPage } from './pages/NewWorkoutPage';
import { AnamnesisPage } from './pages/AnamnesisPage';
import { ProgressionReviewPage } from './pages/ProgressionReviewPage';
import { SheetUploadPage } from './pages/SheetUploadPage';
import { ProgressPage } from './pages/ProgressPage';
import { HistoryPage } from './pages/HistoryPage';
import { GoalsPage } from './pages/GoalsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { Settings } from 'lucide-react';
import { api } from './services/api';
import { InstallAppButton } from './components/InstallAppButton';
import { ExerciseLibraryPage } from './pages/ExerciseLibraryPage';
import { AnatomyStudioPage } from './pages/AnatomyStudioPage';

function MainApp() {
  const { user, isAuthenticated, isLoading, authLoadError } = useAuth();
  const validViews = ['dashboard', 'biblioteca', 'musculos', 'sessao', 'ia-lab', 'progresso', 'perfil', 'configuracoes', 'historico', 'treinos', 'novo-treino', 'anamnese', 'revisao', 'arquivos', 'objetivos', 'atlas'];
  const [activeTab, setActiveTabState] = useState<string>(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    return view && validViews.includes(view) ? view : 'dashboard';
  });
  const setActiveTab = useCallback((tab: string) => {
    if (!validViews.includes(tab)) return;
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === 'dashboard') url.searchParams.delete('view');
    else url.searchParams.set('view', tab);
    window.history.pushState({ focoView: tab }, '', url.pathname + url.search + url.hash);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);
  useEffect(() => {
    const onPopState = () => {
      const view = new URLSearchParams(window.location.search).get('view');
      setActiveTabState(view && validViews.includes(view) ? view : 'dashboard');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let active = true;
    api.getAnamnesis().then((saved) => {
      if (active && !saved) setActiveTab('anamnese');
    }).catch(() => {
      // Do not block access if the connection is temporarily unavailable.
    });
    return () => { active = false; };
  }, [isAuthenticated, user?.id]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-[#161616] border border-white/20 flex items-center justify-center text-white animate-pulse shadow-2xl mb-4">
          <FocoSymbol className="w-10 h-10 text-white" />
        </div>
        <div className="flex items-center gap-1.5 font-black text-2xl text-white tracking-widest uppercase">
          <span>FOCO</span>
        </div>
        <p className="text-[10px] text-neutral-400 mt-2 font-mono uppercase tracking-widest">
          FOCO EM EVOLUIR.
        </p>
      </div>
    );
  }

  if (!isAuthenticated && authLoadError) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-6 text-center">
          <FocoSymbol className="mx-auto mb-4 h-12 w-12 text-white" />
          <h1 className="text-xl font-black tracking-wide">O servidor está demorando</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            O FOCO não conseguiu validar sua sessão a tempo. Isso não significa que sua conta foi perdida.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-bold text-black"
          >
            Tentar novamente
          </button>
          <p className="mt-3 text-xs text-neutral-500">{authLoadError}</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onRegistered={() => setActiveTab('anamnese')} />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            setActiveTab={setActiveTab}
          />
        );
      case 'musculos':
      case 'biblioteca':
        return <ExerciseLibraryPage setActiveTab={setActiveTab} />;
      case 'atlas':
        return <AnatomyStudioPage setActiveTab={setActiveTab} />;
      case 'sessao':
        return (
          <ActiveSessionPage
            setActiveTab={setActiveTab}
          />
        );
      case 'ia-lab':
        return <AiLabPage setActiveTab={setActiveTab} />;
      case 'progresso':
        return <ProgressPage setActiveTab={setActiveTab} />;
      case 'perfil':
        return <ProfilePage setActiveTab={setActiveTab} />;
      case 'configuracoes':
        return <SettingsPage setActiveTab={setActiveTab} />;
      case 'historico':
        return <HistoryPage setActiveTab={setActiveTab} />;
      case 'treinos':
        return <WorkoutsPage setActiveTab={setActiveTab} />;
      case 'novo-treino':
        return <NewWorkoutPage setActiveTab={setActiveTab} />;
      case 'anamnese':
        return <AnamnesisPage setActiveTab={setActiveTab} />;
      case 'revisao':
        return <ProgressionReviewPage setActiveTab={setActiveTab} />;
      case 'arquivos':
        return <SheetUploadPage setActiveTab={setActiveTab} />;
      case 'objetivos':
        return <GoalsPage />;
      default:
        return (
          <DashboardPage
            setActiveTab={setActiveTab}
          />
        );
    }
  };

  const avatarInitials = (user?.full_name || 'FOCO').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return (
    <div className="foco-v4-shell min-h-screen text-white antialiased flex justify-center">
      <a href="#foco-main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-black">Pular para o conteúdo</a>
      
      {/* Mobile Ergonomic Container Shell (Zero-Overlap Guarantee) */}
      <div className="w-full min-h-screen flex flex-col relative">
        <div className="flex min-h-screen flex-1">
          <DesktopNav activeTab={activeTab} navigate={setActiveTab} />
          <div className="min-w-0 flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between bg-[#080808]/95 px-5 backdrop-blur-xl sm:px-7 md:h-[70px] md:border-b md:border-white/10">
          <button type="button" onClick={() => setActiveTab('dashboard')}
            className="inline-flex items-center justify-center md:hidden" aria-label="FOCO — início">
            <FocoLettering className="h-[31px] w-[159px]" />
          </button>
          <span className="hidden text-[10px] font-bold tracking-[.2em] text-neutral-500 md:block">FOCO EM EVOLUIR.</span>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block"><InstallAppButton /></div>
            <button type="button" onClick={() => setActiveTab('configuracoes')} aria-label="Configurações"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1A1A1A] text-neutral-400 transition hover:border-white/30 hover:text-white sm:flex">
              <Settings className="h-[19px] w-[19px]" />
            </button>
            <button type="button" onClick={() => setActiveTab('perfil')} aria-label="Meu perfil"
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-gradient-to-br from-[#373737] to-[#101010] text-sm font-black tracking-wide text-white shadow-lg"
              title="Meu perfil">
              {avatarInitials}
            </button>
          </div>
        </header>

        {/* Viewport Content Area with Protected Bottom Space (pb-32) */}
        <main id="foco-main-content" tabIndex={-1} className="flex-1 min-w-0 px-4 pb-28 pt-3 sm:px-6 sm:pt-4 lg:px-9 lg:pt-6 md:pb-10">
          {renderActiveView()}
        </main>

        {/* Global Floating Rest Timer HUD */}
        <RestTimerHUD />

        {/* Fixed Native Bottom Tab Bar */}
        <BottomNavBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onStartSession={() => setActiveTab('sessao')}
        />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RestTimerProvider>
        <MainApp />
      </RestTimerProvider>
    </AuthProvider>
  );
}
