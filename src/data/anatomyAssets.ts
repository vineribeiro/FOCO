/** Approved FOCO anatomy atlases, loaded from a public manifest.
 * Pending assets and unreviewed model outputs are never displayed.
 */
export interface AnatomyEntry {
  id: string;
  name: string;
  status: 'pending' | 'needs_review' | 'approved' | 'rejected';
  atlas: string | null;
  approved_by?: string;
  approved_at?: string;
  sha256?: string;
}
interface AnatomyManifest {
  schema_version: number;
  exercises: Record<string, AnatomyEntry>;
}
let cached: Promise<AnatomyManifest> | null = null;
export function loadAnatomyManifest(): Promise<AnatomyManifest> {
  if (!cached) {
    cached = fetch(import.meta.env.BASE_URL + 'anatomy/v3/manifest.json')
      .then(async response => {
        if (!response.ok) throw new Error('Manifest de anatomia indisponível.');
        const json = await response.json();
        if (json?.schema_version !== 3 || typeof json.exercises !== 'object') throw new Error('Manifest inválido.');
        return json as AnatomyManifest;
      }).catch(error => { cached = null; throw error; });
  }
  return cached;
}
const normalize = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '');
export async function findApprovedAnatomyAtlas(exerciseId: string | undefined, exerciseName: string): Promise<string | null> {
  const manifest = await loadAnatomyManifest();
  let entry = exerciseId ? manifest.exercises[exerciseId] : undefined;
  if (!entry) {
    const target = normalize(exerciseName);
    // A name must identify a unique exercise. Never display a similar but different movement.
    const matches = Object.values(manifest.exercises).filter(item => normalize(item.name) === target);
    if (matches.length === 1) entry = matches[0];
  }
  if (entry?.status !== 'approved' || !entry.atlas ||
    !/^anatomy\/v3\/[a-z0-9_]+\.(png|jpg|webp)$/.test(entry.atlas)) return null;
  return import.meta.env.BASE_URL + entry.atlas;
}
