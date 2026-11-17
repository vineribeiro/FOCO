# FOCO 3.3 — frequência, catálogo PT-BR e revisão de imagens

Revisão de 17/11/2026. Escopo: frequência da ficha automática, biblioteca RepDB,
nomes/instruções e correspondência das imagens. Não modifica registros reais.

## Frequência escolhida

A versão 3.2 interpretava frequência como disponibilidade e limitava saúde a
três sessões; outros objetivos também reduziam a quantidade de dias. Isso não
correspondia ao pedido explícito de treinar sete vezes por semana.

A montagem agora usa todos os dias escolhidos. Duas/três sessões intercaladas
podem ser corpo inteiro; calendários consecutivos usam divisões por padrões.
Quatro usam superiores/inferiores; cinco combinam superiores/inferiores e
empurrar/puxar/pernas; seis usam empurrar/puxar/pernas duas vezes; sete acrescentam
uma sessão de core/acessórios com dose menor. A dose semanal, os tetos e o intervalo
por músculo continuam valendo, incluindo sinergistas e domingo/segunda.

O motor não aumenta o volume apenas para preencher o tempo, não inventa séries
de cardio e não reduz a frequência silenciosamente. Se equipamento/tempo/dias
não permitirem uma ficha válida, retorna conflito. O tempo é um teto estimado;
uma sessão de acessórios pode durar menos. Isso não declara que sete sessões são
ideais para todo iniciante ou que horários reais garantem exatamente 48 horas.

Estados: editar → gerar → revisar → aprovar; edição invalida a prévia e resposta
tardia não restaura parâmetros antigos. Fichas e sessões salvas não são migradas.

## Fonte congelada e abrangência

