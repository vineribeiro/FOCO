export interface ExerciseCatalogItem {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  level: string;
  instructions: string[];
  images: string[];
  category: string;
  aliases?: string[];
  movementPattern?: string;
  primaryMuscleDisplay?: string[];
  secondaryMuscleDisplay?: string[];
  equipmentDisplay?: string;
  respiration?: Record<string, string>;
  commonErrors?: string[];
  safetyNotes?: string[];
  suggestedSets?: number | string;
  suggestedReps?: string;
  suggestedRepsLabel?: string;
  variations?: string[];
  sourceGroup?: string;
}

interface DedicatedExerciseSource {
  id: string;
  nome: string;
  aliases: string[];
  musculos_primarios: string[];
  musculos_secundarios: string[];
  equipamentos: string[];
  padrao_movimento: string;
  nivel: string;
  execucao: string[];
  respiracao: Record<string, string>;
  erros_comuns: string[];
  cuidados: string[];
  series_sugeridas: number | number[];
  repeticoes_sugeridas: string | number[];
  unidade_repeticoes?: string;
  variacoes: string[];
  imagens_execucao: string[];
}

interface DedicatedExerciseFile {
  exercicios: DedicatedExerciseSource[];
}

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abdômen',
  adductors: 'Adutores',
  abductors: 'Abdutores',
  biceps: 'Bíceps',
  calves: 'Panturrilhas',
  chest: 'Peito',
  forearms: 'Antebraços',
  glutes: 'Glúteos',
  hamstrings: 'Posteriores de coxa',
  lats: 'Dorsais',
  'lower back': 'Lombar',
  'middle back': 'Costas médias',
  neck: 'Pescoço',
  cardio: 'Cardio',
  functional: 'Funcionais',
  quadriceps: 'Quadríceps',
  shoulders: 'Ombros',
  traps: 'Trapézio',
  triceps: 'Tríceps',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  'body only': 'Peso corporal',
  barbell: 'Barra',
  dumbbell: 'Halteres',
  cable: 'Polia',
  machine: 'Máquina',
  'leverage machine': 'Máquina articulada',
  'smith machine': 'Smith',
  kettlebells: 'Kettlebell',
  bands: 'Elásticos',
  'medicine ball': 'Medicine ball',
  'exercise ball': 'Bola suíça',
  'foam roll': 'Rolo de liberação',
  'ez curl bar': 'Barra W',
  'e-z curl bar': 'Barra W',
  other: 'Outro',
  none: 'Sem equipamento',
};

const EXERCISE_NAME_PT: Record<string, string> = {
  '3/4 Sit-Up': 'Abdominal parcial',
  '90/90 Hamstring': 'Mobilidade de posterior 90/90',
  'Air Bike': 'Abdominal bicicleta',
  'Alternate Heel Touchers': 'Abdominal tocando os calcanhares',
  'Barbell Bench Press': 'Supino reto com barra',
  'Barbell Curl': 'Rosca direta com barra',
  'Barbell Deadlift': 'Levantamento terra com barra',
  'Barbell Full Squat': 'Agachamento livre com barra',
  'Barbell Hip Thrust': 'Elevação pélvica com barra',
  'Barbell Incline Bench Press': 'Supino inclinado com barra',
  'Barbell Row': 'Remada curvada com barra',
  'Barbell Shrug': 'Encolhimento com barra',
  'Bent Over Barbell Row': 'Remada curvada com barra',
  'Bent Over Two-Dumbbell Row': 'Remada curvada com halteres',
  'Cable Crossover': 'Crossover na polia',
  'Cable Curl': 'Rosca na polia',
  'Cable Lateral Raise': 'Elevação lateral na polia',
  'Cable Rope Overhead Triceps Extension': 'Tríceps francês na polia com corda',
  'Cable Rope Triceps Pushdown': 'Tríceps corda na polia',
  'Close-Grip Barbell Bench Press': 'Supino fechado com barra',
  'Crunches': 'Abdominal crunch',
  'Dumbbell Bench Press': 'Supino reto com halteres',
  'Dumbbell Flyes': 'Crucifixo com halteres',
  'Dumbbell Front Raise': 'Elevação frontal com halteres',
  'Dumbbell Lateral Raise': 'Elevação lateral com halteres',
  'Dumbbell Shoulder Press': 'Desenvolvimento com halteres',
  'Dumbbell Shrug': 'Encolhimento com halteres',
  'Dumbbell Squat': 'Agachamento com halteres',
  'Face Pull': 'Puxada para o rosto na polia',
  'Hammer Curls': 'Rosca martelo',
  'Incline Dumbbell Bench Press': 'Supino inclinado com halteres',
  'Incline Dumbbell Curl': 'Rosca inclinada com halteres',
  'Lat Pulldown': 'Puxada frontal na polia',
  'Leg Extension': 'Cadeira extensora',
  'Leg Press': 'Leg press',
  'Lying Leg Curls': 'Mesa flexora',
  'Machine Bench Press': 'Supino na máquina',
  'One-Arm Dumbbell Row': 'Remada unilateral com halter',
  'Pullups': 'Barra fixa',
  'Pushups': 'Flexão de braços',
  'Romanian Deadlift': 'Levantamento terra romeno',
  'Seated Cable Rows': 'Remada baixa na polia',
  'Seated Dumbbell Press': 'Desenvolvimento sentado com halteres',
  'Seated Leg Curl': 'Cadeira flexora',
  'Smith Machine Squat': 'Agachamento no Smith',
  'Standing Calf Raises': 'Elevação de panturrilhas em pé',
  'Standing Leg Curl': 'Flexão de joelhos em pé',
  'Triceps Pushdown': 'Tríceps na polia',
  'Wide-Grip Lat Pulldown': 'Puxada frontal com pegada aberta',
  'Wrist Curls': 'Flexão de punhos',
};

