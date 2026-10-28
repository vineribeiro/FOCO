/**
 * FOCO LAB · Ciência do Treinamento, edição de 28/10/2026 (16 páginas).
 * Fonte: PDF fornecido pelo proprietário do FOCO.
 * Referência interna: docs/FOCO_LAB_DOSSIE_2026_IMPLEMENTACAO.md
 *
 * Revisão NARRATIVA do proprietário, não uma nova revisão sistemática.
 * As referências são citadas pelo dossiê, não verificadas automaticamente
 * por este módulo. Não converter heurísticas em verdades científicas.
 *
 * Este módulo representa regras/contexto versionados; NÃO faz fine-tuning
 * e não recebe, armazena ou compartilha dados privados dos usuários.
 */
export const FOCO_LAB_SOURCE = Object.freeze({
  id: "FOCO-LAB-DOSSIE-2026-10-28",
  title: "FOCO LAB · Ciência do Treinamento — Estudo Completo 2026",
  edition: "2026-10-28",
  pages: 16,
  methodology: "revisao-narrativa-tecnica",
  verification: "sintese-do-documento-fornecido; fontes externas nao validadas aqui",
});

export const FOCO_LAB_KNOWLEDGE = Object.freeze([
  {
    id: "LAB01", chapter: 1, page: 3, type: "EVIDÊNCIA",
    references: ["01", "02", "08", "09"],
    rule: "Avalie objetivo, estímulo, recuperação e adesão em conjunto. Exercício resistido e cardiovascular são complementares quando a meta envolver saúde e composição corporal.",
  },
  {
    id: "LAB03", chapter: 3, page: 5, type: "EVIDÊNCIA",
    references: ["01", "04", "05"],
    rule: "Progressão também pode ocorrer em repetições, séries válidas e execução. Fadiga e dor tardia não comprovam qualidade do estímulo.",
  },
  {
    id: "LAB04", chapter: 4, page: 5, type: "HEURÍSTICA",
    references: ["01", "04", "05", "06"],
    rule: "Volume, RIR, carga e descanso dependem de experiência e resposta individual; 6–15 repetições e 1–4 RIR são referências, não exigências universais.",
  },
  {
    id: "LAB05", chapter: 5, page: 7, type: "CONDIÇÃO / LIMITE",
    references: [],
    rule: "Cada exercício precisa de mapeamento de músculos, padrão biomecânico, equipamento, execução, limitações e alternativas; o catálogo e a validação técnica prevalecem sobre suposições da IA.",
  },
  {
    id: "LAB06", chapter: 6, page: 8, type: "HEURÍSTICA",
    references: ["07"],
    rule: "Faixas de exercícios por duração são preferências de UX. Duração deve considerar execução das séries, pausas, transições e aquecimento, nunca apenas a contagem.",
  },
  {
    id: "LAB07", chapter: 7, page: 9, type: "EVIDÊNCIA",
    references: ["08", "09", "15"],
    rule: "Perda de gordura, peso total e recomposição são desfechos distintos; exercícios abdominais não garantem redução localizada de gordura.",
  },
  {
    id: "LAB08", chapter: 8, page: 9, type: "CONDIÇÃO / LIMITE",
    references: ["02", "03", "08"],
    rule: "Cardio moderado, vigoroso, intervalado e concorrente precisam respeitar objetivo, tolerância e recuperação. HIIT não é superior para todas as pessoas nem obrigatório para emagrecer.",
  },
  {
    id: "LAB09", chapter: 9, page: 10, type: "HEURÍSTICA",
    references: ["10", "11"],
    rule: "Treinamento de core abrange anti-extensão, anti-rotação, anti-flexão lateral, flexão, extensão e coordenação; 2–3 exposições semanais podem ser um início, não uma obrigação universal.",
  },
  {
    id: "LAB10", chapter: 10, page: 10, type: "CONDIÇÃO / LIMITE",
    references: [],
    rule: "A técnica depende de biomecânica, equipamento, tolerância e proporções individuais. Não impor postura ou amplitude universal a partir de fotos sem avaliação.",
  },
  {
    id: "LAB11", chapter: 11, page: 11, type: "CONDIÇÃO / LIMITE",
    references: ["12", "15"],
    rule: "Sono, fadiga autorrelatada, desconforto e desempenho ajudam a revisar a recuperação; nenhuma variável estima um relógio exato. Não prescrever dietas, suplementos ou medicamentos automaticamente.",
  },
  {
    id: "LAB12", chapter: 12, page: 11, type: "CONDIÇÃO / LIMITE",
    references: ["13"],
    rule: "OKOK/bioimpedância é estimativa dependente de protocolo; comparar condições semelhantes e não declarar quilos exatos de músculo ganho a partir de pequenas flutuações.",
  },
  {
    id: "LAB13", chapter: 13, page: 12, type: "HEURÍSTICA",
    references: [],
    rule: "Usar regras determinísticas, histórico de séries reais, feedback, explicação assistida pela IA e revisão auditável. Nunca reescrever sessões antigas ao criar nova ficha.",
  },
  {
    id: "LAB14", chapter: 14, page: 13, type: "CONDIÇÃO / LIMITE",
    references: ["14", "21"],
    rule: "Sinais agudos de alerta impedem otimização de treino; histórico de rabdomiólise requer cautela, orientação individual e avaliação profissional.",
  },
  {
    id: "LAB17", chapter: 17, page: 15, type: "HEURÍSTICA",
    references: [],
    rule: "Auditar segurança, grandes grupos musculares, volume, tempo plausível, substituições, progressão, explicabilidade e dados reais; registrar erros e critérios não cumpridos.",
  },
  {
    id: "LAB18", chapter: 18, page: 15, type: "CONDIÇÃO / LIMITE",
    references: [],
    rule: "Registrar fonte, versão da regra, motivo da decisão e incerteza. Proteger dados corporais e exigir revisão humana em situações de risco.",
  },
]);

