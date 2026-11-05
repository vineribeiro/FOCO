# Auditoria FOCO — escala da tela Treinar e atualização da PWA

Data: 05/11/2026. Rota Treinar = `sessao`, componente `ActiveSessionPage.tsx`.

## Achados confirmados no código
1. O CSS 2.1 forçava o card do exercício a 330–470 px (até 44% da altura da tela), títulos até 47 px e controles exagerados.
2. V7, V2 e V2.1 definiam dimensões concorrentes para a mesma `.foco-v7-session-stage`. A preferência "Compacto" podia deixar o card maior que o tamanho normal.
3. V7 impunha botões sticky; V2 impunha static somente em mobile. Essa contradição permitia sobreposições inconsistentes do cronômetro/CTA.
4. V7 impunha largura desktop de 740 px com `!important`, acima do limite intencional de 550 px do 2.1.
5. A marca da revisão no `index.html` ainda dizia "2026-11-03-refresh1"; o app mostrava 2.1 e o SW usava `20261105-v21` apesar de mudanças posteriores. Isso dificultava conferir que o browser carregou o deploy.
6. A regra do QA visual exigia um card alto (>=325 px) e não media proporcionalidade, tamanhos de texto ou a escala da viewport.

## Correções 2.2
- Card do exercício limitado a 218–290 px no celular, 285–380 px no desktop; modo compacto celular 195–248 px.
- Player com largura máxima de 500 px, entrada de carga e repetições legível (20–27 px), títulos de exercício 22–29 px, controles com alvos táteis adequados.
- CTA de início/conclusão segue o fluxo da página, em vez de ficar grudada por CSS sobre outros controles.
- A folha 2.1 mantém a propriedade das dimensões do player; V7 não define mais alturas/larguras concorrentes nem sticky; V2 não define a altura compacta.
- `FOCO_BUILD_ID`, marca `foco-release` do HTML, SW e atualização manual usam `2026-11-05-v22`.
- Em telas já abertas, o app pode detectar um HTML publicado diferente por consulta `no-store`; oferece atualizar, **sem recarregar automaticamente** durante um treino.
- Testes de CI garantem versões sincronizadas, ausência das regras conflitantes e limites geométricos por viewport. O smoke após deploy valida a versão do HTML que está realmente publicada.

## Limites
GitHub Pages já confirmava deploys anteriores; a experiência de cada dispositivo específico não pode ser inferida desses logs. No Android, uma PWA instalada pode permanecer em execução usando seu bundle até ser atualizada/reaberta. O procedimento em `/FOCO/atualizar.html` limpa somente caches de assets, não exclui histórico, login ou dados do banco.

As outras rotas (Home, Agenda, Cardio, Biblioteca, Evolução) mantêm as dimensões originais; esta correção mira a escala de Treinar sem redesenhar novamente o app inteiro. O repositório continua pessoal e não comercial.
