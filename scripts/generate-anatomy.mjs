#!/usr/bin/env node
/**
 * FOCO Anatomy Engine v3 — one anatomically reviewed atlas per exercise.
 *
 * Default is DRY RUN: no API calls and no charges.
 * Generate: GEMINI_API_KEY=... npm run anatomy:generate -- --execute --accept-costs --max-images=12 --group=01_peito
 * Approve: npm run anatomy:generate -- --approve=peito_supino_reto_barra --reviewer=professional-name
 * Reject:  npm run anatomy:generate -- --reject=peito_supino_reto_barra --reviewer=professional-name
 *
 * Images are NEVER published until manually approved.
 */
import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public');
const outputDir = path.join(dataDir, 'anatomy', 'v3');
const manifestPath = path.join(outputDir, 'manifest.json');
const flags = new Map(process.argv.slice(2).map(arg => {
  const [k, ...rest] = arg.replace(/^--/, '').split('=');
  return [k, rest.join('=') || true];
}));
const flag = k => flags.get(k);
const group = typeof flag('group') === 'string' ? String(flag('group')) : '';
const only = typeof flag('id') === 'string' ? String(flag('id')) : '';
const maxImages = Number(flag('max-images') ?? 0);
const execute = flag('execute') === true;
const accepted = flag('accept-costs') === true;
const approval = flag('approve');
const rejection = flag('reject');
const reviewer = flag('reviewer');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const allowedStatus = new Set(['pending', 'needs_review', 'approved', 'rejected']);
const sourceFiles = (await fs.readdir(dataDir))
  .filter(file => /^(0[1-9]|1[0-5])_[a-z0-9_]+\.json$/.test(file)).sort();

if (sourceFiles.length !== 15) throw new Error('A base FOCO precisa conter os 15 arquivos musculares.');

const exercises = [];
for (const file of sourceFiles) {
  if (group && file !== group && !file.startsWith(group)) continue;
  const document = JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf8'));
  if (!Array.isArray(document.exercicios)) throw new Error(file + ': exercicios ausente');
  for (const row of document.exercicios) {
    if (!/^[a-z0-9_]+$/.test(row.id)) throw new Error('ID inseguro: ' + row.id);
    if (only && row.id !== only) continue;
    exercises.push({ ...row, sourceFile: file, sourceGroup: document.grupo_muscular });
  }
}
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (manifest.schema_version !== 3 || typeof manifest.exercises !== 'object') throw new Error('Manifest inválido');
for (const entry of Object.values(manifest.exercises)) {
  if (!allowedStatus.has(entry.status)) throw new Error('Status não reconhecido: ' + entry.status);
}

const writeManifest = () => fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
const validateReviewer = () => {
  if (typeof reviewer !== 'string' || reviewer.trim().length < 3) throw new Error('Informe --reviewer=NOME para a revisão humana.');
};
const assetInfo = async entry => {
  if (typeof entry.atlas !== 'string' || !/^anatomy\/v3\/[a-z0-9_]+\.(png|jpg|webp)$/.test(entry.atlas)) {
    throw new Error('Caminho de atlas inválido');
  }
  const file = path.join(dataDir, entry.atlas);
  const bytes = await fs.readFile(file);
  if (bytes.length < 30_000) throw new Error('Arquivo suspeito: imagem muito pequena');
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (entry.sha256 !== digest) throw new Error('O atlas foi alterado após a geração.');
  return bytes;
};
if (approval || rejection) {
  if (approval && rejection) throw new Error('Aprovar e rejeitar são operações exclusivas.');
  validateReviewer();
  const id = String(approval || rejection);
  const entry = manifest.exercises[id];
  if (!entry) throw new Error('Exercício desconhecido: ' + id);
  if (approval) {
    if (entry.status !== 'needs_review' && entry.status !== 'rejected') throw new Error('Somente imagens geradas podem ser aprovadas.');
    await assetInfo(entry);
    entry.status = 'approved';
    entry.approved_by = String(reviewer).trim();
    entry.approved_at = new Date().toISOString();
    entry.review_note = String(flag('review-note') || 'Conferência visual e biomecânica humana efetuada.');
  } else {
    entry.status = 'rejected';
    entry.reviewed_by = String(reviewer).trim();
    entry.reviewed_at = new Date().toISOString();
    entry.review_note = String(flag('review-note') || 'Necessita correção antes de publicação.');
  }
  await writeManifest();
  console.log(entry.status + ': ' + id);
  process.exit(0);
}