export function focoLabGuidance({ goal = "", highRisk = false } = {}) {
  const text = String(goal || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const focus = /emagrec|gordur|defini|recompos/.test(text)
    ? ["LAB07", "LAB08", "LAB12"]
    : /core|abd[oô]m|lombar/.test(text)
      ? ["LAB09", "LAB10", "LAB11"]
      : ["LAB03", "LAB04", "LAB10"];
  const ids = ["LAB01", "LAB05", "LAB06", "LAB11", "LAB12", "LAB13", "LAB14", "LAB17", "LAB18", ...focus];
  if (highRisk) ids.push("LAB14");
  return [
    "BASE COMPLEMENTAR FOCO LAB 2026 (revisão narrativa, fonte " + FOCO_LAB_SOURCE.id + ").",
    "As etiquetas EVIDÊNCIA/HEURÍSTICA/CONDIÇÃO indicam o enquadramento do dossiê. Heurística NÃO equivale a obrigação clínica.",
    ...[...new Set(ids)].map(id => {
      const record = FOCO_LAB_KNOWLEDGE.find(entry => entry.id === id);
      return record ? "[" + record.id + " cap." + record.chapter + " pág." + record.page + " / " + record.type + "] " + record.rule : "";
    }).filter(Boolean),
    "Ressalva: o dossiê é síntese técnica e não certifica a IA como profissional; se faltarem dados, explicitar incerteza e não inventar medições ou diagnósticos.",
  ].join("\n");
}

export function focoLabEvidenceRefs() {
  return {
    source_id: FOCO_LAB_SOURCE.id,
    source_title: FOCO_LAB_SOURCE.title,
    methodology: FOCO_LAB_SOURCE.methodology,
    sections: ["LAB01", "LAB03", "LAB04", "LAB05", "LAB06", "LAB07", "LAB08", "LAB09", "LAB10", "LAB11", "LAB12", "LAB13", "LAB14", "LAB17", "LAB18"],
    note: "Regras do dossiê fornecido; critérios operacionais requerem validação e revisão humana.",
  };
}
