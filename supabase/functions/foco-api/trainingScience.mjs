/**
 * FOCO · Motor de decisão para fichas de musculação.
 * Base metodológica: Estudo Profissional de Musculação (edição 2026),
 * entregue pelo proprietário do aplicativo em 28/10/2026.
 * Valores são faixas de partida, não prescrições clínicas universais.
 * Referências principais citadas no estudo:
 * ACSM 2026 https://pubmed.ncbi.nlm.nih.gov/41843416/
 * Dose-resposta https://pubmed.ncbi.nlm.nih.gov/41343037/
 * Descanso https://pubmed.ncbi.nlm.nih.gov/39205815/
 */
import { catalogExercise } from "./trainingCatalog.mjs";
import { focoLabGuidance, focoLabEvidenceRefs, FOCO_LAB_SOURCE } from "./focoLabKnowledge.mjs";

export const SCIENCE_ENGINE_VERSION = "foco-training-study-2026.3";
const WEEKDAYS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
const NORMALIZE = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const EXPERIENCE = {
  iniciante: { weeklyHint: [4, 8], weeklyCeiling: 12, dailyCeiling: 19, rir: [3, 4] },
  intermediario: { weeklyHint: [8, 14], weeklyCeiling: 18, dailyCeiling: 26, rir: [2, 3] },
  avancado: { weeklyHint: [10, 20], weeklyCeiling: 24, dailyCeiling: 32, rir: [1, 3] },
};
const RANGE = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * FOCO session-size preference (product heuristic, NOT a scientific dose rule).
 * Adjust sets/rest/exercise choices to the available time rather than increasing
 * total volume to reach a cosmetic exercise count.
 */
export function sessionExerciseRange(sessionMinutes = 60) {
  const minutes = RANGE(Number(sessionMinutes) || 60, 20, 180);
  if (minutes < 30) return { min: 2, max: 3 };
  if (minutes <= 45) return { min: 4, max: 5 };
  if (minutes <= 60) return { min: 5, max: 6 };
  if (minutes <= 75) return { min: 6, max: 7 };
  return { min: 7, max: 8 };
}

export function classifyMovement(name, muscle = "") {
  const n = NORMALIZE(name);
  const group = NORMALIZE(muscle);
  if (/(esteira|corrida|caminhada|bicicleta|eliptic|remo ergometrico|pular corda|polichinelo|burpee|corrida parada)/.test(n)
      || /(cardio|aerobio|condicionamento)/.test(group)) return "cardio";
  if (/(prancha|pallof|abdominal|crunch|dead bug|bird dog|mountain climber|rotacao russa|elevacao de pernas)/.test(n)
      || /(abdomen|core)/.test(group)) return "core";
  if (/(triceps|rosca|antebraco|punho|elevacao lateral|elevacao frontal|panturrilha|extensora|flexora|aducao|abducao|crucifixo|face pull|peck deck|coice|encolhimento)/.test(n)) return "accessory";
  if (/(remada|puxada|pulldown|barra fixa|desenvolvimento|pull up|pullover)/.test(n)) return "pull_push_compound";
  if (/(supino|agachamento|terra|stiff|leg press|afundo|avanco|hip thrust|hack|levantamento|smith|burpee|mergulho|step up)/.test(n))
    return "heavy_compound";
  return "other";
}
export function minimumRestSeconds(name, group = "") {
  const movement = classifyMovement(name, group);
  if (movement === "heavy_compound" || movement === "pull_push_compound") return 120;
  if (movement === "accessory") return 60;
  return movement === "cardio" || movement === "core" ? 45 : 75;
}
function splitForFrequency(frequency) {
  if (frequency <= 3) return "Full Body A/B/C: movimentos de empurrar, puxar, joelho, quadril e core distribuídos entre os dias.";
  if (frequency === 4) return "Upper/Lower A/B: 2 sessões superiores e 2 inferiores, sem concentração excessiva da dose.";
  if (frequency === 5) return "Híbrida: superiores A, inferiores A, sessão de prioridade recuperável, superiores B, inferiores B.";
  if (frequency === 6) return "Push/Pull/Legs A/B ou outra divisão equilibrada em seis dias, sem treinar o mesmo grupo pesado em dias seguidos.";
  return "Sete dias disponíveis: até seis sessões de força e um dia de recuperação ativa/cardio leve; não exigir sete sessões pesadas.";
}
function goalRules(goal, experience) {
  const n = NORMALIZE(goal);
  if (/(forca|powerbuilding|cargas)/.test(n))
    return experience === "iniciante"
      ? "Força em iniciantes: priorize domínio técnico com 6-10 repetições; não sugerir teste de 1RM."
      : "Força: compostos principais podem usar 3-6 repetições com técnica e 3-5 minutos de descanso; acessórios moderados.";
  if (/(resistencia|condicionamento)/.test(n))
    return "Resistência muscular: usualmente 15-25 repetições ou mais em exercícios adequados, mantendo força e técnica.";
  if (/(potencia|explos)/.test(n))
    return "Potência: 2-5 repetições com execução veloz e de qualidade, somente quando experiência e segurança permitirem; baixa fadiga.";
  return "Hipertrofia e recomposição: usualmente 6-15 repetições, sem proibir outras faixas apropriadas; nunca confundir repetições altas com maior perda de gordura.";
}

