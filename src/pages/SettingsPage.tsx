import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Database,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  Info,
  Server,
  Layers,
} from 'lucide-react';

interface SettingsPageProps {
  setActiveTab?: (tab: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ setActiveTab }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        await api.getSystemStatus();
      } catch (e) {
        console.error('Failed to get system status:', e);
      }
    }
    fetchStatus();
  }, []);

  const migrationSqlSnippet = `-- FOCO Schema PostgreSQL (Supabase RLS)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  experience_level TEXT
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON public.profiles 
  FOR ALL USING (auth.uid() = id);

CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  goal TEXT,
  weekly_frequency INTEGER,
  status TEXT DEFAULT 'ativo'
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own plans" ON public.workout_plans 
  FOR ALL USING (auth.uid() = user_id);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(migrationSqlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Configurações & Diagnóstico do Sistema</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Auditoria da infraestrutura persistente, credenciais de IA e especificações do banco relacional.
        </p>
      </div>

      {/* Brand Identity Quick Banner */}
      {setActiveTab && (
        <div className="p-4 rounded-2xl bg-[#141414] border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white">Identidade Visual FOCO</h3>
              <p className="text-[11px] text-neutral-400">
                Acesse o manual de marca, prancha oficial, especificações e mockups.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('identidade')}
            className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
          >
            Ver Manual
          </button>
        </div>
      )}

      {/* System Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Database Status */}
        <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Banco de Dados</span>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase">
            <Database className="w-4 h-4" />
            <span>Persistente & Relacional</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed font-mono">
            Estruturado com isolamento estrito por <code className="text-white">user_id</code> e sem perda de dados ao fechar ou deslogar.
          </p>
        </div>

        {/* AI Status */}
        <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Motor de Inteligência</span>
            <span className="w-2 h-2 rounded-full bg-white" />
          </div>
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Gemini 2.5 Flash</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            API ativa no backend para visão de fichas físicas, geração biomecânica e ciclos de sobrecarga.
          </p>
        </div>

        {/* Security & RLS */}
        <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Segurança & Criptografia</span>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2 text-white font-black text-sm uppercase">
            <span>Bcrypt + JWT 30d</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Senhas protegidas com hashing irreversível. Sessões autenticadas via cabeçalhos Bearer.
          </p>
        </div>
      </div>

      {/* Supabase PostgreSQL Documentation */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-white" />
            <h3 className="text-sm font-black uppercase text-white">Integração com Supabase PostgreSQL</h3>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-white bg-white/10 px-2.5 py-1 rounded-md">
            Migration Versionada
          </span>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          O FOCO foi construído com suporte total à arquitetura do Supabase. O arquivo de migration SQL executável e versionado está disponível no repositório em <code className="text-white font-mono">/supabase/migrations/20261026_initial_schema.sql</code> contendo todas as 9 tabelas obrigatórias, chaves estrangeiras, índices e políticas de Row Level Security (RLS).
        </p>

        {/* Env vars list */}
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-white/10 space-y-2 font-mono text-xs">
          <p className="text-neutral-500 font-sans text-[11px] font-bold uppercase tracking-wider mb-2">
            Variáveis no .env.example:
          </p>
          <div className="text-neutral-300">
            <span className="text-white font-bold">NEXT_PUBLIC_SUPABASE_URL</span>=https://seu-projeto.supabase.co
          </div>
          <div className="text-neutral-300">
            <span className="text-white font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=eyJhbGciOiJIUzI1NiIsInR5...
          </div>
          <div className="text-neutral-300">
            <span className="text-white font-bold">SUPABASE_SERVICE_ROLE_KEY</span>=eyJhbGciOiJIUzI1NiIsInR5...
          </div>
          <div className="text-neutral-300">
            <span className="text-white font-bold">GEMINI_API_KEY</span>=AIzaSy...
          </div>
        </div>

        {/* SQL Snippet & Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Trecho da Migration SQL com Row Level Security (RLS)
            </span>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 text-xs text-white hover:underline cursor-pointer font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Trecho SQL'}</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-[#0A0A0A] border border-white/10 text-[11px] font-mono text-neutral-400 overflow-x-auto">
            {migrationSqlSnippet}
          </pre>
        </div>
      </div>

      {/* Backup and Isolation Policy */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Info className="w-4 h-4 text-white" />
          <span className="font-black uppercase text-xs tracking-wider">Isolamento e Segurança de Dados</span>
        </div>
        <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>Nenhum dado é perdido ao recarregar a página, fechar o navegador ou deslogar.</li>
          <li>Cada usuário só pode ler, editar ou excluir exclusivamente as suas próprias fichas, sessões e medidas.</li>
          <li>O token JWT é verificado a cada requisição nas rotas privadas no backend.</li>
          <li>A chave do Gemini opera 100% no servidor, nunca exposta ao frontend.</li>
        </ul>
      </div>
    </div>
  );
};
