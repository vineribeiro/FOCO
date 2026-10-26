import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AIRecommendation, WorkoutPlan } from '../types';
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ReviewProps {
  setActiveTab: (tab: string) => void;
}

export const ProgressionReviewPage: React.FC<ReviewProps> = ({ setActiveTab }) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  const [intervalDays, setIntervalDays] = useState<15 | 30>(15);
  const [userFeedback, setUserFeedback] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recs, plan] = await Promise.all([
        api.getRecommendations(),
        api.getActiveWorkout(),
      ]);
      setRecommendations(recs);
      setActivePlan(plan);
    } catch (e: any) {
      console.error('Error loading review recommendations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan) {
      setActionMsg({
        type: 'error',
        text: 'Você precisa ter uma ficha ativa no FOCO antes de rodar o ciclo de revisão.',
      });
      return;
    }

    setIsRequesting(true);
    setActionMsg(null);

    try {
      await api.reviewProgression({
        review_interval_days: intervalDays,
        user_feedback: userFeedback,
      });

      setActionMsg({
        type: 'success',
        text: `Ciclo de ${intervalDays} dias processado! Uma proposta com progressão foi gerada para sua avaliação.`,
      });

      loadData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: 'Falha ao processar ciclo com IA: ' + err.message,
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.updateRecommendationStatus(id, 'approved');
      setActionMsg({
        type: 'success',
        text: 'Novo plano aprovado e ativado como sua ficha principal!',
      });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: 'Erro ao aprovar proposta: ' + err.message,
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.updateRecommendationStatus(id, 'rejected');
      setActionMsg({
        type: 'success',
        text: 'Proposta arquivada. Sua ficha atual foi mantida.',
      });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: 'Erro ao recusar proposta: ' + err.message,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Ciclos de Revisão (15 ou 30 Dias)</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          O algoritmo analisa seu volume real, tonelagem levantada e tempo de descanso para recalibrar as cargas e evitar a acomodação neuromuscular.
        </p>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-200'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Trigger Form Card */}
      <form onSubmit={handleTriggerReview} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-white" />
          <span>Solicitar Nova Análise de Sobrecarga Progressiva</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
              Janela de Ciclo de Treino
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIntervalDays(15)}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  intervalDays === 15
                    ? 'bg-white text-black'
                    : 'bg-[#0A0A0A] text-neutral-400 border border-white/10 hover:text-white'
                }`}
              >
                Ciclo 15 Dias
              </button>
              <button
                type="button"
                onClick={() => setIntervalDays(30)}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  intervalDays === 30
                    ? 'bg-white text-black'
                    : 'bg-[#0A0A0A] text-neutral-400 border border-white/10 hover:text-white'
                }`}
              >
                Ciclo 30 Dias
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 font-mono">
              {intervalDays === 15 ? 'Micro-ciclo rápido de ajuste fino de carga' : 'Meso-ciclo completo de variação de estímulo'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
              Feedback do Aluno sobre o Período
            </label>
            <input
              type="text"
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              placeholder="Ex: Carga do supino está leve; quero mais ênfase em tríceps."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isRequesting || !activePlan}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isRequesting ? 'Calculando Sobrecarga...' : 'Analisar e Propor Evolução'}</span>
          </button>
        </div>
      </form>

      {/* Recommendations List with Side-by-Side Comparison */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Propostas de Progressão ({recommendations.length})
        </h3>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-neutral-500 font-mono">
            Carregando histórico de ciclos...
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#141414] border border-dashed border-white/10 text-neutral-400 text-xs">
            Nenhuma revisão gerada ainda. Clique no botão acima para iniciar seu primeiro ciclo de 15 ou 30 dias.
          </div>
        ) : (
          recommendations.map((rec) => {
            const isPending = rec.status === 'pending';

            return (
              <div
                key={rec.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isPending
                    ? 'bg-[#141414] border-white/30 shadow-xl'
                    : 'bg-[#141414]/70 border-white/10'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      <span>Ciclo de {rec.review_interval_days} Dias</span>
                      <span>·</span>
                      <span>
                        {new Date(rec.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white uppercase mt-0.5">
                      {rec.proposed_plan?.name || 'Nova Proposta de Sobrecarga'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleApprove(rec.id)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprovar e Ativar</span>
                        </button>
                        <button
                          onClick={() => handleReject(rec.id)}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          Recusar
                        </button>
                      </>
                    ) : (
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-white/10 text-white"
                      >
                        {rec.status === 'approved' ? 'Aprovado e Ativado' : 'Recusado'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#0A0A0A] border border-white/10 text-xs text-neutral-300 leading-relaxed">
                  <p className="font-bold text-white mb-1 uppercase tracking-wide text-[11px]">Fundamento Biomecânico:</p>
                  <p>{rec.explanation}</p>
                </div>

                {/* Side-by-Side Comparison if Proposed Plan exists */}
                {rec.proposed_plan?.exercises && (
                  <div className="mt-5">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2.5">
                      Comparativo de Sobrecarga e Exercícios Propostos
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
                            <th className="py-2 px-2">OBJETIVO DO AJUSTE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {rec.proposed_plan.exercises.map((ex, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="py-2.5 px-2 font-sans font-bold text-white">
                                {ex.exercise_name}
                              </td>
                              <td className="py-2.5 px-2 font-sans text-neutral-400">
                                {ex.muscle_group}
                              </td>
                              <td className="py-2.5 px-2 text-white font-black">
                                {ex.sets}
                              </td>
                              <td className="py-2.5 px-2 text-neutral-300">
                                {ex.reps_min}-{ex.reps_max}
                              </td>
                              <td className="py-2.5 px-2 text-white font-bold">
                                {ex.suggested_load_kg ? `${ex.suggested_load_kg} kg` : '--'}
                              </td>
                              <td className="py-2.5 px-2 text-neutral-400">
                                {ex.rest_seconds}s
                              </td>
                              <td className="py-2.5 px-2 font-sans text-neutral-400 truncate max-w-[200px]">
                                {ex.notes || 'Progressão de tensão'}
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
          })
        )}
      </div>
    </div>
  );
};
