# Galeria FOCO + ExerciseDB — projeto pessoal (05/11/2026)

## Situação do produto
O FOCO não será comercializado. O projeto permanece de uso pessoal não comercial. A API livre ExerciseDB V1 permite projetos pessoais, exige atribuição ao AscendAPI e possui limites de requisições e de armazenamento. Fontes: https://oss.exercisedb.dev/docs e https://docs.ascendapi.com/guides/caching.

## Nova experiência da Biblioteca
- **FOCO**: exercícios curados, nomenclatura em português, imagem editorial, dicas e adição à ficha.
- **ExerciseDB**: navegação remota sob demanda, 12 resultados por página, pesquisa, filtros de grupo muscular **apenas na página atual** e detalhes com mídia ao toque.
- A navegação acompanha **meta.nextCursor** na resposta da API, conforme https://docs.ascendapi.com/guides/pagination. Não usa paginação numérica de servidor, offsets calculados nem faz coleta massiva.
- Resultados do provedor são mantidos apenas na memória do componente enquanto a galeria estiver aberta, necessários à exibição e troca de página; não são salvos em localStorage, IndexedDB, Supabase, repositório ou cache da aplicação.
- GIFs de 180p são carregados apenas quando o usuário solicita. Atribuição presente na galeria e detalhes. Falhas de API e rate limits não afetam a biblioteca FOCO.
- **Adicionar à ficha** só é permitido pela fonte FOCO. Quando há uma única correspondência verificada com a curadoria, o detalhe externo abre a versão local existente. Outros exercícios ficam somente para consulta até que um conteúdo próprio seja desenvolvido/licenciado.

## O que a integração não faz
- Não importa automaticamente 1.500 registros ou GIFs para o banco de dados.
- Não finge tradução em português das instruções originais.
- Não garante que a API gratuita estará disponível ou que todas as variações representam instruções biomecânicas corretas.
- Não armazena identificadores, imagens ou instruções externas nas fichas existentes.
- Não altera histórico, treino ativo, backend ou dados de conta.

## Qualidade e validação
`npm run lint`, `npm run build`, `npm run test:edb`, `npm run test:atlas` e revisão visual. Testes com mocks verificam o formato e a UI, não substituem o teste live para `nextCursor`, falhas HTTP e CORS.

## Migração 2.3 — ExerciseDB como fonte visual única (05/11/2026)
A decisão foi substituir a galeria dupla anterior por **apenas ExerciseDB**, retirar imagens antigas dos treinos, remover a galeria anatômica legada e deixar os GIFs sob demanda.

- A página Biblioteca consulta a primeira página da ExerciseDB ao abrir (consulta única), sem baixar os ~1.500 registros nem renderizar duas galerias.
- Busca/paginação continuam ao vivo por cursor; o usuário pede o GIF no modal antes de baixá-lo.
- Detalhes de exercícios nos treinos e em Exercícios Complementares usam somente a demonstração da ExerciseDB; correspondências exatas são exigidas para nomes antigos em português.
- Nomes, IDs, URLs de mídia e instruções da API não são salvos automaticamente no Supabase ou nas fichas. Para adicionar um movimento, o usuário escreve **manualmente** o próprio nome (dado fornecido pelo usuário), grupo e dia de treino.
- As imagens antigas não são mais renderizadas; a aplicação mostra um placeholder uniforme e a execução via GIF sob demanda. Não há fallback visual vindo de outro fornecedor.
- Os treinos históricos, a IA e a compatibilidade de nomes continuam dependendo de dados internos curados. Esses dados internos NÃO são exibidos como catálogo paralelo e NÃO são deletados para não quebrar fichas antigas.
- A paginação, atribuição e licença permanecem limitadas a uso não comercial. Referência: https://oss.exercisedb.dev/docs e https://exercisedb.notion.site/ExerciseDB-API-Terms-of-Use-226983b728ca8090bf7be79564e4b356.
