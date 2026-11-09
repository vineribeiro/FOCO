# FOCO — layout e clareza operacional

## Escopo e critérios de aceite

Correções dos oito pontos revisados no build anterior, preservando identidade
escura/lima, dados, navegação funcional, mídia RepDB Free e a persistência da
sessão. Sem alterações de backend, modelos de dados ou infraestrutura.

| Fluxo/estado | Evidência anterior | Critério de aceite |
| --- | --- | --- |
| Mídia do treino | O botão Execução sobrepunha o selo RepDB nas quatro larguras | Crédito livre; Execução acessível pelo seletor sem ação duplicada no hero |
| Revisão da extração | Notas mais largas que a célula eram cortadas, inclusive em desktop | Texto completo acessível por toque/teclado antes de aprovar; estrutura legível no celular |
| IA e Manual | Hero e cartões de IA ocupavam o modo manual antes do formulário | Seletor no topo, conteúdo por modo e campos preservados ao alternar |
| Perfil expandido | Outra página, cabeçalho, identidade e espaçamento final dentro do disclosure | Uma página/identidade, seção Dados pessoais direta, labels e modal preservados |
| Semana | Home mostrava apenas segunda–sexta | Sete dias acessíveis; contêiner de rolagem contido com indicação visível onde necessário |
| Navegação lateral | Treinar e Minhas fichas marcados como página atual simultaneamente | Destaque e aria-current apenas no destino atual; sem acesso Perfil duplicado no rodapé |
| Treino no celular | Ação principal vinha depois de informações auxiliares | Iniciar visível no fluxo normal em 320×720/390×844; concluir próximo aos campos e antes do descanso |
| Home no desktop | Coluna de 520px, semana abaixo da dobra e grandes laterais vazias | Duas colunas em telas amplas; treino protagonista e semana ao lado; uma coluna no celular |

## Decisões e riscos de regressão

- `foco-pro` arbitra o trabalho; `better-layout` e `better-accessibility` cuidam
  da estrutura, foco, legibilidade e interação. Direção Operate preservada.
- Alterar as folhas existentes, sem adicionar outra geração de overrides.
- A ordem visual acompanha o DOM. Conteúdo auxiliar não precede o início do
  treino em telas pequenas. Não recriar CTA fixo sobre controles ou navegação.
- Mudar disposição dos controles não muda handlers, séries, relógio, UUID,
  snapshot de finalização nem retry. Manter a suíte de resposta perdida/reload.
- Revisão de extração usa somente fixture sintética nos testes; não gerar
  treinos com IA, enviar arquivos privados ou aprovar fichas reais em QA.
- Conservar formulários e valores ao alternar modos e ao abrir/fechar perfil.

## Verificação

Executar lint/build, guardrails UI/motion/qualidade, a suíte anterior de
acessibilidade/recuperação e a suíte de resposta perdida. O teste novo
`npm run test:layout-regression` cobre os critérios de layout em
320/390/768/1440px, com screenshots e API interceptada. O CI publica evidência
sintética como artefato. O smoke publicado verifica o build
`2026-11-09-v24-layout3`.

Feito e testado: registrar evidências finais no PR/CI. Testes sintéticos e
emulação não equivalem a validação em aparelhos ou leitores de tela reais.
Nenhuma alteração de escopo comercial ou nova fonte de mídia é parte desta entrega.
