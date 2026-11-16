import type { GeneratedWorkoutProposal } from '../types';

const prefix = 'foco:ai-workout-draft:v1:';
const ttl = 10 * 60_000;
export interface AiWorkoutFormDraft {
  goal: string;
  frequency: number;
  experience: 'iniciante' | 'intermediario' | 'avancado';
  focus: string[];
  equipment: string;
  includeBodyMetrics: boolean;
  medicalClearanceConfirmed: boolean;
}
export function readAiWorkoutFormDraft(userId: string, baseFingerprint: string): AiWorkoutFormDraft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(prefix + encodeURIComponent(userId)) || 'null');
    const form = draft?.form;
    if (!Number.isFinite(draft?.expiresAt) || draft.expiresAt <= Date.now() || draft.baseFingerprint !== baseFingerprint
      || !form || typeof form.goal !== 'string' || !Number.isInteger(form.frequency)
      || form.frequency < 2 || form.frequency > 7 || !['iniciante','intermediario','avancado'].includes(form.experience)
      || !Array.isArray(form.focus) || form.focus.some((value: unknown) => typeof value !== 'string')
      || typeof form.equipment !== 'string' || typeof form.includeBodyMetrics !== 'boolean'
      || typeof form.medicalClearanceConfirmed !== 'boolean') return null;
    return form;
  } catch { return null; }
}
export async function aiWorkoutFingerprint(context: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(context));
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}
export function readAiWorkoutDraft(userId: string, fingerprint: string): GeneratedWorkoutProposal | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(prefix + encodeURIComponent(userId)) || 'null');
    if (!draft || !Number.isFinite(draft.expiresAt) || draft.expiresAt <= Date.now()) {
      clearAiWorkoutDraft(userId); return null;
    }
    if (draft.fingerprint !== fingerprint || typeof draft.plan?.name !== 'string'
      || !Array.isArray(draft.plan?.exercises) || !draft.plan.exercises.length) return null;
    return draft.plan;
  } catch { return null; }
}
export function saveAiWorkoutDraft(userId: string, fingerprint: string, plan: GeneratedWorkoutProposal,
  formContext?: { baseFingerprint: string; form: AiWorkoutFormDraft }): void {
  try { sessionStorage.setItem(prefix + encodeURIComponent(userId), JSON.stringify({ fingerprint, expiresAt: Date.now() + ttl, plan, ...formContext })); }
  catch { /* The proposal remains available on screen if browser storage is full. */ }
}
export function clearAiWorkoutDraft(userId: string): void {
  try { sessionStorage.removeItem(prefix + encodeURIComponent(userId)); } catch { /* Storage may be unavailable. */ }
}
