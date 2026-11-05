import type { WorkoutSession } from '../types';
import { isCardioSession } from './cardio';

/** Read-only, transparent insights built from persisted sessions. No recovery or medical inference. */
export interface FocoTrainingInsights {
  workouts: number;
  strengthSessions: number;
  cardioSessions: number;
  completedSets: number;
  totalMinutes: number;
  hasHistory: boolean;
}
export function summarizeTrainingHistory(sessions: WorkoutSession[], now = Date.now()): FocoTrainingInsights {
  const start = now - 30 * 24 * 60 * 60 * 1000;
  const valid = sessions.filter(s => {
    const at = new Date(s.started_at).getTime();
    return s.status === 'completed' && Number.isFinite(at) && at >= start && at <= now;
  });
  const cardio = valid.filter(isCardioSession);
  const strength = valid.filter(s => !isCardioSession(s));
  return {
    workouts: valid.length,
    strengthSessions: strength.length,
    cardioSessions: cardio.length,
    completedSets: strength.reduce((n,s)=>n+(s.sets || []).filter(set=>set.completed).length,0),
    totalMinutes: Math.round(valid.reduce((n,s)=>n+Math.max(0,Number(s.duration_seconds)||0),0)/60),
    hasHistory: sessions.some(s=>s.status==='completed'),
  };
}
