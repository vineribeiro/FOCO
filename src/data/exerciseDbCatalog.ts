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
  | { state: 'ok'; exercises: ExternalExercise[]; total: number | null; hasNext: boolean }
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

export function makeExerciseDBBrowseUrl(query = '', page = 1): string {
  const term = query.trim().slice(0, 80);
  const n = Math.max(1, Math.min(200, Math.floor(Number(page) || 1)));
  const path = term ? '/api/v1/exercises/search' : '/api/v1/exercises';
  const url = new URL(path, ROOT);
  if (term) url.searchParams.set('search', term);
  url.searchParams.set('limit', String(EXERCISEDB_PAGE_SIZE));
  // Supports public-API offset pagination and page-based implementations;
  // a repetition guard in the caller prevents looping if a param is ignored.
  url.searchParams.set('page', String(n));
  url.searchParams.set('offset', String((n - 1) * EXERCISEDB_PAGE_SIZE));
  return url.href;
}

export async function browseExerciseDB(
  { query = '', page = 1, signal }: { query?: string; page?: number; signal?: AbortSignal } = {}
): Promise<ExternalExercisePage> {
  if (!isExerciseDBBetaAllowed()) return { state: 'disabled' };
  try {
    const response = await fetch(makeExerciseDBBrowseUrl(query, page), {
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
    const pages = meta && typeof meta.totalPages === 'number' ? meta.totalPages : null;
    const total = meta && typeof meta.total === 'number' && Number.isFinite(meta.total) ? meta.total : null;
    const hasNext = pages !== null ? page < pages : meta?.hasNextPage === false
      ? false : total !== null ? page * EXERCISEDB_PAGE_SIZE < total
      : root.data.length >= EXERCISEDB_PAGE_SIZE;
    return { state: 'ok', exercises, total, hasNext };
  } catch {
    return { state: 'unavailable' };
  }
}
