import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const manifest = JSON.parse(await fs.readFile(path.join(publicDir,'anatomy/v3/manifest.json'),'utf8'));
const errors = [];
const counts = { pending:0, needs_review:0, approved:0, rejected:0 };
const names = (await fs.readdir(publicDir)).filter(name => /^(0[1-9]|1[0-5])_[a-z0-9_]+\.json$/.test(name)).sort();
if (names.length !== 15) errors.push('Expected exactly 15 source data files');
if (manifest.schema_version !== 3 || !manifest.exercises || typeof manifest.exercises !== 'object') errors.push('Invalid manifest format');
const idSet = new Set();
for (const name of names) {
  const data = JSON.parse(await fs.readFile(path.join(publicDir,name),'utf8'));
  for (const ex of data.exercicios || []) {
    if (idSet.has(ex.id)) errors.push('Duplicate ID: ' + ex.id);
    idSet.add(ex.id);
    const item = manifest.exercises?.[ex.id];
    if (!item) { errors.push('Not represented: ' + ex.id); continue; }
    if (item.name !== ex.nome || item.source !== name) errors.push('Source mismatch: '+ex.id);
    if (!Object.hasOwn(counts,item.status)) errors.push('Invalid status: '+ex.id);
    else counts[item.status]++;
    if (item.status !== 'approved') continue;
    if (!item.approved_by || !item.approved_at) errors.push('Approved without reviewer: '+ex.id);
    if (typeof item.atlas !== 'string' || !/^anatomy\/v3\/[a-z0-9_]+\.(png|jpg|webp)$/.test(item.atlas)
      || !item.atlas.startsWith('anatomy/v3/'+ex.id+'.')) {errors.push('Unexpected atlas path for '+ex.id);continue;}
    try {
      const bytes = await fs.readFile(path.join(publicDir,item.atlas));
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (bytes.length < 30_000 || sha256 !== item.sha256) errors.push('Missing/tampered image '+ex.id);
    } catch { errors.push('Approved asset file missing: '+ex.id); }
  }
}
for (const id of Object.keys(manifest.exercises || {})) if(!idSet.has(id)) errors.push('Orphan manifest entry: '+id);
if (idSet.size !== manifest.total_exercises) errors.push('Expected '+idSet.size+' items, declared '+manifest.total_exercises);
console.log('FOCO Anatomy Engine v3:',idSet.size,'source exercises;',counts);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
else console.log('Manifest coherent; only approved assets with valid files will be presented.');
