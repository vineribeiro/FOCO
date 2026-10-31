import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { isCardioSession } from '../utils/cardio';
import { savePreferredTrainingDay } from '../data/exerciseLibrary';
import type { AIRecommendation, UploadedFile, WorkoutPlan, WorkoutSession } from '../types';
import {
  Activity, ArrowRight, BarChart3, BellRing, BookOpen, CalendarDays,
  CheckCircle2, ChevronRight, ClipboardList, Clock3, Dumbbell, FilePlus2,
  FileUp, ScanLine, Sparkles, TrendingUp,
} from 'lucide-react';

interface DashboardProps { setActiveTab: (tab: string) => void }
const DAYS = [
  { id: 'segunda', short: 'Seg' }, { id: 'terca', short: 'Ter' },
  { id: 'quarta', short: 'Qua' }, { id: 'quinta', short: 'Qui' },
  { id: 'sexta', short: 'Sex' }, { id: 'sabado', short: 'Sáb' },
  { id: 'domingo', short: 'Dom' },
] as const;
const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const isBodyAssessment = (file: UploadedFile) =>
  file.processing_status === 'processed' && !!file.extracted_data
  && typeof file.extracted_data.summary === 'string'
  && Array.isArray(file.extracted_data.metrics);

function findMetric(file: UploadedFile | undefined, pattern: RegExp): string | null {
  if (!file) return null;
  const entries = file.extracted_data?.metrics;
  if (!Array.isArray(entries)) return null;
  const matching = entries.find((metric: { name?: unknown; value?: unknown }) =>
    typeof metric?.name === 'string' && pattern.test(normalize(metric.name))
      && !/(gordura|muscular|osseo|visceral|proteina|magra)/.test(normalize(metric.name)));
  return matching && typeof matching.value === 'string' ? matching.value : null;
}

