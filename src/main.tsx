import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
        <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FFFFFF', fontFamily: 'Arial, sans-serif', display: 'grid', placeItems: 'center', padding: '24px' }}>
          <section style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, letterSpacing: '0.28em', fontSize: '30px' }}>FOCO</div>
            <h1 style={{ fontSize: '20px', marginTop: '24px' }}>Não foi possível carregar esta tela</h1>
            <p style={{ color: '#A3A3A3', lineHeight: 1.6 }}>O aplicativo encontrou um erro ao renderizar. Recarregue a página; se continuar, abra o console do navegador e envie o erro para o suporte.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '12px 18px', background: '#FFFFFF', color: '#000000', border: 0, borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Recarregar FOCO</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const registerFocoWorker = () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {
      // Installation can still work through the browser menu if offline caching is unavailable.
    });
  };
  if (document.readyState === 'complete') registerFocoWorker();
  else window.addEventListener('load', registerFocoWorker, { once: true });
}

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
