import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ExerciseIllustration } from '../components/ExerciseIllustration';
import { WorkoutPlan } from '../types';
import {
  Dumbbell,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';

interface WorkoutsPageProps {
  setActiveTab: (tab: string) => void;
}

export const WorkoutsPage: React.FC<WorkoutsPageProps> = ({ setActiveTab }) => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWorkouts();
      setPlans(data);
      if (data.length > 0 && !expandedPlanId) {
        setExpandedPlanId(data[0].id);
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: 'Erro ao carregar fichas: ' + e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      await api.activateWorkout(id);
      setActionMsg({ type: 'success', text: 'Ficha ativada com sucesso!' });
      loadPlans();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: 'Falha ao ativar ficha: ' + e.message });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteWorkout(id);
      setActionMsg({ type: 'success', text: 'Ficha excluída com sucesso.' });
      loadPlans();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: 'Falha ao excluir ficha: ' + e.message });
    }
  };

  return (
    <div className="space-y-6 pb-32 text-white">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Fichas & Planos de Treino</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Gerencie suas divisões de treino, planos gerados por IA e importações de fichas físicas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('biblioteca')}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer border border-white/15 transition-all"
          >
            Biblioteca de exercícios
          </button>
          <button
            onClick={() => setActiveTab('novo-treino')}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Ficha</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="py-16 text-center text-neutral-500 text-xs font-mono">
          Carregando fichas de treino...
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#141414] border border-dashed border-white/10 space-y-4">
          <Dumbbell className="w-12 h-12 text-neutral-500 mx-auto" />
          <div>
            <h3 className="text-base font-black uppercase text-white">Nenhuma ficha cadastrada</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
              Gere uma ficha personalizada usando o Gemini 2.5 Flash ou faça upload de fotos da sua ficha de academia.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveTab('novo-treino')}
              className="px-4 py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Montar com IA
            </button>
            <button
              onClick={() => setActiveTab('arquivos')}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
            >
              Digitalizar Ficha
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const isActive = plan.status === 'ativo';

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-[#141414] border-white/40 shadow-lg'
                    : 'bg-[#141414]/70 border-white/10'
                }`}
              >
                {/* Plan Card Summary Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white text-black font-black'
                          : 'bg-white/5 text-neutral-400 border border-white/10'
                      }`}
                    >
                      <Dumbbell className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white uppercase">{plan.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-white text-black text-[10px] font-black uppercase tracking-wider">
                            Ativa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 font-mono">
                        <span>Frequência: {plan.weekly_frequency}x/sem</span>
                        <span>·</span>
                        <span>Objetivo: {plan.goal}</span>
                        <span>·</span>
                        <span>{plan.exercises?.length || 0} exercícios</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleActivate(plan.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-colors cursor-pointer"
                      >
                        Tornar Ficha Ativa
                      </button>
                    )}

                    {isActive && (
                      <button
                        onClick={() => setActiveTab('sessao')}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Treinar Agora</span>
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white cursor-pointer"
                      title={isExpanded ? 'Recolher' : 'Ver Exercícios'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDelete(plan.id, plan.name)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title="Excluir Ficha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Exercises Detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/10">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">
                      Grade de Exercícios e Séries
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-neutral-500 border-b border-white/10 font-bold uppercase text-[10px]">
                            <th className="py-2 px-2">EXERCÍCIO</th>
                            <th className="py-2 px-2">GRUPAMENTO</th>
                            <th className="py-2 px-2">SÉRIES</th>
                            <th className="py-2 px-2">FAIXA DE REPS</th>
                            <th className="py-2 px-2">CARGA</th>
                            <th className="py-2 px-2">DESCANSO</th>
                            <th className="py-2 px-2">OBSERVAÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {(plan.exercises || []).map((ex, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-2 font-sans font-bold text-white">
                                <div className="flex min-w-[190px] items-center gap-2.5">
                                  <ExerciseIllustration exerciseName={ex.exercise_name} muscleGroup={ex.muscle_group} className="h-16 w-16 shrink-0" />
                                  <span>{ex.exercise_name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400 font-sans">
                                {ex.muscle_group}
                              </td>
                              <td className="py-2.5 px-2 text-white font-black">
                                {ex.sets}
                              </td>
                              <td className="py-2.5 px-2 text-neutral-300">
                                {ex.reps_min} - {ex.reps_max}
                              </td>
                              <td className="py-2.5 px-2 text-white font-bold">
                                {ex.suggested_load_kg ? `${ex.suggested_load_kg} kg` : '--'}
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400">
                                {ex.rest_seconds}s
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400 font-sans truncate max-w-[200px]">
                                {ex.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
