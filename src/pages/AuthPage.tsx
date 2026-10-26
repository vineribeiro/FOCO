import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FocoSymbol, FocoLettering } from '../components/FocoBrand';
import { ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { InstallAppButton } from '../components/InstallAppButton';

interface AuthPageProps { onRegistered: () => void; }

export const AuthPage: React.FC<AuthPageProps> = ({ onRegistered }) => {
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'iniciante' | 'intermediario' | 'avancado'>('intermediario');
  const [weightKg, setWeightKg] = useState('78');
  const [heightCm, setHeightCm] = useState('175');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          throw new Error('Informe seu nome completo');
        }
        await register({
          email,
          password,
          full_name: fullName,
          experience_level: experienceLevel,
          current_weight_kg: Number(weightKg) || 75,
          height_cm: Number(heightCm) || 175,
        });
        onRegistered();
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setSuccessMsg(res.message || 'Instruções de recuperação enviadas com sucesso.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a operação. Verifique seus dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center px-4 py-8 relative text-white">
      <div className="w-full max-w-sm z-10 space-y-6">
        
        {/* Official Brand Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/20 flex items-center justify-center p-3 shadow-2xl mb-3">
            <FocoSymbol className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-[0.25em] text-white uppercase font-sans">
            FOCO
          </h1>
          <p className="text-[10px] font-mono tracking-[0.3em] text-neutral-400 uppercase mt-1">
            FOCO EM EVOLUIR.
          </p>
        </div>

        <div className="flex justify-center">
          <InstallAppButton />
        </div>

        {/* Auth Card */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 shadow-2xl">
          
          {/* Tabs */}
          <div className="flex border-b border-white/10 mb-5">
            <button
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/20 text-neutral-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-white/10 border border-white/30 text-white text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-white" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Gabriel Toledo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/10 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/10 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">
                    Senha
                  </label>

                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/10 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="pt-2 border-t border-white/10 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1 font-bold">
                      Peso Atual (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/10 text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1 font-bold">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/10 text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1 font-bold">
                    Nível de Experiência
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e: any) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-white/10 text-white text-xs focus:outline-none focus:border-white"
                  >
                    <option value="iniciante">Iniciante (&lt; 1 ano)</option>
                    <option value="intermediario">Intermediário (1 a 3 anos)</option>
                    <option value="avancado">Avançado (&gt; 3 anos)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-3 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Processando...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Entrar no FOCO</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <>
                  <span>Criar Perfil de Atleta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>Enviar Instruções</span>
              )}
            </button>
          </form>


          {mode === 'forgot' && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Voltar para o login
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>Seu espaço de treino personalizado</span>
        </div>
      </div>
    </div>
  );
};
