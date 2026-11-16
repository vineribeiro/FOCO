# FOCO 3.2 — preferências e recuperação (16/11/2026)

## Falha reproduzida

Com sete dias, iniciante, 40 minutos e os dez grupos selecionados, o motor
2026.1 retornava exercícios/séries/repetições/pausas idênticos para saúde,
hipertrofia, emagrecimento e recomposição. A divisão repetia ombros segunda/terça
e core segunda/terça/quarta. A auditoria antiga só impedia seis séries diretas
em ambos os dias; a continuidade de exercícios recebia precedência excessiva.

## Comportamento esperado e implementado

- Objetivo e experiência definem faixas de repetições, pausas, RIR, dose e escolha
  entre movimentos do catálogo. São heurísticas iniciais do produto, apoiadas
  no estudo fornecido; não são regras clínicas universais. Emagrecimento mantém
  treino resistido para preservar força/massa, sem promessa por faixa de repetições.
- O formulário envia os dias da semana escolhidos. Disponibilidade não obriga
  preencher todos os dias: saúde/iniciante com sete disponíveis usa três sessões
  intercaladas. Calendários consecutivos podem usar superiores/inferiores; o motor
  reduz frequência quando não consegue uma divisão recuperável dentro do tempo.
- Uma nova auditoria, exclusiva de propostas automáticas, impede estímulo
  direcionado em dias consecutivos. Considera grupos co-primários e sinergistas
  relevantes, inclusive extensão de quadril em agachamentos/leg press, e a passagem
  domingo/segunda. Recrutamento incidental do tronco não vira sessão direta de core.
  A ponderação indireta 0,5 é uma estimativa de planejamento, não medição fisiológica.
- A regra garante um dia completo de calendário entre estímulos, não 48 horas
  reais, pois os horários das sessões não são informados. O app informa essa limitação.
- Prioridades recebem espaço/dose antes dos extras. Selecionar todos os dez grupos
  equivale a equilíbrio, com aviso explícito. Tempo e teto de volume continuam
  prevalecendo; a prévia informa quando limitam a ênfase.
- Os dias sem musculação aparecem como recuperação; não há série/repetição fictícia
  de caminhada para preencher a agenda. A frequência salva é a real de força.
- Alterar os ajustes invalida a prévia; respostas antigas são descartadas e o cache
  rejeita propostas do motor 2026.1. Campos aguardam o carregamento da anamnese.
  A ficha ativa só muda na aprovação. Histórico e fichas existentes são preservados.

## Fluxo e risco de regressão

Estados: carregando preferências → editando → montando → prévia → aprovação → salvo;
erros conservam os ajustes, edição invalida a prévia e resposta tardia não a substitui.
Não há alteração de esquema, gravação durante a prévia, inferência ou migração de
registros reais. Revisão de ciclo conserva os dias da ficha ativa em vez de cortar
arbitrariamente os primeiros dias da anamnese. Montagem manual permanece independente.

## Critérios de aceite e validação

Reprodução exata da imagem; seis objetivos com prescrições diferentes; foco altera
séries diretas; duração altera a ficha; dias enviados prevalecem sobre a anamnese;
calendários de 2–7 dias (todos os subconjuntos) mantêm recuperação; casos explícitos
supino/tríceps, terra/glúteos, agachamento/glúteos e domingo/segunda; tempo como teto;
equipamento disponível; catálogo correto; zero chamadas de IA; zero escritas na prévia.
Navegador sintético em 320/390/768/1440 px, restauração, mudança de parâmetros,
aprovação e Personal; WCAG automatizada e inspeção das capturas. Sem teste em atleta
ou aparelho físico: a recuperação individual continua dependendo da execução e registros.

### Feito e testado localmente

308 contextos aceitos e 16 conflitos explícitos de sessões curtas na matriz de 324;
todos os 120 subconjuntos de dois ou mais dias em três níveis (360 calendários);
seis objetivos distintos, equipamentos limitados, volume co-primário e sinergias.
21 grupos de testes da API/Personal e cache por conta/versão; reprodução no navegador
em quatro larguras, incluindo todos os dez grupos e resposta tardia descartada;
48/48 capturas da revisão visual, 40/40 verificações de layout, Axe sem violações
nas telas modificadas e verificações TypeScript/Deno, build, UI, motion, produto e
sessão. As imagens e respostas dos testes são sintéticas. O primeiro teste de layout
local sem ponte de rede falhou ao carregar a mídia externa; a execução com TLS e
proxy configurados passou, sem alteração do produto para contornar a falha.

Pendente de validação: uso em aparelho físico e recuperação individual observada.
Não iniciado nesta entrega: tradução integral do catálogo e substituição de imagens
por IA, que continuam regidas pelo documento de idioma/mídia já aprovado.

A primeira execução completa no GitHub identificou uma corrida preexistente no
calendário: os dias estavam clicáveis antes de consultar a ficha e podiam abrir a
anamnese. Agora aguardam o carregamento e ficam indisponíveis em erro; a navegação
não desloca o foco de um controle que a pessoa já alcançou no conteúdo. O teste
por teclado aguarda a disponibilidade real do calendário antes de selecionar.
