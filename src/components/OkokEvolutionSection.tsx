import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, CalendarDays, ChevronDown, FileUp, ScanLine, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { getOkokAssessments, getOkokTrend, type OkokAssessment, type OkokMetric } from '../utils/okokMetrics';

interface Props {
  period: '30' | '90' | 'all';
  onOpenAssessment: () => void;
}
const categories: OkokMetric['category'][] = ['Composição corporal', 'Metabolismo', 'Circunferências', 'Outros indicadores'];
const displayNumber = (value: number): string => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const displayDate = (iso: string): string => new Date(iso).toLocaleDateString('pt-BR');
const priorityKeys = ['peso', 'gordura_corporal', 'musculo_esqueletico', 'massa_muscular', 'gordura_visceral', 'imc'];

/** Keep the four most relevant OKOK indicators visible; preserve all others
 * in an accessible expandable section so no extracted data is discarded.
 */
function prioritizedMetrics(metrics: OkokMetric[]): OkokMetric[] {
  const used = new Set<number>();
  const selected: OkokMetric[] = [];
  for (const key of priorityKeys) {
    const index = metrics.findIndex((metric, idx) => !used.has(idx) && metric.key.startsWith(key + ':'));
    if (index < 0) continue;
    selected.push(metrics[index]);
    used.add(index);
    if (selected.length === 4) break;
  }
  for (let index = 0; index < metrics.length && selected.length < 4; index++) {
    if (!used.has(index)) { selected.push(metrics[index]); used.add(index); }
  }
  return selected;
}

