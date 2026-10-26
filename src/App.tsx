/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestTimerProvider } from './context/RestTimerContext';
import { BottomNavBar } from './components/BottomNavBar';
import { RestTimerHUD } from './components/RestTimerHUD';
import { Anatomy3DViewer } from './components/Anatomy3DViewer';
import { FocoSymbol, FocoLogoHorizontal } from './components/FocoBrand';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { MusclesPage } from './pages/MusclesPage';
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
import { Settings, User } from 'lucide-react';
import { api } from './services/api';
import { InstallAppButton } from './components/InstallAppButton';

function MainApp() {
  const { user, isAuthenticated, isLoading, authLoadError } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

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
  
  // 3D Exercise Anatomy Modal State
  const [exercise3dModal, setExercise3dModal] = useState<{
    isOpen: boolean;
    name: string;
    group: string;
  }>({
    isOpen: false,
    name: '',
    group: '',
  });

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

  const handleOpenExercise3D = (name: string, group: string) => {
    setExercise3dModal({
      isOpen: true,
      name,
      group,
    });
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            setActiveTab={setActiveTab}
            onOpenExercise3D={handleOpenExercise3D}
          />
        );
      case 'musculos':
        return (
          <MusclesPage
            setActiveTab={setActiveTab}
            onOpenExercise3D={handleOpenExercise3D}
          />
        );
      case 'sessao':
        return (
          <ActiveSessionPage
            setActiveTab={setActiveTab}
            onOpenExercise3D={handleOpenExercise3D}
          />
        );
      case 'ia-lab':
        return <AiLabPage setActiveTab={setActiveTab} />;
      case 'progresso':
        return <ProgressPage />;
      case 'perfil':
        return <ProfilePage />;
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
            onOpenExercise3D={handleOpenExercise3D}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] antialiased flex justify-center">
      
      {/* Mobile Ergonomic Container Shell (Zero-Overlap Guarantee) */}
      <div className="w-full max-w-6xl min-h-screen bg-[#0A0A0A] border-x border-white/10 flex flex-col relative shadow-2xl overflow-x-hidden">
        
        {/* Top Header with Official FOCO Brand Monogram */}
        <header className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center text-left cursor-pointer group"
            aria-label="FOCO — voltar ao início"
          >
            <FocoLogoHorizontal
              symbolSize="w-8 h-8"
              showSlogan={true}
              className="gap-2.5"
            />
          </button>

          {/* Atalhos funcionais do aplicativo */}
          <div className="flex items-center gap-1.5">
            <InstallAppButton />
            <button
              onClick={() => setActiveTab('configuracoes')}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                activeTab === 'configuracoes'
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
              }`}
              title="Preferências"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={() => setActiveTab('perfil')}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
              }`}
              title="Perfil"
            >
              <User className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Viewport Content Area with Protected Bottom Space (pb-32) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-32 overflow-y-auto">
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

        {/* Global Interactive 3D Anatomy & Execution Modal */}
        {exercise3dModal.isOpen && (
          <Anatomy3DViewer
            exerciseName={exercise3dModal.name}
            muscleGroup={exercise3dModal.group}
            onClose={() => setExercise3dModal({ isOpen: false, name: '', group: '' })}
            isModal={true}
          />
        )}
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
