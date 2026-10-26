import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Goal } from '../types';
import { Target, Plus, Trash2 } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [goalType, setGoalType] = useState('Hipertrofia');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [targetDate, setTargetDate] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGoals();
      setGoals(data);
    } catch (e: any) {
      console.error('Error fetching goals:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setMsg({ type: 'error', text: 'Preencha a descrição do seu objetivo.' });
      return;
    }

    setIsSaving(true);
    setMsg(null);

    try {
      await api.addGoal({
        goal_type: goalType,
        description,
        priority: Number(priority),
        target_date: targetDate || undefined,
      });

      setDescription('');
      setTargetDate('');
      setMsg({ type: 'success', text: 'Meta salva com sucesso!' });
      loadGoals();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Falha ao salvar meta: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await api.deleteGoal(id);
      loadGoals();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Erro ao remover meta: ' + err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 text-white">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Metas & Foco Esportivo</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Defina alvos claros de força, ganho de massa ou emagrecimento para nortear os ciclos de progressão.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            msg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Add Goal Form */}
      <form onSubmit={handleAddGoal} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
          <Plus className="w-4 h-4 text-white" />
          <span>Cadastrar Novo Alvo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Tipo de Meta</label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
            >
              <option value="Hipertrofia">Hipertrofia (Massa Magra)</option>
              <option value="Força Máxima">Força Máxima (Carga Alvo)</option>
              <option value="Definição">Definição / Redução de Gordura</option>
              <option value="Condicionamento">Condicionamento Físico Geral</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs focus:outline-none focus:border-white"
            >
              <option value={1}>Alta Prioridade (Principal)</option>
              <option value={2}>Média Prioridade</option>
              <option value={3}>Secundária</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Data Alvo</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-300 mb-1 uppercase tracking-wide">Descrição do Alvo</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Bater 100kg no Supino Reto para 8 reps ou atingir 85kg com 12% de BF"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-white"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            <span>{isSaving ? 'Salvando...' : 'Salvar Objetivo'}</span>
          </button>
        </div>
      </form>

      {/* Goals List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Metas Registradas ({goals.length})
        </h3>

        {goals.length === 0 ? (
          <p className="text-xs text-neutral-500 py-6 text-center font-mono">Nenhuma meta ativa cadastrada.</p>
        ) : (
          goals.map((g) => (
            <div
              key={g.id}
              className="p-4 rounded-xl bg-[#141414] border border-white/10 flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{g.description}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-mono uppercase">
                      Prioridade {g.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                    <span>{g.goal_type}</span>
                    {g.target_date && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          Alvo: {new Date(g.target_date).toLocaleDateString('pt-BR')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteGoal(g.id)}
                className="p-1.5 text-neutral-500 hover:text-white rounded transition-colors cursor-pointer"
                title="Remover Meta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
