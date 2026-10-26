import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BodyMeasurement, WorkoutSession } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  Plus,
  Weight,
  Trash2,
  Activity,
} from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New measurement form
  const [measurementType, setMeasurementType] = useState('peso');
  const [measurementValue, setMeasurementValue] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('kg');
  const [isSaving, setIsSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, s] = await Promise.all([
        api.getMeasurements(),
        api.getSessions(),
      ]);
      setMeasurements(m);
      setSessions(s);
    } catch (e: any) {
      console.error('Error fetching progress data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measurementValue || isNaN(Number(measurementValue))) {
      setActionMsg({ type: 'error', text: 'Informe um valor numérico válido.' });
      return;
    }

    setIsSaving(true);
    setActionMsg(null);

    try {
      await api.addMeasurement({
        measurement_type: measurementType,
        value: Number(measurementValue),
        unit: measurementUnit,
        measured_at: new Date().toISOString(),
      });

      setMeasurementValue('');
      setActionMsg({ type: 'success', text: 'Medida corporal registrada com sucesso!' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Falha ao salvar medida: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    try {
      await api.deleteMeasurement(id);
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Erro ao remover medida: ' + err.message });
    }
  };

  const weightData = measurements
    .filter((m) => m.measurement_type.toLowerCase() === 'peso')
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: Number(m.value),
    }));

  const volumeData = sessions
    .filter((s) => s.status === 'completed' && s.sets && s.sets.length > 0)
    .slice(-10)
    .map((s) => {
      const totalTonnage = s.sets!.reduce((acc, cur) => acc + (cur.completed ? cur.load_kg * cur.repetitions : 0), 0);
      return {
        sessionName: s.plan_name ? s.plan_name.split('-')[0].trim() : 'Treino',
        date: new Date(s.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        tonelagem: Math.round(totalTonnage),
      };
    });

  return (
    <div className="space-y-6 pb-32 max-w-md mx-auto">
      
      {/* Header */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
          Métricas Reais
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight">Evolução & Gráficos</h2>
      </div>

      {actionMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Weight Evolution Chart (Monochrome Area) */}
      <div className="p-5 rounded-2xl bg-[#0E1015] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-white" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Peso Corporal (kg)
            </h3>
          </div>
          {weightData.length > 0 && (
            <span className="text-xs font-mono font-bold text-white">
              {weightData[weightData.length - 1].peso} kg
            </span>
          )}
        </div>

        <div className="h-56 w-full">
          {weightData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="monoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262B35" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1015',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#FFF',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  name="Peso (kg)"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#monoGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-neutral-500 text-center">
              Cadastre pelo menos 2 pesagens para plotar o gráfico.
            </div>
          )}
        </div>
      </div>

      {/* Training Tonnage per Session (Monochrome Bar) */}
      <div className="p-5 rounded-2xl bg-[#0E1015] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Volume por Sessão (kg)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">
            Tonelagem
          </span>
        </div>

        <div className="h-56 w-full">
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262B35" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1015',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#FFF',
                  }}
                />
                <Bar
                  dataKey="tonelagem"
                  name="Tonelagem (kg)"
                  fill="#FFFFFF"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-neutral-500 text-center">
              Complete treinos para registrar o volume levantado.
            </div>
          )}
        </div>
      </div>

      {/* Record Measurement Form & List */}
      <form
        onSubmit={handleAddMeasurement}
        className="p-5 rounded-2xl bg-[#0E1015] border border-white/10 space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
          <Plus className="w-4 h-4 text-white" />
          <span>Registrar Medida Corporal</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Tipo de Medida</label>
            <select
              value={measurementType}
              onChange={(e) => {
                setMeasurementType(e.target.value);
                setMeasurementUnit(e.target.value === 'peso' ? 'kg' : 'cm');
              }}
              className="w-full px-2.5 py-2 rounded-xl bg-[#000000] border border-white/10 text-white text-xs focus:outline-none focus:border-white"
            >
              <option value="peso">Peso (kg)</option>
              <option value="braco_direito">Braço Dir. (cm)</option>
              <option value="braco_esquerdo">Braço Esq. (cm)</option>
              <option value="torax">Tórax (cm)</option>
              <option value="cintura">Cintura (cm)</option>
              <option value="coxa_direita">Coxa Dir. (cm)</option>
              <option value="panturrilha">Panturrilha (cm)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Valor</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                step="0.1"
                required
                value={measurementValue}
                onChange={(e) => setMeasurementValue(e.target.value)}
                placeholder="Ex: 82.5"
                className="flex-1 px-2.5 py-2 rounded-xl bg-[#000000] border border-white/10 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-white"
              />
              <span className="px-2.5 py-2 rounded-xl bg-[#000000] border border-white/10 text-xs font-bold text-neutral-400 flex items-center">
                {measurementUnit}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
        >
          {isSaving ? 'Salvando...' : 'Adicionar Medida'}
        </button>
      </form>

      {/* History Table */}
      <div className="p-5 rounded-2xl bg-[#0E1015] border border-white/10 space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Histórico de Medições ({measurements.length})
        </h3>

        <div className="max-h-56 overflow-y-auto">
          {measurements.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">Nenhuma medição registrada.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-neutral-500 font-semibold border-b border-white/5 text-[10px]">
                  <th className="py-2 px-1">DATA</th>
                  <th className="py-2 px-1">TIPO</th>
                  <th className="py-2 px-1 font-mono">VALOR</th>
                  <th className="py-2 px-1 text-right">EXCLUIR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {measurements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 px-1 text-neutral-400">
                      {new Date(m.measured_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 px-1 font-sans font-bold text-white capitalize">
                      {m.measurement_type.replace('_', ' ')}
                    </td>
                    <td className="py-2 px-1 text-white font-black">
                      {m.value} {m.unit}
                    </td>
                    <td className="py-2 px-1 text-right">
                      <button
                        onClick={() => handleDeleteMeasurement(m.id)}
                        className="p-1 text-neutral-500 hover:text-white rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
