import assert from 'node:assert/strict';
import type { UploadedFile } from '../src/types';
import { classifyOkokMetric, getOkokAssessments, getOkokTrend, parseOkokNumber } from '../src/utils/okokMetrics';

const makeFile = (id: string, created_at: string, metrics: Array<{ name: string; value: string; interpretation: string }>): UploadedFile => ({
  id, user_id: 'isolated-test-user', filename: id + '.pdf', mime_type: 'application/pdf',
  storage_path: 'isolated-test-user/' + id + '.pdf', processing_status: 'processed',
  created_at, extracted_data: { summary: 'Somente dados documentados', metrics, limitations: 'Hidratação e horário afetam a leitura.' },
});

const earlier = makeFile('okok-1', '2026-09-01T10:00:00.000Z', [
  { name: 'Peso corporal', value: '80,5 kg', interpretation: 'Medido pela balança.' },
  { name: 'Gordura corporal (%)', value: '25,4%', interpretation: 'Estimativa.' },
  { name: 'Massa muscular', value: '31,7 kg', interpretation: 'Estimativa.' },
  { name: 'Massa muscular', value: '39,4%', interpretation: 'Taxa.' },
  { name: 'Metabolismo basal', value: '1.450 kcal', interpretation: 'Estimativa.' },
  { name: 'IMC', value: '25,6', interpretation: 'Índice.' },
]);
const latest = makeFile('okok-2', '2026-10-20T10:00:00.000Z', [
  { name: 'Peso', value: '78.2 kg', interpretation: 'Medido pela balança.' },
  { name: 'Taxa de gordura', value: '23,9 %', interpretation: 'Estimativa.' },
  { name: 'Massa muscular', value: '32,1 kg', interpretation: 'Estimativa.' },
  { name: 'Água corporal', value: '54,9%', interpretation: 'Estimativa.' },
  { name: 'Gordura visceral', value: '7', interpretation: 'Nível informado pela OKOK.' },
  { name: 'Idade metabólica', value: '29 anos', interpretation: 'Estimativa.' },
  { name: 'Circunferência da cintura', value: '89 cm', interpretation: 'Leitura.' },
  { name: 'Outro indicador da OKOK', value: 'não legível', interpretation: 'Não inventar valores.' },
]);
const workoutSheet = {
  ...makeFile('workout-sheet', '2026-10-22T10:00:00.000Z', []),
  extracted_data: { plan_name: 'Treino ABC', extracted_exercises: [] },
};
const invalidFile = {
  ...makeFile('pending', '2026-10-25T10:00:00.000Z', []),
  processing_status: 'pending' as const,
};

const reports = getOkokAssessments([latest, workoutSheet, invalidFile, earlier]);
assert.equal(reports.length, 2, 'Importações de treino e arquivos pendentes não são avaliações OKOK');
assert.deepEqual(reports.map(report => report.id), ['okok-1', 'okok-2']);
assert.equal(reports[1].metrics.length, 8, 'Todas as métricas válidas permanecem visíveis, mesmo sem número');
assert.equal(reports[1].metrics.at(-1)?.numericValue, null, 'Não criar gráfico para valores qualitativos');
assert.equal(classifyOkokMetric('IMC', '25,6').unit, 'kg/m²');
assert.equal(classifyOkokMetric('Peso', '72,5').key, 'peso:kg');
assert.equal(classifyOkokMetric('Massa muscular', '32,1 kg').key, 'massa_muscular:kg');
assert.equal(classifyOkokMetric('Massa muscular', '39,4%').key, 'massa_muscular:%');
assert.equal(parseOkokNumber('1.450 kcal'), 1450, 'Separador de milhar de kcal');
assert.equal(parseOkokNumber('78,5 kg'), 78.5);
assert.equal(parseOkokNumber('18,8%'), 18.8);
assert.equal(parseOkokNumber('10 a 20 kg'), null, 'Não considerar intervalos como medição exata');
assert.equal(parseOkokNumber('aproximadamente 80 kg'), null, 'Não gerar número incerto');
assert.equal(parseOkokNumber(''), null);
const weight = getOkokTrend(reports, 'peso:kg');
assert.equal(weight.length, 2, 'Peso reconhecido em avaliações com rótulos diferentes');
assert.deepEqual(weight.map(item => item.value), [80.5, 78.2]);
assert.equal(getOkokTrend(reports, 'massa_muscular:%').length, 1, 'Nunca misturar percentagem e massa muscular kg');
assert.equal(getOkokTrend(reports, 'massa_muscular:kg').length, 2);
assert.equal(getOkokTrend(reports, 'original:outro_indicador_da_okok:sem_unidade').length, 0);
assert.deepEqual(getOkokAssessments([]), []);
console.log('OKOK: filtros, metadados, indicadores, unidades e séries históricas validados.');