export function assessTrainingSafety({ notes = "", consent = false } = {}) {
  if (!consent) return { highRisk: false, acuteRedFlag: false, warnings: [] };
  const normalized = NORMALIZE(notes);
  const highRisk = /(rabdomiol|rhabdomyol|recorrenc.*renal|miopatia)/.test(normalized);
  const redFlag = /(urina escura|dor no peito|dor toracica|desmaio|falta de ar desproporcional|fraqueza intensa|sintoma neurologico)/.test(normalized);
  const negated = /(sem|nega|nao apresenta|ausencia de)\s+.{0,28}(urina escura|dor no peito|dor toracica|desmaio|falta de ar|fraqueza intensa)/.test(normalized);
  const acuteRedFlag = redFlag && !negated;
  const warnings = [];
  if (highRisk) warnings.push("Histórico de rabdomiólise/risco de recorrência: solicite revisão de profissional habilitado em articulação com o médico. Não prescrever teste máximo, falha frequente ou aumento abrupto do volume.");
  if (acuteRedFlag) warnings.push("Há relato compatível com sinal de alerta. Não iniciar treino nem gerar cargas antes de avaliação médica.");
  return { highRisk, acuteRedFlag, warnings };
}

export function buildScientificWorkoutGuidance({
  frequency = 3, experience = "iniciante", goal = "", sessionMinutes = 60,
  priorityMuscles = [], historyAvailable = false, highRisk = false,
} = {}) {
  const level = EXPERIENCE[experience] || EXPERIENCE.iniciante;
  const priority = Array.isArray(priorityMuscles) ? priorityMuscles.filter(Boolean).join(", ") : String(priorityMuscles || "");
  const exerciseRange = sessionExerciseRange(sessionMinutes);
  return [
    "MÉTODO FOCO 2026 (estudo técnico fornecido pelo responsável do app; faixas são heurísticas, não leis):",
    "1. Organize por padrões: empurrar horizontal/vertical, puxar horizontal/vertical, joelho, dobradiça de quadril, locomover-se e estabilidade do tronco. Peito/tríceps/ombros e costas/bíceps são sinergias, mas não divisões obrigatórias.",
    "2. Divisão para " + frequency + " dias: " + splitForFrequency(frequency) + " Prefira adesão e recuperação a divisões artificiais.",
    "3. Volume direto por músculo, ponto de partida para " + experience + ": " + level.weeklyHint[0] + "-" + level.weeklyHint[1] +
      " séries/semana; considere trabalho indireto de compostos; teto técnico conservador de " + level.weeklyCeiling + " séries diretas por grupo/semana para esta geração. Não trate mínimos como obrigação para músculos acessórios.",
    "4. Respeite até " + level.dailyCeiling + " séries por dia e duração realista de aproximadamente " + sessionMinutes + " minutos incluindo aquecimento e transições. Evite dezenas de exercícios por dia.",
    "4a. Para " + sessionMinutes + " minutos, a preferência FOCO é de " + exerciseRange.min + "-" + exerciseRange.max + " exercícios DIFERENTES por dia. Faixas: 30-45 min = 4-5; 46-60 min = 5-6; 61-75 min = 6-7; 76+ min = 7-8. Para menos de 30 min, 2-3. Esta é uma preferência do produto, NÃO uma recomendação científica de dose: distribua os exercícios com 1-3 séries quando necessário, respeite a duração, a recuperação, o volume semanal, as restrições e o catálogo. Não adicione isolamentos redundantes apenas para preencher números. Exceção para condição de alto risco e dia exclusivamente dedicado à recuperação ativa.",
    "5. " + goalRules(goal, experience),
    "6. RIR alvo inicial de " + level.rir[0] + "-" + level.rir[1] + " (repetições em reserva). Não exigir falha muscular em todas as séries; jamais inventar cargas em kg sem histórico.",
    "7. Pausas: multiarticulares pesados 120-240 s (força muito pesada pode precisar 180-300 s); remadas/puxadas/desenvolvimento 120-180 s; isolamentos 60-120 s. Ajuste a execução e a recuperação do indivíduo.",
    "8. Prioridades musculares: " + (priority || "equilíbrio global") + ". Aumente prioridade redistribuindo volume semanal; não apenas somando séries indiscriminadamente.",
    "9. Ordem: primeiro o padrão/exercício prioritário, depois auxiliares; combine estímulos diretos/indiretos sem sobrecarga repetida. Recuperação aproximada de 48 h entre sessões exigentes do mesmo grupo é referência, não regra universal. Não repetir o mesmo grupo com dose alta em dias seguidos.",
    "10. Progressão dupla: primeiro ampliar repetições dentro da faixa; ao atingir limite superior em todas as séries com técnica, amplitude e RIR compatíveis, aumentar a carga gradualmente e reiniciar na faixa inferior. Deload somente se fadiga/desempenho justificarem.",
    "11. Técnica: movimentos controlados, amplitude individual sem dor, ajustes de banco/apoios. Supino punhos alinhados, agachamento pés estáveis, leg press pelve apoiada, remada tronco estabilizado, terra romeno dobradiça de quadril, desenvolvimento ombro tolerado.",
    "12. Emagrecimento: preserve força e massa magra, adicione cardio segundo tolerância; não prometer que repetições altas queimam mais gordura. Diretrizes gerais de atividade aeróbica da OMS não precisam ser convertidas em volume extremo por sessão.",
    "13. Monitore repetições, séries, carga, RIR, técnica, sono, dores, adesão e recuperação por sessão e semana; reavalie prioridades e volume após 15 dias, e métricas corporais quando justificadas. Bioimpedância OKOK depende de condições de medição e não é diagnóstico.",
    "14. " + (historyAvailable ? "Use desempenho anterior registrado para evitar trocar exercícios sem necessidade e melhorar a progressão." : "Sem histórico de carga: suggested_load_kg = 0, ajuste inicial presencial."),
    "15. " + (highRisk ? "ALERTA: condição médica relatada; apenas proposta educacional conservadora, RIR 3-4, até 2 séries por exercício, sem cargas máximas/falha/sessões extenuantes; revisão médica e profissional indispensável." : "Não prescrever dieta ou tratar doenças. Respeitar limitações consentidas."),
    "16. Para cada exercício inclua rir_target inteiro compatível com as orientações acima (tipicamente " + level.rir[0] + "-" + level.rir[1] + "); notes com cue técnico breve, sem alegações médicas.",
    focoLabGuidance({ goal, highRisk }),
    "Retorne a ficha em JSON, sem instruções fora do schema.",
  ].join("\n");
}

