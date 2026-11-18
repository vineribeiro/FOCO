import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyUiPreferences, readUiPreferences } from './utils/uiPreferences';
import { FOCO_BUILD_ID } from './utils/release';
import { FocoV6Lockup } from './components/FocoV6UI';
import './index.css';
import './foco-pro-tokens.css';
import './foco-brand.css';
import './foco-v2-experience.css';
import './foco-exercise-atlas.css';
import './foco-ui.css';
import './foco-motion.css';

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('FOCO render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="foco-brand-state">
          <section className="foco-shell-card">
            <FocoV6Lockup />
            <h1>Não foi possível carregar esta tela</h1>
            <p>Recarregue o FOCO para tentar novamente. Se o problema continuar, confira a conexão e tente abrir o aplicativo mais tarde.</p>
            <button type="button" className="foco-shell-action" onClick={() => window.location.reload()}>Recarregar FOCO</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Active-workout input is never discarded: installing a new worker only
  // offers a user-initiated refresh, rather than unexpectedly reloading.
  const showUpdateNotice = () => {
    if (document.querySelector('[data-foco-update-notice]')) return;
    const notice = document.createElement('aside');
    notice.setAttribute('data-foco-update-notice', 'true');
    notice.setAttribute('role', 'status');
    notice.className = 'foco-update-notice';
    const label = document.createElement('span');
    label.textContent = 'Nova versão do FOCO disponível.';
    const button = document.createElement('button');
    button.textContent = 'Atualizar';
    button.type = 'button';
    button.className = 'foco-shell-action';
    button.addEventListener('click', () => {
      window.location.assign(import.meta.env.BASE_URL + 'atualizar.html');
    });
    notice.append(label, button);
    document.body.append(notice);
  };

  // Unlike Service Worker updates, this also detects a newly deployed HTML shell
  // when sw.js is unchanged. No auto-reload: an active workout may contain unsaved data.
  let lastVersionCheck = 0;
  const verifyPublishedRelease = async () => {
    if (Date.now() - lastVersionCheck < 120_000) return;
    lastVersionCheck = Date.now();
    const htmlRelease = document.querySelector('meta[name="foco-release"]')?.getAttribute('content');
    if (htmlRelease && htmlRelease !== FOCO_BUILD_ID) {
      showUpdateNotice();
      return;
    }
    try {
      const remoteUrl = new URL(import.meta.env.BASE_URL + 'index.html?foco_release_check=1', window.location.origin);
      const remote = await fetch(remoteUrl, { cache: 'no-store', credentials: 'omit' });
      if (!remote.ok) return;
      const html = await remote.text();
      const match = html.match(/<meta\s+name=["']foco-release["']\s+content=["']([^"']+)["']/);
      if (match && match[1] !== FOCO_BUILD_ID) showUpdateNotice();
    } catch {
      // Offline/temporary outage is not evidence of an app update.
    }
  };

  const registerFocoWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register(
        import.meta.env.BASE_URL + 'sw.js', { updateViaCache: 'none' }
      );
      // A first-time installation is not an available update to an older UI.
      const alreadyControlled = Boolean(navigator.serviceWorker.controller);
      if (alreadyControlled && reg.waiting) showUpdateNotice();
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && alreadyControlled) {
            showUpdateNotice();
          }
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (alreadyControlled) showUpdateNotice();
      });
      await reg.update();
      void verifyPublishedRelease();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void reg.update().catch(() => {});
          void verifyPublishedRelease();
        }
      });
    } catch {
      // Website continues to operate when service workers are unsupported.
    }
  };
  if (document.readyState === 'complete') void registerFocoWorker();
  else window.addEventListener('load', () => { void registerFocoWorker(); }, { once: true });
}

applyUiPreferences(readUiPreferences());
const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<main class="foco-brand-state"><section class="foco-shell-card"><img class="foco-shell-logo" src="'+import.meta.env.BASE_URL+'assets/brand/foco-v6-reference-vector.svg" alt="FOCO" width="170" height="42"><h1>Não foi possível iniciar o FOCO</h1><p>Atualize a página para tentar novamente.</p><button type="button" class="foco-shell-action" id="foco-reload">Recarregar FOCO</button></section></main>';
  document.getElementById('foco-reload')?.addEventListener('click', () => window.location.reload());
} else {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}
