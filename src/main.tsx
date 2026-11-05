import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyUiPreferences, readUiPreferences } from './utils/uiPreferences';
import { FOCO_BUILD_ID } from './utils/release';
import './index.css';
import './foco-pro-tokens.css';
import './foco-v6.css';
import './foco-v7-polish.css';
import './foco-v8-fidelity.css';
import './foco-motion.css';
import './foco-pro-responsive.css';
import './foco-v2-experience.css';
import './foco-21-redesign.css';
import './foco-exercise-atlas.css';

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
        <main style={{ minHeight: '100vh', background: '#080A07', color: '#F7F8F4', fontFamily: 'Arial, sans-serif', display: 'grid', placeItems: 'center', padding: '24px' }}>
          <section style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, letterSpacing: '0.28em', fontSize: '30px' }}>FOCO</div>
            <h1 style={{ fontSize: '20px', marginTop: '24px' }}>Não foi possível carregar esta tela</h1>
            <p style={{ color: '#A3A3A3', lineHeight: 1.6 }}>O aplicativo encontrou um erro ao renderizar. Recarregue a página; se continuar, abra o console do navegador e envie o erro para o suporte.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '12px 18px', background: '#D5FF40', color: '#000000', border: 0, borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Recarregar FOCO</button>
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
    Object.assign(notice.style, {
      position: 'fixed', bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 96px))',
      left: '50%', transform: 'translateX(-50%)', width: 'min(94vw, 420px)',
      background: '#1A2117', color: '#F7F8F1', padding: '14px 16px',
      border: '1px solid #62713A', borderRadius: '20px', zIndex: '99999',
      boxShadow: '0 18px 45px #000A', font: '600 13px Poppins, sans-serif',
      display: 'flex', alignItems: 'center', gap: '12px'
    });
    const label = document.createElement('span');
    label.textContent = 'Nova versão do FOCO disponível.';
    label.style.flex = '1';
    const button = document.createElement('button');
    button.textContent = 'Atualizar';
    button.type = 'button';
    Object.assign(button.style, {
      border: 0, borderRadius: '999px', padding: '12px 16px', minHeight: '43px',
      background: '#D5FF40', color: '#10160D', fontWeight: '800', cursor: 'pointer'
    });
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
  document.body.innerHTML = '<main style="background:#0A0A0A;color:white;min-height:100vh;padding:32px;font-family:Arial,sans-serif"><h1>FOCO</h1><p>Não foi encontrado o elemento principal do aplicativo. Atualize a página e tente novamente.</p></main>';
} else {
  createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}
