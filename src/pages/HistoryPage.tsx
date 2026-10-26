import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WorkoutSession } from '../types';
import {
  History,
  Dumbbell,
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
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await api.getSessions();
        setSessions(data);
        if (data.length > 0) {
          setExpandedSessionId(data[0].id);
        }
      } catch (e) {
        console.error('Error fetching sessions:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Histórico de Treinos</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Registro cronológico de todas as sessões concluídas, tonelagem e séries executadas.
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
                <div
                  onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                      <Dumbbell className="w-5 h-5" />
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
                        <span>{(sess.sets || []).length} séries</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-neutral-500 block uppercase">Tonelagem Total</span>
                      <span className="text-xs font-black text-white tabular-nums">
                        {Math.round(totalTonnage)} kg
                      </span>
                    </div>

                    <button className="p-1 text-neutral-400 hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Sets Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/10 space-y-3">
                    {sess.notes && (
                      <p className="text-xs text-neutral-300 bg-[#0A0A0A] p-3 rounded-xl border border-white/10">
                        <span className="font-bold text-white uppercase text-[10px]">Anotações:</span> {sess.notes}
                      </p>
                    )}

                    <div className="overflow-x-auto">
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