const NAME_ALIASES: Record<string, string[]> = {
  supinoreto: ['Barbell Bench Press', 'Dumbbell Bench Press'],
  supinoretocombarra: ['Barbell Bench Press'],
  supinoretocomhalteres: ['Dumbbell Bench Press'],
  supinoinclinado: ['Barbell Incline Bench Press', 'Incline Dumbbell Bench Press'],
  supinoinclinadocomhalteres: ['Incline Dumbbell Bench Press'],
  supinoinclinadocombarra: ['Barbell Incline Bench Press'],
  crucifixo: ['Dumbbell Flyes', 'Cable Crossover'],
  crucifixocomhalteres: ['Dumbbell Flyes'],
  agachamento: ['Barbell Full Squat', 'Dumbbell Squat'],
  agachamentolivre: ['Barbell Full Squat'],
  agachamentolivrecombarra: ['Barbell Full Squat'],
  levantamentoterra: ['Barbell Deadlift'],
  terraromeno: ['Romanian Deadlift'],
  remadacurvada: ['Bent Over Barbell Row', 'Barbell Row'],
  remadacurvadacombarra: ['Bent Over Barbell Row', 'Barbell Row'],
  remadabaixa: ['Seated Cable Rows'],
  puxadafrontal: ['Lat Pulldown', 'Wide-Grip Lat Pulldown'],
  puxadafrontalpegadaaberta: ['Wide-Grip Lat Pulldown'],
  barrafixa: ['Pullups'],
  roscadireta: ['Barbell Curl'],
  roscadiretacombarra: ['Barbell Curl'],
  roscamartelo: ['Hammer Curls'],
  elevacaolateral: ['Dumbbell Lateral Raise', 'Cable Lateral Raise'],
  elevacaolateralcomhalteres: ['Dumbbell Lateral Raise'],
  elevacaolateralnapolia: ['Cable Lateral Raise'],
  desenvolvimento: ['Dumbbell Shoulder Press'],
  desenvolvimentocomhalteres: ['Dumbbell Shoulder Press', 'Seated Dumbbell Press'],
  desenvolvimentomilitarcomhalteres: ['Dumbbell Shoulder Press', 'Seated Dumbbell Press'],
  tricepscorda: ['Cable Rope Triceps Pushdown'],
  tricepscordanapolia: ['Cable Rope Triceps Pushdown'],
  cadeiraflexora: ['Seated Leg Curl'],
  mesaflexora: ['Lying Leg Curls'],
  cadeiraextensora: ['Leg Extension'],
  legpress: ['Leg Press'],
  panturrilhaempe: ['Standing Calf Raises'],
  abdominobicicleta: ['Air Bike'],
};

export const TRAINING_DAYS = [
  { value: 'segunda', label: 'Segunda-feira', shortLabel: 'Segunda' },
  { value: 'terca', label: 'Terça-feira', shortLabel: 'Terça' },
  { value: 'quarta', label: 'Quarta-feira', shortLabel: 'Quarta' },
  { value: 'quinta', label: 'Quinta-feira', shortLabel: 'Quinta' },
  { value: 'sexta', label: 'Sexta-feira', shortLabel: 'Sexta' },
  { value: 'sabado', label: 'Sábado', shortLabel: 'Sábado' },
  { value: 'domingo', label: 'Domingo', shortLabel: 'Domingo' },
] as const;

