/**
 * Browser-only import of FOCO anatomy review bundles.
 *
 * It intentionally does not publish or approve any image. Assets are object
 * URLs that exist only in this browser tab and are revoked when removed.
 * No zip entry is executed or written to the app's production catalog.
 */
export interface ReviewSample {
  filename: string;
  url: string;
  status: 'rejected' | 'needs_review';
  subject: string;
  note: string;
}
const MAX_PACKAGE_BYTES = 35 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const FILE_PREFIX = 'artes_geradas_em_revisao/';
const KNOWN_SAMPLES: Record<string, Omit<ReviewSample, 'filename' | 'url'>> = {
  'supino_reto_prancha_sem_rotulos_em_revisao.png': {
    status: 'needs_review', subject: 'Supino reto com barra',
    note: 'Estudo de linguagem visual: conferir trajetória da barra e anatomia antes de qualquer uso didático.',
  },
  'supino_reto_prancha_rotulada_reprovada.png': {
    status: 'rejected', subject: 'Supino reto com barra',
    note: 'Rótulos de posição inconsistentes. Arquivo reprovado para a biblioteca de exercícios.',
  },
  'peito_mosaico_reprovado.png': {
    status: 'rejected', subject: 'Exercícios de peito',
    note: 'Mosaico com resolução insuficiente por exercício e movimentos repetidos. Não deve ser fragmentado.',
  },
};
const u16 = (view: DataView, offset: number): number => view.getUint16(offset, true);
const u32 = (view: DataView, offset: number): number => view.getUint32(offset, true);

async function extractZipEntry(
  buffer: ArrayBuffer, view: DataView,
  localOffset: number, compressedSize: number, expectedSize: number, method: number
): Promise<Uint8Array<ArrayBuffer>> {
  if (localOffset + 30 > buffer.byteLength || u32(view, localOffset) !== 0x04034b50) {
    throw new Error('Cabeçalho de arquivo ZIP inválido.');
  }
  const nameLength = u16(view, localOffset + 26);
  const extraLength = u16(view, localOffset + 28);
  const from = localOffset + 30 + nameLength + extraLength;
  const end = from + compressedSize;
  if (end > buffer.byteLength) throw new Error('Arquivo incompleto dentro do pacote.');
  const bytes = new Uint8Array(buffer.slice(from, end));
  let output: Uint8Array<ArrayBuffer>;
  if (method === 0) {
    output = bytes;
  } else if (method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador não suporta importação ZIP; extraia as imagens no aparelho.');
    }
    try {
      const decompressor = new DecompressionStream('deflate-raw' as CompressionFormat);
      const stream = new Blob([bytes]).stream().pipeThrough(decompressor);
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      throw new Error('O navegador não conseguiu descompactar este ZIP. Tente um navegador atualizado.');
    }
  } else {
    throw new Error('Método de compressão ZIP não suportado.');
  }
  if (output.byteLength !== expectedSize) throw new Error('Tamanho descompactado não corresponde ao pacote.');
  return output;
}

export async function importAnatomyReviewPackage(file: File): Promise<ReviewSample[]> {
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Selecione o arquivo FOCO_Anatomy_Pacote_Direto.zip.');
  if (file.size > MAX_PACKAGE_BYTES) throw new Error('O pacote excede o limite seguro de 35 MB.');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  // Read the ZIP central directory; ignore arbitrary files and JSON inside the package.
  let endOfCentral = -1;
  for (let i = Math.max(0, bytes.length - 65557); i <= bytes.length - 22; i++) {
    if (u32(view, i) === 0x06054b50) endOfCentral = i;
  }
  if (endOfCentral < 0) throw new Error('Não encontrei o índice deste arquivo ZIP.');
  const totalEntries = u16(view, endOfCentral + 10);
  let cursor = u32(view, endOfCentral + 16);
  if (totalEntries > 600) throw new Error('Pacote com entradas demais para uma prévia.');
  const samples: ReviewSample[] = [];
  try {
    for (let n = 0; n < totalEntries; n++) {
      if (cursor + 46 > bytes.length || u32(view, cursor) !== 0x02014b50) {
        throw new Error('Índice ZIP inválido.');
      }
      const method = u16(view, cursor + 10);
      const compressed = u32(view, cursor + 20);
      const uncompressed = u32(view, cursor + 24);
      const nameLength = u16(view, cursor + 28);
      const extraLength = u16(view, cursor + 30);
      const commentLength = u16(view, cursor + 32);
      const localOffset = u32(view, cursor + 42);
      const filename = new TextDecoder('utf-8').decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
      cursor += 46 + nameLength + extraLength + commentLength;
      if (!filename.startsWith(FILE_PREFIX)) continue;
      const basename = filename.slice(FILE_PREFIX.length);
      const info = KNOWN_SAMPLES[basename];
      // This application only accepts the three known, documented study images;
      // unfamiliar files cannot silently become approved exercise assets.
      if (!info) continue;
      if (uncompressed < 1024 || uncompressed > MAX_IMAGE_BYTES || compressed > MAX_IMAGE_BYTES) {
        throw new Error('Imagem muito grande ou vazia: ' + basename);
      }
      const contents = await extractZipEntry(buffer, view, localOffset, compressed, uncompressed, method);
      const isPng = contents[0] === 137 && contents[1] === 80 && contents[2] === 78 && contents[3] === 71;
      if (!isPng) throw new Error('O arquivo não é uma imagem PNG válida: ' + basename);
      const blob = new Blob([contents], { type: 'image/png' });
      samples.push({ filename: basename, url: URL.createObjectURL(blob), ...info });
    }
    if (samples.length === 0) throw new Error('Nenhuma das três artes conhecidas foi encontrada no pacote.');
    return samples;
  } catch (error) {
    for (const entry of samples) URL.revokeObjectURL(entry.url);
    throw error;
  }
}
