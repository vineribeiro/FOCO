import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { cardioDetails, isCardioSession } from '../utils/cardio';
import { WorkoutSession } from '../types';
import {
  History,
  Dumbbell,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface HistoryProps {
  setActiveTab: (tab: string) => void;
}

export const HistoryPage: React.FC<HistoryProps> = ({ setActiveTab }) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      setIsLoading(true);
      setLoadError(false);
      try {
        const data = await api.getSessions();
        setSessions(data);
        if (data.length > 0) {
          setExpandedSessionId(data[0].id);
        }
      } catch (e) {
        console.error('Error fetching sessions:', e);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, [reloadKey]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Histórico de Treinos</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Registro de musculação e cardio, com tempo, distância, séries e cargas.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('sessao')}
          className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
        >
          Iniciar Novo Treino
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-neutral-500 font-mono">
          Carregando histórico de sessões...
        </div>
      ) : loadError ? (
        <section role="alert" className="rounded-2xl border border-amber-200/30 bg-[#1C1C13] p-6">
          <h3 className="text-base font-bold">Histórico indisponível</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">Não foi possível consultar as sessões salvas. Seus registros não foram apagados.</p>
          <button type="button" onClick={()=>setReloadKey(n=>n+1)} className="mt-4 min-h-11 rounded-xl bg-[#C8F040] px-5 text-sm font-bold text-black">Tentar novamente</button>
        </section>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141414] border border-dashed border-white/10 space-y-3">
          <History className="w-10 h-10 text-neutral-500 mx-auto" />
          <h3 className="text-sm font-black uppercase text-white">Nenhum treino concluído ainda</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Abra a aba "Sessão Ativa" e conclua seu primeiro treino para registrar o progresso no banco de dados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const isExpanded = expandedSessionId === sess.id;
            const cardio = cardioDetails(sess);
            const isCardio = isCardioSession(sess);
            const totalTonnage = (sess.sets || []).reduce(
              (acc, cur) => acc + (cur.completed ? cur.load_kg * cur.repetitions : 0),
              0
            );

            return (
              <div
                key={sess.id}
                className="rounded-2xl bg-[#141414] border border-white/10 overflow-hidden transition-all"
              >
                {/* Header Row */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={'foco-history-details-'+sess.id}
                  onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                  className="w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C8F040] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                      {isCardio ? <Activity className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white uppercase">
                        {sess.plan_name || 'Treino Realizado'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5 font-mono">
                        <span>{new Date(sess.started_at).toLocaleDateString('pt-BR')}</span>
                        <span>·</span>
                        <span>{Math.round(sess.duration_seconds / 60)} min</span>
                        <span>·</span>
                        <span>{isCardio ? 'Atividade cardiovascular' : (sess.sets || []).length + ' séries'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-neutral-500 block uppercase">{isCardio ? 'Distância / Andares' : 'Tonelagem Total'}</span>
                      <span className="text-xs font-black text-white tabular-nums">
                        {isCardio ? (cardio?.metric || '—') : Math.round(totalTonnage) + ' kg'}
                      </span>
                    </div>

                    <span className="p-1 text-neutral-400" aria-hidden="true">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>
                </button>

                {/* Expanded Sets Details */}
                {isExpanded && (
                  <div id={'foco-history-details-'+sess.id} className="px-5 pb-5 pt-2 border-t border-white/10 space-y-3">
                    {sess.notes && (
                      <p className="text-xs text-neutral-300 bg-[#0A0A0A] p-3 rounded-xl border border-white/10">
                        <span className="font-bold text-white uppercase text-[10px]">Anotações:</span> {sess.notes}
                      </p>
                    )}

                    {!isCardio && <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-neutral-500 font-bold border-b border-white/10 uppercase text-[10px]">
                            <th className="py-2 px-2">EXERCÍCIO</th>
                            <th className="py-2 px-2">SÉRIE</th>
                            <th className="py-2 px-2">CARGA</th>
                            <th className="py-2 px-2">REPS</th>
                            <th className="py-2 px-2 text-right">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {(sess.sets || []).map((s, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-2 font-sans font-medium text-white">
                                {s.exercise_name}
                              </td>
                              <td className="py-2 px-2 text-neutral-400">
                                #{s.set_number}
                              </td>
                              <td className="py-2 px-2 text-white font-bold">
                                {s.load_kg} kg
                              </td>
                              <td className="py-2 px-2 text-neutral-300">
                                {s.repetitions} reps
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span className="inline-flex items-center gap-1 text-[11px] text-white font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  <span>Concluído</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
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
