# FOCO PRO 2027 — Programa de beta real e prontidão comercial

**Corte de planejamento:** 2026-11-05. **Status:** não lançado comercialmente.

## Três gates, nesta ordem
### Gate 1 — Beta operacional estável
- Todos os fluxos centrais passam: login/logout/recuperação; anamnese; ficha; escolha de dia; iniciar/pausar/finalizar sessão; editar/salvar hoje x sempre; cardio independente; histórico; upload; evolução; exclusão de conta.
- Teste em celulares de baixo/médio desempenho; perda de rede/alternância de abas/bloqueio e retomada; persistência sem duplicação.
- Tempos, cargas, repetições, confirmação e registros nunca simulados.
- Bugs P0/P1: **zero abertos** antes de qualquer lançamento público; bugs P2 possuem proprietário e prazo.
- Cobertura de cenários de `docs/FOCO_PRO_TEST_MATRIX.md` documentada com evidências, não porcentagens inventadas.

### Gate 2 — Produto confiável e acessível
- Auditoria WCAG 2.2 AA e testes assistivos (teclado, voz/leitor, zoom até 200%, foco, mínimo de alvo, cores).
- Consentimento e transparência adequados para dados corporais/saúde; bases legais e finalidade revisadas por profissional competente; exportação, correção, eliminação e retenção de dados avaliadas.
- Revisão de autorização horizontal entre contas, permissões de armazenamento, políticas RLS, sessão/refresh token, limitação de taxa, erro de IA, logs e backup/restauração.
- Catálogo de exercícios e recomendações revisados quanto à segurança; linguagem não diagnóstica e regras clínicas/esportivas documentadas.
- Auditoria de uso comercial das imagens, fontes, fotos, ícones e materiais externos.
- Ambiente de testes separado de dados reais; contas de teste sintéticas em CI.

### Gate 3 — Comercialização 2027 (somente depois dos dois anteriores)
- Marca e propriedade intelectual; domínio próprio, Política de Privacidade, Termos, contato e suporte.
- Definir cobrança, emissão fiscal, cancelamento, reembolso, atendimento e métricas sem fabricar resultados.
- Definir SLOs/observabilidade, runbook de incidentes, notificações e processo de rollback.
- Teste de preço e onboarding com usuários reais; transparência sobre capacidades e limitações da IA.
- Preparar publicação em lojas apenas se houver suporte real aos requisitos das plataformas.

## Métricas de produto a observar na beta (sem valores presumidos)
- Conclusão do cadastro/anamnese por coorte.
- Taxa de sessões iniciadas e concluídas, abandono e falhas de salvar.
- Volta à sessão após perder internet; relatos de dados perdidos.
- Sucesso do usuário ao trocar treino do dia, salvar "só hoje" e registrar cardio.
- Tempo para primeira série registrada; erros de uso; reclamações de acessibilidade.
- Qualidade de conteúdo e alertas de segurança da IA.
- Incidentes de autorização, privacidade, disponibilidade e custos operacionais.

## Evidências existentes no repositório
Existem checks de TypeScript, build, regras de treino, análise de imagem, UI, motion, visual com fixtures e smoke público. **Isso não substitui** testes end-to-end autenticados entre contas distintas, pentest, análise LGPD nem parecer de educação física/nutrição.

## Fontes normativas
- ANPD: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte
- ANPD: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
