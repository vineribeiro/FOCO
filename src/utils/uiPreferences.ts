/** Per-device presentation preferences only; never stored in account/health data. */
export type FocoDensity = 'comfortable' | 'compact';
export type FocoGlass = 'balanced' | 'reduced';
export interface FocoUiPreferences { density: FocoDensity; glass: FocoGlass; }
const STORAGE_KEY = 'foco-ui-preferences-v2';
export const defaultUiPreferences: FocoUiPreferences = { density:'comfortable', glass:'balanced' };
export function readUiPreferences(): FocoUiPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      glass: parsed.glass === 'reduced' ? 'reduced' : 'balanced',
    };
  } catch { return { ...defaultUiPreferences }; }
}
export function applyUiPreferences(value: FocoUiPreferences): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.focoDensity = value.density;
  document.documentElement.dataset.focoGlass = value.glass;
}
export function saveUiPreferences(value: FocoUiPreferences): boolean {
  applyUiPreferences(value);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; }
  catch { return false; }
}
