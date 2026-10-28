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
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('90');

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
      setActionMsg({ type: 'error', text: 'Não foi possível consultar a evolução. Verifique sua conexão e tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measurementValue || !Number.isFinite(Number(measurementValue)) || Number(measurementValue) <= 0) {
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
    if (!window.confirm('Excluir esta medição corporal? Esta ação não pode ser desfeita.')) return;
    try {
      await api.deleteMeasurement(id);
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: 'Erro ao remover medida: ' + err.message });
    }
  };

  const weightData = measurements
    .filter((m) => m.measurement_type.toLowerCase() === 'peso')
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: Number(m.value),
      timestamp: new Date(m.measured_at).getTime(),
    }));

  const volumeData = sessions
    .filter((s) => s.status === 'completed' && s.sets && s.sets.length > 0)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .slice(-10)
    .map((s) => {
      const totalTonnage = s.sets!.reduce((acc, cur) => acc + (cur.completed ? cur.load_kg * cur.repetitions : 0), 0);
      return {
        sessionName: s.plan_name ? s.plan_name.split('-')[0].trim() : 'Treino',
        date: new Date(s.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        tonelagem: Math.round(totalTonnage),
        timestamp: new Date(s.started_at).getTime(),
      };
    });

  const cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
  const visibleWeightData = weightData.filter(point => point.timestamp >= cutoff);
  const visibleVolumeData = volumeData.filter(point => point.timestamp >= cutoff);
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklyCompleted = completedSessions.filter(s => new Date(s.started_at) >= weekStart).length;
  const lifetimeMinutes = Math.round(completedSessions.reduce((sum, session) => sum + Math.max(0, Number(session.duration_seconds) || 0), 0) / 60);
  const latestWeight = weightData.length ? weightData[weightData.length - 1].peso : null;
  const weightDelta = visibleWeightData.length >= 2 ? visibleWeightData[visibleWeightData.length - 1].peso - visibleWeightData[0].peso : null;

  return (
    <div className="foco-v4-page space-y-5">
      
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="foco-v4-eyebrow">Métricas registradas</span>
          <h1 className="foco-v4-heading">Minha evolução</h1>
          <p className="mt-2 text-sm text-neutral-400">Seus treinos e medidas, com dados reais.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-300">
          Período dos gráficos
          <select aria-label="Período dos gráficos" className="foco-v4-field !min-h-11 !py-2" value={period} onChange={event => setPeriod(event.target.value as '30' | '90' | 'all')}>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o histórico</option>
          </select>
        </label>
      </header>
      {isLoading && <div role="status" className="foco-v4-panel p-4 text-sm text-neutral-300">Atualizando seus registros...</div>}
      {!isLoading && <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4" aria-label="Resumo da evolução">
        {[
          { label: 'Treinos concluídos', value: String(completedSessions.length), hint: 'Desde o início' },
          { label: 'Nesta semana', value: String(weeklyCompleted), hint: 'Sessões concluídas' },
          { label: 'Tempo de treino', value: lifetimeMinutes + ' min', hint: 'Tempo acumulado' },
          { label: 'Peso registrado', value: latestWeight === null ? '—' : latestWeight.toLocaleString('pt-BR') + ' kg', hint: 'Última medição' },
        ].map(item => <div className="foco-v4-stat" key={item.label}>
          <span className="foco-v4-eyebrow">{item.label}</span>
          <p className="foco-v4-stat-value mt-3">{item.value}</p>
          <p className="mt-2 text-xs text-neutral-400">{item.hint}</p>
        </div>)}
      </div>}
      {weightDelta !== null && !isLoading && <p className="text-xs text-neutral-400">Variação de peso no período: <strong className="text-white">{weightDelta > 0 ? '+' : ''}{weightDelta.toLocaleString('pt-BR', {maximumFractionDigits: 2})} kg</strong>. Compare medidas feitas em condições semelhantes.</p>}

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

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      {/* Weight Evolution Chart (Monochrome Area) */}
      <div className="foco-v4-panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-white" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Peso Corporal (kg)
            </h3>
          </div>
          {visibleWeightData.length > 0 && (
            <span className="text-xs font-mono font-bold text-white">
              {visibleWeightData[visibleWeightData.length - 1].peso} kg
            </span>
          )}
        </div>

        <div className="h-56 w-full">
          {visibleWeightData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleWeightData}>
                <defs>
                  <linearGradient id="monoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} />
                <YAxis
                  stroke="#A3A3A3"
                  fontSize={10}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
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
              São necessárias duas pesagens no período selecionado.
            </div>
          )}
        </div>
      </div>

      {/* Training Tonnage per Session (Monochrome Bar) */}
      <div className="p-5 rounded-2xl bg-[#171717] border border-white/10 space-y-3">
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
          {visibleVolumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visibleVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303030" />
                <XAxis dataKey="date" stroke="#A3A3A3" fontSize={10} />
                <YAxis stroke="#A3A3A3" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
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
              Nenhum treino com séries concluídas no período selecionado.
            </div>
          )}
        </div>
      </div>

      </div>
      {/* Record Measurement Form & List */}
      <form
        onSubmit={handleAddMeasurement}
        className="p-5 rounded-2xl bg-[#171717] border border-white/10 space-y-3"
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
              className="foco-v4-field w-full"
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
                min="0.1"
                inputMode="decimal"
                aria-label="Valor da medida"
                className="foco-v4-field min-w-0 flex-1 font-mono tabular-nums"
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
          className="foco-v4-action w-full"
        >
          {isSaving ? 'Salvando...' : 'Adicionar Medida'}
        </button>
      </form>

      {/* History Table */}
      <div className="p-5 rounded-2xl bg-[#171717] border border-white/10 space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          Histórico de Medições ({measurements.length})
        </h3>

        <div className="max-h-64 overflow-auto">
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
                        className="foco-touch rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                        aria-label={"Excluir medição de " + m.measurement_type.replaceAll("_", " ") + " de " + new Date(m.measured_at).toLocaleDateString("pt-BR")}
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
