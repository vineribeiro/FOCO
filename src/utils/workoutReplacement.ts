import type { WorkoutExercise, WorkoutPlan } from '../types';

/** One navigation intent, held in memory only; reload and logout never restore it. */
export interface WorkoutReplacementIntent {
  ownerId: string;
  planId: string;
  exerciseId: string;
  fingerprint: string;
  expiresAt: number;
  key: number;
}
let pending: WorkoutReplacementIntent | null = null;
let nextKey = 0;
const ttl = 10 * 60_000;
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

export function workoutReplacementFingerprint(plan: WorkoutPlan): string {
  return JSON.stringify({ id: plan.id, version: plan.version, name: plan.name, goal: plan.goal,
    frequency: plan.weekly_frequency, status: plan.status,
    exercises: (plan.exercises || []).map(ex => [ex.id, ex.exercise_name, ex.repdb_id ?? null, ex.muscle_group,
      ex.sets, ex.reps_min, ex.reps_max, ex.rest_seconds, ex.suggested_load_kg, ex.rir_target ?? null,
      ex.notes ?? '', ex.training_day ?? null, ex.position ?? null]) });
}

export function beginWorkoutReplacement(ownerId: string, plan: WorkoutPlan, exerciseId: string): void {
  if (!ownerId || plan.user_id !== ownerId || plan.status !== 'ativo' || !exerciseId
    || !plan.exercises?.some(ex => ex.id === exerciseId)) {
    throw new Error('Abra um exercício da sua ficha ativa para escolher uma substituição.');
  }
  pending = { ownerId, planId: plan.id, exerciseId, fingerprint: workoutReplacementFingerprint(plan),
    expiresAt: Date.now() + ttl, key: ++nextKey };
}

export function readWorkoutReplacement(ownerId?: string): WorkoutReplacementIntent | null {
  if (!pending || !ownerId || pending.ownerId !== ownerId || pending.expiresAt <= Date.now()) {
    pending = null; return null;
  }
  return { ...pending };
}

export function clearWorkoutReplacement(ownerId: string, key?: number): void {
  if (pending?.ownerId === ownerId && (key === undefined || pending.key === key)) pending = null;
}

export function replacementOriginal(plan: WorkoutPlan | null | undefined, intent: WorkoutReplacementIntent | null,
  ownerId?: string): WorkoutExercise | null {
  if (!plan || !intent || !ownerId || intent.ownerId !== ownerId || intent.expiresAt <= Date.now()
    || plan.user_id !== ownerId || plan.id !== intent.planId || plan.status !== 'ativo'
    || workoutReplacementFingerprint(plan) !== intent.fingerprint) return null;
  return plan.exercises?.find(ex => ex.id === intent.exerciseId) || null;
}

/** The existing atomic create-workout operation archives the prior active plan.
 * History still refers to the old plan. No exercise row is deleted or patched.
 */
export function buildWorkoutReplacement(plan: WorkoutPlan, intent: WorkoutReplacementIntent, ownerId: string,
  movement: Pick<WorkoutExercise, 'exercise_name' | 'muscle_group' | 'repdb_id'>) {
  const original = replacementOriginal(plan, intent, ownerId);
  if (!original) throw new Error('Sua ficha mudou ou a escolha expirou. Volte ao treino e selecione novamente o exercício.');
  const name = movement.exercise_name.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 100 || !movement.muscle_group || !movement.repdb_id)
    throw new Error('Escolha um movimento identificado na biblioteca e confira seu nome.');
  if (original.repdb_id === movement.repdb_id || normalize(original.exercise_name) === normalize(name))
    throw new Error('Escolha um movimento diferente do exercício atual.');
  if (plan.exercises?.some(ex => ex.id !== original.id && normalize(ex.exercise_name) === normalize(name)
    && (!ex.training_day || !original.training_day || ex.training_day === original.training_day)))
    throw new Error('Esse movimento já está neste dia da ficha. Escolha outro exercício.');
  return { name: plan.name, version: (plan.version || 1) + 1, goal: plan.goal,
    weekly_frequency: plan.weekly_frequency, status: 'ativo' as const,
    exercises: (plan.exercises || []).map(ex => {
      const { id: _id, plan_id: _planId, ...prescription } = ex;
      return ex.id === original.id ? { ...prescription, exercise_name: name, muscle_group: movement.muscle_group,
        repdb_id: movement.repdb_id, suggested_load_kg: 0, notes: '' } : prescription;
    }) };
}
