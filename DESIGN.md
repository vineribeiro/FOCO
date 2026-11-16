# FOCO — direção visual aprovada em 16/11/2026

O proprietário pediu um redesign completo com base nas quatro imagens fornecidas nesta conversa: grafite neutro, lima suave, lilás e rosa, títulos geométricos, cartões de treino com recortes e navegação branca flutuante. Esta decisão substitui a referência escura/verde de 09/11 e orienta composição, tipografia e navegação.

## Design System Canônico

Tokens: `src/foco-pro-tokens.css`. Único proprietário visual: `src/foco-ui.css`. As folhas v6/v7/v8 e 2.1 permanecem como arquivos históricos, sem importação na aplicação.

- Fundo #222222, superfície #2D2D2D, elevada #363636, texto #F7F7F3, secundário #BCBCB8.
- Lima #E5F88A, lilás #B6A1F3, rosa #EDC3F7, papel #FAFAF7, texto sobre pastel #22231C.
- Títulos e cronômetros: Michroma 400. Corpo e controles: Space Grotesk 400–700. Fontes locais, OFL em public/fonts/.
- Cartões de 24px, controles em pílula, navegação branca com botões circulares. Cor nunca é o único indicador de estado.
- Escala estimada a partir de telas equivalentes a aproximadamente 390px. Não há arquivo Figma nem promessa de igualdade pixel a pixel.

## Composição

1. Início: saudação, destaque lima para o treino do dia e meta semanal real, calendário, cartões lilás/rosa da ficha e atalhos de modalidades.
2. Agenda: semana e cartões coloridos por dia com exercício ilustrado correto. Escolher não inicia a sessão nem altera os outros dias.
3. Sessão: ilustração RepDB e painel claro com série, carga, repetições, descanso e concluir. Rascunho e envio idempotente preservados.
4. Evolução: períodos, tendência e indicadores pastel com fontes e datas dos registros. Valores ausentes ficam ausentes.
5. Perfil e formulários: mesmos tokens e hierarquia. Navegação desktop equivalente à móvel.

Calorias, passos, notificações e percentuais dos mockups não são inventados. Fotografias decorativas de marca não representam exercícios nem atletas do usuário. Mídia técnica permanece exclusivamente RepDB Free com atribuição.

## Validação

Conferir 320/390/768/1440px, teclado, contraste, reduced motion, carregamento/vazio/erro, escolha de dia, registro e recuperação de sessão, upload e anamnese. Preservar autenticação, histórico, fichas, IA e armazenamento. O usuário autorizou a mudança visual e sua publicação nesta conversa.
