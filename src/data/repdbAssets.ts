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
interface RepExercise { id: string; images?: {flat?: {start?:string;peak?:string;main?:string}} }
let indexPromise: Promise<Map<string, RepExercise>> | null = null;
function index(): Promise<Map<string,RepExercise>> {
 if(!indexPromise) indexPromise = fetch('https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json')
 .then(async r=>{ if(!r.ok) throw Error('RepDB unavailable'); const body=await r.json(); return new Map((body.exercises as RepExercise[]).map(ex=>[ex.id,ex])); })
 .catch(err=>{indexPromise=null;throw err});
 return indexPromise;
}
export async function getRepDBIllustrations(name:string):Promise<string[]> {
 const id=repdbIdForExercise(name); if(!id)return [];
 const exercise=(await index()).get(id); const p=exercise?.images?.flat;if(!p)return [];
 const files=[p.start,p.peak].filter((v):v is string=>typeof v==='string');
 if(!files.length&&p.main)files.push(p.main);
 return files.filter(p=>/^images\/flat\/[a-z0-9-]+\.webp$/.test(p))
 .map(p=>'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/'+p);
}
