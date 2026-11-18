import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AIRecommendation, WorkoutPlan } from '../types';
import { actionErrorMessage } from '../utils/actionErrorMessage';
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
  const [loadError, setLoadError] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const [intervalDays, setIntervalDays] = useState<15 | 30>(15);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [recs, plan] = await Promise.all([
        api.getRecommendations(),
        api.getActiveWorkout(),
      ]);
      setRecommendations(recs);
      setActivePlan(plan);
    } catch (e: any) {
      setLoadError(true);
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
        text: 'Ative uma ficha em Meus treinos antes de solicitar a revisão.',
      });
      return;
    }

    setIsRequesting(true);
    setActionMsg(null);

    try {
      await api.reviewProgression({
        review_interval_days: intervalDays,

      });

      setActionMsg({
        type: 'success',
        text: `A revisão dos últimos ${intervalDays} dias está pronta. Confira a proposta antes de aprovar.`,
      });

      loadData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: actionErrorMessage(err, 'Não foi possível confirmar a revisão. Atualize suas revisões antes de tentar novamente.'),
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
        text: 'Ficha aprovada e ativada.',
      });
      loadData();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: actionErrorMessage(err, 'Não foi possível confirmar a ativação da ficha. Confira Meus treinos antes de tentar novamente.'),
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
        text: actionErrorMessage(err, 'Não foi possível confirmar a recusa da proposta. Atualize suas revisões antes de tentar novamente.'),
      });
    }
  };

  return (
    <div className="foco-v4-page foco-progression-review space-y-6 max-w-4xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div>
        <h1>Revisão do treino</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Revise sua ficha a partir dos registros recentes. Confira a proposta antes de aprovar.
        </p>
      </div>

      {actionMsg && (
        <div
          role={actionMsg.type==='error'?'alert':'status'}
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-200'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button type="button" onClick={() => setActionMsg(null)} aria-label="Fechar aviso" className="foco-icon-action">✕</button>
        </div>
      )}

      {/* Trigger Form Card */}
      <form onSubmit={handleTriggerReview} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-white" />
          <span>Solicitar revisão do treino</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wide">
              Período dos registros
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={intervalDays === 15}
                onClick={() => setIntervalDays(15)}
                className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  intervalDays === 15
                    ? 'bg-white text-black'
                    : 'bg-[#0A0A0A] text-neutral-400 border border-white/10 hover:text-white'
                }`}
              >
                Ciclo de 15 dias
              </button>
              <button
                type="button"
                aria-pressed={intervalDays === 30}
                onClick={() => setIntervalDays(30)}
                className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  intervalDays === 30
                    ? 'bg-white text-black'
                    : 'bg-[#0A0A0A] text-neutral-400 border border-white/10 hover:text-white'
                }`}
              >
                Ciclo de 30 dias
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 foco-numeric">
              {intervalDays === 15 ? 'Revisar registros dos últimos 15 dias' : 'Revisar registros dos últimos 30 dias'}
            </p>
          </div>

          <details className="foco-v4-panel-soft p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Como funciona a revisão</summary>
            <p className="mt-3 leading-relaxed">O Método FOCO usa as preferências da sua ficha e os registros do período. A revisão segue regras, sem chamadas à IA ou consumo de créditos. Sua ficha muda após a aprovação.</p>
            <button type="button" className="foco-inline-link mt-3" onClick={()=>setActiveTab('personal')}>Tirar dúvidas com o Personal FOCO</button>
          </details>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isRequesting || !activePlan || loadError}
            className="foco-v6-primary w-full sm:w-auto disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isRequesting ? 'Revisando registros...' : 'Revisar treino'}</span>
          </button>
        </div>
      </form>

      {/* Recommendations List with Side-by-Side Comparison */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Propostas de Progressão ({recommendations.length})
        </h3>

        {loadError ? (
          <div role="alert" className="foco-feedback space-y-3">
            <p>Não foi possível consultar suas revisões. Confira a conexão e tente novamente.</p>
            <button type="button" className="foco-v6-secondary" onClick={() => void loadData()}>Tentar novamente</button>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-xs text-neutral-500 foco-numeric">
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
                    <div className="flex items-center gap-2 text-[10px] foco-numeric font-bold text-neutral-400 uppercase tracking-widest">
                      <span>Ciclo de {rec.review_interval_days} Dias</span>
                      <span>·</span>
                      <span>
                        {new Date(rec.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white uppercase mt-0.5">
                      {rec.proposed_plan?.name || 'Proposta de treino'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleApprove(rec.id)}
                          className="foco-v6-primary"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprovar e ativar ficha</span>
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
                        className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/10 text-white"
                      >
                        {rec.status === 'approved' ? 'Aprovado e Ativado' : 'Recusado'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#0A0A0A] border border-white/10 text-xs text-neutral-300 leading-relaxed">
                  <p className="font-bold text-white mb-1 uppercase tracking-wide text-[11px]">Sobre a proposta</p>
                  <p>{rec.explanation}</p>
                </div>

                {/* Side-by-Side Comparison if Proposed Plan exists */}
                {rec.proposed_plan?.exercises && (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5">
                      Exercícios propostos
                    </p>

                    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Comparação da proposta de treino">
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
                        <tbody className="divide-y divide-white/5 foco-numeric">
                          {rec.proposed_plan.exercises.map((ex, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="py-2.5 px-2 font-sans font-bold text-white">
                                {ex.exercise_name}
                              </td>
                              <td className="py-2.5 px-2 font-sans text-neutral-400">
                                {ex.muscle_group}
                              </td>
                              <td className="py-2.5 px-2 text-white font-bold">
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
                                {ex.notes || 'Confira execução e progressão'}
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
