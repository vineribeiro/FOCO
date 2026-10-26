import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const InstallAppButton: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsIOS(ios);
    setIsStandalone(standalone);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setIsStandalone(true);
      setInstallPrompt(null);
      if (choice.outcome === 'dismissed') setShowHelp(true);
      return;
    }
    setShowHelp(true);
  };

  if (isStandalone) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 text-[11px] font-bold text-white transition hover:bg-white/10 sm:px-3"
        aria-label="Instalar FOCO no celular"
        title="Instalar FOCO no celular"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Instalar</span>
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="foco-install-title">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#141414] p-5 text-white shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black"><Smartphone className="h-5 w-5" /></div>
                <div>
                  <h2 id="foco-install-title" className="font-black">Adicionar FOCO à tela inicial</h2>
                  <p className="mt-1 text-xs text-neutral-400">Abre como aplicativo, sem precisar procurar o link.</p>
                </div>
              </div>
              <button type="button" aria-label="Fechar instruções" onClick={() => setShowHelp(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {isIOS ? (
              <ol className="space-y-3 text-sm leading-relaxed text-neutral-300">
                <li className="flex gap-3"><Share className="mt-0.5 h-4 w-4 shrink-0" /><span>Abra este site no <strong className="text-white">Safari</strong> e toque em Compartilhar.</span></li>
                <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">2</span><span>Escolha <strong className="text-white">Adicionar à Tela de Início</strong>.</span></li>
                <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">3</span><span>Toque em Adicionar para criar o ícone do FOCO.</span></li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm leading-relaxed text-neutral-300">
                <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">1</span><span>No menu do navegador (⋮), procure <strong className="text-white">Instalar app</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>.</span></li>
                <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">2</span><span>Confirme a instalação. Se a opção não aparecer, abra o site no Chrome atualizado.</span></li>
              </ol>
            )}
            <button type="button" onClick={() => setShowHelp(false)} className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-black">Entendi</button>
          </div>
        </div>
      )}
    </>
  );
};
