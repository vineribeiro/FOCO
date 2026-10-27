import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { importAnatomyReviewPackage } from '../src/utils/anatomyReviewZip.ts';

/* Build a ZIP with data descriptors disabled and method deflate to exercise
 * the same central-directory layout as the FOCO review bundle. */
const makeZip = (entries) => {
  let offset = 0;
  const localEntries = [];
  const centralEntries = [];
  for (const { name, data } of entries) {
    const compressed = deflateRawSync(data);
    const nameBuffer = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localEntries.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralEntries.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralSize = centralEntries.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localEntries, ...centralEntries, end]);
};

const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(2200)]);
const names = [
  'supino_reto_prancha_sem_rotulos_em_revisao.png',
  'supino_reto_prancha_rotulada_reprovada.png',
  'peito_mosaico_reprovado.png',
];
const zipBuffer = makeZip([
  { name: 'status_biblioteca.json', data: Buffer.from('[]') },
  ...names.map(name => ({ name: 'artes_geradas_em_revisao/' + name, data: png })),
  { name: 'artes_geradas_em_revisao/nao_conhecido.png', data: png },
]);
const zipFile = new File([zipBuffer], 'FOCO_Anatomy_Pacote_Direto.zip', { type:'application/zip' });
const samples = await importAnatomyReviewPackage(zipFile);
assert.equal(samples.length, 3, 'only three pre-reviewed names may be displayed');
assert.deepEqual(samples.map(s => s.status), ['needs_review', 'rejected', 'rejected']);
assert.equal(samples[0].subject, 'Supino reto com barra');
assert(samples.every(s => s.url.startsWith('blob:')));
samples.forEach(s => URL.revokeObjectURL(s.url));
await assert.rejects(
  importAnatomyReviewPackage(new File([Buffer.from('not-a-zip')], 'broken.zip')),
  /índice deste arquivo ZIP/,
);
await assert.rejects(
  importAnatomyReviewPackage(new File([zipBuffer], 'other.jpg')),
  /Selecione o arquivo/,
);
// Optional live check in a local developer workstation:
// FOCO_REVIEW_PACKAGE=... npm run test:anatomy-review
if (process.env.FOCO_REVIEW_PACKAGE) {
  const actual = await readFile(process.env.FOCO_REVIEW_PACKAGE);
  const imageSamples = await importAnatomyReviewPackage(new File([actual], path.basename(process.env.FOCO_REVIEW_PACKAGE)));
  assert.equal(imageSamples.length, 3);
  imageSamples.forEach(s => URL.revokeObjectURL(s.url));
  console.log('Real package sample import passed.');
}
console.log('FOCO ZIP preview import: passed (3 known images, rejected/needs_review statuses, invalid inputs blocked).');
