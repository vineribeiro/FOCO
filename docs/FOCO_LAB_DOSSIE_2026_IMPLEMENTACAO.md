# FOCO LAB 2026 — Integração do dossiê científico ao motor

**Fonte primária:** `FOCO LAB | Ciência do Treinamento — Estudo Completo 2026`, edição de 28/10/2026, PDF de 16 páginas fornecido pelo responsável pelo FOCO. Identificador: `FOCO-LAB-DOSSIE-2026-10-28`.

**Natureza:** síntese técnico-científica **narrativa**, não revisão sistemática original (p. 2). **Revisão técnica do dossiê: concluída, segundo informação do responsável pelo FOCO**, que relata ter analisado e corrigido o conteúdo em conjunto com um profissional de Educação Física. A identidade, o registro profissional, a data específica e o escopo documental da revisão ainda não constam deste repositório; portanto, não se apresenta isso como certificação ou parecer formal independente. Artigos citados no PDF têm suas próprias limitações; o motor não considera a mera menção uma validação independente. O PDF foi usado como fonte de análise, não enviado para o prompt de cada aluno nem importado para o banco de dados.

**Arquitetura aplicada:** base de conhecimento versionada → instrução contextual → proposta Gemini → normalização e auditoria determinística → justificativa/aviso → revisão humana. Isso é *engenharia de conhecimento*, **não** fine-tuning nem treinamento dos pesos do Gemini.

## Mapeamento do artigo (19 capítulos)

| Capítulo | Página | Regra/competência e status |
| --- | --- | --- |
| 01 Princípios baseados em evidência | 3 | Ativo em `LAB01`: objetivo, estímulo, aderência e segurança |
| 02 Matriz de competências | 3–4 | Roteiro de formação; **não** equivale a credencial profissional ou integração acadêmica |
| 03 Fisiologia e adaptação | 4–5 | Ativo em `LAB03`: desempenho, aprendizagem motora, fadiga e progressão |
| 04 Hipertrofia | 5–6 | Ativo em `LAB04`: séries, RIR, descanso, progressão, faixas como referências |
| 05 Anatomia e biblioteca | 6–7 | Ativo em `LAB05`: catálogo verificado, músculos e padrões; metadados detalhados ainda demandam curadoria |
| 06 Divisão e tempo | 7–8 | Ativo em `LAB06`: faixas preferenciais (UX) + estimativa de duração por séries, intervalos, transição e aquecimento |
| 07 Emagrecimento | 8–9 | Ativo em `LAB07`: separar gordura/peso e não prometer perda localizada |
| 08 Cardio | 9 | Ativo em `LAB08`: intensidade/tolerância/treino concorrente; não impor HIIT |
| 09 Core | 10 | Ativo em `LAB09`: funções variadas e auditoria de presença de core, sem imposição rígida |
| 10 Biomecânica | 10 | Ativo em `LAB10`: ajustes individuais, não alegar análise técnica por foto da balança |
| 11 Recuperação/nutrição | 11 | Ativo em `LAB11`: recuperação multissinal; sem dieta/suplemento automáticos |
| 12 Avaliação e OKOK | 11–12 | Ativo em `LAB12`: distinguir estimativas, acompanhar tendências; importação via arquivo existente, **sem alegar API oficial OKOK** |
| 13 Motor adaptativo | 12 | Ativo em `LAB13`: histórico real e proposta revisável; aprendizado autônomo contínuo **não implementado** |
| 14 Segurança | 12–13 | Ativo em `LAB14`: sinais de alerta e contexto clínico; revisão presencial em situações de risco |
| 15 Formação, cursos e workshops | 13–14 | Bibliografia/propostas educacionais; não implica cursos realizados ou certificados |
| 16 Plano de 12 semanas | 14 | Roteiro de desenvolvimento futuro, não cronograma já executado |
| 17 Métricas de qualidade | 14–15 | Ativo em `LAB17`: cobertura muscular, tempo, dados, explicação, testes; métricas globais agregadas ainda parciais |
| 18 Governança da IA | 15 | Ativo em `LAB18`: fonte, versão, limitações e regra; logging detalhado por decisão ainda pendente |
| 19 Bibliografia | 15–16 | Referências numéricas preservadas nos registros; confirmação externa individual ainda pendente |

## Regras específicas aplicadas

1. **Treino resistido + cardiovascular:** escolher conforme o objetivo, sem tratar cardio intenso como superior em todos os casos (caps. 1, 7–8).
2. **Hipertrofia:** volume, repetições e RIR orientativos são pontos de partida; decisões dependem de dados individuais (caps. 3–4).
3. **Divisão:** full body, upper/lower, híbrida e PPL são opções, não obrigações fisiológicas (cap. 6).
4. **Duração:** a faixa preferencial de exercícios segue a tabela da página 8; a auditoria adicionou tempo estimado por sessão e mantém restrições de volume e segurança.
5. **Cobertura:** um grupo muscular principal ausente ou ausência de core explícito gera aviso de revisão, **não** prescrição automática de exercícios extras (caps. 5, 9, 17).
6. **Emagrecimento/recomposição:** não prometer perda localizada, não inferir gasto ou ganhos musculares exatos com OKOK (caps. 7, 12).
7. **Segurança:** sintomas de alerta exigem escalonamento, sem otimização de carga; históricos clínicos relevantes requerem revisão profissional (cap. 14).
8. **Rastreabilidade:** nova ficha com versão da regra, ID de fonte e tempo estimado na justificativa (caps. 13, 17, 18).

## Código

- `supabase/functions/foco-api/focoLabKnowledge.mjs`: registros com IDs, capítulos, páginas, categoria e referências citadas no PDF.
- `supabase/functions/foco-api/trainingScience.mjs`: injeta regras contextualizadas nas propostas e audita tempo, volume, cobertura e sessões.
- `src/pages/NewWorkoutPage.tsx`: mostra referência do dossiê e estimativas das sessões.
- `scripts/test-training-science.mjs`: testes regressivos e invariantes da integração.

## Status da validação técnica

- **Conteúdo do dossiê:** revisão colaborativa com profissional de Educação Física **informada como concluída pelo responsável**. Não tratar como pendência.
- **Implementação do motor:** testes automatizados de regras e segurança existem; não equivalem à validação humana de todas as fichas possíveis.
- **Fichas individuais geradas:** ainda dependem de avaliação do contexto e, nos casos aplicáveis, de revisão profissional; o aval ao material de referência não é um aval automático a cada treino.

## Limites e próximos incrementos

- Não foi construído um modelo treinado especificamente nos PDFs; o Gemini não adquire memória permanente ao ler um prompt.
- Técnicas, amplitudes e tolerâncias articulares não podem ser validadas só com texto e requerem avaliação humana.
- O motor ainda não mede RIR efetivo por série; usa registros de carga/repetições e feedback textual quando disponíveis.
- Sem tempo de cardio registrado individualmente, o estimador usa uma referência provisória e deve exibir incerteza.
- Não foi implementado fine-tuning, RAG com toda a bibliografia, nem aprovação profissional automática.
- Uma proposta nova só é validada em produção com conta autorizada, Gemini configurado, dados coerentes e inspeção humana. Testes de CI não substituem isso.
- Mudanças científicas futuras devem passar por **fonte → evidência → regra → teste → revisão → publicação**, como orientado na página 14 do dossiê.

**Critério editorial:** Sempre distinguir `EVIDÊNCIA`, `HEURÍSTICA`, `HIPÓTESE/EXEMPLO` e `CONDIÇÃO/LIMITE` do PDF. Uma faixa de UX nunca prevalece sobre uma restrição clínica.
