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

function mapDedicatedExercise(
  exercise: DedicatedExerciseSource,
  sourceGroup: 'Peito' | 'Costas' | 'Ombros' | 'Bíceps',
  primaryGroup: 'chest' | 'back' | 'shoulders' | 'biceps',
): ExerciseCatalogItem {
  const equipmentText = exercise.equipamentos.join(', ').toLocaleLowerCase('pt-BR');
  const equipment = !exercise.equipamentos.length ? 'body only'
    : /polia|cabo/i.test(equipmentText) ? 'cable'
      : /halter/i.test(equipmentText) ? 'dumbbell'
        : /elástico|elastico|faixa/i.test(equipmentText) ? 'bands'
          : /smith/i.test(equipmentText) ? 'smith machine'
            : /barra|anilha/i.test(equipmentText) ? 'barbell'
              : /máquina|maquina|peck deck/i.test(equipmentText) ? 'machine'
                : /paralela|suspensão|suspensao|barra baixa/i.test(equipmentText) ? 'other'
                  : 'body only';

  const muscleText = [...exercise.musculos_primarios, ...exercise.musculos_secundarios]
    .join(' ').toLocaleLowerCase('pt-BR');
  const secondaryMuscles = Array.from(new Set([
    ...(/bíceps|biceps|braquial|braquiorradial/i.test(muscleText) ? ['biceps'] : []),
    ...(/tríceps|triceps/i.test(muscleText) ? ['triceps'] : []),
    ...(/deltoide|ombro/i.test(muscleText) ? ['shoulders'] : []),
    ...(/abdominal|abdômen|abdomen|reto abdominal|transverso/i.test(muscleText) ? ['abdominals'] : []),
    ...(/antebraço|antebraco|pegada|braquiorradial/i.test(muscleText) ? ['forearms'] : []),
    ...(/trapézio|trapezio|levantador da escápula/i.test(muscleText) ? ['traps'] : []),
    ...(/latíssimo|latissimo|dors[o]/i.test(muscleText) ? ['lats'] : []),
    ...(/romboide|costas|trapézio médio|trapezio medio/i.test(muscleText) ? ['middle back'] : []),
    ...(/glúteo|gluteo/i.test(muscleText) ? ['glutes'] : []),
    ...(/posterior de coxa|isquiotibial/i.test(muscleText) ? ['hamstrings'] : []),
    ...(/eretor da coluna|quadrado lombar|lombar/i.test(muscleText) ? ['lower back'] : []),
    ...(/peitoral/i.test(muscleText) ? ['chest'] : []),
    ...(/quadríceps|quadriceps/i.test(muscleText) ? ['quadriceps'] : []),
    ...(/panturrilha|gastrocnêmio|soleo/i.test(muscleText) ? ['calves'] : []),
    ...(/adutor/i.test(muscleText) ? ['adductors'] : []),
    ...(/abdutor|glúteo médio|gluteo medio/i.test(muscleText) ? ['abductors'] : []),
  ])).filter((muscle) => {
    if (primaryGroup === 'chest') return muscle !== 'chest';
    if (primaryGroup === 'back') return muscle !== 'lats' && muscle !== 'middle back';
    if (primaryGroup === 'shoulders') return muscle !== 'shoulders';
    if (primaryGroup === 'biceps') return muscle !== 'biceps';
    return muscle !== 'shoulders';
  });

  const primaryMuscles = primaryGroup === 'chest' ? ['chest']
    : primaryGroup === 'back' ? ['lats', 'middle back']
      : primaryGroup === 'shoulders' ? ['shoulders']
        : ['biceps'];

  return {
    id: exercise.id,
    name: exercise.nome,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    level: exercise.nivel === 'intermediario' ? 'intermediate' : exercise.nivel === 'avancado' ? 'expert' : 'beginner',
    instructions: exercise.execucao,
    images: exercise.imagens_execucao,
    category: 'strength',
    aliases: exercise.aliases,
    movementPattern: exercise.padrao_movimento,
    primaryMuscleDisplay: exercise.musculos_primarios,
    secondaryMuscleDisplay: exercise.musculos_secundarios,
    equipmentDisplay: exercise.equipamentos.length ? exercise.equipamentos.join(' · ') : 'Peso corporal',
    respiration: exercise.respiracao,
    commonErrors: exercise.erros_comuns,
    safetyNotes: exercise.cuidados,
    suggestedSets: Array.isArray(exercise.series_sugeridas)
      ? (exercise.series_sugeridas[0] === exercise.series_sugeridas[1]
        ? exercise.series_sugeridas[0]
        : `${exercise.series_sugeridas[0]}–${exercise.series_sugeridas[1]}`)
      : exercise.series_sugeridas,
    suggestedReps: Array.isArray(exercise.repeticoes_sugeridas)
      ? (exercise.repeticoes_sugeridas[0] === exercise.repeticoes_sugeridas[1]
        ? String(exercise.repeticoes_sugeridas[0])
        : `${exercise.repeticoes_sugeridas[0]}–${exercise.repeticoes_sugeridas[1]}`)
      : exercise.repeticoes_sugeridas,
    variations: exercise.variacoes,
    sourceGroup,
  };
}