export type TrainingDay = (typeof TRAINING_DAYS)[number]['value'];

export function getCurrentTrainingDay(): TrainingDay {
  const day = new Date().getDay();
  return (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const)[day];
}

export function getPreferredTrainingDay(): TrainingDay {
  try {
    const saved = localStorage.getItem('foco_selected_training_day');
    if (TRAINING_DAYS.some((day) => day.value === saved)) return saved as TrainingDay;
  } catch {
    // Local storage may be unavailable; use the actual current weekday.
  }
  return getCurrentTrainingDay();
}

export function savePreferredTrainingDay(value: string): void {
  if (!TRAINING_DAYS.some((day) => day.value === value)) return;
  try {
    localStorage.setItem('foco_selected_training_day', value);
  } catch {
    // The current screen state remains usable without local persistence.
  }
}

export function getTrainingDayLabel(value?: string | null): string {
  return TRAINING_DAYS.find((day) => day.value === value)?.label || 'Qualquer dia';
}

export const MUSCLE_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Peito', value: 'chest' },
  { label: 'Costas', value: 'back' },
  { label: 'Dorsais', value: 'lats' },
  { label: 'Costas médias', value: 'middle back' },
  { label: 'Lombar', value: 'lower back' },
  { label: 'Adutores', value: 'adductors' },
  { label: 'Abdutores', value: 'abductors' },
  { label: 'Ombros', value: 'shoulders' },
  { label: 'Bíceps', value: 'biceps' },
  { label: 'Tríceps', value: 'triceps' },
  { label: 'Quadríceps', value: 'quadriceps' },
  { label: 'Posteriores', value: 'hamstrings' },
  { label: 'Glúteos', value: 'glutes' },
  { label: 'Panturrilhas', value: 'calves' },
  { label: 'Abdômen', value: 'abdominals' },
  { label: 'Antebraços', value: 'forearms' },
  { label: 'Trapézio', value: 'traps' },
  { label: 'Pescoço', value: 'neck' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Funcionais', value: 'functional' },
];

// Catálogo editorial: manter somente movimentos listados nos guias do Hipertrofia.org.
// As ilustrações vêm do banco de imagens de exercícios já usado pelo FOCO; não são copiadas do site.
const HIPERTROFIA_ALLOWED_EXERCISES = new Set([
  'Barbell Bench Press', 'Dumbbell Bench Press', 'Barbell Incline Bench Press', 'Incline Dumbbell Bench Press',
  'Machine Bench Press', 'Dumbbell Flyes', 'Cable Crossover', 'Close-Grip Barbell Bench Press',
  'Cable Rope Triceps Pushdown', 'Triceps Pushdown', 'Cable Rope Overhead Triceps Extension',
  'Pushups', 'Barbell Curl', 'Cable Curl', 'Incline Dumbbell Curl', 'Hammer Curls',
  'Barbell Shrug', 'Dumbbell Shrug', 'Barbell Deadlift', 'Face Pull', 'Bent Over Barbell Row',
  'Barbell Row', 'Bent Over Two-Dumbbell Row', 'One-Arm Dumbbell Row', 'Seated Cable Rows',
  'Lat Pulldown', 'Wide-Grip Lat Pulldown', 'Pullups', 'Barbell Full Squat', 'Dumbbell Squat',
  'Smith Machine Squat', 'Leg Press', 'Leg Extension', 'Lying Leg Curls', 'Seated Leg Curl',
  'Romanian Deadlift', 'Barbell Hip Thrust', 'Standing Calf Raises', 'Dumbbell Shoulder Press',
  'Seated Dumbbell Press', 'Dumbbell Front Raise', 'Dumbbell Lateral Raise', 'Cable Lateral Raise',
  'Crunches', 'Wrist Curls',
  'Barbell Full Squat', 'Standing Leg Curl', 'Triceps Pushdown'
]);

let catalogPromise: Promise<ExerciseCatalogItem[]> | null = null;

