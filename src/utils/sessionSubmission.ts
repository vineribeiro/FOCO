export interface SessionSubmissionSet {
  exercise_name: string;
  set_number: number;
  repetitions: number;
  load_kg: number;
  completed: boolean;
}

/** The first finalization is a snapshot. Retries must send this exact record. */
export interface SessionSubmission {
  client_request_id: string;
  plan_id?: string;
  plan_name?: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  status: 'completed';
  notes?: string;
  sets: SessionSubmissionSet[];
}

export function isSessionRequestId(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createSessionRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Older secure webviews expose getRandomValues before randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createSessionSubmission(
  requestId: string,
  data: Omit<SessionSubmission, 'client_request_id'>,
): SessionSubmission {
  if (!isSessionRequestId(requestId)) throw new Error('Não foi possível identificar esta sessão. Reabra o treino antes de salvar.');
  // Detach all sets from editable state so a response lost in transit cannot
  // turn a retry into a different workout under the same idempotency key.
  return { ...data, client_request_id: requestId, sets: data.sets.map(set => ({ ...set })) };
}

export function isSessionSubmission(value: unknown): value is SessionSubmission {
  if (!value || typeof value !== 'object') return false;
  const item = value as SessionSubmission;
  return isSessionRequestId(item.client_request_id)
    && typeof item.started_at === 'string' && typeof item.finished_at === 'string'
    && Number.isFinite(Date.parse(item.started_at))
    && Number.isFinite(Date.parse(item.finished_at))
    && item.status === 'completed'
    && Number.isFinite(item.duration_seconds) && item.duration_seconds >= 0
    && Array.isArray(item.sets) && item.sets.every(set => set
      && typeof set.exercise_name === 'string'
      && Number.isFinite(set.set_number) && Number.isFinite(set.repetitions)
      && Number.isFinite(set.load_kg) && typeof set.completed === 'boolean');
}
