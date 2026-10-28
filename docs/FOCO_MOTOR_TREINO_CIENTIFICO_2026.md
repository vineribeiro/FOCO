# FOCO · Motor de Treinamento Científico (2026.2)

## Finalidade
Gerar e revisar fichas de musculação individualizadas com o Gemini **sob regras determinísticas baseadas no Estudo Profissional de Musculação 2026** fornecido pelo proprietário do FOCO. Nenhuma regra numérica substitui avaliação presencial ou julgamento clínico.

### 1. Fontes de contexto
- Anamnese: objetivo, duração, nível de experiência, frequência, dias disponíveis, prioridades, equipamentos, preferências, sono, hábitos de cardio.
- Avaliação OKOK **somente quando o usuário marcar a opção para utilizá-la na geração**. São métricas estimadas de composição corporal, não diagnóstico ou plano de perda de gordura por IMC.
- Histórico real das últimas sessões e séries concluídas (carga e repetição), sem presumir RIR ou biomecânica não registrados.
- Restrições clínicas da anamnese apenas quando houve consentimento específico; restrições informadas no formulário são tratadas com cautela.

### 2. Etapas do motor
1. Escolher dias disponíveis e objetivos. Divisão sugerida: até 3 dias Full Body; 4 dias Upper/Lower; 5 híbrida; 6 PPL 2x; 7 com recuperação ativa. A IA pode adaptar conforme aderência, não há divisão obrigatória.
2. Contextualizar a geração com volume semanal, padrões motores, proximidade à falha (RIR), intervalos, biomecânica, progressão dupla e recuperação, seguindo o estudo.
3. Gemini propõe somente exercícios reconhecidos nos 254 registros de 15 grupos do catálogo FOCO; registros repetidos somam **233 nomes únicos**.
4. Normalização técnica remove cargas fictícias, acrescenta RIR alvo às notas e corrige intervalos mínimos por tipo de exercício.
5. Auditoria independente confere exercício/grupo muscular, séries diretas por grupo, recuperação com dois dias exigentes seguidos, duração aproximada por sessão e limites conservadores.
6. Para grupos secundários, a auditoria mostra **séries ponderadas estimadas**: diretas + 0,5 × séries indiretas; *heurística explicativa, não medida fisiológica*.
7. Se proposta falha, uma segunda tentativa recebe o motivo; se falha de novo, não apresenta uma ficha como válida.
8. O resultado contém justificativa de divisão, volume, RIR, recuperação, progressão e alertas, visíveis no formulário de Nova ficha.

### 3. Parâmetros heurísticos de partida
| Nível | Séries diretas/semana por músculo | RIR orientativo | Teto conservador empregado na auditoria |
| --- | --- | --- | --- |
| Iniciante | 4–8 | 3–4 | 12 |
| Intermediário | 8–14 | 2–3 | 18 |
| Avançado | 10–20 | 1–3 | 24 |

Esses tetos **são mecanismos de contenção de propostas automáticas**, não alvos a atingir. O trabalho indireto e a resposta individual importam. A auditoria também limita a dose por sessão para evitar fichas incompatíveis com o tempo informado.

Descansos: compostos a partir de 2 min; isolamentos a partir de 1 min; cardio/core podem ter outros esquemas. Cargas iniciais em kg nunca são inventadas. Progressão dupla ocorre somente quando desempenho, técnica e recuperação sustentam a mudança.

### 4. Preferência de exercícios por duração (configuração FOCO)
- 20–29 min: 2–3 exercícios.
- 30–45 min: **4–5 exercícios**.
- 46–60 min: **5–6 exercícios**.
- 61–75 min: **6–7 exercícios**.
- 76–180 min: **7–8 exercícios**.

Essas faixas são preferências de produto, **não prescrições científicas de quantidade**. Em novos treinos de força e revisões geradas por IA, o auditor rejeita dias fora da faixa e informa o motivo para regeneração. Não há expansão automática de fichas já salvas. O validador mantém limites de volume, descanso, duração e recuperação. Sessões exclusivamente aeróbicas/de recuperação ativa e condições clínicas de alto risco não são obrigadas a atingir a contagem. Em caso de conflito, a segurança prevalece; a IA não deve acrescentar exercícios redundantes.

### 5. Segurança e casos clínicos
Sinais de alerta agudos informados bloqueiam geração e orientam avaliação clínica. Histórico de rabdomiólise ou condição muscular de risco solicita confirmação explícita de liberação médica para uma proposta **conservadora** e revisão com profissional habilitado; não autoriza treino até a falha ou carga máxima. A liberação declarada não equivale a diagnóstico ou garantia de segurança.

### 6. Revisão aos 15/30 dias
A revisão analisa histórico de sessões e feedback (quando enviados), mantém exercícios eficazes quando possível, evita aumentar volume automaticamente e submete a nova proposta ao mesmo processo de validação. Sem histórico suficiente, não inventar progresso.

### 7. Limites do sistema atual
- RIR prescrito é um **alvo educativo**, salvo em `notes`; o usuário ainda não registra RIR de cada série na tabela do banco.
- A auditoria de músculos auxiliares é uma aproximação e não mede esforço real.
- A plataforma não mede automaticamente mobilidade, amplitude, dor, prontidão ou técnica. Não afirmar que a IA os detectou por fotografia da OKOK.
- Um usuário de teste precisa executar fluxos ponta a ponta com autenticação para verificar uma chamada real ao Gemini e gravação de ficha. Testes automatizados de CI não substituem isso.
- Não há treinamento/fine-tuning do Gemini com dados privados do usuário. O sistema melhora a personalização por **contexto recuperado + regras + feedback**, não por ajuste contínuo dos pesos do modelo.

### 8. Testes e implantação
- `npm run test:training-science`: regras de volume, esforço, divisão, contagem por duração, taxonomia, descanso e sinais de alerta.
- `npm run lint` e `npm run build`: tipos e frontend.
- Deploy do backend via Supabase Edge Function `foco-api`, com os arquivos `index.ts`, `trainingScience.mjs`, `trainingCatalog.mjs`; manter a validação JWT interna original.
- O endpoint público `GET /api/system/status` anuncia `science_engine` para identificar a versão que está rodando sem expor informações pessoais.

## Bibliografia central do estudo enviado
- ACSM Position Stand (2026): https://pubmed.ncbi.nlm.nih.gov/41843416/
- Dose-resposta (2026): https://pubmed.ncbi.nlm.nih.gov/41343037/
- Divisões Full Body/Split (2024): https://pubmed.ncbi.nlm.nih.gov/38595233/
- Proximidade da falha (2024): https://pubmed.ncbi.nlm.nih.gov/38970765/
- Descanso entre séries (2024): https://pubmed.ncbi.nlm.nih.gov/39205815/
- WHO: https://www.who.int/initiatives/behealthy/physical-activity/
- Segurança em rabdomiólise: https://doi.org/10.1249/JSR.0000000000000822

**Importante:** atualizações nas evidências e opiniões profissionais podem levar à revisão dos parâmetros; a versão do motor deve sempre ser identificada.
