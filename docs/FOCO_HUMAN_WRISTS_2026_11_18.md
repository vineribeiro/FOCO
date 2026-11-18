# FOCO — duas variações de extensão de punho

## Problema e aceite

A auditoria do FOCO 3.8 encontrou duas escolhas do motor sem identificação visual: **Extensão de punho com barra** e **Extensão de punho na polia**. Não há correspondente exato para ambas na revisão RepDB fixada. A flexão de punho existente tem outra pegada e outro movimento, portanto não pode ilustrar estas extensões.

Aceite: duas variações próprias identificadas, preparação e final distintos, pegada pronada (palmas para baixo), antebraços apoiados, equipamento correto, texto e instruções em PT-BR, autoria FOCO e arquivo leve. Não reescrever fichas nem histórico; não reutilizar imagens RepDB como entrada de IA.

## Feito e testado

- IDs próprios: `foco-barbell-wrist-extension` e `foco-cable-wrist-extension`.
- Registro local com `source: foco`, nomes exatos do motor, músculos extensores do antebraço, equipamentos barra/polia e instruções independentes em português. Nomes em inglês são somente metadados internos.
- Uma prancha original de quatro quadros gerada por `image_gen.imagegen` a partir de descrição escrita, sem referências de imagem. Original preservado no workspace; WebP de 1330 × 1182 px e 65.078 bytes publicado com seleção exata dos quatro quadros. Não houve alteração nos pixels das imagens anteriores.
- Triagem visual: corpo e aparelho dentro de cada quadro; pegada pronada; mãos descem na preparação e se elevam no final com apoio dos antebraços; cabo ligado à barra reta e à polia baixa; barra livre com anilhas distinta do acessório da polia. Não é certificação biomecânica profissional. Os quadros são referências estáticas; não há interpolação ou animação inferida.
- Manifesto rastreável: `docs/media/FOCO_HUMAN_WRISTS_2026_11_18.json`, com prompt integral, hashes do original e WebP, limites dos quadros, revisão e ausência de entradas RepDB.
- Coleção passa a **169 IDs, 334 posições estáticas, 60 WebPs e 3.542.858 bytes**. Catálogo: 708 IDs RepDB + quatro IDs próprios = **712 movimentos**.
- `npm run test:human-media`: hashes, dimensões, enquadramentos, aliases exatos, catálogo próprio e integridade passaram. 108 contextos ordinários (seis objetivos × três níveis × frequências de 2 a 7, 40 min, academia completa) emitiram somente escolhas com mídia humana exata nesta amostra; isso não descreve estatística de uso real nem cobertura de todos os exercícios possíveis.
- `npm run test:repdb` e `npm run lint` passaram após a integração. Os 708 registros de origem e seu pacote PT-BR permanecem intactos.
- Histórico com ligação explícita de extensão a um ID de flexão recebe bloqueio visual, em vez de uma imagem de outro movimento. IDs e dados históricos não são alterados por esse bloqueio.

## Pendente de validação

Teste da nova mídia renderizada no player/biblioteca nas quatro larguras junto ao build final. O teste de navegador de mídia já inclui as duas variações. Publicação, validação em aparelho físico e revisão profissional não ocorreram nesta etapa do arquivo.

## Não iniciado

Não há expansão das outras variações do catálogo, animação ou uso de imagens da RepDB como base de geração.
