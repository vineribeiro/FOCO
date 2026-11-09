import { extraRows } from './repdbExtra';
/** Curated FOCO-to-RepDB exact variants. In-app use with visible credit required.
 * https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md */
const rows = `
Supino reto com barra|bench-press
Supino inclinado com halteres|incline-db-press
Supino declinado com barra|decline-bench-press-barbell
Supino na máquina|chest-press-machine
Flexão de braços|push-up
Crucifixo com halteres|db-fly
Crossover nas polias|cable-fly
Peck deck|pec-deck
Supino reto com halteres|db-bench-press
Mergulho nas paralelas com foco no peito|dips
Supino no Smith|smith-machine-bench-press
Flexão inclinada|incline-push-ups
Puxada frontal na polia|lat-pulldown
Remada curvada com barra|barbell-row
Remada baixa no cabo|seated-cable-row
Remada unilateral com halter|single-arm-db-row
Barra fixa pronada|pull-up
Remada com barra T|t-bar-row
Pulldown com braços estendidos|straight-arm-pulldown
Pullover com halter|db-pullover
Remada invertida|inverted-row
Puxada frontal com pegada neutra|v-bar-lat-pulldown
Remada curvada no Smith|smith-machine-bent-over-row
Remada unilateral no cabo|one-arm-seated-cable-row
Remada Pendlay|pendlay-row
Puxada frontal com pegada supinada|reverse-grip-lat-pulldown
Desenvolvimento com halteres|dumbbell-shoulder-press
Desenvolvimento na máquina|machine-shoulder-press
Desenvolvimento com barra|ohp
Elevação lateral com halteres|lateral-raise
Elevação lateral no cabo|cable-lateral-raise
Elevação frontal com halteres|dumbbell-front-raise
Elevação frontal no cabo|cable-front-raise
Crucifixo inverso na máquina|machine-reverse-fly
Crucifixo inverso com halteres|dumbbell-reverse-fly
Crucifixo inverso no cabo|cable-reverse-fly
Remada alta no cabo|cable-upright-row
Face pull na polia|face-pull
Rotação externa do ombro no cabo|cable-external-rotation
Arnold press|arnold-press
Encolhimento de ombros com halteres|db-shrug
Rosca direta com barra reta|barbell-curl
Rosca direta com barra EZ|ez-bar-curl
Rosca direta com halteres|bicep-curl
Rosca martelo com halteres|hammer-curl
Rosca martelo na polia com corda|cable-hammer-curl
Rosca Scott com barra EZ|barbell-preacher-curl
Rosca Scott com halter|db-preacher-curl
Rosca concentrada com halter|concentration-curl
Rosca direta na polia com barra reta|cable-curl
Rosca inclinada com halteres|incline-db-curl
Rosca reversa com barra EZ|ez-bar-reverse-curl
Rosca de bíceps na máquina|machine-bicep-curl
Rosca Scott na máquina|machine-preacher-curl
Rosca drag com barra|drag-curl
Tríceps pulley com barra reta|tricep-pushdown
Tríceps pulley com barra V|v-bar-tricep-pushdown
Tríceps testa com barra EZ|ez-bar-lying-tricep-extension
Tríceps testa com halteres|db-skull-crusher
Tríceps francês unilateral com halter|single-arm-dumbbell-overhead-tricep-extension
Tríceps coice com halter|tricep-kickback
Extensão de tríceps acima da cabeça na polia|cable-overhead-tricep-extension
Mergulho no banco para tríceps|bench-dips
Mergulho nas paralelas assistido|assisted-dips
Mergulho nas paralelas com peso corporal|dips
Supino com pegada fechada|close-grip-bench-press
Supino fechado com halteres|close-grip-db-bench-press
Tríceps coice na polia|cable-tricep-kickback
Extensão unilateral de tríceps na polia|single-arm-tricep-pushdown
Extensão de tríceps na máquina|machine-triceps-extension
Flexão de braços com pegada fechada|close-grip-push-ups
`.trim();
const normalize = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g,'');
export const REPD_B_MAPPING = new Map((rows + '\n' + extraRows).split('\n').map(line => {
 const [name, id] = line.split('|'); return [normalize(name),id] as const;
}));
export const repdbIdForExercise = (name: string): string | null => REPD_B_MAPPING.get(normalize(name)) || null;