export const OkokEvolutionSection: React.FC<Props> = ({ period, onOpenAssessment }) => {
  const [assessments, setAssessments] = useState<OkokAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const files = await api.getFiles();
      setAssessments(getOkokAssessments(files));
    } catch {
      setError('Não foi possível carregar suas avaliações OKOK. Verifique sua conexão ou sessão.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const latest = assessments[assessments.length - 1];
  const availableSeries = useMemo(() => {
    const seen = new Set<string>();
    const metrics: Pick<OkokMetric, 'key' | 'name' | 'unit'>[] = [];
    for (const assessment of [...assessments].reverse()) {
      for (const metric of assessment.metrics) {
        if (seen.has(metric.key) || metric.numericValue === null) continue;
        seen.add(metric.key);
        metrics.push({ key: metric.key, name: metric.name, unit: metric.unit });
      }
    }
    return metrics;
  }, [assessments]);
  const preferredKey = availableSeries.find(metric => metric.key === 'peso:kg')?.key
    || availableSeries.find(metric => metric.key.startsWith('gordura_corporal:') && metric.unit === '%')?.key
    || availableSeries[0]?.key || '';
  const activeKey = availableSeries.some(metric => metric.key === selectedMetric) ? selectedMetric : preferredKey;
  const activeMetric = availableSeries.find(metric => metric.key === activeKey);
  const cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
  const chartData = getOkokTrend(assessments, activeKey).filter(point => point.timestamp >= cutoff);

  const previous = assessments.length > 1 ? assessments[assessments.length - 2] : undefined;
  const featured = latest ? prioritizedMetrics(latest.metrics) : [];
  const featuredIndices = new Set(featured.map(metric => latest?.metrics.indexOf(metric) ?? -1));
  const otherMetrics = latest?.metrics.filter((_, index) => !featuredIndices.has(index)) || [];
  const metricDelta = (metric: OkokMetric): number | null => {
    if (metric.numericValue === null) return null;
    // Compare only against another independent upload with the same metric AND unit.
    const preceding = [...assessments].slice(0, -1).reverse()
      .flatMap(report => report.metrics)
      .find(item => item.key === metric.key && item.numericValue !== null);
    return preceding?.numericValue === null || preceding?.numericValue === undefined
      ? null : metric.numericValue - preceding.numericValue;
  };

  if (isLoading) return (
    <section className="foco-v4-panel space-y-4 p-5" aria-label="Carregando avaliação OKOK" role="status">
      <div className="flex items-center gap-3"><ScanLine className="h-6 w-6 text-neutral-400" /><span className="font-bold">Buscando suas avaliações OKOK...</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[1, 2, 3, 4].map(item =>
        <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/5" />)}</div>
    </section>
  );
  if (error) return (
    <section className="foco-v4-panel flex flex-col gap-4 p-5" role="alert">
      <div className="flex items-center gap-2"><ScanLine className="h-5 w-5" /><h2 className="foco-v4-section-title">Avaliação OKOK indisponível</h2></div>
      <p className="text-sm text-neutral-300">{error}</p>
      <button type="button" onClick={() => void load()} className="foco-v4-secondary w-fit">Tentar novamente</button>
    </section>
  );
  if (!latest) return (
    <section className="foco-v4-panel space-y-4 p-5 sm:p-7" aria-labelledby="foco-okok-title">
      <div className="foco-v4-info-icon"><ScanLine className="h-6 w-6" /></div>
      <div>
        <p className="foco-v4-eyebrow">Sua composição corporal</p>
        <h2 className="foco-v4-section-title mt-1" id="foco-okok-title">Evolução com seus dados OKOK</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-400">Nenhuma avaliação OKOK analisada nesta conta. Envie o relatório da balança para que peso, composição corporal e os demais indicadores encontrados apareçam automaticamente aqui.</p>
      </div>
      <button type="button" onClick={onOpenAssessment} className="foco-v4-action w-fit"><FileUp className="h-4 w-4" /> Enviar avaliação OKOK <ArrowRight className="h-4 w-4" /></button>
    </section>
  );

  return (
    <section className="foco-v4-panel space-y-5 p-4 sm:p-6" aria-labelledby="foco-okok-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="foco-v4-info-icon"><ScanLine className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="foco-v4-eyebrow">Composição corporal · OKOK</p>
            <h2 className="foco-v4-section-title mt-1" id="foco-okok-title">Seu relatório em números</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Último envio: {displayDate(latest.uploadedAt)}
              <span>·</span>{assessments.length} {assessments.length === 1 ? 'relatório' : 'relatórios'}
            </p>
          </div>
        </div>
        <button type="button" onClick={onOpenAssessment} className="foco-v4-secondary !min-h-11 !text-xs">
          <FileUp className="h-4 w-4" /> Nova avaliação
        </button>
      </header>

      {latest.metrics.length > 0 ? (
        <div className="space-y-4">
          <section aria-label="Principais indicadores OKOK" className="space-y-3">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Principais indicadores</h3>
              <p className="mt-1 text-xs text-neutral-300">Valores extraídos do último relatório, sem estimativas adicionais.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {featured.map((metric, index) => {
                const delta = metricDelta(metric);
                return <article key={metric.key + ':' + index} className="foco-v4-data-tile !min-h-[140px]">
                  <p className="text-xs font-semibold leading-snug text-neutral-200">{metric.name}</p>
                  <strong className="mt-3 block break-words !text-[clamp(19px,4vw,26px)] leading-tight tracking-tight text-white">{metric.value}</strong>
                  {delta !== null && <p className="mt-2 text-xs text-neutral-300">
                    <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                    {delta > 0 ? '+' : ''}{displayNumber(delta)} {metric.unit} vs. anterior
                  </p>}
                  {metric.interpretation && <details className="mt-3 text-xs leading-relaxed text-neutral-300">
                    <summary className="min-h-8 cursor-pointer py-1 font-semibold text-neutral-200">Sobre o indicador</summary>
                    <p className="mt-1 whitespace-pre-line">{metric.interpretation}</p>
                  </details>}
                </article>;
              })}
            </div>
          </section>
          {otherMetrics.length > 0 && <details className="rounded-2xl border border-white/15 bg-white/[.025] p-4 sm:p-5">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-bold text-white">
              <span>Ver todos os indicadores ({latest.metrics.length})</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" />
            </summary>
            <p className="mt-2 text-xs text-neutral-300">Mais {otherMetrics.length} indicadores disponíveis no arquivo OKOK.</p>
            <div className="mt-4 space-y-5">
              {categories.map(category => {
                const group = otherMetrics.filter(item => item.category === category);
                if (!group.length) return null;
                return <section key={category} aria-label={category}>
                  <h4 className="mb-3 text-xs font-bold text-neutral-200">{category}</h4>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {group.map((metric, index) => {
                      const delta = metricDelta(metric);
                      return <article key={metric.key + ':' + index} className="foco-v4-data-tile !min-h-0">
                        <p className="text-xs font-semibold text-neutral-200">{metric.name}</p>
                        <strong className="mt-2 block break-words !text-xl text-white">{metric.value}</strong>
                        {delta !== null && <p className="mt-2 text-xs text-neutral-300">
                          {delta > 0 ? '+' : ''}{displayNumber(delta)} {metric.unit} vs. anterior
                        </p>}
                        {metric.interpretation && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-300">{metric.interpretation}</p>}
                      </article>;
                    })}
                  </div>
                </section>;
              })}
            </div>
          </details>}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 p-4 text-sm text-neutral-300">O relatório foi analisado, mas não contém valores estruturados legíveis. Abra a avaliação para conferir a leitura ou envie um arquivo mais nítido.</p>
      )}

      {availableSeries.length > 0 && <section className="space-y-3 border-t border-white/10 pt-5" aria-label="Evolução entre avaliações OKOK">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="foco-v4-section-title">Comparativo OKOK</h3>
            <p className="mt-1 text-xs text-neutral-400">Histórico de indicadores identificados nos relatórios.</p>
          </div>
          <label className="flex min-w-[185px] flex-col gap-1 text-[11px] text-neutral-300">
            Indicador
            <span className="relative">
              <select value={activeKey} onChange={event => setSelectedMetric(event.target.value)} className="foco-v4-field w-full appearance-none !pr-9" aria-label="Selecionar indicador OKOK">
                {availableSeries.map(metric => <option key={metric.key} value={metric.key}>{metric.name}{metric.unit ? ' (' + metric.unit + ')' : ''}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </span>
          </label>
        </div>
        {chartData.length >= 2 ? <>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -16 }}>
                <defs>
                  <linearGradient id="foco-okok-trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff" stopOpacity={0.27} />
                    <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#333" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} width={48} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: 14, background: '#151515', color: '#fff', border: '1px solid #444' }}
                  formatter={(value) => [displayNumber(Number(value)) + (activeMetric?.unit ? ' ' + activeMetric.unit : ''), activeMetric?.name || 'Indicador']}
                />
                <Area dataKey="value" type="monotone" stroke="#fff" strokeWidth={2.5} fill="url(#foco-okok-trend)" dot={{ fill: '#fff', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-baseline gap-3 text-xs text-neutral-300">
            <span>{chartData.length} medições comparáveis</span>
            <strong className="ml-auto text-sm text-white">
              {chartData[chartData.length - 1].value - chartData[0].value > 0 ? '+' : ''}
              {displayNumber(chartData[chartData.length - 1].value - chartData[0].value)} {activeMetric?.unit}
            </strong>
            <span>no período</span>
          </div>
        </> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.025] p-5 text-center">
          <Activity className="mx-auto mb-2 h-5 w-5 text-neutral-400" />
          <p className="text-sm font-semibold">Ainda não há duas avaliações comparáveis neste período.</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">A última medição continua disponível acima. Envie uma nova avaliação OKOK para acompanhar mudanças, ou amplie o filtro de datas.</p>
        </div>}
      </section>}

      {latest.summary && <details className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <summary className="cursor-pointer text-sm font-bold text-white">Interpretação do último relatório</summary>
        <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-neutral-300">{latest.summary}</p>
      </details>}

      <p className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-neutral-400">
        Dados apresentados conforme a extração do arquivo OKOK, sem substituir as medidas manuais.
        As datas dos gráficos correspondem ao <strong>envio</strong> dos relatórios, não necessariamente ao dia em que a balança realizou a medição.
        A bioimpedância é uma estimativa sujeita a hidratação e condições de coleta; variação não significa, isoladamente, melhora ou piora.
        {previous && <span> Relatório anterior enviado em {displayDate(previous.uploadedAt)}.</span>}
        {latest.limitations && <span className="mt-2 block">Limitações do relatório: {latest.limitations}</span>}
      </p>
    </section>
  );
};