export function normalizeScienceExercises(exercises, { experience = "iniciante", highRisk = false } = {}) {
  const level = EXPERIENCE[experience] || EXPERIENCE.iniciante;
  return exercises.map(ex => {
    const rest = Number(ex.rest_seconds);
    const minimum = minimumRestSeconds(ex.exercise_name, ex.muscle_group);
    const correctedRest = RANGE(Math.max(Number.isFinite(rest) ? rest : minimum, minimum), 45, 300);
    const desiredRir = Number.isInteger(Number(ex.rir_target)) ? Number(ex.rir_target) : level.rir[0];
    const rir = RANGE(desiredRir, highRisk ? 3 : level.rir[0], highRisk ? 4 : level.rir[1]);
    const sets = highRisk ? Math.min(Number(ex.sets), 2) : Number(ex.sets);
    const rawNotes = String(ex.notes || "").trim().slice(0, 350);
    const rirText = "RIR alvo: " + rir + ". Progrida após alcançar o topo das repetições com técnica e recuperação.";
    return {
      ...ex,
      sets,
      rest_seconds: correctedRest,
      suggested_load_kg: 0,
      rir_target: rir,
      notes: [rawNotes.replace(/RIR\s*(alvo|target)?\s*[:=]?\s*\d+/ig, "").trim(), rirText]
        .filter(Boolean).join(" ").slice(0, 500),
    };
  });
}

