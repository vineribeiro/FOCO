import React, { useState, useEffect, useRef } from 'react';
import { FocoV6Status, FocoV6Segment } from '../components/FocoV6UI';
import { getOkokAssessments, getOkokTrend, type OkokAssessment } from '../utils/okokMetrics';
import { api } from '../services/api';
import { OkokEvolutionSection } from '../components/OkokEvolutionSection';
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

export const ProgressPage: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const openOkok = () => {
    try { sessionStorage.setItem('foco_upload_mode', 'body'); } catch { /* route remains available */ }
    setActiveTab('arquivos');
  };
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const [period, setPeriod] = useState<'7' | '30' | '90' | '365' | 'all'>('30');
  const [assessments, setAssessments] = useState<OkokAssessment[]>([]);
  const reportRef=useRef<HTMLDetailsElement>(null);

  // New measurement form
  const [measurementType, setMeasurementType] = useState('peso');
  const [measurementValue, setMeasurementValue] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('kg');
  const [isSaving, setIsSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setDataUnavailable(false);
    try {
      const [m, s, f] = await Promise.all([
        api.getMeasurements(),
        api.getSessions(),
        api.getFiles().catch(()=>[]),
      ]);
      setAssessments(getOkokAssessments(f));
      setMeasurements(m);
      setSessions(s);
    } catch (e: any) {
      setDataUnavailable(true);
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
  const visibleVolumeData = volumeData.filter(point => point.timestamp >= cutoff).slice(-20);
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklyCompleted = completedSessions.filter(s => new Date(s.started_at) >= weekStart).length;
  const lifetimeMinutes = Math.round(completedSessions.reduce((sum, session) => sum + Math.max(0, Number(session.duration_seconds) || 0), 0) / 60);
  const latestWeight = weightData.length ? weightData[weightData.length - 1].peso : null;
  const weightDelta = visibleWeightData.length >= 2 ? visibleWeightData[visibleWeightData.length - 1].peso - visibleWeightData[0].peso : null;

  const latestAssessment=assessments[assessments.length-1];
  const metric=(prefix:string)=>latestAssessment?.metrics.find(m=>m.key.startsWith(prefix+':'));
  const prior=assessments[assessments.length-2];
  const deltaFor=(prefix:string)=>{
    const current=metric(prefix);
    const previous=prior?.metrics.find(m=>m.key===current?.key);
    return current?.numericValue!=null && previous?.numericValue!=null ? current.numericValue-previous.numericValue:null;
  };
  const heroMetric=metric('peso');
  const heroValue=heroMetric?.value || (latestWeight!==null?latestWeight.toLocaleString('pt-BR')+' kg':'—');
  const series=heroMetric?getOkokTrend(assessments,heroMetric.key).filter(p=>p.timestamp>=cutoff)
    :visibleWeightData.map(p=>({value:p.peso,date:p.date,timestamp:p.timestamp,unit:'kg',assessmentId:p.date}));
  const numericSeries=series.filter(p=>Number.isFinite(p.value));
  const lo=numericSeries.length?Math.min(...numericSeries.map(p=>p.value))-0.5:0;
  const hi=numericSeries.length?Math.max(...numericSeries.map(p=>p.value))+0.5:1;
  const svgPoints=numericSeries.map((p,i)=>{
    const x=6+(numericSeries.length===1?.5:i/(numericSeries.length-1))*288;
    const y=90-(p.value-lo)/Math.max(.01,hi-lo)*72;
    return [x,y] as const;
  });
  const pathPoints=svgPoints.map(p=>p.join(',')).join(' ');
  const tiles=[
    {label:'Gordura corporal',key:'gordura_corporal'},
    {label:'Massa muscular',key:metric('musculo_esqueletico')?'musculo_esqueletico':'massa_muscular'},
    {label:'Gordura visceral',key:'gordura_visceral'},
    {label:'IMC',key:'imc'},
  ];
  return (
    <div className="foco-v6-progress foco-v4-page foco-motion-progress">
      <div className="md:hidden"><FocoV6Status/></div>
      <header className="foco-v6-mobile-title"><h1>Minha evolução</h1></header>
      <FocoV6Segment label="Período de evolução" options={[{value:'7',label:'7 dias'},{value:'30',label:'30 dias'},{value:'90',label:'90 dias'},{value:'365',label:'1 ano'}]}
        value={period} onChange={value=>setPeriod(value as '7'|'30'|'90'|'365')}/>
      <section className="foco-v6-progress-hero">
        <p>Peso corporal</p>
        <div className="foco-v6-progress-value">{heroValue}</div>
        {numericSeries.length>=2?<svg className="foco-v6-progress-svg" viewBox="0 0 300 106" preserveAspectRatio="none" role="img" aria-label="Tendência do peso no período">
          <defs><linearGradient id="v6-weight-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8F040" stopOpacity=".32"/><stop offset="100%" stopColor="#C8F040" stopOpacity="0"/>
          </linearGradient></defs>
          <path d={'M'+pathPoints.replaceAll(' ',' L')+' L294 104 L6 104Z'} fill="url(#v6-weight-gradient)"/>
          <polyline points={pathPoints} fill="none" stroke="#C8F040" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
          {svgPoints.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===svgPoints.length-1?3.6:2.2} fill="#C8F040"/>)}
        </svg>:<div className="my-5 flex h-[92px] items-center justify-center rounded-xl border border-dashed border-[#C8F040]/15 text-center text-xs text-[#A5B09E]">
          {isLoading?'Consultando dados...':'Adicione duas avaliações para visualizar sua tendência.'}
        </div>}
        {numericSeries.length>=2&&<div className="flex justify-between text-[10px] text-[#B0B8AB]"><span>{numericSeries[0].date}</span><span>{numericSeries[numericSeries.length-1].date}</span></div>}
      </section>
      <div className="foco-v6-progress-tiles">
        {tiles.map(tile=>{
          const value=metric(tile.key), delta=deltaFor(tile.key);
          return <div className="foco-v6-progress-tile" key={tile.key}>
            <p>{tile.label}</p><strong>{value?.value||'—'}</strong>
            {delta!==null&&<em>{delta>0?'+':''}{delta.toLocaleString('pt-BR',{maximumFractionDigits:2})} {value?.unit||''} desde o relatório anterior</em>}
          </div>;
        })}
      </div>
      <button type="button" className="foco-v6-glass-button w-full" onClick={()=>{reportRef.current?.setAttribute('open','');reportRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}>
        Ver relatório completo <TrendingUp size={15}/>
      </button>
      <details ref={reportRef} id="foco-v6-report" className="foco-v6-glass rounded-2xl p-3">
        <summary className="cursor-pointer px-2 py-3 text-sm font-bold text-[#C8F040]">Histórico, gráficos e ajustes</summary>
    <div className="foco-v5-evolution foco-v4-page space-y-5">
      
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="foco-v4-eyebrow">EVOLUÇÃO / SEUS DADOS</span>
          <h1 className="foco-v4-heading">Minha <span className="text-[#C8F040]">evolução.</span></h1>
          <p className="mt-2 text-sm text-neutral-400">Acompanhe sua composição corporal OKOK, seus treinos e as medidas registradas.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-neutral-300">
          Período dos gráficos
          <select aria-label="Período dos gráficos" className="foco-v4-field !min-h-11 !py-2" value={period} onChange={event => setPeriod(event.target.value as '7' | '30' | '90' | '365' | 'all')}>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o histórico</option>
          </select>
        </label>
      </header>
      <OkokEvolutionSection period={period==='7'?'30':period==='365'?'all':period} onOpenAssessment={openOkok} />

      {isLoading && <div role="status" className="foco-v4-panel p-4 text-sm text-neutral-300">Atualizando seus registros...</div>}
      {dataUnavailable && !isLoading && <div className="foco-v4-panel flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
        <p className="text-sm text-neutral-200">Os dados de treinos e medidas manuais não puderam ser carregados. Nenhum valor foi presumido.</p>
        <button type="button" onClick={() => void loadData()} className="foco-v4-secondary">Tentar novamente</button>
      </div>}
      {!isLoading && !dataUnavailable && <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4" aria-label="Resumo da evolução">
        {[
          { label: 'Treinos concluídos', value: String(completedSessions.length), hint: 'Desde o início' },
          { label: 'Nesta semana', value: String(weeklyCompleted), hint: 'Sessões concluídas' },
          { label: 'Tempo de treino', value: lifetimeMinutes + ' min', hint: 'Tempo acumulado' },
          { label: 'Peso manual', value: latestWeight === null ? '—' : latestWeight.toLocaleString('pt-BR') + ' kg', hint: 'Último registro manual' },
        ].map(item => <div className="foco-v4-stat" key={item.label}>
          <span className="foco-v4-eyebrow">{item.label}</span>
          <p className="foco-v4-stat-value mt-3">{item.value}</p>
          <p className="mt-2 text-xs text-neutral-400">{item.hint}</p>
        </div>)}
      </div>}
      {weightDelta !== null && !isLoading && !dataUnavailable && <p className="text-xs text-neutral-400">Variação do peso manual no período: <strong className="text-white">{weightDelta > 0 ? '+' : ''}{weightDelta.toLocaleString('pt-BR', {maximumFractionDigits: 2})} kg</strong>. Compare medidas feitas em condições semelhantes.</p>}

      {actionMsg && (
        <div role={actionMsg.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-xl text-sm flex items-center justify-between border ${
            actionMsg.type === 'success'
              ? 'bg-white/10 border-white/30 text-white'
              : 'bg-white/5 border-white/20 text-neutral-300'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button type="button" onClick={() => setActionMsg(null)} aria-label="Fechar aviso" className="foco-touch ml-2 rounded-lg font-bold">✕</button>
        </div>
      )}

      {!dataUnavailable && <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      {/* Weight Evolution Chart (Monochrome Area) */}
      <div className="foco-v4-panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Weight className="w-4 h-4 text-white" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Peso manual (kg)
            </h3>
          </div>
          {visibleWeightData.length > 0 && (
            <span className="text-xs font-mono font-bold text-white">
              {visibleWeightData[visibleWeightData.length - 1].peso} kg
            </span>
          )}
        </div>

        <div className="h-56 min-w-0 w-full">
          {visibleWeightData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibleWeightData}>
                <defs>
                  <linearGradient id="monoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8F040" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C8F040" stopOpacity={0} />
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
                    backgroundColor: '#1A2116',
                    borderColor: 'rgba(213,255,64,0.22)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#FFF',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  name="Peso (kg)"
                  stroke="#C8F040"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#monoGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-neutral-300">
              São necessários dois registros manuais de peso no período. As avaliações OKOK aparecem na seção acima.
            </div>
          )}
        </div>
      </div>

      {/* Training Tonnage per Session (Monochrome Bar) */}
      <div className="foco-v4-panel space-y-3 p-4 sm:p-5">
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

        <div className="h-56 min-w-0 w-full">
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
                  fill="#C8F040"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-neutral-300">
              Nenhum treino com séries concluídas no período selecionado.
            </div>
          )}
        </div>
      </div>

      </div>}
      {/* Record Measurement Form & List */}
      <form
        onSubmit={handleAddMeasurement}
        className="foco-v4-panel space-y-3 p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
          <Plus className="w-4 h-4 text-white" />
          <span>Registrar medida manual</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="foco-measurement-kind" className="mb-2 block text-xs font-semibold text-neutral-300">Tipo de medida</label>
            <select
              id="foco-measurement-kind"
              value={measurementType}
              onChange={(e) => {
                setMeasurementType(e.target.value);
                setMeasurementUnit(e.target.value === 'peso' ? 'kg' : 'cm');
              }}
              className="foco-v4-field w-full !text-base sm:!text-sm"
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
            <label htmlFor="foco-measurement-value" className="mb-2 block text-xs font-semibold text-neutral-300">Valor</label>
            <div className="flex gap-1.5">
              <input
                id="foco-measurement-value"
                type="number"
                step="0.1"
                required
                value={measurementValue}
                onChange={(e) => setMeasurementValue(e.target.value)}
                placeholder="Ex: 82.5"
                min="0.1"
                inputMode="decimal"
                aria-label="Valor da medida"
                className="foco-v4-field min-w-0 flex-1 font-mono tabular-nums !text-base"
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
      {!dataUnavailable && <div className="foco-v4-panel space-y-3 p-4 sm:p-5">
        <h3 className="text-sm font-extrabold text-white">
          Histórico de medidas manuais ({measurements.length})
        </h3>

        <div className="max-h-64 overflow-auto">
          {measurements.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">Nenhuma medida manual registrada.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-neutral-300">
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
      </div>}
    </div>
      </details>
    </div>
  );
};
