import type { UploadedFile } from '../types';

/**
 * OKOK assessments are already stored in uploaded_files.extracted_data by the
 * authenticated /api/files endpoint. This adapter does not upload, copy or
 * silently convert those sensitive metrics into manual body_measurements.
 */
export interface OkokMetric {
  key: string;
  name: string;
  value: string;
  interpretation: string;
  category: 'Composição corporal' | 'Metabolismo' | 'Circunferências' | 'Outros indicadores';
  numericValue: number | null;
  unit: string;
}

export interface OkokAssessment {
  id: string;
  uploadedAt: string;
  filename: string;
  summary: string;
  limitations: string;
  metrics: OkokMetric[];
}

export interface OkokTrendPoint {
  assessmentId: string;
  timestamp: number;
  date: string;
  value: number;
  unit: string;
}

const clean = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const matches = (name: string, expressions: RegExp[]): boolean => expressions.some(expression => expression.test(name));

/** A number is only chartable if the whole field is numeric (with an optional unit).
 * Ranges, qualitative categories and AI explanations are intentionally excluded.
 */
export function parseOkokNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/\u00a0/g, ' ');
  const candidate = raw.match(/^([+-]?(?:\d+(?:[.,]\d+)*))\s*(?:kg\s*\/\s*m(?:²|2)|kcal(?:\s*\/\s*dia)?|kg|g|%|cm|mm|l|litros?|anos?|n[ií]vel|pontos?)?$/i);
  if (!candidate) return null;
  const number = candidate[1];
  let standardized = number;
  if (number.includes(',') && number.includes('.')) {
    const lastComma = number.lastIndexOf(',');
    const lastDot = number.lastIndexOf('.');
    standardized = lastComma > lastDot ? number.replace(/\./g, '').replace(',', '.') : number.replace(/,/g, '');
  } else if (number.includes(',')) {
    standardized = number.replace(',', '.');
  } else if ((number.match(/\./g) || []).length === 1) {
    // 1.234 may be a thousand separator or decimal: prefer decimal unless grouping is explicit.
    standardized = number;
  }
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(standardized)) return null;
  const parsed = Number(standardized);
  return Number.isFinite(parsed) ? parsed : null;
}

function unitOf(name: string, value: string): string {
  const normalized = clean(value + ' ' + name);
  if (/kg\s*\/\s*m(?:²|2)/.test(normalized)) return 'kg/m²';
  if (/%|percentual|porcentagem|taxa de gordura|percent of/.test(normalized)) return '%';
  if (/\bkcal\b/.test(normalized)) return 'kcal';
  if (/\bkg\b|quilogram/.test(normalized)) return 'kg';
  if (/\bcm\b|centimetr/.test(normalized)) return 'cm';
  if (/\bmm\b/.test(normalized)) return 'mm';
  if (/\b(litros?|l)\b/.test(normalized)) return 'L';
  if (/\b(anos?|idade)\b/.test(normalized)) return 'anos';
  if (/\b(nivel|grau|escore|indice)\b/.test(normalized)) return 'nível';
  return '';
}

/** Identifiers are stable across common OKOK / Portuguese translations, but
 * metrics with different units never share the same chart series.
 */
