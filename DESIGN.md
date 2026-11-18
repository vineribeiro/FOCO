# FOCO — direção visual aprovada em 16/11/2026

O proprietário pediu um redesign completo com base nas quatro imagens fornecidas nesta conversa: grafite neutro, lima suave, lilás e rosa, títulos geométricos, cartões de treino com recortes e navegação branca flutuante. Esta decisão substitui a referência escura/verde de 09/11 e orienta composição, tipografia e navegação.

## Design System Canônico

Tokens: `src/foco-pro-tokens.css`. Único proprietário visual: `src/foco-ui.css`. As folhas v6/v7/v8 e 2.1 permanecem como arquivos históricos, sem importação na aplicação.

Na revisão 3.7, `src/foco-brand.css` compartilha as fontes e os estados de abertura/recuperação com o HTML inicial e o atualizador. O build gera `public/foco-brand.css` desses estilos e dos tokens. A folha de estrutura do atlas usa os mesmos tokens e é carregada antes de `foco-ui.css`.

- Fundo #222222, superfície #2D2D2D, elevada #363636, texto #F7F7F3, secundário #BCBCB8.
- Lima #E5F88A, lilás #B6A1F3, rosa #EDC3F7, papel #FAFAF7, texto sobre pastel #22231C.
- Títulos e cronômetros: Michroma 400. Corpo e controles: Space Grotesk 400–700. Fontes locais, OFL em public/fonts/.
- Cartões de 24px, controles em pílula, navegação branca com botões circulares. Cor nunca é o único indicador de estado.
- Ações irreversíveis usam o papel semântico de perigo, com confirmação explícita. Botões de ícone têm nome de ação e área de 44px.
- Densidade confortável/compacta altera espaçamento de cartões e resumos, sem reduzir áreas de toque. Superfícies são opacas; não oferecer um ajuste de transparência sem efeito.
- Ícones PWA e símbolo isolado derivam da geometria do logotipo aprovado, com cores dos tokens. Cards exportáveis usam a mesma marca e as fontes locais, com valores registrados.
- Escala estimada a partir de telas equivalentes a aproximadamente 390px. Não há arquivo Figma nem promessa de igualdade pixel a pixel.

## Composição

1. Início: saudação, destaque lima para o treino do dia e meta semanal real, calendário, cartões da ficha com cabeçalhos lilás/rosa e área grafite integrada para a ilustração, e atalhos de modalidades.
2. Agenda: semana e cartões coloridos por dia com exercício ilustrado correto. Escolher não inicia a sessão nem altera os outros dias.
3. Sessão: ilustração RepDB e painel claro com série, carga, repetições, descanso e concluir. Rascunho e envio idempotente preservados.
4. Evolução: períodos, tendência e indicadores pastel com fontes e datas dos registros. Valores ausentes ficam ausentes.
5. Perfil e formulários: mesmos tokens e hierarquia. Navegação desktop equivalente à móvel.

Calorias, passos, notificações e percentuais dos mockups não são inventados. Fotografias decorativas de marca não representam exercícios nem atletas do usuário. Mídia de movimentos usa a coleção humana autoral FOCO de 167 variações por ID e RepDB Free para os demais exercícios/fallback, com origem identificada. A revisão 3.6 ajusta 98 enquadramentos, refaz cinco imagens e mantém 330 posições estáticas. No detalhe, a área visual acompanha a proporção do movimento. Na sessão, o movimento ocupa o destaque principal e os controles permanecem no fluxo, sem encobrir a imagem.

## Validação

Conferir 320/390/768/1440px, teclado, contraste, reduced motion, carregamento/vazio/erro, escolha de dia, registro e recuperação de sessão, upload e anamnese. Preservar autenticação, histórico, fichas, IA e armazenamento. O usuário autorizou a mudança visual e sua publicação nesta conversa.
