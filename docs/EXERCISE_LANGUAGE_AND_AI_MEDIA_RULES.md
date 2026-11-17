# FOCO — regras de idioma e futuras ilustrações próprias

Atualização de 17/11/2026: o pacote PT-BR foi integrado na revisão 3.3. O proprietário
solicitou depois um piloto em dez exercícios e sua integração à tela de treino.
Ver `FOCO_HUMAN_MEDIA_2026_11_17.md` para a entrega 3.4 e a origem das imagens próprias.
As falhas de idioma descritas abaixo são o diagnóstico histórico de 16/11.

Direção solicitada pelo proprietário em 16/11/2026: corrigir nomes e explicações em inglês primeiro; depois avaliar novas imagens de IA para tornar os exercícios mais bonitos. Este documento define a próxima etapa. Não declara que o catálogo já foi traduzido nem autoriza trocar toda a mídia sem revisão.

## 1. Português brasileiro na interface

- Nome principal, instruções, dicas, músculos, equipamento, filtros e texto alternativo em PT-BR. Inglês pode ser mantido como metadado interno de busca/proveniência, sem virar o texto padrão da tela.
- Usar o nome reconhecido em academias brasileiras. Termos consagrados sem tradução inequívoca podem aparecer entre parênteses após uma descrição clara; nomes próprios como Smith e Scott permanecem nomes próprios.
- Exemplos de glossário: `Bench Press` → `Supino reto com barra`; `Hip Thrust` → `Elevação de quadril apoiada no banco (hip thrust)`. Cada variante precisa ser conferida; esses exemplos não autorizam renomear outra variação parecida.
- Preservar equipamento, pegada, unilateralidade, apoio e ângulo. Não confundir supino reto/inclinado, terra romeno/stiff, ponte no chão/elevação apoiada no banco ou leg press/panturrilha no leg press.
- O `repdb_id`/identificador do exercício permanece a chave. Localizar o texto não pode trocar imagens, histórico, fichas ou os nomes personalizados salvos pelo usuário. O título localizado do catálogo é uma camada de apresentação.
- As instruções devem explicar preparação, movimento e cuidados em frases curtas. Traduzir o sentido técnico, sem inventar carga, amplitude universal, contraindicação, desempenho ou promessa de resultado.
- Traduções são preparadas, revisadas e versionadas antes da publicação. Abrir um exercício não chama uma IA para traduzir e não gasta cota de inferência.

### Falhas atuais identificadas

`src/data/repdbAssets.ts`: `repdbDisplayName` usa `name_en` quando não encontra um nome local. `src/components/RepDBCatalogBrowser.tsx`: o detalhe exibe `instructions_en` diretamente com o título “Instruções da fonte (inglês)”. A próxima implementação deve substituir esses caminhos por um pacote PT-BR completo e rastreável.

### Aceite do pacote de idioma

Fixar a revisão do catálogo usada na tradução; associar cada registro ao ID correto; revisar a cobertura de nomes e instruções antes de ativar o pacote. Não apagar ou ocultar exercícios para simular que a tradução ficou completa. Atualizações do catálogo entram com revisão de idioma e variação. Testar busca por nome PT-BR e termo original, filtros, detalhes, inclusão na ficha e preservação de registros antigos.

## 2. Imagens de IA independentes

A autorização para explorar imagens próprias não permite derivar imagens da RepDB com IA. A licença consultada em 16/11/2026, item 5, diz: **“The images may not be used as input, reference, or conditioning material for generative models”**. Inclui restilização e transferência de estilo. Fonte: [RepDB LICENSE-DATA.md](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md).

- Criar as imagens a partir de descrições próprias do movimento, equipamento e posição. Não enviar imagens RepDB a um gerador nem usá-las como referência visual, conditioning, fine-tuning, contorno ou base para restilização.
- Não usar imagens de terceiros como base sem direitos compatíveis. Não remover marcas para disfarçar a origem.
- Primeiros resultados são protótipos próprios para avaliação. A mídia atual permanece publicada até haver substituto revisado por exercício e variação.
- Mídia própria tem origem `ai`, modelo/data/versão do prompt e estado de revisão registrados. Não deve ser atribuída à RepDB nem apresentada como fotografia ou observação real de um atleta.

## 3. Direção visual proposta

Ilustração semirrealista limpa, com personagem adulto e proporções naturais; equipamento legível; roupa esportiva em grafite e detalhes da paleta lima/lilás/rosa do FOCO. Mesma linguagem de luz, câmera, enquadramento, personagem e acabamento ao longo da coleção. Evitar cenário carregado e elementos decorativos que atrapalhem a técnica.

Preferir fundo transparente quando adequado aos cartões, sem cortar corpo ou aparelho. Evitar textos e números dentro da imagem: nomes, séries e instruções continuam no HTML, com acessibilidade. Gerar resolução suficiente para o app e otimizar o arquivo publicado, preservando detalhes de mãos, pés e equipamento.

## 4. Técnica precede beleza

- Conferir articulações, proporções, mãos/pés, contato com banco/chão/aparelho, trajetória da carga e posição da coluna. Recusar membros extras, apoios impossíveis, carga flutuante ou equipamento inventado.
- A imagem deve corresponder exatamente ao exercício e à variação, com início e final coerentes. Câmera, personagem e equipamento não mudam entre as duas posições.
- Uma ilustração bonita não comprova execução correta. Usar uma lista técnica de revisão por exercício e identificar quem revisou; não inventar certificação profissional.
- Não animar duas imagens com interpolação que invente uma trajetória de movimento. Animação exigiria uma sequência própria tecnicamente revisada.

## 5. Publicação gradual e reversível

Fluxo: `descrição própria → protótipo → revisão técnica/visual → teste no app → publicação por ID`.

Começar por um lote pequeno de movimentos distintos, não pela biblioteca inteira. Conferir legibilidade em 320/390/768/1440 px, contraste, transparência, tempo de carregamento, posições inicial/final e alternativas textuais. Cada exercício precisa de fallback para a mídia atual. Manter um manifesto próprio de imagens; não reescrever o dataset nem redistribuí-lo como catálogo/API independente.

A tradução do catálogo e a substituição das imagens são entregas separadas. O idioma vem primeiro. Nenhuma imagem gerada nesta etapa de regras foi publicada.