/** RepDB Free: imagens WebP licenciadas para uso DENTRO do aplicativo com crédito.
 * Nunca carregar premium-samples nem redistribuir a coleção como API.
 * Fonte: https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md
 */
export const REPDB_CREDIT_URL = 'https://repdb.co';
export const REPDB_CREDIT_TEXT = 'Exercise data by RepDB (repdb.co)';
const PUBLIC_DATASET = 'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/';
const BACKUP_DATASET = 'https://exercise-dataset.com/';

export interface RepDBExercise {
 id:string;
 name_en:string;
 body_part?:string;
 equipment?:string;
 primary_muscles?:string[];
 secondary_muscles?:string[];
 instructions_en?:string[];
 tips_en?:string[];
 images?: {flat?: {start?:string;peak?:string;main?:string}};
}
const reverse = new Map<string,string>();
for (const [line] of (rows + '\n' + extraRows).split('\n').filter(Boolean).map(line=>[line])) {
 const [name,id] = line.split('|');
 if (name && id && !reverse.has(id)) reverse.set(id,name);
}
export const repdbDisplayName = (item:RepDBExercise):string =>
 reverse.get(item.id) || item.name_en;
export const normalizeRepDBName = (name:string):string =>
 name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');

/** Prevent catalogue-controlled image URLs pointing outside the licensed flat tier. */
export function safeRepDBImagePath(input:unknown):string|null {
 return typeof input==='string' && /^images\/flat\/[a-z0-9-]+\.webp$/.test(input) ? input : null;
}
export function repdbImageUrl(path:unknown):string|null {
 const safe = safeRepDBImagePath(path);
 return safe ? PUBLIC_DATASET + safe : null;
}
export function repdbImageUrls(item:RepDBExercise):string[] {
 const flat=item.images?.flat;
 if (!flat) return [];
 return [flat.start || flat.main, flat.peak].map(repdbImageUrl).filter((url):url is string=>Boolean(url));
}

let catalogPromise:Promise<RepDBExercise[]>|null=null;
async function fetchCatalog(base:string):Promise<RepDBExercise[]> {
 const response=await fetch(base+'exercises.json', {credentials:'omit',mode:'cors'});
 if (!response.ok) throw new Error('Falha ao carregar catálogo RepDB ('+response.status+')');
 const data:unknown=await response.json();
 if (!data || typeof data!=='object' || !('exercises' in data)) throw new Error('Formato RepDB desconhecido');
 const records=(data as {exercises:unknown}).exercises;
 if (!Array.isArray(records) || records.length<100) throw new Error('Catálogo RepDB incompleto');
 return records.filter((e):e is RepDBExercise=>Boolean(e)&&typeof e==='object'
   && typeof e.id==='string'&&/^[a-z0-9-]+$/.test(e.id)
   && typeof e.name_en==='string'&&e.name_en.length>1
   && Boolean(e.images && typeof e.images==='object'));
}
/** Single request per app lifetime; share it between gallery, thumbnails and session. */
export function loadRepDBCatalog():Promise<RepDBExercise[]> {
 if (!catalogPromise) catalogPromise=fetchCatalog(PUBLIC_DATASET)
   .catch(()=>fetchCatalog(BACKUP_DATASET))
   .catch(error=>{catalogPromise=null;throw error;});
 return catalogPromise;
}
export async function resolveRepDBExercise(name:string, id?:string|null):Promise<RepDBExercise|null> {
 const catalog=await loadRepDBCatalog();
 // An explicitly stored ID is authoritative; never fuzzy-match a different variant.
 if (id) return catalog.find(item=>item.id===id)||null;
 const mapped=repdbIdForExercise(name);
 if (mapped) return catalog.find(item=>item.id===mapped)||null;
 const normalized=normalizeRepDBName(name);
 return catalog.find(item=>normalizeRepDBName(item.name_en)===normalized)||null;
}
export async function getRepDBIllustrations(name:string,id?:string|null):Promise<string[]> {
 const exercise=await resolveRepDBExercise(name,id);
 return exercise ? repdbImageUrls(exercise) : [];
}