export async function loadExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const baseUrl = import.meta.env.BASE_URL;
      const [catalogResponse, chestResponse, backResponse, shoulderResponse, bicepsResponse] = await Promise.all([
        fetch(`${baseUrl}exercise-catalog.json`),
        fetch(`${baseUrl}01_peito.json`),
        fetch(`${baseUrl}02_costas.json`),
        fetch(`${baseUrl}03_ombros.json`),
        fetch(`${baseUrl}04_biceps.json`),
      ]);
      if (!catalogResponse.ok) throw new Error('Não foi possível carregar a biblioteca de exercícios.');
      if (!chestResponse.ok || !backResponse.ok || !shoulderResponse.ok || !bicepsResponse.ok) {
        throw new Error('Não foi possível carregar uma das bibliotecas musculares do FOCO.');
      }
      const raw = await catalogResponse.json();
      const [chestData, backData, shoulderData, bicepsData] = await Promise.all([
        chestResponse.json() as Promise<DedicatedExerciseFile>,
        backResponse.json() as Promise<DedicatedExerciseFile>,
        shoulderResponse.json() as Promise<DedicatedExerciseFile>,
        bicepsResponse.json() as Promise<DedicatedExerciseFile>,
      ]);
      if (!Array.isArray(raw)) throw new Error('O catálogo de exercícios está em um formato inválido.');
      for (const [name, dataset] of [
        ['peito', chestData], ['costas', backData], ['ombros', shoulderData], ['bíceps', bicepsData],
      ] as const) {
        if (!Array.isArray(dataset.exercicios)) throw new Error(`O catálogo de ${name} está em um formato inválido.`);
      }

      const allDedicated = [
        ...chestData.exercicios.map((exercise) => mapDedicatedExercise(exercise, 'Peito', 'chest')),
        ...backData.exercicios.map((exercise) => mapDedicatedExercise(exercise, 'Costas', 'back')),
        ...shoulderData.exercicios.map((exercise) => mapDedicatedExercise(exercise, 'Ombros', 'shoulders')),
        ...bicepsData.exercicios.map((exercise) => mapDedicatedExercise(exercise, 'Bíceps', 'biceps')),
      ];
      const dedicatedImageIds = new Set(
        [...chestData.exercicios, ...backData.exercicios, ...shoulderData.exercicios, ...bicepsData.exercicios]
          .flatMap((exercise) => exercise.imagens_execucao.map((image) => image.split('/')[0]))
      );
      const dedicatedNames = new Set(
        [...chestData.exercicios, ...backData.exercicios, ...shoulderData.exercicios, ...bicepsData.exercicios]
          .flatMap((exercise) => [exercise.nome, ...exercise.aliases].map(normalizeExerciseText))
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
