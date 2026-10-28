import { readFile } from 'node:fs/promises';
import path from 'node:path';
const base = new URL('../public/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('anatomy/review/previews.json', base), 'utf8'));
if (manifest.schema_version !== 1 || !Array.isArray(manifest.previews) || manifest.previews.length !== 3) {
  throw new Error('Expected exactly 3 review samples');
}
let published = 0;
const ids = new Set();
for (const item of manifest.previews) {
  if (ids.has(item.id)) throw new Error('Duplicated preview ID: ' + item.id);
  ids.add(item.id);
  if (!['needs_review', 'rejected'].includes(item.status)) throw new Error('Unreviewed image must not be approved: '+item.id);
  if (!item.image) continue;
  if (!/^anatomy\/review\/[a-z0-9_.-]+\.(png|avif|webp|jpg)$/.test(item.image)) throw new Error('Invalid public image path');
  const buffer = await readFile(new URL(item.image,base));
  if (buffer.length < 5000) throw new Error('Broken preview image '+item.id);
  if (item.image.endsWith('.jpg') && (buffer[0] !== 255 || buffer[1] !== 216)) throw new Error('JPEG header missing');
  published++;
}
console.log('FOCO review image gallery: '+published+' public preview(s) out of '+manifest.previews.length+' samples; all unapproved.');
