# FOCO 3.5 — ampliação das ilustrações humanas

## Entrega

A coleção passa de dez para **167 exercícios com ilustrações humanas próprias**: 157 novas variações, 326 posições estáticas no total, 54 arquivos WebP e 3.200.502 bytes. A biblioteca completa preserva os 708 movimentos RepDB e acrescenta duas variações próprias FOCO, totalizando 710 registros. Os 165 IDs RepDB ilustrados não representam toda a coleção da fonte.

As imagens aparecem na ficha, nos cartões, na sessão, no guia e no detalhe da biblioteca usando o mesmo componente e o mesmo identificador. Na sessão, a imagem continua protagonista e os controles permanecem abaixo dela. O filtro **Imagens FOCO · 167** usa paginação de 24 movimentos. O carregamento acontece conforme a mídia entra na tela; o app não baixa os 54 arquivos ao abrir um treino. Consultar as imagens não chama uma IA e não consome créditos de inferência.

A ampliação inclui variações com barra, halteres, polias, máquinas, peso corporal, core, panturrilhas e cardio. Os nomes e as orientações continuam em PT-BR. A comparação com a especificação também corrigiu dois títulos: pullover **com um halter** e elevação frontal **unilateral** na polia.

## Variações exatas e registros preservados

- `Agachamento goblet`, usado pelo montador com halter, passa a apontar para `db-goblet-squat`. Um registro com ID explícito `goblet-squat` mantém o kettlebell.
- `Tríceps pulley com corda` recebe o ID próprio `foco-rope-triceps-pushdown`; a variante com barra não serve de substituto.
- `Stiff com halteres` recebe `foco-dumbbell-stiff-leg-deadlift`. O terra romeno com halteres permanece distinto. A associação histórica conhecida entre o nome stiff e o ID de terra romeno continua bloqueada.
- O campo legado `repdb_id` armazena também os dois IDs `foco-*`, sem exigir alteração do contrato de persistência. Os registros próprios têm `source: 'foco'`, instruções próprias e nenhum caminho de imagem RepDB.
- IDs explícitos são prioritários mesmo com nomes personalizados. Um ID desconhecido não adquire a imagem de outra variação pelo nome. A busca por nomes originais exatos permanece disponível para fichas antigas sem ID.

Esta entrega não altera prescrições, frequência, volume, motor de montagem, fichas ou histórico. Não há migração de dados nem mudança da API.

## Origem e triagem

O manifesto [FOCO_HUMAN_EXPANSION_2026_11_17.json](media/FOCO_HUMAN_EXPANSION_2026_11_17.json) contém prompts, data, ferramenta, referências próprias com hashes, hashes das imagens, dimensões, recortes por ID e decisões de revisão. O manifesto original do piloto permanece intacto. A ferramenta é `image_gen.imagegen`; a versão interna do modelo não é exposta e está registrada como `not-exposed-by-tool`.

Foram usadas descrições escritas dos movimentos e somente imagens previamente geradas pelo próprio FOCO como referência de personagem. **Nenhuma imagem RepDB foi enviada ao gerador.** A atribuição visível da fonte continua nos dados e nas imagens licenciadas da RepDB; a mídia própria é identificada como **FOCO · IMAGEM DE IA**.

Cada linha de exercício passou por triagem visual do assistente. Divergências de pegada, barra, apoio ou postura foram separadas e, quando necessário, geradas novamente. Há oito exercícios publicados com uma única posição de referência: prancha, prancha lateral, suspensão na barra, sustentação em pinça, flexão de punhos com barra, flexão de punhos na polia, extensão de punhos com halteres e rotação externa na polia. Os outros 159 têm duas posições. Não há interpolação ou animação artificial.

As folhas compartilham arquivos para reduzir requisições. Apenas os recortes registrados são mostrados; células recusadas e quadros não aprovados não são usados como poses. O manifesto preserva as decisões anteriores para rastreabilidade. O SVG usa os pixels originais e seleciona o quadro, sem inventar partes do movimento.

A triagem visual por assistente **não equivale a certificação biomecânica ou revisão presencial por profissional**. Os arquivos originais gerados permanecem no workspace. Nas variantes da fonte, uma falha da mídia própria tenta a imagem RepDB do mesmo ID, respeitando os bloqueios de revisão; nas duas próprias, usa o fallback textual, sem trocar o equipamento.

## Validação

Critérios: conferir arquivos e hashes, nomes e equipamentos por ID, recortes dentro dos limites, poses estáticas, fallback da mesma variação, inclusão das duas próprias na ficha, navegação da biblioteca, nomes personalizados e preservação do rascunho de carga/repetições.

O teste de mídia verifica as 167 associações e os 54 arquivos. O teste de navegador percorre todos os 167 detalhes e suas posições em 390 px; a sessão usa 12 variações representativas em 320/390/768/1440 px. Os dados são sintéticos e as requisições de conta são interceptadas: não há alteração de treino real ou geração de IA nos testes.

Feito e testado localmente: lint, build, mídia própria, contrato RepDB/PT-BR, UI/UX, motion, FOCO PRO, sessão, atlas, FOCO V2 e regras científicas; navegador de mídia nas quatro larguras (167 detalhes em 390 px, fallback e rascunho); inclusão das duas variações próprias em fichas sintéticas; auditoria Axe sem violações detectadas no cenário testado; 48/48 cenários visuais internos. O CI repete os contratos da entrega. A revisão automatizada com dados sintéticos não equivale a teste presencial na academia ou em dispositivo físico; essa validação profissional permanece pendente.

## Atualização

Frontend: **FOCO 3.5**, build `2026-11-17-v35-expanded-human-media`. O cache PWA e o atualizador manual avançam juntos. O identificador da API e a lógica de treino permanecem nos valores anteriores.
