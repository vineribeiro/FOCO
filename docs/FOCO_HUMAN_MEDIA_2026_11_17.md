# FOCO 3.4 — piloto humano e imagem como destaque do treino

Pedido: produzir um teste em dez exercícios e integrar as imagens ao FOCO,
com o movimento como protagonista da sessão. Escopo: mídia e apresentação;
não altera o gerador, a prescrição, o backend, fichas ou registros reais.

## Lote autoral

Dez imagens próprias de IA, com nove pares estáticos e uma referência de prancha.
Personagens adultos com rosto, roupas grafite e detalhes lima/lilás; mesma pessoa,
câmera e equipamento entre as posições de cada exercício. Origem, prompts das duas
versões, hashes, referências autorais e revisão por ID estão em
`docs/media/FOCO_HUMAN_PILOT_2026_11_17.json`. O modelo específico não é exposto pela
ferramenta; não inventar um nome/versão. Nenhuma imagem RepDB entrou na geração.

| Exercício | ID exato | Conferência visual do piloto |
| --- | --- | --- |
| Supino reto com halteres | `db-bench-press` | Banco reto, dois halteres, apoios e flexão/extensão; posição inicial usa o painel com cotovelos flexionados |
| Agachamento goblet com kettlebell | `goblet-squat` | Um kettlebell, duas mãos e calcanhares apoiados |
| Remada unilateral com halter | `single-arm-db-row` | Uma carga, mão/joelho contralaterais no banco; olhar ajustado |
| Panturrilha em pé com halteres | `dumbbell-calf-raise` | Duas cargas, apoio no chão e elevação dos calcanhares |
| Prancha | `plank` | Uma referência, antebraços e pontas dos pés apoiados; olhar ajustado |
| Terra romeno com halteres | `dumbbell-romanian-deadlift` | Dobradiça do quadril, joelhos levemente flexionados; cervical ajustada |
| Elevação lateral com halteres | `lateral-raise` | Duas cargas, elevação bilateral e punhos sem queda excessiva |
| Rosca martelo com halteres | `hammer-curl` | Pegada neutra; orientação da carga na posição baixa corrigida |
| Ponte de glúteos no chão | `glute-bridge` | Peso corporal, cabeça/ombros e pés no colchonete |
| Puxada frontal na polia | `lat-pulldown` | Cabo central, coxas sob apoios e barra à frente do peito |

A primeira versão transparente apresentou halos de máscara. O refinamento usa
fundo grafite opaco e corrige esses resíduos. A revisão é triagem visual do
assistente; não equivale a certificação biomecânica profissional. Uma nova
divergência exige retenção ou reversão por ID.

## Integração

Os dez arquivos WebP somam **438.922 bytes**, sem reduzir a resolução original.
São arquivos estáticos: não há geração de imagem ou uso de cota ao treinar.
O visualizador seleciona quadros das imagens originais, mantendo proporção,
sem interpolação entre poses e sem inventar uma animação.

`ExerciseIllustration` é o proprietário da resolução de mídia no app. Primeiro
consulta o manifesto autoral por ID exato; um nome personalizado não perde a
associação. Se o arquivo falha, usa a mesma variação RepDB; não escolhe movimento
semelhante. Vínculos históricos conhecidos como incorretos continuam bloqueados.
O nome genérico antigo “Agachamento goblet”, usado pelo motor com halter, não
recebe a imagem de kettlebell sem um ID explícito que desambigue a variação.

Origem visível: “FOCO · IMAGEM DE IA” ou “RE P DB · ILUSTRAÇÃO”. Os dados do catálogo
continuam atribuídos à RepDB; as imagens próprias não são atribuídas ao provedor.
O filtro “Imagens FOCO” na biblioteca permite localizar os dez movimentos.

Na sessão, a imagem tem espaço próprio e maior, troca de posição ao alcance,
e nome do exercício abaixo. Foi removida a regra antiga que encolhia a mídia
para 74% da largura/320 px e 77% da altura. Título e controles não cobrem corpo
ou equipamento. Séries, carga, repetições, descanso e rascunho mantêm seu fluxo.

## Verificação

Integridade/hashes, peso dos arquivos, limites dos quadros, 19 poses, ausência de
substituição aproximada, nomes personalizados e proveniência. No navegador:
dez variantes em 320/390/768/1440 px, alternância, referência única, filtro,
falha com fallback do mesmo ID, acessibilidade e rascunho preservado após recarga.
Os dados dos testes são sintéticos; nenhuma sessão real é gravada.

Validação em aparelho físico e avaliação biomecânica profissional individual
permanecem pendentes. As demais imagens do catálogo permanecem na fonte RepDB.
