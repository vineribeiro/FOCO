import React, { useState } from 'react';
import { InstallAppButton } from '../components/InstallAppButton';
import { soundEngine } from '../utils/soundEngine';
import { FOCO_VISUAL_RELEASE, FOCO_VISUAL_DATE } from '../utils/release';
import { useAuth } from '../context/AuthContext';
import { applyUiPreferences, readUiPreferences, saveUiPreferences, type FocoUiPreferences } from '../utils/uiPreferences';
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
  RefreshCcw,
} from 'lucide-react';

interface SettingsPageProps {
  setActiveTab: (tab: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ setActiveTab }) => {
  const { logout } = useAuth();
  const [hapticsEnabled, setHapticsEnabled] = useState(() => soundEngine.getHapticsEnabled());
  const [uiPreferences, setUiPreferences] = useState(readUiPreferences);
  const [uiPreferencesError, setUiPreferencesError] = useState(false);
  const changeUiPreferences = (change: Partial<FocoUiPreferences>) => {
    const next = { ...uiPreferences, ...change };
    setUiPreferences(next);
    applyUiPreferences(next);
    setUiPreferencesError(!saveUiPreferences(next));
  };
  const setHaptics = (enabled: boolean) => { soundEngine.setHapticsEnabled(enabled); setHapticsEnabled(enabled); if (enabled) soundEngine.vibrate(40); };

  const settings = [
    { title: 'Anamnese de treino', description: 'Objetivos, rotina e grupos musculares prioritários.', icon: ClipboardList, tab: 'anamnese' },
    { title: 'Perfil do atleta', description: 'Atualize seus dados pessoais e medidas.', icon: UserRound, tab: 'perfil' },
    { title: 'Avaliação OKOK', description: 'Envie seu relatório corporal e consulte a análise por IA.', icon: FileUp, tab: 'arquivos' },
    { title: 'Meus treinos', description: 'Consulte, ajuste ou altere sua ficha ativa.', icon: Dumbbell, tab: 'treinos' },
    { title: 'Biblioteca de exercícios', description: 'Pesquise movimentos e adicione-os às suas fichas.', icon: BookOpen, tab: 'biblioteca' },
    { title: 'Metas pessoais', description: 'Acompanhe os objetivos que você definiu.', icon: Target, tab: 'objetivos' },
    { title: 'Evolução', description: 'Revise seus registros e seu histórico de treino.', icon: TrendingUp, tab: 'progresso' },
  ];

  return (
    <div className="foco-v4-page max-w-3xl space-y-5 text-white">
      <header>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Sua conta FOCO</p>
        <h1 className="foco-v4-heading">Preferências</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">Gerencie seu perfil, seus treinos e os dados usados para personalizar sua experiência.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
        {settings.map((item, index) => {
          const Icon = item.icon;
          return (
            <button key={item.tab} type="button" onClick={() => { if (item.tab === 'arquivos') { try { sessionStorage.setItem('foco_upload_mode', 'body'); } catch { /* navigate */ } } setActiveTab(item.tab); }} className={'flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-white/[0.04] sm:p-5 ' + (index > 0 ? 'border-t border-white/10' : '')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black"><Icon className="h-5 w-5 text-neutral-300" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-neutral-500">{item.description}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500" />
            </button>
          );
        })}
      </section>

      <section className="foco-v4-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-sm font-extrabold">Instalar FOCO</h2><p className="mt-1 text-xs text-neutral-400">Acesse pela tela inicial do celular, como um aplicativo.</p></div>
        <InstallAppButton />
      </section>

      <section className="foco-v4-panel flex flex-wrap items-center justify-between gap-3 p-5" aria-label="Atualizar FOCO">
        <div>
          <h2 className="text-sm font-extrabold">Atualizações do FOCO</h2>
          <p className="mt-1 text-xs text-neutral-400">FOCO Visual {FOCO_VISUAL_RELEASE} · {FOCO_VISUAL_DATE}. Se a interface anterior aparecer, atualize os arquivos sem excluir o histórico salvo.</p>
        </div>
        <a href={import.meta.env.BASE_URL + 'atualizar.html'}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#D5FF40] px-4 text-xs font-extrabold text-[#10160D]">
          <RefreshCcw className="h-4 w-4"/> Atualizar
        </a>
      </section>

      <section className="foco-v4-panel space-y-4 p-5 sm:p-6" aria-labelledby="foco-ui-preferences-title">
        <div>
          <h2 id="foco-ui-preferences-title" className="text-base font-extrabold">Aparência do FOCO</h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">Ajuste o espaço entre os elementos e a transparência das superfícies. Vale apenas neste dispositivo.</p>
        </div>
        <div role="group" aria-label="Densidade da interface">
          <p className="mb-2 text-xs font-semibold text-neutral-300">Espaçamento</p>
          <div className="grid grid-cols-2 gap-2">
            {([['comfortable','Confortável'],['compact','Compacto']] as const).map(([value,label])=>
              <button key={value} type="button" aria-pressed={uiPreferences.density===value}
                onClick={()=>changeUiPreferences({density:value})}
                className={'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F040] '+(uiPreferences.density===value?'border-[#C8F040] bg-[#C8F040] text-[#10160D]':'border-white/20 bg-white/5 text-white')}>
                {label}
              </button>)}
          </div>
        </div>
        <div role="group" aria-label="Transparência das superfícies">
          <p className="mb-2 text-xs font-semibold text-neutral-300">Transparência</p>
          <div className="grid grid-cols-2 gap-2">
            {([['balanced','Equilibrada'],['reduced','Reduzida']] as const).map(([value,label])=>
              <button key={value} type="button" aria-pressed={uiPreferences.glass===value}
                onClick={()=>changeUiPreferences({glass:value})}
                className={'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F040] '+(uiPreferences.glass===value?'border-[#C8F040] bg-[#C8F040] text-[#10160D]':'border-white/20 bg-white/5 text-white')}>
                {label}
              </button>)}
          </div>
        </div>
        {uiPreferencesError && <p role="alert" className="text-xs text-amber-200">Não foi possível guardar a preferência neste aparelho. Ela poderá voltar ao padrão após fechar o aplicativo.</p>}
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
