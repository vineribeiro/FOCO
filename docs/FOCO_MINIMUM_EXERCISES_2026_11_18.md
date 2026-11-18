# FOCO — mínimo de quatro exercícios por sessão automática

## Problema e evidência antes da alteração

Solicitação do proprietário em 18/11/2026: cada dia da ficha automática deve conter pelo menos quatro exercícios. O motor `foco-rules-2026.3` reservava somente dois e limitava cada grupo a um movimento por sessão; o template de empurrar tinha apenas três grupos.

Reprodução sintética: academia completa, iniciante, saúde e qualidade de vida, sete dias, 40 minutos. Contagens por dia: **3, 2, 4, 3, 2, 3, 2**; durações estimadas: 22, 16, 26, 22, 16, 22, 15 minutos. Havia tempo disponível e a contagem não atendia à instrução do produto.

## Contrato e critérios de aceite

- Toda nova proposta automática aceita tem pelo menos quatro movimentos distintos em **cada** dia escolhido, inclusive a sessão de acessórios na frequência de sete dias.
- Reservar espaço para os quatro movimentos antes de aumentar a dose das prioridades. Permitir movimentos distintos para o mesmo grupo quando compatíveis com o foco do dia, sem duplicar o mesmo exercício.
- Preservar os dias escolhidos, o teto de duração estimada, pausas mínimas, volume semanal por nível, equipamentos, exclusões, objetivos e recuperação por grupo, incluindo domingo/segunda.
- Se as condições forem incompatíveis, explicar o conflito e como ajustar; nunca entregar dois movimentos ou remover dias silenciosamente.
- Invalidar propostas da versão anterior. A aprovação continua explícita; fichas ativas e histórico não são reescritos pela atualização.
- O mínimo de quatro é uma decisão do produto solicitada pelo proprietário, não uma alegação de dose clínica universal.

## Fluxos, impacto e validação planejada

Montagem e revisão automáticas compartilham o motor. Conferir estados de carregamento, proposta válida, alteração de preferências, proposta antiga, conflito e aprovação. Revisão de texto por `better-writing`; qualidade geral por FOCO PRO; publicação da Edge Function conforme skill Supabase.

Riscos: preencher o mínimo com duplicatas, consumir volume antes de completar os dias, sobrepor sinergistas, aceitar cache antigo e afetar fichas manuais/históricas. Testar com dados sintéticos, matriz de frequências/níveis/durações/prioridades, todos os subconjuntos de dias, equipamentos alternativos, cache e navegador em 320/390/768/1440px. Sem gravações na conta real nem chamadas de inferência.

## Resultado

### Feito e testado

- Motor `foco-rules-2026.4`, release FOCO 3.8: reserva quatro movimentos antes de aumentar séries; prioriza dias mais restritos e admite duas escolhas distintas do mesmo grupo. Variações já existentes no catálogo ampliam peitoral e flexão/extensão de punho, respeitando equipamento e identidade exata.
- A reprodução de sete dias/40 minutos passou de **3, 2, 4, 3, 2, 3, 2** para **4, 4, 5, 4, 4, 4, 4** exercícios, sem ultrapassar a duração estimada nem os limites de volume/recuperação do motor.
- 324 cenários de duração/frequência/nível/prioridades, 432 cenários dos seis objetivos e 360 verificações dos subconjuntos de dias (120 calendários × três níveis). Conferidos determinismo, mínimo de quatro, duração, exclusões, catálogo, cobertura, equipamento e recuperação. Há um teste de conflito por exclusões que tornam quatro movimentos inviáveis.
- As três rotas reais (prévia, compatibilidade legada e revisão) executadas com serviços sintéticos entregam o mínimo e não reescrevem ficha ativa/histórico; a revisão salva somente recomendação pendente. Nenhuma chamada de inferência.
- Cliente verifica versão, calendário, mínimo e nomes distintos ao receber, restaurar ou aprovar uma proposta. Testes de cache recusam a versão anterior e uma proposta curta com versão atual.
- TypeScript, build, estudo, roteamento, confiabilidade da Edge, UI/UX, motion, FOCO PRO, contrato da sessão e assets da marca aprovados localmente. Navegador sintético em 320/390/768/1440px: mínimo nos sete dias, mudanças de preferências, restauração, resposta atrasada, rejeição de servidor curto/antigo, aprovação e Personal. Quinze cenários de regressão da marca aprovados.

### Pendente de validação

CI, publicação coordenada da função e do frontend, seguida de consulta ao status público e smoke de autenticação/CORS sem alterar dados. Não houve teste com atleta real nem em aparelho físico nesta correção.

### Não iniciado

Não faz parte desta alteração reescrever fichas já ativas, registros históricos, prescrições manuais, imagens ou as regras clínicas gerais do estudo. Para aplicar a correção a uma ficha anterior, montar uma nova prévia e aprová-la.