function promptFor(e) {
  return [
    'FOCO Anatomy Engine v3. Produce ONE premium educational fitness anatomical atlas image.',
    'Critical: this is ONLY the following exercise, not a similar variation:',
    'EXERCISE: ' + e.nome + '.',
    'Exercise ID: ' + e.id,
    'Equipment: ' + (e.equipamentos?.join(', ') || 'bodyweight') + '.',
    'Movement pattern: ' + e.padrao_movimento + '.',
    'Primary target muscles: ' + (e.musculos_primarios?.join(', ') || 'not specified') + '.',
    'Secondary muscles: ' + (e.musculos_secundarios?.join(', ') || 'not specified') + '.',
    'Actual execution steps in order: ' + JSON.stringify(e.execucao || []),
    'Common technique errors to AVOID: ' + JSON.stringify(e.erros_comuns || []),
    'Exercise safety notes: ' + JSON.stringify(e.cuidados || []),
    'ART DIRECTION: elegant grayscale studio anatomical 3D medical-sports plate.',
    'Neutral bald adult anatomical athlete with muscular surface anatomy, dark-gray gym shorts and gray shoes; no exposed genitals.',
    'Same model, same dark steel gym equipment, same neutral lighting, same camera angle in both action panels.',
    'LAYOUT 16:9: The top 60% consists of TWO large side-by-side panels depicting biomechanically correct START and END positions.',
    'The bottom 40%: front muscle map, back muscle map, side muscle map, and a large inset close-up of visible primary muscles.',
    'Near-black #101010 highlights on primary muscles only; secondary muscles in #555555; unrelated muscles light gray #D9D9D9.',
    'Avoid showing muscles through the equipment or activating hidden structures. Full relevant body and equipment in frame.',
    'White #FFFFFF background, meticulous orthopedic proportions, refined shading and fine anatomical fiber details.',
    'IMPORTANT: never copy the pose of a different exercise. Keep correct grip, load trajectory, and joint alignment.',
    'Do NOT include any text, captions, labels, logos, orange/red/blue/green colors or watermarks.',
    'No visual artifacts, no extra fingers or limbs, no implausible range of motion. This is an educational reference, not a clinical guarantee.',
  ].join('\n');
}
const candidates = exercises.filter(e => manifest.exercises[e.id] && (
  Boolean(flag('force')) || manifest.exercises[e.id].status === 'pending' || manifest.exercises[e.id].status === 'rejected'
));
const requested = (Number.isInteger(maxImages) && maxImages > 0) ? candidates.slice(0, maxImages) : candidates;
console.log('FOCO Anatomy v3: ' + exercises.length + ' exercise records selected; ' + requested.length + ' eligible images.');

if (!execute) {
  const output = requested.map(e => ({
    id: e.id, name: e.nome, group: e.sourceFile, prompt: promptFor(e),
    review_status: manifest.exercises[e.id].status,
  }));
  const pathOut = path.join(root, 'anatomy-generation-plan.json');
  await fs.writeFile(pathOut, JSON.stringify({ model: 'gemini-3.1-flash-image', atlas_count: output.length, outputs: output }, null, 2));
  console.log('Dry-run: prompts exported to anatomy-generation-plan.json. No images requested and no charge.');
  process.exit(0);
}

if (!accepted) throw new Error('Generation is billable; pass --accept-costs explicitly.');
if (!Number.isInteger(maxImages) || maxImages < 1 || maxImages > 254) {
  throw new Error('Define --max-images=1..254 as an explicit safety cap.');
}
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada. Não use chave privada no frontend.');
const model = process.env.FOCO_IMAGE_MODEL || 'gemini-3.1-flash-image';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const reference = typeof flag('reference') === 'string' ? String(flag('reference')) : '';
let refPart = null;
if (reference) {
  const bytes = await fs.readFile(path.resolve(reference));
  if (bytes.length > 8_000_000) throw new Error('Imagem de referência excede 8 MB');
  const ext = path.extname(reference).toLowerCase();
  refPart = {
    inlineData: { mimeType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      data: bytes.toString('base64') },
  };
}
let failures = 0;
for (let i = 0; i < requested.length; i++) {
  const e = requested[i], entry = manifest.exercises[e.id];
  try {
    console.log('[' + (i + 1) + '/' + requested.length + '] ' + e.id);
    const contents = refPart ? [refPart, { text: 'Use the reference ONLY for visual art direction, not the shown exercise pose.\n' + promptFor(e) }] : promptFor(e);
    const response = await ai.models.generateContent({
      model, contents, config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '2K' } },
    });
    const block = response.candidates?.flatMap(c => c.content?.parts || []).find(p => p.inlineData?.data);
    if (!block) throw new Error('Provider did not return image data.');
    const mime = String(block.inlineData.mimeType || '');
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : null;
    if (!ext) throw new Error('MIME de saída não suportado: ' + mime);
    const buffer = Buffer.from(block.inlineData.data, 'base64');
    const isPng = ext === 'png' && buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
    const isJpg = ext === 'jpg' && buffer[0] === 0xff && buffer[1] === 0xd8;
    const isWebp = ext === 'webp' && buffer.subarray(0,4).toString() === 'RIFF';
    if (!(isPng || isJpg || isWebp) || buffer.length < 30_000 || buffer.length > 20_000_000) {
      throw new Error('Imagem vazia, corrompida ou tamanho não permitido.');
    }
    if (isPng && (buffer.readUInt32BE(16) < 800 || buffer.readUInt32BE(20) < 600)) throw new Error('Resolução insuficiente');
    const relative = 'anatomy/v3/' + e.id + '.' + ext;
    await fs.mkdir(outputDir, {recursive:true});
    await fs.writeFile(path.join(dataDir, relative), buffer);
    entry.atlas = relative;
    entry.status = 'needs_review';
    entry.sha256 = createHash('sha256').update(buffer).digest('hex');
    entry.model = model;
    entry.generated_at = new Date().toISOString();
    entry.prompt_sha256 = createHash('sha256').update(promptFor(e)).digest('hex');
    delete entry.approved_by;
    delete entry.approved_at;
    await writeManifest();
  } catch (error) {
    failures++;
    console.error(e.id + ': ' + (error instanceof Error ? error.message : error));
  }
  if (i < requested.length - 1) await sleep(1100);
}
console.log('Done. Images remain UNPUBLISHED until approved. Failed: ' + failures);
if (failures) process.exitCode = 1;
