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

export async function loadExerciseCatalog(): Promise<ExerciseCatalogItem[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}exercise-catalog.json`);
      if (!response.ok) throw new Error('Não foi possível carregar a biblioteca de exercícios.');
      const raw = await response.json();
      if (!Array.isArray(raw)) throw new Error('O catálogo de exercícios está em um formato inválido.');
      return raw as ExerciseCatalogItem[];
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
    normalizeExerciseText(getExerciseDisplayName(exercise.name)) === normalized
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
