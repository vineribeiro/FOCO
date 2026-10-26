import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WorkoutPlan, WorkoutSession, Goal, AIRecommendation } from '../types';
import {
  Play,
  Dumbbell,
  Sparkles,
  RotateCcw,
  TrendingUp,
  Clock,
  ArrowRight,
  MoreVertical,
  Activity,
  Flame,
  CheckCircle2,
  ChevronRight,
  Rotate3d,
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenExercise3D: (exName: string, group: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ setActiveTab, onOpenExercise3D }) => {
  const { user, profile } = useAuth();
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [plan, userSessions, userGoals, userRecs] = await Promise.all([
          api.getActiveWorkout().catch(() => null),
          api.getSessions().catch(() => []),
          api.getGoals().catch(() => []),
          api.getRecommendations().catch(() => []),
        ]);
        setActivePlan(plan);
        setSessions(userSessions);
        setGoals(userGoals);
        setRecommendations(userRecs);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const pendingRec = recommendations.find((r) => r.status === 'pending');

  const muscleChips = [
    { name: 'Peito', pct: '100%' },
    { name: 'Ombros', pct: '85%' },
    { name: 'Tríceps', pct: '70%' },
    { name: 'Core', pct: '60%' },
  ];

  return (
    <div className="space-y-5 pb-32 max-w-md mx-auto">
      
      {/* Fitbod Top Breadcrumb (Monochrome) */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setActiveTab('perfil')}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-white text-black font-black text-xs flex items-center justify-center">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <span className="text-xs font-black text-white group-hover:text-neutral-300 transition-colors flex items-center gap-1">
            Meu Plano <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </span>
        </button>

        <button
          onClick={() => setActiveTab('musculos')}
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white bg-white/10 hover:bg-white hover:text-black px-3 py-1 rounded-full border border-white/20 cursor-pointer transition-all"
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>Ver 3D</span>
        </button>
      </div>

      {/* Routine Title Header (Monochrome Fitbod) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">
            {activePlan ? activePlan.name.split('-')[0].trim() : 'Push Day'}
          </h1>

          <button
            onClick={() => setActiveTab('treinos')}
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Trocar</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
          <span>{activePlan?.exercises?.length || 7} Exercícios</span>
          <span>·</span>
          <span>{activePlan?.weekly_frequency || 4}x por semana</span>
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-[#0E1015] border border-white/10 text-neutral-300 font-bold">
            ~50 min
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#0E1015] border border-white/10 text-white font-bold">
            Sobrecarga Ativa
          </span>
        </div>
      </div>

      {/* Target Muscles Carousel Mini (Grayscale) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            Músculos Alvo de Hoje
          </span>
          <button
            onClick={() => setActiveTab('musculos')}
            className="text-[11px] font-bold text-white hover:underline"
          >
            Anatomia 3D
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {muscleChips.map((m) => (
            <div
              key={m.name}
              onClick={() => setActiveTab('musculos')}
              className="p-2.5 rounded-xl bg-[#0E1015] border border-white/10 flex items-center gap-2.5 shrink-0 cursor-pointer hover:border-white/30 transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center text-xs font-black">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-black text-white">{m.name}</p>
                <p className="text-[9px] font-mono font-bold text-neutral-400">
                  {m.pct}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cycle Review Alert if Pending (Monochrome) */}
      {pendingRec && (
        <div className="p-3.5 rounded-2xl bg-[#14171D] border border-white/20 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-white shrink-0" />
            <div>
              <p className="text-xs font-black text-white">Ciclo de Sobrecarga Pronto!</p>
              <p className="text-[10px] text-neutral-400 line-clamp-1">{pendingRec.explanation}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('revisao')}
            className="px-3 py-1.5 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-wider shrink-0 cursor-pointer hover:bg-neutral-200 transition-colors"
          >
            Revisar
          </button>
        </div>
      )}

      {/* Exercises Connected Vertical Track */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Grade de Execução
          </span>
          <span className="text-[11px] text-neutral-400 font-mono">
            Toque em "3D" para ver postura
          </span>
        </div>

        <div className="relative pl-3 space-y-3">
          {/* Vertical Track Line */}
          <div className="absolute left-[26px] top-4 bottom-6 w-[2px] bg-white/10" />

          {(activePlan?.exercises || []).map((ex, idx) => {
            const isFirst = idx === 0;

            return (
              <div key={idx} className="relative flex items-start gap-3.5 group">
                <div className="z-10 w-7 h-7 rounded-full bg-[#000000] border-2 border-white/20 group-hover:border-white flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0 mt-3 transition-colors">
                  {idx + 1}
                </div>

                <div className="flex-1 p-3.5 rounded-2xl bg-[#0E1015] border border-white/10 hover:border-white/30 transition-all shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isFirst && (
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-400 block mb-0.5">
                          Exercício de Foco
                        </span>
                      )}
                      <h4 className="text-sm font-black text-white tracking-tight leading-tight truncate">
                        {ex.exercise_name}
                      </h4>
                      <p className="text-xs font-mono text-neutral-400 mt-1">
                        <span className="text-white font-bold">{ex.sets} Séries</span>
                        <span> · </span>
                        <span>{ex.reps_min}-{ex.reps_max} Reps</span>
                        <span> · </span>
                        <span className="text-white font-bold">
                          {ex.suggested_load_kg ? `${ex.suggested_load_kg} kg` : 'Livre'}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenExercise3D(ex.exercise_name, ex.muscle_group)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 border border-white/10"
                      title="Ver Boneco 3D"
                    >
                      <Rotate3d className="w-3.5 h-3.5" />
                      <span>3D</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Workout Button (Integrated into natural flow, no fixed overlap) */}
      <div className="pt-2">
        <button
          onClick={() => setActiveTab('sessao')}
          className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current text-black" />
          <span>INICIAR TREINO DE HOJE</span>
        </button>
      </div>
    </div>
  );
};