export const DashboardPage: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user, profile } = useAuth();
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [filesUnavailable, setFilesUnavailable] = useState(false);
  const [planUnavailable, setPlanUnavailable] = useState(false);
  const [sessionsUnavailable, setSessionsUnavailable] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWorkoutPreview, setShowWorkoutPreview] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      api.getActiveWorkout().then(value => ({ value, failed: false })).catch(() => ({ value: null, failed: true })),
      api.getSessions().then(value => ({ value, failed: false })).catch(() => ({ value: [] as WorkoutSession[], failed: true })),
      api.getFiles().catch(() => null),
      api.getRecommendations().catch(() => [] as AIRecommendation[]),
    ]).then(([planResult, sessionsResult, uploadedFiles, allRecommendations]) => {
      if (!mounted) return;
      setActivePlan(planResult.value);
      setPlanUnavailable(planResult.failed);
      setSessions(sessionsResult.value);
      setSessionsUnavailable(sessionsResult.failed);
      setFiles(uploadedFiles || []);
      setFilesUnavailable(uploadedFiles === null);
      setRecommendations(allRecommendations);
    }).finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const now = new Date();
  const todayIndex = weekdayIndex(now);
  const todayKey = DAYS[todayIndex].id;
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'atleta';
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const exercises = activePlan?.exercises || [];
  const isDailyPlan = exercises.some(item => !!item.training_day);
  const todayExercises = isDailyPlan ? exercises.filter(item => !item.training_day || item.training_day === todayKey) : exercises;
  const todayMuscles = [...new Set(todayExercises.map(item => item.muscle_group).filter(Boolean))];
  const heroTitle = todayMuscles.length ? todayMuscles.slice(0,2).join(' + ')
    : activePlan?.name || 'Treino feito para você';

  const recentSessions = useMemo(() => {
    const weekStart = new Date();
    weekStart.setHours(0,0,0,0);
    weekStart.setDate(weekStart.getDate() - weekdayIndex(weekStart));
    return sessions.filter(s => s.status === 'completed' && new Date(s.started_at) >= weekStart);
  }, [sessions]);
  const strengthSessions = recentSessions.filter(session => !isCardioSession(session));
  const weeklyCardioMinutes = Math.round(recentSessions.filter(isCardioSession).reduce(
    (sum, session) => sum + Math.max(0, Number(session.duration_seconds) || 0), 0) / 60);
  const totalCompleted = sessions.filter(s => s.status === 'completed').length;
  const completedDays = new Set(strengthSessions.map(s => weekdayIndex(new Date(s.started_at))));
  const targetPerWeek = activePlan?.weekly_frequency || 0;
  const weeklyMinutes = Math.round(recentSessions.reduce((sum, session) => sum + Math.max(0, Number(session.duration_seconds) || 0), 0) / 60);
  const bodyFiles = files.filter(isBodyAssessment).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestAssessment = bodyFiles[0];
  const lastDate = latestAssessment ? new Date(latestAssessment.created_at) : null;
  const daysSinceAssessment = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;
  const isOkokDue = daysSinceAssessment !== null && daysSinceAssessment >= 15;
  const weightMetric = findMetric(latestAssessment, /^(peso|weight)(\s|$)/);
  const displayWeight = weightMetric || (profile?.current_weight_kg ? String(profile.current_weight_kg).replace('.', ',') + ' kg' : '—');
  const openAssessment = () => {
    try { sessionStorage.setItem('foco_upload_mode', 'body'); } catch { /* navigate anyway */ }
    setActiveTab('arquivos');
  };
  const pendingReview = recommendations.find(r => r.status === 'pending');
  const openScheduledWorkout = (day: typeof DAYS[number]['id']) => {
    savePreferredTrainingDay(day);
    setActiveTab('sessao');
  };

  if (isLoading) return <div className="foco-v4-page space-y-4" role="status" aria-label="Carregando painel">
    <div className="h-20 animate-pulse rounded-2xl bg-[#171717]" />
    <div className="h-64 animate-pulse rounded-3xl bg-[#171717]" />
    <div className="grid grid-cols-3 gap-2">{[1,2,3].map(n => <div key={n} className="h-32 animate-pulse rounded-2xl bg-[#171717]" />)}</div>
  </div>;

  return (
    <div className="foco-v4-page space-y-[17px] sm:space-y-6">
      {showWorkoutPreview && activePlan && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Detalhes do treino de hoje">
        <section className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-[#141414] p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div><p className="foco-v4-eyebrow">Treino de hoje</p><h2 className="mt-2 text-2xl font-extrabold">{heroTitle}</h2><p className="mt-2 text-sm text-neutral-400">{todayExercises.length} exercícios • {activePlan.name}</p></div>
            <button type="button" onClick={() => setShowWorkoutPreview(false)} aria-label="Fechar detalhes" className="min-h-11 min-w-11 rounded-xl border border-white/20 text-xl">×</button>
          </div>
          <ol className="mt-5 space-y-2">{todayExercises.map((exercise, index) => <li key={index} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">{index+1}</span><div className="min-w-0"><p className="font-bold">{exercise.exercise_name}</p><p className="mt-1 text-xs text-neutral-400">{exercise.muscle_group} • {exercise.sets || 3} séries • {exercise.reps_min || 10}{exercise.reps_max && exercise.reps_max !== exercise.reps_min ? '–' + exercise.reps_max : ''} repetições • {exercise.rest_seconds || 60}s descanso</p></div></div>
          </li>)}</ol>
          <button type="button" onClick={() => {setShowWorkoutPreview(false);openScheduledWorkout(todayKey);}} className="foco-v4-action mt-5 w-full justify-center">Ir para iniciar treino <ChevronRight className="h-5 w-5" /></button>
        </section>
      </div>}
      <header className="pb-1">
        <h1 className="foco-v4-heading">{greeting}, <span className="font-extrabold">{firstName}</span></h1>
        <p className="mt-2 text-sm text-neutral-300">Disciplina hoje, resultado sempre.</p>
      </header>

      {planUnavailable && <div role="alert" className="foco-v4-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="max-w-xl text-sm text-neutral-300">Não foi possível consultar sua ficha agora. Seus dados não foram alterados.</p>
        <button type="button" onClick={() => window.location.reload()} className="foco-v4-secondary">Tentar novamente</button>
      </div>}

      {activePlan ? (
        <section className="foco-v4-hero cursor-pointer" aria-labelledby="foco-workout-hero" role="button" tabIndex={0} aria-label="Ver detalhes do treino de hoje" onClick={() => { if (todayExercises.length) setShowWorkoutPreview(true); else setActiveTab("treinos"); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); if (todayExercises.length) setShowWorkoutPreview(true); else setActiveTab("treinos"); } }}>
          <div className="foco-v4-hero-content relative z-10 space-y-3">
            <p className="foco-v4-eyebrow !text-neutral-300">{todayExercises.length ? "Treino de hoje" : "Dia de recuperação"}</p>
            <h2 id="foco-workout-hero" className="max-w-[430px] text-[29px] font-extrabold leading-[1.13] tracking-[-.055em] sm:text-[37px]">{todayExercises.length ? heroTitle : 'Recuperação também faz parte.'}</h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-200">
              <span className="inline-flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5" />{todayExercises.length ? todayExercises.length + ' exercícios' : 'Sem exercício atribuído a hoje'}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{activePlan.weekly_frequency} dias por semana</span>
            </div>
            <button type="button" onClick={() => todayExercises.length ? setShowWorkoutPreview(true) : setActiveTab("treinos")} className="foco-v4-action !mt-4 w-fit">
              <span>{todayExercises.length ? "Ver treino de hoje" : "Ver meu plano"}</span><span className="foco-v4-cta-arrow"><ChevronRight className="h-5 w-5" /></span>
            </button>
          </div>
        </section>
      ) : !planUnavailable ? (
        <section className="foco-v4-hero" aria-labelledby="foco-onboarding">
          <div className="foco-v4-hero-content relative z-10 space-y-3">
            <p className="foco-v4-eyebrow !text-neutral-300">Comece com FOCO IA</p>
            <h2 id="foco-onboarding" className="text-[29px] font-extrabold tracking-tight sm:text-[37px]">Seu plano começa aqui.</h2>
            <p className="max-w-[360px] text-xs leading-relaxed text-neutral-200">Informe seus objetivos, escolha os grupos prioritários e gere uma ficha personalizada.</p>
            <button type="button" onClick={() => setActiveTab('anamnese')} className="foco-v4-action !mt-4">
              <span>Configurar meu treino</span><span className="foco-v4-cta-arrow"><ChevronRight className="h-5 w-5" /></span>
            </button>
          </div>
        </section>
      ) : null}

      <button type="button" onClick={() => setActiveTab('cardio')}
        className="foco-v4-panel flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:border-white/35 sm:px-6">
        <span className="flex min-w-0 items-center gap-3">
          <span className="foco-v4-info-icon !h-12 !w-12 shrink-0"><Activity className="h-5 w-5" /></span>
          <span><strong className="block text-sm">Hoje quero fazer cardio</strong>
            <span className="mt-1 block text-xs text-neutral-400">Atividade livre sem mudar minha ficha · ${weeklyCardioMinutes} min de cardio nesta semana</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-neutral-300" />
      </button>

      <button type="button" onClick={openAssessment}
        className="foco-v4-panel flex min-h-[102px] w-full items-center gap-3.5 px-4 py-4 text-left transition hover:border-white/35 sm:px-6">
        <span className="foco-v4-info-icon !h-16 !w-16 shrink-0"><ScanLine className="h-7 w-7 text-neutral-300" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold sm:text-base">
            {filesUnavailable ? 'Consultar avaliação OKOK' : isOkokDue ? 'Atualize sua avaliação OKOK' : latestAssessment ? 'Sua avaliação OKOK' : 'Envie sua avaliação OKOK'}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
            {isOkokDue ? 'Último relatório há ' + daysSinceAssessment + ' dias. Atualize para ajudar a IA na próxima ficha.' :
              latestAssessment ? 'Última avaliação em ' + lastDate?.toLocaleDateString('pt-BR') + '. Veja seus indicadores.' :
              'Faça o upload do relatório para melhorar a personalização do treino.'}
          </span>
        </span>
        {isOkokDue ? <BellRing className="h-5 w-5 shrink-0 text-white" /> : <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />}
      </button>

      {pendingReview && <button type="button" onClick={() => setActiveTab('revisao')}
        className="foco-v4-panel flex w-full items-start gap-3 px-4 py-3 text-left hover:border-white/30">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
        <span className="flex-1"><strong className="text-sm">Sua revisão de treino está pronta</strong><span className="mt-1 block text-xs text-neutral-400">{pendingReview.explanation}</span></span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0" />
      </button>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3" aria-label="Seus indicadores">
        <button type="button" onClick={() => setActiveTab('historico')} className="foco-v4-stat text-left">
          <BarChart3 className="foco-v4-stat-icon" aria-hidden="true" />
          <p className="foco-v4-stat-value">{sessionsUnavailable ? '—' : strengthSessions.length}/{targetPerWeek || '—'}</p>
          <p className="mt-1.5 text-xs leading-snug text-neutral-300">Treinos na semana</p>
          <div className="mt-3 flex gap-1">{Array.from({length: Math.min(targetPerWeek || 4, 6)},(_,i)=><span key={i} className={'h-1.5 min-w-0 flex-1 rounded-full ' + (!sessionsUnavailable && i<recentSessions.length?'bg-white':'bg-[#414141]')} />)}</div>
        </button>
        <button type="button" onClick={openAssessment} className="foco-v4-stat text-left">
          <ScanLine className="foco-v4-stat-icon" aria-hidden="true" />
          <p className="foco-v4-stat-value break-words">{displayWeight}</p>
          <p className="mt-1.5 text-xs leading-snug text-neutral-300">{weightMetric ? 'Avaliação atual' : 'Peso do perfil'}</p>
        </button>
        <button type="button" onClick={() => setActiveTab('progresso')} className="foco-v4-stat text-left">
          <TrendingUp className="foco-v4-stat-icon" aria-hidden="true" />
          <p className="foco-v4-stat-value">{sessionsUnavailable ? '—' : totalCompleted}</p>
          <p className="mt-1.5 text-xs leading-snug text-neutral-300">Sessões concluídas</p>
        </button>
        <button type="button" onClick={() => setActiveTab("historico")} className="foco-v4-stat text-left">
          <Clock3 className="foco-v4-stat-icon" aria-hidden="true" />
          <p className="foco-v4-stat-value">{sessionsUnavailable ? "—" : weeklyMinutes} <span className="text-sm tracking-normal">min</span></p>
          <p className="mt-1.5 text-xs leading-snug text-neutral-300">Tempo nesta semana</p>
        </button>
      </div>

      {activePlan && (
        <section className="foco-v4-panel px-3.5 py-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div><h2 className="foco-v4-section-title">Seu plano</h2><p className="mt-1 text-xs text-neutral-400">Toque em um dia para abrir a sessão correspondente.</p></div>
            <button type="button" onClick={() => setActiveTab('treinos')} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-neutral-200 hover:text-white">
              Ver plano completo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="foco-v4-week">
            {DAYS.map((day,idx) => {
              const daily = isDailyPlan ? exercises.filter(e => !e.training_day || e.training_day === day.id) : exercises;
              const muscles = [...new Set(daily.map(e=>e.muscle_group).filter(Boolean))];
              const done = completedDays.has(idx);
              return <button type="button" key={day.id} onClick={() => daily.length ? openScheduledWorkout(day.id) : setActiveTab('cardio')}
                className={'foco-v4-day transition hover:border-white/35 ' + (todayIndex === idx ? 'foco-v4-day-today' : '')}
                aria-label={day.short + ': ' + (daily.length ? (muscles.join(', ') || 'Treino') + '. Abrir sessão desse dia' : 'Dia de descanso. Cardio opcional')}>
                <span className="text-xs text-neutral-300">{day.short}</span>
                <span className="line-clamp-2 min-h-[33px] text-xs font-semibold leading-snug">
                  {isDailyPlan ? (daily.length ? muscles.slice(0,2).join(' + ') || 'Treino' : 'Descanso · Cardio opcional') : 'Flexível'}
                </span>
                <Dumbbell className="mt-auto h-4 w-4 text-neutral-400" />
                <span className={'mt-1 flex h-5 w-5 items-center justify-center rounded-full border ' +
                  (done && !sessionsUnavailable ? 'border-white bg-white text-black' : todayIndex === idx ? 'border-white bg-white text-white' : 'border-[#777] text-transparent')}>
                  {done && !sessionsUnavailable ? <CheckCircle2 className="h-4 w-4" /> : todayIndex === idx ? <span className="h-1.5 w-1.5 rounded-full bg-black" /> : null}
                </span>
              </button>;
            })}
          </div>
        </section>
      )}

      <section className="foco-v4-panel p-3.5 sm:p-5">
        <h2 className="foco-v4-section-title mb-3 px-1">Ações rápidas</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[
            {label:'Nova ficha',description:'Crie um treino personalizado',icon:FilePlus2, action:() => setActiveTab('novo-treino')},
            {label:'Enviar avaliação',description:'Atualize seu físico (OKOK)',icon:ScanLine, action:openAssessment},
            {label:'Biblioteca',description:'Explore os exercícios',icon:BookOpen, action:() => setActiveTab('biblioteca')},
            {label:'Progresso',description:'Acompanhe sua evolução',icon:Activity, action:() => setActiveTab('progresso')},
          ].map(item => <button type="button" key={item.label} onClick={item.action} className="foco-v4-quick">
            <span className="foco-v4-info-icon"><item.icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-[13px]">{item.label}</strong><span className="mt-1 block text-xs text-neutral-300">{item.description}</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
          </button>)}
        </div>
      </section>
      {!activePlan && <button type="button" onClick={() => setActiveTab('anamnese')} className="foco-v4-secondary w-full">
        <ClipboardList className="h-4 w-4" /> Preencher minha anamnese <ArrowRight className="h-4 w-4" />
      </button>}
    </div>
  );
};