export function normalizeExerciseText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getMuscleLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === 'back') return 'Costas';
  return MUSCLE_LABELS[normalized] || value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getEquipmentLabel(value: string): string {
  return EQUIPMENT_LABELS[value.toLowerCase()] || value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getExerciseDisplayName(name: string): string {
  return EXERCISE_NAME_PT[name] || name;
}

export function getExerciseImageUrl(imagePath: string): string {
  return IMAGE_BASE + imagePath.split('/').map((part) => encodeURIComponent(part)).join('/');
}


type DedicatedMuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'forearms' | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves' | 'abdominals'
  | 'lower back' | 'traps' | 'adductors' | 'abductors' | 'cardio' | 'functional';

const DEDICATED_LIBRARY_FILES = [
  { file: '01_peito.json', sourceGroup: 'Peito', primaryGroup: 'chest' },
  { file: '02_costas.json', sourceGroup: 'Costas', primaryGroup: 'back' },
  { file: '03_ombros.json', sourceGroup: 'Ombros', primaryGroup: 'shoulders' },
  { file: '04_biceps.json', sourceGroup: 'Bíceps', primaryGroup: 'biceps' },
  { file: '05_triceps.json', sourceGroup: 'Tríceps', primaryGroup: 'triceps' },
  { file: '06_antebracos.json', sourceGroup: 'Antebraços', primaryGroup: 'forearms' },
  { file: '07_quadriceps.json', sourceGroup: 'Quadríceps', primaryGroup: 'quadriceps' },
  { file: '08_posteriores.json', sourceGroup: 'Posteriores', primaryGroup: 'hamstrings' },
  { file: '09_gluteos.json', sourceGroup: 'Glúteos', primaryGroup: 'glutes' },
  { file: '10_panturrilhas.json', sourceGroup: 'Panturrilhas', primaryGroup: 'calves' },
  { file: '11_abdomen.json', sourceGroup: 'Abdômen', primaryGroup: 'abdominals' },
  { file: '12_lombar.json', sourceGroup: 'Lombar', primaryGroup: 'lower back' },
  { file: '13_trapezio.json', sourceGroup: 'Trapézio', primaryGroup: 'traps' },
  { file: '14_adutores_abdutores.json', sourceGroup: 'Adutores e abdutores', primaryGroup: 'adductors' },
  { file: '15_funcionais_e_cardio.json', sourceGroup: 'Funcionais e cardio', primaryGroup: 'functional' },
] as const satisfies ReadonlyArray<{
  file: string; sourceGroup: string; primaryGroup: DedicatedMuscleGroup
}>;

const VOLUME_UNITS: Record<string, { label: string; suffix: string }> = {
  por_perna: { label: 'Repetições por perna', suffix: 'por perna' },
  por_lado: { label: 'Repetições por lado', suffix: 'por lado' },
  total: { label: 'Repetições totais', suffix: 'no total' },
  segundos: { label: 'Duração sugerida', suffix: 'segundos' },
  segundos_por_lado: { label: 'Duração por lado', suffix: 'segundos por lado' },
  segundos_de_esforco: { label: 'Duração de esforço', suffix: 'segundos de esforço' },
  minutos: { label: 'Duração sugerida', suffix: 'minutos' },
  metros: { label: 'Distância sugerida', suffix: 'metros' },
  'metros por lado': { label: 'Distância por lado', suffix: 'metros por lado' },
  passos_por_lado: { label: 'Passos por lado', suffix: 'passos por lado' },
};

function mapDedicatedExercise(
  exercise: DedicatedExerciseSource,
  sourceGroup: string,
  defaultGroup: DedicatedMuscleGroup,
): ExerciseCatalogItem {
  // Files 14 and 15 contain multiple distinct categories. Use the category of
  // each exercise rather than assigning every row to one muscle group.
  const primaryGroup: DedicatedMuscleGroup =
    sourceGroup === 'Adutores e abdutores'
      ? exercise.grupo_principal === 'abdutores' ? 'abductors'
        : exercise.grupo_principal === 'adutores' ? 'adductors' : 'quadriceps'
      : sourceGroup === 'Funcionais e cardio'
        ? exercise.grupo_principal === 'cardio' ? 'cardio' : 'functional'
        : defaultGroup;

  const equipmentText = exercise.equipamentos.join(', ').replace(/_/g, ' ').toLocaleLowerCase('pt-BR');
  const equipment = !exercise.equipamentos.length ? 'body only'
    : /polia|cabo/i.test(equipmentText) ? 'cable'
      : /halter/i.test(equipmentText) ? 'dumbbell'
        : /elástico|elastico|faixa|mini band|elastico/i.test(equipmentText) ? 'bands'
          : /smith/i.test(equipmentText) ? 'smith machine'
            : /máquina|maquina|leg press|esteira|bicicleta|elíptico|eliptico|remador/i.test(equipmentText) ? 'machine'
              : /kettlebell/i.test(equipmentText) ? 'kettlebells'
                : /barra|anilha/i.test(equipmentText) ? 'barbell'
                  : /peso corporal|colchonete|degrau/i.test(equipmentText) ? 'body only'
                    : 'other';

  const muscleText = [...exercise.musculos_primarios, ...exercise.musculos_secundarios]
    .join(' ').replace(/_/g, ' ').toLocaleLowerCase('pt-BR');
  const secondaryMuscles = Array.from(new Set([
    ...(/bíceps|biceps|braquial|braquiorradial/i.test(muscleText) ? ['biceps'] : []),
    ...(/tríceps|triceps/i.test(muscleText) ? ['triceps'] : []),
    ...(/deltoide|ombro/i.test(muscleText) ? ['shoulders'] : []),
    ...(/abdominal|abdômen|abdomen|reto abdominal|transverso|obliquo|oblíquo/i.test(muscleText) ? ['abdominals'] : []),
    ...(/antebraço|antebraco|pegada|braquiorradial/i.test(muscleText) ? ['forearms'] : []),
    ...(/trapézio|trapezio|levantador da escápula/i.test(muscleText) ? ['traps'] : []),
    ...(/latíssimo|latissimo|dors[o]/i.test(muscleText) ? ['lats'] : []),
    ...(/romboide|costas|trapézio médio|trapezio medio/i.test(muscleText) ? ['middle back'] : []),
    ...(/glúteo|gluteo/i.test(muscleText) ? ['glutes'] : []),
    ...(/posterior de coxa|isquiotib/i.test(muscleText) ? ['hamstrings'] : []),
    ...(/eretor(?:es)? da coluna|quadrado lombar|lombar|multifido|multífido/i.test(muscleText) ? ['lower back'] : []),
    ...(/peitoral/i.test(muscleText) ? ['chest'] : []),
    ...(/quadríceps|quadriceps/i.test(muscleText) ? ['quadriceps'] : []),
    ...(/panturrilha|gastrocnêmio|gastrocnemio|soleo|sóleo/i.test(muscleText) ? ['calves'] : []),
    ...(/adutor/i.test(muscleText) ? ['adductors'] : []),
    ...(/abdutor|glúteo médio|gluteo medio|glúteo mínimo|gluteo minimo/i.test(muscleText) ? ['abductors'] : []),
  ])).filter((muscle) => (
    muscle !== primaryGroup
    && (primaryGroup !== 'back' || (muscle !== 'lats' && muscle !== 'middle back'))
  ));

  const primaryMuscles = primaryGroup === 'back' ? ['lats', 'middle back'] : [primaryGroup];
  const unit = exercise.unidade_repeticoes
    ? VOLUME_UNITS[exercise.unidade_repeticoes]
      || { label: 'Volume sugerido', suffix: exercise.unidade_repeticoes.replace(/_/g, ' ') }
    : null;
  const repCount = Array.isArray(exercise.repeticoes_sugeridas)
    ? exercise.repeticoes_sugeridas[0] === exercise.repeticoes_sugeridas[1]
      ? String(exercise.repeticoes_sugeridas[0])
      : String(exercise.repeticoes_sugeridas[0]) + '–' + String(exercise.repeticoes_sugeridas[1])
    : exercise.repeticoes_sugeridas;

  return {
    id: exercise.id,
    name: exercise.nome,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    level: exercise.nivel === 'intermediario' ? 'intermediate' : exercise.nivel === 'avancado' ? 'expert' : 'beginner',
    instructions: exercise.execucao,
    images: exercise.imagens_execucao,
    category: primaryGroup === 'cardio' ? 'cardio' : primaryGroup === 'functional' ? 'functional' : 'strength',
    aliases: exercise.aliases,
    movementPattern: exercise.padrao_movimento,
    primaryMuscleDisplay: exercise.musculos_primarios,
    secondaryMuscleDisplay: exercise.musculos_secundarios,
    equipmentDisplay: exercise.equipamentos.length ? exercise.equipamentos.join(' · ').replace(/_/g, ' ') : 'Peso corporal',
    respiration: exercise.respiracao,
    commonErrors: exercise.erros_comuns,
    safetyNotes: exercise.cuidados,
    suggestedSets: Array.isArray(exercise.series_sugeridas)
      ? exercise.series_sugeridas[0] === exercise.series_sugeridas[1]
        ? exercise.series_sugeridas[0]
        : String(exercise.series_sugeridas[0]) + '–' + String(exercise.series_sugeridas[1])
      : exercise.series_sugeridas,
    suggestedRepsLabel: unit?.label || 'Repetições sugeridas',
    suggestedReps: repCount + (unit ? ' ' + unit.suffix : ''),
    variations: exercise.variacoes,
    sourceGroup,
  };
}

export async function loadExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const baseUrl = import.meta.env.BASE_URL;
      const [catalogResponse, dedicatedResponses] = await Promise.all([
        fetch(baseUrl + 'exercise-catalog.json'),
        Promise.all(DEDICATED_LIBRARY_FILES.map((item) => fetch(baseUrl + item.file))),
      ]);
      if (!catalogResponse.ok) throw new Error('Não foi possível carregar a biblioteca de exercícios.');
      const unavailable = DEDICATED_LIBRARY_FILES.find((_, index) => !dedicatedResponses[index].ok);
      if (unavailable) throw new Error('Não foi possível carregar o catálogo ' + unavailable.file);
      const raw = await catalogResponse.json();
      if (!Array.isArray(raw)) throw new Error('O catálogo de exercícios está em um formato inválido.');
      const datasets = await Promise.all(dedicatedResponses.map((response) => response.json() as Promise<DedicatedExerciseFile>));
      const allDedicated = datasets.flatMap((dataset, index) => {
        if (!Array.isArray(dataset.exercicios)) {
          throw new Error('Formato inválido no catálogo ' + DEDICATED_LIBRARY_FILES[index].file);
        }
        const group = DEDICATED_LIBRARY_FILES[index];
        return dataset.exercicios.map((exercise) => mapDedicatedExercise(exercise, group.sourceGroup, group.primaryGroup));
      });
      const allSourceExercises = datasets.flatMap((dataset) => dataset.exercicios);
      const dedicatedImageIds = new Set(
        allSourceExercises.flatMap((exercise) => exercise.imagens_execucao.map((image) => image.split('/')[0]))
      );
      const dedicatedNames = new Set(
        allSourceExercises.flatMap((exercise) => [exercise.nome, ...exercise.aliases].map(normalizeExerciseText))
      );
      const existingExercises = (raw as ExerciseCatalogItem[]).filter((exercise) => {
        if (!HIPERTROFIA_ALLOWED_EXERCISES.has(exercise.name)) return false;
        if (dedicatedImageIds.has(exercise.id)) return false;
        const nameKeys = [exercise.name, getExerciseDisplayName(exercise.name)].map(normalizeExerciseText);
        return !nameKeys.some((name) => dedicatedNames.has(name));
      });
      return [...allDedicated, ...existingExercises];
    })().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

