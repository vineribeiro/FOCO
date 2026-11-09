import { createSessionRequestId, isSessionRequestId, isSessionSubmission } from './sessionSubmission';
import type { SessionSubmission } from './sessionSubmission';

export interface WorkoutDraftSet {
  set_number: number;
  repetitions: number;
  load_kg: number;
  completed: boolean;
  rpe?: number;
}
export interface WorkoutDraftExercise {
  exercise_name: string;
  repdb_id?: string | null;
  muscle_group: string;
  rest_seconds: number;
  sets: WorkoutDraftSet[];
}
export interface WorkoutDraft {
  version: 1;
  updatedAt: number;
  sessionStartedAt: string;
  clientRequestId: string;
  pendingSubmission?: SessionSubmission;
  selectedTrainingDay: string;
  planId: string | null;
  sessionNotes: string;
  perceivedEffort?: string;
  sessionPerformance?: string;
  exerciseLogs: WorkoutDraftExercise[];
}
const keyFor = (userId: string) => 'foco:workout-draft:v1:' + encodeURIComponent(userId);

export function loadWorkoutDraft(userId: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const draft: WorkoutDraft = JSON.parse(raw);
    if (draft.version !== 1 || !Number.isFinite(draft.updatedAt) || (!draft.pendingSubmission && Date.now() - draft.updatedAt > 7 * 86400000)
      || !Array.isArray(draft.exerciseLogs) || !draft.exerciseLogs.every((ex) => typeof ex.exercise_name === 'string' && Array.isArray(ex.sets))
      || !Number.isFinite(new Date(draft.sessionStartedAt).getTime())
      || (draft.pendingSubmission && !isSessionSubmission(draft.pendingSubmission))) return null;
    const clientRequestId = draft.pendingSubmission?.client_request_id
      || (isSessionRequestId(draft.clientRequestId) ? draft.clientRequestId : createSessionRequestId());
    const restored = { ...draft, clientRequestId };
    if (draft.clientRequestId !== clientRequestId) {
      // Preserve the age of the original draft when adding its replay identity.
      try { localStorage.setItem(keyFor(userId), JSON.stringify(restored)); } catch { /* The page will show its storage warning. */ }
    }
    return restored;
  } catch { return null; }
}
export function saveWorkoutDraft(userId: string, data: Omit<WorkoutDraft, 'version' | 'updatedAt'>): boolean {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ ...data, version: 1, updatedAt: Date.now() }));
    return true;
  } catch { return false; }
}
export function clearWorkoutDraft(userId: string): void {
  try { localStorage.removeItem(keyFor(userId)); } catch { /* unavailable storage */ }
}