Fonte: [RepDB](https://github.com/RepDB/exercise-dataset), revisão
`4b1358a63c9f78f982867726f2a73c0f6cb21475` (14/11/2026).
JSON consultado: SHA-256 `ad7c602fcc6bd4322b6228673c0fff5ad60b87f219352d44f9b92a763835948f`.
A fonte atual contém **708 exercícios**, em vez dos 701 usados nas antigas fixtures.

- 708 nomes localizados, com ângulo, equipamento, apoio, pegada e unilateralidade.
- Nomes únicos por variação: a extensão de tríceps com um halter nas duas mãos
  permanece distinta do tríceps testa com dois halteres.
- 708 resumos FOCO em PT-BR baseados no movimento/região da fonte.
- 3.726 passos e 2.001 dicas em PT-BR, com carregamento local separado do pacote de nomes.
- Rascunho de texto por tradução automática offline de conteúdo público, seguido
  de revisão editorial de terminologia, negações e variações. Foram corrigidos
  547 parágrafos, além da curadoria dos nomes; não se trata de certificação clínica.
- Músculos, regiões e equipamentos com vocabulário PT-BR. Busca aceita português,
  nome original e códigos internos; o texto padrão da tela não cai em inglês.
- Novos IDs sem revisão exibem estado de idioma pendente, sem esconder o registro.
- Tradução não ocorre ao abrir o exercício e não usa a cota dos provedores do FOCO.
- O nome personalizado e o `repdb_id` permanecem separados ao salvar; histórico e
  nomes existentes não são reescritos por este pacote de apresentação.

O pacote é parte do aplicativo; não há publicação de um dataset derivado ou API
independente. A atribuição obrigatória da RepDB permanece visível.

## Auditoria de arquivos e poses

Verificados os **1.231 arquivos WebP** usados pelos 708 registros: 523 pares
início/final e 185 poses únicas. Todos responderam HTTP 200, decodificaram em
512 × 512 e tinham caminhos seguros ligados ao próprio ID. Nenhum par tinha
arquivos com o mesmo SHA-256. Foram conferidas visualmente 18 pranchas internas,
abrangendo os 708 registros, para triagem de correspondência, apoios e variações.
Isso não equivale a aprovação biomecânica profissional de cada execução.

A interface identifica pose única como **posição de referência**. Se a imagem
inicial falhar, a imagem final conserva o rótulo correto; não vira um novo início.
As imagens originais não foram editadas nem usadas como referência generativa.

### Vínculos corrigidos

| Nome antigo | Problema | Tratamento |
| --- | --- | --- |
| Stiff com halteres | Apontava para terra romeno | Removido o vínculo aproximado; registro preservado, sem imagem de outra variação |
| Rosca Scott com barra EZ | Apontava para barra reta | Usa `preacher-curl`; vínculo antigo explícito incorreto não é exibido |
| Abdução de quadril com mini band | Apontava para caminhada lateral | Removido vínculo aproximado |
| Panturrilha unilateral com halter | Apontava para peso corporal | Removido vínculo aproximado |
| Elevação de ponta dos pés | Vínculo ambíguo com flexão plantar | Removido vínculo aproximado |

### Ilustrações retidas para revisão

Os exercícios continuam acessíveis; a ilustração é sinalizada e não é trocada por
movimento semelhante. Motivos por ID em `src/data/repdbMediaReview.ts`:

- `banded-fire-hydrant`: joelho estendido na imagem, flexionado na instrução.
- `db-somersault-squat`: imagem e descrição da variação não correspondem.
- `dumbbell-wrist-curl`: fonte unilateral, representação bilateral.
- `incline-dumbbell-fly`: ângulo do banco/apoio precisam de conferência.
- `single-arm-dumbbell-bench-press`: aparece carga também na mão que deveria ficar livre.
- `single-arm-plate-loaded-lateral-raise`: conferir representação unilateral.
- `single-leg-lying-leg-curl`: conferir a posição da perna livre.
- `smith-machine-incline-bench-press`: conferir apoio em relação aos 30–45 graus descritos.
- `toes-to-bar`: a pose não leva os pés à barra.
- `weighted-wall-crunch`: apoio dos pés na parede pouco legível/ausente.

## Estudo para humanizar as imagens

A licença informa que as ilustrações atuais já foram criadas com ferramentas de
IA, por encomenda da RepDB. O problema visual observado é a repetição do mesmo
personagem sem traços faciais, fundo azul e acabamento esquemático. Mais realismo
não resolve, por si só, posição incorreta, contato com o aparelho ou variante errada.

Recomendação: **ilustração humana semirrealista**, com rosto legível, proporções
naturais e roupa esportiva. Grafite, lima e lilás; iluminação suave; fundo simples
ou transparente; equipamento bem definido. Diversidade de adultos na coleção,
com a mesma pessoa, roupa, câmera e aparelho nas duas poses de cada exercício.
Evitar musculatura exposta decorativa, corpo idealizado obrigatório e cenário
que compita com o movimento. Texto, séries e controles permanecem no HTML.

A criação deve partir de descrições próprias. A licença, item 5, proíbe usar imagens
RepDB como entrada, referência ou condicionamento de modelos generativos:
[licença](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md).
O estudo de personagem deverá ser um protótipo autoral independente, sem uso técnico
antes da revisão individual das poses.

Lote piloto proposto: supino reto com halteres, agachamento goblet, remada unilateral
com halter, panturrilha em pé e prancha. Para cada ID: descrição própria da preparação,
posição inicial/final, contato das mãos/pés, amplitude representada, câmera e rejeições.
Produzir primeiro uma comparação de estilo; depois pares por exercício, com revisão
individual antes de qualquer substituição publicada. Priorizar também as dez retenções.

### Critérios de revisão do piloto

Contato físico plausível; mãos/pés e articulações coerentes; equipamento compatível;
mesmo número de cargas; lado unilateral correto; banco/apoios com ângulo legível;
poses correspondentes ao texto; legibilidade em 320/390/768/1440 px; arquivo otimizado;
origem/modelo/prompt/data registrados; fallback por ID e publicação reversível.

## Verificação e limites

Testes de frequência exata para 2–7 dias, objetivos, limites de tempo/volume e
recuperação por grupo; aliases e poses; cobertura dos 708 IDs; ausência de termos
incorretos conhecidos; busca PT-BR/original; orientações locais; identificação de
pose única/final após falha; inclusão com nome personalizado e ID preservado.
Revisão responsiva e acessibilidade com dados sintéticos; não são treinos reais.

Feito: auditoria estrutural completa, triagem visual, correções de vínculo,
pacote PT-BR e frequência sem redução silenciosa. Pendente: revisão biomecânica
profissional individual e validação em aparelho físico. A coleção humanizada
completa não foi produzida nem publicada nesta revisão.
