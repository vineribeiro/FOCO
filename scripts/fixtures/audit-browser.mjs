/** Synthetic UI fixtures only. None of these IDs, tokens or reports are real. */
export const auditCredentials = {
  access: 'audit-synthetic-access-token',
  refresh: 'audit-synthetic-refresh-token',
  renewedAccess: 'audit-synthetic-renewed-access-token',
  renewedRefresh: 'audit-synthetic-renewed-refresh-token',
};

export function createAuditFixtures() {
  const user = { id: 'audit-synthetic-user', full_name: 'Atleta de Teste', email: 'atleta@example.invalid' };
  const profile = { id: user.id, full_name: user.full_name, birth_date: '1990-01-01',
    height_cm: 175, current_weight_kg: 75, experience_level: 'intermediario' };
  const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const exercises = days.map(day => ({ id: 'audit-exercise-' + day, plan_id: 'audit-plan',
    exercise_name: 'Supino reto com barra', muscle_group: 'Peitoral', training_day: day,
    sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, suggested_load_kg: 20, notes: '' }));
  const plan = { id: 'audit-plan', user_id: user.id, name: 'Ficha sintética de teste', version: 1,
    status: 'ativo', weekly_frequency: 4, goal: 'Hipertrofia',
    created_at: '2026-01-01T12:00:00.000Z', exercises };
  const anamnesis = { primary_goal: 'Hipertrofia Máxima', goal_details: 'Resposta sintética preservada',
    training_age: '1–3 anos', activity_level: 'Moderadamente ativo', weekly_frequency: 4,
    session_minutes: 60, preferred_days: ['segunda', 'terca', 'quinta', 'sexta'],
    priority_muscles: ['Costas'], equipment_available: ['Academia completa'], current_routine: 'Rotina sintética',
    exercise_preferences: '', pain_or_injuries: '', health_notes: '', sleep_quality: 'Bom',
    cardio_habits: 'Caminhadas', consent_health_data: false };
  const goal = { id: 'audit-goal', user_id: user.id, goal_type: 'Força Máxima',
    description: 'Meta sintética recuperada', priority: 1, target_date: '2027-01-01', status: 'ativo' };
  const file = { id: 'audit-file', user_id: user.id, filename: 'documento-sintetico.pdf',
    processing_status: 'pending', mime_type: 'application/pdf', storage_path: 'audit-not-a-real-file',
    created_at: '2026-01-01T12:00:00.000Z', extracted_data: null };
  return {
    '/api/auth/me': { user, profile }, '/api/profile': profile, '/api/anamnesis': anamnesis,
    '/api/workouts/active': plan, '/api/workouts': [plan], '/api/sessions': [],
    '/api/goals': [goal], '/api/files': [file], '/api/measurements': [], '/api/recommendations': [],
    '/api/system/status': { app: 'FOCO', version: 'audit-fixture', database: 'fixture' },
  };
}