export function findMatchingExercise(
  catalog: ExerciseCatalogItem[],
  exerciseName: string,
  muscleGroup?: string
): ExerciseCatalogItem | null {
  const normalized = normalizeExerciseText(exerciseName);
  if (!normalized) return null;
  const exact = catalog.find((exercise) =>
    normalizeExerciseText(exercise.name) === normalized ||
    normalizeExerciseText(getExerciseDisplayName(exercise.name)) === normalized ||
    exercise.aliases?.some((alias) => normalizeExerciseText(alias) === normalized)
  );
  if (exact) return exact;

  const aliasKeys = Object.keys(NAME_ALIASES).sort((a, b) => b.length - a.length);
  const aliasKey = aliasKeys.find((key) => key === normalized || normalized.includes(key) || key.includes(normalized));
  if (aliasKey) {
    for (const alias of NAME_ALIASES[aliasKey]) {
      const match = catalog.find((exercise) => normalizeExerciseText(exercise.name) === normalizeExerciseText(alias));
      if (match) return match;
    }
  }

  const tokens = exerciseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  const candidates = catalog.map((exercise) => {
    const name = normalizeExerciseText(exercise.name);
    const matchCount = tokens.filter((token) => name.includes(token)).length;
    const muscleNorm = normalizeExerciseText(muscleGroup || '');
    const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles].map(normalizeExerciseText);
    const muscleBonus = muscleNorm && muscles.some((muscle) => muscleNorm.includes(muscle) || muscle.includes(muscleNorm)) ? 1 : 0;
    return { exercise, score: matchCount + muscleBonus };
  }).sort((a, b) => b.score - a.score);

  return candidates[0]?.score && candidates[0].score >= 3 ? candidates[0].exercise : null;
}
