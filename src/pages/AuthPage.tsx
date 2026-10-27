import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FocoSymbol, FocoLettering } from '../components/FocoBrand';
import { api, removeStoredToken } from '../services/api';
import { InstallAppButton } from '../components/InstallAppButton';

interface AuthPageProps {
  onRegistered: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const AuthPage: React.FC<AuthPageProps> = ({ onRegistered }) => {
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'iniciante' | 'intermediario' | 'avancado'>('iniciante');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const authError = params.get('error_description') || params.get('error') || params.get('error_code');
    if (authError) {
      try { sessionStorage.setItem('foco_password_recovery_pending', '1'); } catch { /* continue to show a recoverable error */ }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      setErrorMsg(/expired|otp_expired/i.test(authError)
        ? 'Este link de recuperação expirou ou já foi utilizado. Solicite um novo link.'
        : 'Não foi possível validar o link. Solicite uma nova recuperação de senha.');
      return;
    }
    const accessToken = params.get('access_token');
    if (params.get('type') === 'recovery' && accessToken) {
      try { sessionStorage.setItem('foco_password_recovery_pending', '1'); } catch { /* state below still holds the one-time token */ }
      setRecoveryAccessToken(accessToken);
      setMode('reset');
      setSuccessMsg('Link validado. Defina uma nova senha para recuperar o acesso.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const friendlyError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
    if (/credenciais inválidas|invalid login credentials/i.test(message)) {
      return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    }
    if (/sessão ausente|rota do foco não encontrada|caminho da api foco inválido/i.test(message)) {
      return 'O serviço de autenticação acabou de ser atualizado. Atualize esta página e tente entrar novamente.';
    }
    if (/failed to fetch|networkerror|não foi possível conectar/i.test(message)) {
      return 'Não conseguimos conectar ao FOCO agora. Confira a internet e tente novamente.';
    }
    if (/already registered|user already exists/i.test(message)) {
      return 'Este e-mail já possui uma conta. Entre ou use a recuperação de senha.';
    }
    if (/weak_password|password.*(weak|compromised|leaked)|password strength/i.test(message)) {
      return 'Escolha uma senha mais forte, com pelo menos 8 caracteres, que não tenha sido exposta em vazamentos.';
    }
    return message;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (mode === 'reset' && !recoveryAccessToken) {
      setErrorMsg('O link de recuperação não está válido nesta página. Solicite um novo e-mail de recuperação.');
      return;
    }
    if (mode !== 'reset' && !normalizedEmail) {
      setErrorMsg('Informe seu e-mail para continuar.');
      return;
    }
    if (mode !== 'forgot' && !password) {
      setErrorMsg(mode === 'reset' ? 'Informe sua nova senha.' : 'Informe sua senha para continuar.');
      return;
    }
    if (mode === 'register' || mode === 'reset') {
      if (mode === 'register' && !fullName.trim()) {
        setErrorMsg('Informe seu nome para criar o perfil.');
        return;
      }
      if (password.length < 8) {
        setErrorMsg('Use uma senha com pelo menos 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas não coincidem. Confira os dois campos.');
        return;
      }
      if (mode === 'register' && weightKg && (Number(weightKg) < 30 || Number(weightKg) > 350)) {
        setErrorMsg('Informe um peso entre 30 e 350 kg ou deixe o campo em branco.');
        return;
      }
      if (mode === 'register' && heightCm && (Number(heightCm) < 100 || Number(heightCm) > 250)) {
        setErrorMsg('Informe uma altura entre 100 e 250 cm ou deixe o campo em branco.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(normalizedEmail, password);
      } else if (mode === 'register') {
        await register({
          email: normalizedEmail,
          password,
          full_name: fullName.trim(),
          experience_level: experienceLevel,
          ...(weightKg ? { current_weight_kg: Number(weightKg) } : {}),
          ...(heightCm ? { height_cm: Number(heightCm) } : {}),
        });
        onRegistered();
      } else if (mode === 'forgot') {
        const response = await api.forgotPassword(normalizedEmail);
        setSuccessMsg(response.message || 'Se o e-mail estiver cadastrado, enviaremos instruções para recuperar o acesso.');
      } else {
        const response = await api.resetPassword({ new_password: password, access_token: recoveryAccessToken! });
        removeStoredToken();
        setRecoveryAccessToken(null);
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        setSuccessMsg(response.message || 'Senha atualizada. Entre com a nova senha para continuar.');
      }
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : '';
      if (mode === 'register' && /conta criada\. confirme o e-mail/i.test(rawMessage)) {
        setSuccessMsg('Sua conta foi criada. Confira o e-mail enviado para confirmar o cadastro e depois entre no FOCO.');
      } else {
        setErrorMsg(friendlyError(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isLoading;
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white selection:bg-white selection:text-black">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-36 top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-white/[0.045] blur-[110px]" />
        <div className="absolute -bottom-48 right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-neutral-500/[0.07] blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1320px] grid-cols-1 items-center gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-14 lg:px-12 lg:py-10">
        <section className="hidden min-w-0 flex-col justify-between self-stretch py-5 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] p-2.5 shadow-2xl">
                <FocoSymbol className="h-8 w-8" color="#FFFFFF" />
              </div>
              <div>
                <FocoLettering className="h-6 w-[126px]" color="#FFFFFF" />
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-500">Fitness premium</p>
              </div>
            </div>

            <div className="mt-24 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-300">
                <Sparkles className="h-3.5 w-3.5" />
                Seu próximo nível começa aqui
              </div>
              <h1 className="max-w-lg text-5xl font-black leading-[1.02] tracking-[-0.055em] xl:text-6xl">
                Treine com
                <span className="mt-1 block text-neutral-500">intenção.</span>
                Evolua com
                <span className="mt-1 block">método.</span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-neutral-400">
                Organize suas fichas, acompanhe cada sessão e construa uma rotina de treino feita para ti — no teu ritmo, com os teus objetivos.
              </p>
            </div>

            <div className="mt-14 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
                  <Activity className="h-4 w-4" />
                </div>
                <p className="text-sm font-black">Treino organizado</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">Fichas e exercícios num só lugar.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="text-sm font-black">Sua evolução</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">Histórico, metas e progresso pessoal.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600">
            <span>FOCO EM EVOLUIR.</span>
            <span>Um treino de cada vez.</span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[500px]">
          <div className="mb-7 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] p-3 shadow-xl">
              <FocoSymbol className="h-9 w-9" color="#FFFFFF" />
            </div>
            <FocoLettering className="h-6 w-[120px]" color="#FFFFFF" />
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-500">Fitness premium</p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111111]/95 shadow-[0_32px_100px_rgba(0,0,0,.5)] backdrop-blur-xl">
            <div className="border-b border-white/[0.07] px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                  {isLogin ? 'Bem-vindo de volta' : isRegister ? 'Comece sua jornada' : isReset ? 'Definir nova senha' : 'Recuperar acesso'}
                </span>
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Acesso seguro
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-[28px]">
                {isLogin ? 'Entre na sua conta.' : isRegister ? 'Crie seu perfil.' : isReset ? 'Defina sua nova senha.' : 'Vamos recuperar seu acesso.'}
              </h2>
              <p className="mt-2 max-w-md text-xs leading-6 text-neutral-400 sm:text-sm">
                {isLogin
                  ? 'Continue de onde parou e mantenha seu treino em movimento.'
                  : isRegister
                  ? 'Sua rotina de treino começa com um perfil simples e personalizado.'
                  : isReset
                  ? 'Crie uma senha nova, diferente das que você já usa em outros serviços.'
                  : 'Informe o e-mail da sua conta para receber as instruções de recuperação.'}
              </p>
            </div>

            <div className="px-5 py-5 sm:px-8 sm:py-7">
              {!isForgot && !isReset && (
                <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/40 p-1" role="tablist" aria-label="Tipo de acesso">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isLogin}
                    onClick={() => changeMode('login')}
                    className={`rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isRegister}
                    onClick={() => changeMode('register')}
                    className={`rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${isRegister ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                  >
                    Criar conta
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.08] p-3.5 text-xs leading-5 text-rose-100" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] p-3.5 text-xs leading-5 text-emerald-100" role="status">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {isRegister && (
                  <div>
                    <label htmlFor="foco-full-name" className="mb-2 block text-[11px] font-bold text-neutral-300">Nome completo</label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                      <input
                        id="foco-full-name"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={160}
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Como podemos te chamar?"
                        className="w-full rounded-xl border border-white/10 bg-black/40 py-3.5 pl-10 pr-3.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/40 focus:ring-2 focus:ring-white/[0.04]"
                      />
                    </div>
                  </div>
                )}

                {!isReset && (
                  <div>
                    <label htmlFor="foco-email" className="mb-2 block text-[11px] font-bold text-neutral-300">E-mail</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                      <input
                        id="foco-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@email.com"
                        className="w-full rounded-xl border border-white/10 bg-black/40 py-3.5 pl-10 pr-3.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/40 focus:ring-2 focus:ring-white/[0.04]"
                      />
                    </div>
                  </div>
                )}

                {!isForgot && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="foco-password" className="block text-[11px] font-bold text-neutral-300">Senha</label>
                      {isLogin && (
                        <button type="button" onClick={() => changeMode('forgot')} className="text-[10px] font-bold text-neutral-400 transition hover:text-white">
                          Esqueci minha senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                      <input
                        id="foco-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isRegister || isReset ? 'new-password' : 'current-password'}
                        required
                        minLength={isRegister || isReset ? 8 : 6}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={isReset ? 'Digite sua nova senha' : isRegister ? 'Crie uma senha com 8+ caracteres' : 'Digite sua senha'}
                        className="w-full rounded-xl border border-white/10 bg-black/40 py-3.5 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/40 focus:ring-2 focus:ring-white/[0.04]"
                      />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 transition hover:text-white">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {(isRegister || isReset) && <p className="mt-2 text-[10px] text-neutral-600">Use pelo menos 8 caracteres e evite senhas já usadas em outros sites.</p>}
                  </div>
                )}

                {(isRegister || isReset) && (
                  <>
                    <div>
                      <label htmlFor="foco-confirm-password" className="mb-2 block text-[11px] font-bold text-neutral-300">Confirmar senha</label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          id="foco-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder={isReset ? 'Digite a nova senha novamente' : 'Digite a senha novamente'}
                          className="w-full rounded-xl border border-white/10 bg-black/40 py-3.5 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/40 focus:ring-2 focus:ring-white/[0.04]"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 transition hover:text-white">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isRegister && <details className="group rounded-xl border border-white/[0.08] bg-black/20">
                      <summary className="cursor-pointer list-none px-4 py-3.5 text-[11px] font-bold text-neutral-300 marker:hidden">
                        Personalizar meu perfil de atleta
                        <span className="float-right text-neutral-600 transition group-open:rotate-180">⌄</span>
                        <span className="mt-1 block text-[10px] font-normal text-neutral-600">Opcional · peso, altura e experiência</span>
                      </summary>
                      <div className="grid grid-cols-2 gap-3 border-t border-white/[0.08] p-4">
                        <div>
                          <label htmlFor="foco-weight" className="mb-2 block text-[10px] font-bold text-neutral-400">Peso (kg)</label>
                          <input id="foco-weight" type="number" min="30" max="350" step="0.1" inputMode="decimal" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="Ex.: 75" className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-white/40" />
                        </div>
                        <div>
                          <label htmlFor="foco-height" className="mb-2 block text-[10px] font-bold text-neutral-400">Altura (cm)</label>
                          <input id="foco-height" type="number" min="100" max="250" step="1" inputMode="numeric" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="Ex.: 175" className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-white/40" />
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="foco-experience" className="mb-2 block text-[10px] font-bold text-neutral-400">Experiência na musculação</label>
                          <select id="foco-experience" value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value as typeof experienceLevel)} className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-3 text-sm text-white outline-none focus:border-white/40">
                            <option value="iniciante">Iniciante</option>
                            <option value="intermediario">Intermediário</option>
                            <option value="avancado">Avançado</option>
                          </select>
                        </div>
                      </div>
                    </details>}
                  </>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[0_8px_28px_rgba(255,255,255,.08)] transition hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{busy ? 'Aguarde um instante...' : isLogin ? 'Entrar no FOCO' : isRegister ? 'Criar minha conta' : isReset ? 'Atualizar senha' : 'Enviar instruções'}</span>
                  {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              {(isForgot || isReset) && (
                <button type="button" onClick={() => { if (isReset) { removeStoredToken(); setRecoveryAccessToken(null); try { sessionStorage.removeItem('foco_password_recovery_pending'); } catch { /* ignore unavailable session storage */ } } changeMode('login'); }} className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-bold text-neutral-400 transition hover:text-white">
                  Voltar para entrar
                </button>
              )}

              {!isForgot && !isReset && (
                <p className="mt-5 text-center text-[11px] text-neutral-500">
                  {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
                  <button type="button" onClick={() => changeMode(isLogin ? 'register' : 'login')} className="font-black text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white">
                    {isLogin ? 'Criar perfil grátis' : 'Entrar na conta'}
                  </button>
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-white/[0.07] bg-black/20 px-5 py-4 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Seus dados de treino são pessoais
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            <InstallAppButton />
            <p className="text-center text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-700">FOCO · Fitness Premium · FOCO EM EVOLUIR.</p>
          </div>
        </section>
      </div>
    </main>
  );
};
