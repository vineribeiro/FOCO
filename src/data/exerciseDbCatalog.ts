import { isExerciseDBBetaAllowed, safeExerciseDBGif } from './exerciseDbBeta';

/** Live, read-only exploration. No downloading, imports or persistent cache. */
export interface ExternalExercise {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  instructions: string[];
}
export type ExternalExercisePage =
  | { state: 'ok'; exercises: ExternalExercise[]; total: number | null; hasNext: boolean; nextCursor: string | null }
  | { state: 'rate_limited' | 'unavailable' | 'disabled' | 'invalid_response' };

export const EXERCISEDB_PAGE_SIZE = 12;
const ROOT = 'https://oss.exercisedb.dev';
const clean = (x: unknown, max = 180): string => typeof x === 'string' ? x.trim().slice(0, max) : '';
const cleanList = (x: unknown, count = 14): string[] =>
  Array.isArray(x) ? x.slice(0, count).map(v => clean(v, 240)).filter(Boolean) : [];

export function sanitizeExternalExercise(value: unknown): ExternalExercise | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  const exerciseId = clean(r.exerciseId, 80), name = clean(r.name);
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(exerciseId) || !name) return null;
  return {
    exerciseId, name,
    gifUrl: safeExerciseDBGif(r.gifUrl),
    bodyParts: cleanList(r.bodyParts),
    targetMuscles: cleanList(r.targetMuscles),
    secondaryMuscles: cleanList(r.secondaryMuscles),
    equipments: cleanList(r.equipments),
    instructions: cleanList(r.instructions, 18),
  };
}

export function makeExerciseDBBrowseUrl(query = '', after: string | null = null): string {
  const term = query.trim().slice(0, 80);
  const url = new URL(term ? '/api/v1/exercises/search' : '/api/v1/exercises', ROOT);
  if (term) url.searchParams.set('search', term);
  url.searchParams.set('limit', String(EXERCISEDB_PAGE_SIZE));
  // The provider uses opaque, server-issued cursors; never calculate an offset.
  if (after && /^[A-Za-z0-9_-]{3,96}$/.test(after)) url.searchParams.set('after', after);
  return url.href;
}

export async function browseExerciseDB(
  { query = '', after = null, signal }: { query?: string; after?: string | null; signal?: AbortSignal } = {}
): Promise<ExternalExercisePage> {
  if (!isExerciseDBBetaAllowed()) return { state: 'disabled' };
  try {
    const response = await fetch(makeExerciseDBBrowseUrl(query, after), {
      signal, cache: 'no-store', credentials: 'omit',
      referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' },
    });
    if (response.status === 429) return { state: 'rate_limited' };
    if (!response.ok) return { state: 'unavailable' };
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return { state: 'invalid_response' };
    const root = body as Record<string, unknown>;
    if (!Array.isArray(root.data)) return { state: 'invalid_response' };
    const exercises = root.data.slice(0, EXERCISEDB_PAGE_SIZE).map(sanitizeExternalExercise)
      .filter((v): v is ExternalExercise => v !== null);
    const meta = (root.meta && typeof root.meta === 'object') ? root.meta as Record<string, unknown> : null;
    const total = meta && typeof meta.total === 'number' && Number.isFinite(meta.total) ? meta.total : null;
    const nextCursor = meta && meta.hasNextPage === true
      && typeof meta.nextCursor === 'string'
      && /^[A-Za-z0-9_-]{3,96}$/.test(meta.nextCursor) ? meta.nextCursor : null;
    return { state: 'ok', exercises, total, nextCursor, hasNext: nextCursor !== null };
  } catch {
    return { state: 'unavailable' };
  }
}
