# FOCO 3.6 — correção das imagens existentes

A coleção continua com 167 exercícios humanizados. Esta entrega corrige a apresentação das imagens e os problemas mostrados nas capturas do proprietário: miniatura escura com borda sobre o cartão pastel, texto encostado na imagem, muito espaço vazio no detalhe do abdominal bicicleta e superfícies verdes legadas.

## O que mudou

Foram revisados os limites de enquadramento dos 167 IDs. Foram publicados 98 ajustes: 93 recortes de arquivos existentes e cinco exercícios com novas imagens. Os recortes são metadados de `viewBox`, preservam os pixels originais e usam limites comuns entre início e final para manter escala e câmera. O `clipPath` continua obrigatório para impedir que outras células da folha apareçam no espaço criado pelo ajuste de proporção do SVG.

As cinco imagens refeitas são abdominal bicicleta, flexão de punhos com barra, flexão de punhos na polia, extensão de punhos com halteres e rotação externa do ombro na polia. Na bicicleta, o primeiro quadro mostra a preparação e o segundo uma posição de execução. Nos punhos, a preparação foi refeita com apoio mais claro dos antebraços nas coxas. Resultados com poses repetidas ou apoio ambíguo foram separados e não entraram na aplicação.

A coleção passa a ter 330 posições estáticas em 59 WebPs, somando 3.477.780 bytes. Prancha, prancha lateral, suspensão na barra e sustentação em pinça permanecem com uma imagem de referência porque representam sustentações estáticas. Os demais 163 exercícios possuem duas posições. A consulta das imagens continua sem inferência ou consumo de créditos de IA.

Os cartões mantêm cabeçalhos pastel e integram a ilustração a uma área grafite, sem a borda da antiga miniatura. Texto e imagem têm colunas separadas e contraste próprio. O detalhe usa a proporção do movimento, com altura limitada pela tela; assim, movimentos horizontais não precisam de uma caixa quadrada alta. Origem, contador e botões ficam fora da área do desenho. Os tons grafite substituem o verde legado no detalhe e no guia.

## Origem e revisão

O manifesto [FOCO_HUMAN_CORRECTIONS_2026_11_17.json](media/FOCO_HUMAN_CORRECTIONS_2026_11_17.json) registra os limites anteriores, os limites protegidos de cada célula, os recortes publicados, os hashes, os prompts e as referências próprias das cinco novas imagens. Os manifestos anteriores e os arquivos do piloto permanecem intactos. Nenhuma imagem RepDB foi usada como entrada de geração. A ferramenta é `image_gen.imagegen`, com versão de modelo registrada como `not-exposed-by-tool`.

A análise de pixels serviu para propor limites de enquadramento; os recortes foram conferidos como SVGs renderizados antes da integração. A triagem visual do assistente não equivale a certificação biomecânica profissional. Não foram criadas animações ou trajetórias interpoladas.

## Validação e preservação

Os contratos verificam os 167 IDs, as 330 posições, os hashes dos 59 arquivos e os limites dos recortes dentro da célula protegida. O navegador percorre todos os detalhes da biblioteca em 390 px e doze exercícios representativos da sessão em 320/390/768/1440 px, incluindo as cinco imagens refeitas. Também confere contraste e espaçamento dos cartões, navegação por teclado, altura do detalhe da bicicleta, troca de posições, fallback da mesma variação e preservação do rascunho de carga/repetições.

Feito e testado localmente: lint, build, hashes e limites dos recortes, RepDB/PT-BR, UI/UX, motion, FOCO PRO, contrato da sessão e atlas. O navegador verificou os 167 detalhes em 390 px, a sessão e os cartões nas quatro larguras, o contador acima da imagem, o contraste real do texto e o rascunho após recarregar. Axe não detectou violações nos cenários de sessão e cartões analisados. Os 48 cenários visuais internos e a regressão estrutural também passaram.

As verificações usam dados sintéticos e interceptam as requisições da conta. Não há alteração de fichas reais, histórico, prescrições, frequência, volume ou API. A revisão visual em navegador não substitui teste em dispositivo físico ou acompanhamento profissional.

Frontend: FOCO 3.6, build `2026-11-17-v36-corrected-exercise-images`. O cache PWA, o HTML e o atualizador manual avançam juntos. Resultados de validação e publicação ficam vinculados ao PR desta entrega.