function muscleKey(group) {
  const s = NORMALIZE(group);
  if (/(peito|peitoral)/.test(s)) return "Peitoral";
  if (/(costas|dorsal)/.test(s)) return "Costas";
  if (/(ombro|deltoide)/.test(s)) return "Ombros";
  if (/(triceps)/.test(s)) return "Tríceps";
  if (/(biceps)/.test(s)) return "Bíceps";
  if (/(quadriceps|coxa anterior)/.test(s)) return "Quadríceps";
  if (/(posterior|isquiotibial)/.test(s)) return "Posteriores";
  if (/(gluteo)/.test(s)) return "Glúteos";
  if (/(panturrilha)/.test(s)) return "Panturrilhas";
  if (/(abdomen|abdominal|core)/.test(s)) return "Core";
  if (/(lombar)/.test(s)) return "Lombar";
  if (/(adutor)/.test(s)) return "Adutores";
  if (/(abdutor)/.test(s)) return "Abdutores";
  if (/(trapezio)/.test(s)) return "Trapézio";
  if (/(antebraco)/.test(s)) return "Antebraços";
  return /cardio|aerobio|condicionamento/.test(s) ? "Cardio" : s || "Geral";
}

/**
 * Estimativa não clínica da duração: aquecimento, execução de séries, intervalos
 * ENTRE séries (não após a última) e transições. Para cardio sem campo de duração
 * explícito, oito minutos por bloco são apenas placeholder de planejamento.
 * Referência: FOCO LAB capítulo 6, página 8 (heurística de produto).
 */
export function estimateTrainingSessionMinutes(exercises = []) {
  const estimated = 6 + exercises.reduce((total, exercise) => {
    if (classifyMovement(exercise.exercise_name, exercise.muscle_group) === "cardio") return total + 8 + 1;
    const sets = Math.max(0, Number(exercise.sets) || 0);
    const restSeconds = Math.max(0, Number(exercise.rest_seconds) || 0);
    return total + sets * 1 + Math.max(0, sets - 1) * restSeconds / 60 + 1.5;
  }, 0);
  return Math.ceil(estimated);
}

