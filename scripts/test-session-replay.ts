import assert from 'node:assert/strict';
import { createSessionRequestId, createSessionSubmission, isSessionRequestId } from '../src/utils/sessionSubmission';
import { loadWorkoutDraft, saveWorkoutDraft, clearWorkoutDraft } from '../src/utils/workoutDraft';
import { loadCardioDraft, saveCardioDraft, currentCardioSeconds } from '../src/utils/cardioDraft';

const values = new Map<string, string>();
let quotaExceeded = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (quotaExceeded) throw new DOMException('Synthetic quota limit', 'QuotaExceededError');
    values.set(key, value);
  },
  removeItem: (key: string) => values.delete(key),
} });
const originalNow = Date.now;
let now = Date.parse('2026-11-09T12:00:00Z');
Date.now = () => now;

try {
  const requestId = createSessionRequestId();
  assert.ok(isSessionRequestId(requestId));
  const editableSets = [{ exercise_name: 'Supino de teste', set_number: 1, repetitions: 10, load_kg: 20, completed: true }];
  const submission = createSessionSubmission(requestId, {
    plan_name: 'Treino sintético', started_at: new Date(now - 60000).toISOString(),
    finished_at: new Date(now).toISOString(), duration_seconds: 60,
    status: 'completed', notes: 'Registro sintético', sets: editableSets,
  });
  const originalPayload = JSON.stringify(submission);
  editableSets[0].repetitions = 99;
  assert.equal(submission.sets[0].repetitions, 10, 'Finalization must detach the record from editable inputs');

  const workout = {
    clientRequestId: requestId, pendingSubmission: submission,
    sessionStartedAt: submission.started_at, selectedTrainingDay: 'segunda', planId: null,
    sessionNotes: 'Registro sintético', exerciseLogs: [{ exercise_name: 'Supino de teste',
      muscle_group: 'Peitoral', rest_seconds: 60, sets: submission.sets }],
  };
  assert.equal(saveWorkoutDraft('account-a', workout), true);
  assert.equal(saveWorkoutDraft('account-b', { ...workout, clientRequestId: createSessionRequestId(), pendingSubmission: undefined }), true);
  // Simulate a saved POST whose response was lost, then an app reload days later.
  now += 9 * 86400000;
  const restored = loadWorkoutDraft('account-a');
  assert.ok(restored, 'A pending finalization must remain recoverable after the normal draft expiry');
  assert.equal(JSON.stringify(restored.pendingSubmission), originalPayload, 'A reload/retry must preserve the exact original record');
  assert.equal(restored.clientRequestId, requestId);
  assert.equal(loadWorkoutDraft('unknown-account'), null);
  clearWorkoutDraft('account-a');
  assert.equal(loadWorkoutDraft('account-a'), null);
  assert.ok(values.has('foco:workout-draft:v1:account-b'), 'Confirming one account must not erase another account draft');

  // Existing in-progress drafts gain an identity without changing times or sets.
  const legacy = { ...workout, clientRequestId: undefined, pendingSubmission: undefined,
    version: 1, updatedAt: now, sessionStartedAt: new Date(now - 120000).toISOString() };
  values.set('foco:workout-draft:v1:legacy', JSON.stringify(legacy));
  const upgraded = loadWorkoutDraft('legacy')!;
  assert.ok(isSessionRequestId(upgraded.clientRequestId));
  assert.equal(loadWorkoutDraft('legacy')!.clientRequestId, upgraded.clientRequestId);
  assert.deepEqual(upgraded.exerciseLogs, legacy.exerciseLogs);
  assert.equal(upgraded.sessionStartedAt, legacy.sessionStartedAt);

  const cardio = { version: 1 as const, clientRequestId: requestId, machine: 'esteira' as const,
    effort: 'leve' as const, startedAt: now - 60000, runningSince: null,
    accumulatedSeconds: 60, finalizing: true, metric: '1,25', notes: '', pendingSubmission: submission };
  assert.equal(saveCardioDraft('account-a', cardio), true);
  now += 10 * 86400000;
  const restoredCardio = loadCardioDraft('account-a')!;
  assert.ok(restoredCardio);
  assert.equal(currentCardioSeconds(restoredCardio), 60, 'A retry cannot add idle time to the activity');
  assert.equal(JSON.stringify(restoredCardio.pendingSubmission), originalPayload);
  quotaExceeded = true;
  const previousRaw = values.get('foco:cardio-draft:v1:account-a');
  assert.equal(saveCardioDraft('account-a', { ...restoredCardio, notes: 'unsaved edit' }), false);
  assert.equal(values.get('foco:cardio-draft:v1:account-a'), previousRaw, 'A failed write must retain the previous recoverable record');
  const previousWorkoutRaw = values.get('foco:workout-draft:v1:legacy');
  assert.equal(saveWorkoutDraft('legacy', upgraded), false);
  assert.equal(values.get('foco:workout-draft:v1:legacy'), previousWorkoutRaw);
  quotaExceeded = false;
  assert.equal(saveCardioDraft('account-a', null), true);
  assert.equal(loadCardioDraft('account-a'), null);

  console.log('PASS session replay: immutable payload, reload, stable identity, legacy drafts, own-account cleanup and storage failure.');
} finally {
  Date.now = originalNow;
}
