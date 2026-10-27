import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const publicDir = new URL('../public/', import.meta.url);
const sourceNames = (await readdir(publicDir)).filter((name) => /^(0[1-9]|1[0-5])_[\w]+\.json$/.test(name)).sort();
if (sourceNames.length !== 15) {
  console.error('Esperados 15 arquivos de grupos musculares. Encontrados:', sourceNames.length);
  process.exitCode = 1;
}
const ids = new Map();
const coverage = [];
const errors = [];
for (const filename of sourceNames) {
  const parsed = JSON.parse(await readFile(new URL(filename, publicDir), 'utf8'));
  if (!Array.isArray(parsed.exercicios)) {
    errors.push(filename + ': propriedade exercicios deve ser lista');
    continue;
  }
  let withImages = 0, withoutImages = 0;
  for (const exercise of parsed.exercicios) {
    const id = exercise.id;
    if (typeof id !== 'string' || !/^[a-z0-9_]+$/.test(id)) {
      errors.push(filename + ': ID inválido: ' + String(id));
    } else if (ids.has(id)) {
      errors.push(filename + ': ID duplicado ' + id + ' (também em ' + ids.get(id) + ')');
    } else {
      ids.set(id, filename);
    }
    if (!exercise.nome || !Array.isArray(exercise.execucao) || !exercise.execucao.length) {
      errors.push(filename + ': exercício sem nome/instruções: ' + id);
    }
    const paths = exercise.imagens_execucao;
    if (!Array.isArray(paths)) {
      errors.push(filename + ': imagens_execucao inválido em ' + id);
      continue;
    }
    if (!paths.length) withoutImages++;
    else {
      withImages++;
      if (paths.length !== 2) errors.push(filename + ': exigir 2 fases ou nenhuma em ' + id);
      if (paths.some((path) => typeof path !== 'string' || !/^[-\w()]+\/[01]\.(?:jpg|jpeg|png|webp)$/.test(path) || path.includes('..'))) {
        errors.push(filename + ': caminho de imagem inseguro ou inválido em ' + id);
      }
    }
  }
  coverage.push({ file: filename, exercises: parsed.exercicios.length, withImages, withoutImages });
}
const totals = coverage.reduce((a, row) => ({
  exercises: a.exercises + row.exercises,
  withImages: a.withImages + row.withImages,
  withoutImages: a.withoutImages + row.withoutImages,
}), { exercises: 0, withImages: 0, withoutImages: 0 });
console.log('\nFOCO — Auditoria estrutural de imagens de exercícios');
console.table(coverage);
console.log('TOTAL:', totals);
if (errors.length) {
  console.error('\nFalhas:');
  for (const error of errors) console.error('• ' + error);
  process.exitCode = 1;
} else {
  console.log('Caminhos e IDs válidos. Exercícios sem ilustração permanecem sinalizados, não substituídos por imagem de outro exercício.');
  console.log('A auditoria NÃO verifica a existência remota, direitos de uso ou precisão biomecânica das imagens.');
}
