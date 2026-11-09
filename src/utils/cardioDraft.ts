import { CARDIO_TYPES } from './cardio';
import type { CardioEffort, CardioMachine } from './cardio';
import { createSessionRequestId, isSessionRequestId, isSessionSubmission } from './sessionSubmission';
import type { SessionSubmission } from './sessionSubmission';

export interface CardioDraft {
  version: 1;
  clientRequestId: string;
  machine: CardioMachine;
  effort: CardioEffort;
  startedAt: number;
  runningSince: number | null;
  accumulatedSeconds: number;
  finalizing?: boolean;
  finishedAt?: number;
  metric: string;
  notes: string;
  pendingSubmission?: SessionSubmission;
}

const storageKey = (userId: string) => 'foco:cardio-draft:v1:' + encodeURIComponent(userId);

export function loadCardioDraft(userId?: string): CardioDraft | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as CardioDraft;
    if (draft.version !== 1 || !CARDIO_TYPES.some(type => type.id === draft.machine)
      || !Number.isFinite(draft.startedAt) || draft.startedAt > Date.now()
      || (!draft.pendingSubmission && draft.startedAt < Date.now() - 7 * 86400000)
      || !Number.isFinite(draft.accumulatedSeconds)
      || (draft.runningSince !== null && !Number.isFinite(draft.runningSince))
      || (draft.pendingSubmission && !isSessionSubmission(draft.pendingSubmission))) return null;
    // Upgrade existing drafts in place; retain all activity data and its clock.
    const clientRequestId = draft.pendingSubmission?.client_request_id
      || (isSessionRequestId(draft.clientRequestId) ? draft.clientRequestId : createSessionRequestId());
    const restored = { ...draft, clientRequestId };
    if (draft.clientRequestId !== clientRequestId) saveCardioDraft(userId, restored);
    return restored;
  } catch { return null; }
}

export function saveCardioDraft(userId: string, next: CardioDraft | null): boolean {
  try {
    if (next) localStorage.setItem(storageKey(userId), JSON.stringify(next));
    else localStorage.removeItem(storageKey(userId));
    return true;
  } catch { return false; }
}

export function currentCardioSeconds(draft: CardioDraft): number {
  if (draft.pendingSubmission) return draft.pendingSubmission.duration_seconds;
  return Math.max(0, Math.floor(draft.accumulatedSeconds
    + (draft.runningSince === null ? 0 : (Date.now() - draft.runningSince) / 1000)));
}
