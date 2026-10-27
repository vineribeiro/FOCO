import React, { useState } from 'react';
import { soundEngine } from '../utils/soundEngine';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  UserRound,
  FileUp,
  Dumbbell,
  BookOpen,
  TrendingUp,
  Target,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Vibrate,
} from 'lucide-react';

interface SettingsPageProps {
  setActiveTab: (tab: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ setActiveTab }) => {
  const { logout } = useAuth();
  const [hapticsEnabled, setHapticsEnabled] = useState(() => soundEngine.getHapticsEnabled());
  const setHaptics = (enabled: boolean) => { soundEngine.setHapticsEnabled(enabled); setHapticsEnabled(enabled); if (enabled) soundEngine.vibrate(40); };

  const settings = [
    { title: 'Anamnese de treino', description: 'Objetivos, rotina e grupos musculares prioritários.', icon: ClipboardList, tab: 'anamnese' },
    { title: 'Perfil do atleta', description: 'Atualize seus dados pessoais e medidas.', icon: UserRound, tab: 'perfil' },
    { title: 'Fichas e avaliações', description: 'Importe uma ficha ou analise sua avaliação corporal.', icon: FileUp, tab: 'arquivos' },
    { title: 'Meus treinos', description: 'Consulte, ajuste ou altere sua ficha ativa.', icon: Dumbbell, tab: 'treinos' },
    { title: 'Biblioteca de exercícios', description: 'Pesquise movimentos e adicione-os às suas fichas.', icon: BookOpen, tab: 'biblioteca' },
    { title: 'Metas pessoais', description: 'Acompanhe os objetivos que você definiu.', icon: Target, tab: 'objetivos' },
    { title: 'Evolução', description: 'Revise seus registros e seu histórico de treino.', icon: TrendingUp, tab: 'progresso' },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-32 text-white">
      <header>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Sua conta FOCO</p>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Preferências</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">Gerencie seu perfil, seus treinos e os dados usados para personalizar sua experiência.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
        {settings.map((item, index) => {
          const Icon = item.icon;
          return (
            <button key={item.tab} type="button" onClick={() => setActiveTab(item.tab)} className={'flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-white/[0.04] sm:p-5 ' + (index > 0 ? 'border-t border-white/10' : '')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black"><Icon className="h-5 w-5 text-neutral-300" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-neutral-500">{item.description}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />
            </button>
          );
        })}
      </section>

      <section aria-labelledby="foco-haptics-label" className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Vibrate className="mt-1 h-5 w-5 shrink-0 text-neutral-300" aria-hidden="true" />
            <div>
              <h2 id="foco-haptics-label" className="text-base font-bold">Resposta tátil</h2>
              <p className="mt-1 text-sm text-neutral-400">Vibração opcional ao registrar séries e ao terminar o descanso, se o dispositivo permitir.</p>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={hapticsEnabled}
            aria-label="Vibração do FOCO" onClick={() => setHaptics(!hapticsEnabled)}
            className={'relative h-12 w-16 shrink-0 rounded-full border transition-colors ' + (hapticsEnabled ? 'border-white bg-white' : 'border-white/20 bg-[#303030]')}>
            <span className={'absolute top-1.5 h-8 w-8 rounded-full transition-transform ' + (hapticsEnabled ? 'left-6 bg-black' : 'left-1.5 bg-neutral-400')} />
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-black"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h2 className="text-sm font-black">Privacidade dos seus dados</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">Compartilhe apenas as informações necessárias para personalizar seus treinos. Dores, lesões e outras informações de saúde só devem ser usadas com sua autorização.</p>
          </div>
        </div>
      </section>

      <button type="button" onClick={logout} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-xs font-black uppercase tracking-wide text-white transition hover:border-white/35 hover:bg-white/10">
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>
    </div>
  );
};