export function classifyOkokMetric(name: string, value: string): Pick<OkokMetric, 'key' | 'category' | 'unit'> {
  const text = clean(name);
  const unit = unitOf(name, value);
  const pct = unit === '%';
  const category: OkokMetric['category'] = /cintura|quadril|torax|peito|pescoco|braco|coxa|panturrilha|abd[oô]men|circunferencia/.test(text) ? 'Circunferências'
    : /metabol|taxa metabolica|tmb|basal|idade corporal/.test(text) ? 'Metabolismo'
    : 'Composição corporal';
  let key = '';
  if (matches(text, [/^peso(\s|$)/, /peso corporal/, /body weight/, /^weight$/])) key = 'peso';
  else if (matches(text, [/\bimc\b/, /indice de massa corporal/, /\bbmi\b/])) key = 'imc';
  else if (matches(text, [/gordura visceral/, /visceral fat/])) key = 'gordura_visceral';
  else if (matches(text, [/massa muscular esquelet/, /musculo esquelet/, /skeletal muscle/])) key = 'musculo_esqueletico';
  else if (matches(text, [/massa magra/, /massa livre de gordura/, /fat.free mass/, /lean body mass/])) key = 'massa_magra';
  else if (matches(text, [/massa de gordura/, /massa gorda/, /peso de gordura/, /fat mass/])) key = 'massa_gorda';
  else if (matches(text, [/gordura corporal/, /percentual de gordura/, /taxa de gordura/, /body fat/, /porcentagem de gordura/])) key = 'gordura_corporal';
  else if (matches(text, [/massa muscular/, /muscle mass/, /quantidade de musculo/])) key = 'massa_muscular';
  else if (matches(text, [/agua corporal/, /agua total/, /body water/, /hidratacao/])) key = 'agua_corporal';
  else if (matches(text, [/massa ossea/, /bone mass/, /peso dos ossos/])) key = 'massa_ossea';
  else if (matches(text, [/\bproteina/, /\bprotein/])) key = 'proteinas';
  else if (matches(text, [/metabolismo basal/, /taxa metabolica basal/, /\btmb\b/, /\bbmr\b/, /gasto energetico basal/])) key = 'metabolismo_basal';
  else if (matches(text, [/idade metabolica/, /idade corporal/, /body age/])) key = 'idade_metabolica';
  else if (matches(text, [/relacao cintura.quadril/, /cintura\s*\/\s*quadril/, /\bwh[rq]\b/])) key = 'relacao_cintura_quadril';
  else if (category === 'Circunferências') key = 'circunferencia:' + text.replace(/[^a-z0-9]+/g, '_');
  else key = 'original:' + text.replace(/[^a-z0-9]+/g, '_');
  // Separates "muscle mass 36 kg" from "muscle rate 42%" and similar reports.
  return { key: key + ':' + (unit || 'sem_unidade'), unit, category: key.startsWith('original:') ? 'Outros indicadores' : category };
}

export function getOkokAssessments(files: UploadedFile[]): OkokAssessment[] {
  if (!Array.isArray(files)) return [];
  return files.filter(file => {
    const data = file?.extracted_data;
    return file.processing_status === 'processed' && data && typeof data.summary === 'string'
      && Array.isArray(data.metrics) && Number.isFinite(Date.parse(file.created_at));
  }).map(file => {
    const data = file.extracted_data as Record<string, unknown>;
    const metrics: OkokMetric[] = (data.metrics as unknown[]).flatMap(raw => {
      if (!raw || typeof raw !== 'object') return [];
      const source = raw as Record<string, unknown>;
      if (typeof source.name !== 'string' || !source.name.trim() ||
          typeof source.value !== 'string' || !source.value.trim()) return [];
      const name = source.name.trim().slice(0, 160);
      const value = source.value.trim().slice(0, 160);
      const interpretation = typeof source.interpretation === 'string' ? source.interpretation.trim().slice(0, 800) : '';
      return [{ ...classifyOkokMetric(name, value), name, value, interpretation, numericValue: parseOkokNumber(value) }];
    });
    return {
      id: file.id,
      uploadedAt: file.created_at,
      filename: file.filename,
      summary: (data.summary as string).slice(0, 3500),
      limitations: typeof data.limitations === 'string' ? data.limitations.slice(0, 1600) : '',
      metrics,
    };
  }).sort((a, b) => Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt));
}

export function getOkokTrend(assessments: OkokAssessment[], key: string): OkokTrendPoint[] {
  return assessments.flatMap(assessment => {
    // A repeated metric in the same assessment is not an additional data point.
    const metric = assessment.metrics.find(item => item.key === key && item.numericValue !== null);
    if (!metric || metric.numericValue === null) return [];
    return [{
      assessmentId: assessment.id,
      timestamp: Date.parse(assessment.uploadedAt),
      date: new Date(assessment.uploadedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: metric.numericValue,
      unit: metric.unit,
    }];
  });
}