export function auditScientificWorkout(exercises, {
  days = WEEKDAYS.slice(0, 3), experience = "iniciante", sessionMinutes = 60, highRisk = false,
  enforceExerciseRange = true,
} = {}) {
  const config = EXPERIENCE[experience] || EXPERIENCE.iniciante;
  const volume = new Map();
  const indirect = new Map();
  const dayVolume = new Map();
  const warnings = [];
  const sessionTimeByDay = {};
  for (const ex of exercises) {
    const day = String(ex.training_day || "");
    const group = muscleKey(ex.muscle_group);
    const sets = Number(ex.sets || 0);
    const catalog = catalogExercise(ex.exercise_name);
    if (!catalog) return { ok: false, issue: "Exercício fora do catálogo FOCO: " + ex.exercise_name };
    if (!catalog.primary.includes(group)) return {
      ok: false,
      issue: "O exercício " + ex.exercise_name + " foi classificado como " + group +
        ", mas seu grupamento no catálogo FOCO é " + catalog.primary.join(" / ") + ".",
    };
    if (!WEEKDAYS.includes(day) || !days.includes(day) || !Number.isInteger(sets) || sets < 1)
      return { ok: false, issue: "Dia ou série inválida." };
    const type = classifyMovement(ex.exercise_name, ex.muscle_group);
    const secs = Number(ex.rest_seconds);
    if (!Number.isFinite(secs) || secs < minimumRestSeconds(ex.exercise_name, ex.muscle_group))
      return { ok: false, issue: "Descanso incompatível com o tipo de exercício: " + ex.exercise_name };
    if (highRisk && (sets > 2 || Number(ex.rir_target || 0) < 3))
      return { ok: false, issue: "Condição clínica relatada exige ficha inicial mais conservadora." };
    dayVolume.set(day, (dayVolume.get(day) || 0) + sets);
    if (group !== "Cardio") {
      volume.set(group, (volume.get(group) || 0) + sets);
      // Indirect-series accounting is a practical estimate (0.5), not measured stimulus.
      // Data comes from FOCO's exercise catalog, not an unconstrained AI classification.
      for (const secondary of new Set(catalog.secondary)) {
        if (secondary === group || catalog.primary.includes(secondary) && catalog.primary.length > 1) continue;
        indirect.set(secondary, (indirect.get(secondary) || 0) + sets);
      }
    }
  }
  if (enforceExerciseRange && !highRisk) {
    const range = sessionExerciseRange(sessionMinutes);
    for (const day of days) {
      const daily = exercises.filter(ex => ex.training_day === day);
      // A dedicated active-recovery / aerobic day isn't a standard lifting session.
      const activeRecoveryDay = daily.length > 0 && daily.every(ex => classifyMovement(ex.exercise_name, ex.muscle_group) === "cardio");
      if (activeRecoveryDay) continue;
      if (daily.length < range.min || daily.length > range.max) {
        return { ok: false, issue: day + " tem " + daily.length + " exercícios; preferência de "
          + range.min + "-" + range.max + " para " + sessionMinutes
          + " minutos. Redistribua os padrões e séries sem ultrapassar duração ou volume." };
      }
    }
  }
  for (const [day, sets] of dayVolume) {
    if (sets > config.dailyCeiling)
      return { ok: false, issue: day + " concentra " + sets + " séries; reduza a dose ou redistribua." };
    const daily = exercises.filter(e => e.training_day === day);
    const estimatedMinutes = estimateTrainingSessionMinutes(daily);
    sessionTimeByDay[day] = estimatedMinutes;
    if (estimatedMinutes > Number(sessionMinutes || 60) * 1.4 + 8)
      return { ok: false, issue: day + " excede tempo disponível estimado para sessão (" + Math.ceil(estimatedMinutes) + " min)." };
  }
  for (const [group, sets] of volume) {
    if (sets > config.weeklyCeiling)
      return { ok: false, issue: "Volume direto semanal de " + group + " (" + sets + " séries) excede o teto conservador." };
  }
  // Consecutive same-group sessions are not automatically wrong; only reject heavy repetition.
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const dayA = WEEKDAYS[i], dayB = WEEKDAYS[(i + 1) % 7];
    if (!days.includes(dayA) || !days.includes(dayB)) continue;
    for (const [group] of volume) {
      const a = exercises.filter(e => e.training_day === dayA && muscleKey(e.muscle_group) === group)
        .reduce((total, e) => total + Number(e.sets), 0);
      const b = exercises.filter(e => e.training_day === dayB && muscleKey(e.muscle_group) === group)
        .reduce((total, e) => total + Number(e.sets), 0);
      if (a >= 6 && b >= 6)
        return { ok: false, issue: "Repetição de volume alto para " + group + " em dias consecutivos (" + dayA + "/" + dayB + ")." };
    }
  }
  const estimatedEffective = {};
  const allGroups = new Set([...volume.keys(), ...indirect.keys()]);
  for (const group of allGroups) {
    const directSets = volume.get(group) || 0;
    const indirectSets = indirect.get(group) || 0;
    const effective = Math.round((directSets + indirectSets * 0.5) * 10) / 10;
    estimatedEffective[group] = effective;
    if (indirectSets > 0 && effective > config.weeklyCeiling) {
      warnings.push("O estímulo estimado de " + group + " (" + effective + " séries ponderadas) inclui trabalho indireto: acompanhe a recuperação.");
    }
  }
  // LAB17: expose omissions for informed review, but do not reject by a
  // universal split rule: focus, constraints and medical reviews may differ.
  const covered = new Set([...volume.keys()].filter(group => (volume.get(group) || 0) > 0));
  const importantGroups = ["Peitoral", "Costas", "Quadríceps"];
  const uncoveredMajorGroups = importantGroups.filter(group => !covered.has(group));
  if (!covered.has("Posteriores") && !covered.has("Glúteos")) {
    uncoveredMajorGroups.push("Cadeia posterior/glúteos");
  }
  if (uncoveredMajorGroups.length && !highRisk) {
    warnings.push("Revisar cobertura semanal: " + uncoveredMajorGroups.join(", ") + ". Uma omissão pode ser intencional conforme a avaliação.");
  }
  // Incidental stabilizer recruitment in a squat or a press is not a
  // dedicated core session. Count only explicitly assigned core work.
  const coreDays = new Set(exercises.filter(ex =>
    muscleKey(ex.muscle_group) === "Core" ||
    classifyMovement(ex.exercise_name, ex.muscle_group) === "core"
  ).map(ex => ex.training_day));
  if (coreDays.size === 0 && !highRisk) {
    warnings.push("O plano não contém trabalho de core explicitamente identificado; conferir estabilidade do tronco e objetivos (FOCO LAB cap. 9).");
  }
  return {
    ok: true,
    sessionTimeByDay,
    uncoveredMajorGroups,
    coreExposureDays: coreDays.size,
    directSetsByGroup: Object.fromEntries(volume.entries()),
    estimatedEffectiveSetsByGroup: estimatedEffective,
    totalSetsByDay: Object.fromEntries(dayVolume.entries()),
    warnings: [...new Set(warnings)].slice(0, 4),
    guidance: "Faixas e tetos são pontos de partida; ajustar conforme desempenho, esforço e recuperação.",
  };
}

