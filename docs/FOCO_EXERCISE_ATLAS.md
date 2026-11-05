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