export function sciencePlanSummary({ frequency = 3, experience = "iniciante", highRisk = false } = {}, audit) {
  const level = EXPERIENCE[experience] || EXPERIENCE.iniciante;
  return {
    source: SCIENCE_ENGINE_VERSION,
    evidence: focoLabEvidenceRefs(),
    session_time_minutes_by_day: audit.sessionTimeByDay || {},
    uncovered_major_groups: audit.uncoveredMajorGroups || [],
    core_exposure_days: audit.coreExposureDays ?? 0,
    split_rationale: splitForFrequency(frequency),
    dose: "Referência inicial para " + experience + ": " + level.weeklyHint[0] + "-" + level.weeklyHint[1] +
      " séries diretas por grupo/semana. O volume indireto conta e não é idêntico às séries diretas.",
    direct_sets_by_group: audit.directSetsByGroup || {},
    estimated_effective_sets_by_group: audit.estimatedEffectiveSetsByGroup || {},
    total_sets_by_day: audit.totalSetsByDay || {},
    recovery: "Pausas variam com o exercício; observe desempenho, sono, sintomas e técnica. Deload não é obrigatório pelo calendário.",
    progression: "Progressão dupla: atingir o topo das repetições com técnica e RIR adequados antes de aumentar gradualmente a carga.",
    monitoring: "Registro por sessão; revisão de prioridades, fadiga e dose em 15 dias. Métricas OKOK são estimativas e precisam de condições de medição comparáveis. Fonte: " + FOCO_LAB_SOURCE.id + " (capítulos 11–14, 17–18).",
    alerts: highRisk
      ? ["Condição clínica informada: revisão presencial e alinhamento com médico; nenhum teste máximo, falha frequente ou aumento brusco de volume."]
      : [...(audit.warnings || [])],
  };
}
