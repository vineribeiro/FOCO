# FOCO — correções da auditoria de 09/11/2026

Escopo: confiabilidade e acessibilidade do projeto pessoal em beta. Preservar
histórico, fichas, avaliações e identidade visual. Não representa certificação
WCAG, validação clínica nem teste com atleta real.

## Critérios de aceite e risco

| Fluxo/estado | Problema observado | Critério de aceite | Proteção contra regressão |
| --- | --- | --- | --- |
| Criar/ativar ficha, inclusive erro | A ficha antiga era desativada antes de validar a nova | Operação transacional, alvo próprio validado e rollback integral | PostgreSQL real: erro de exercício, ID inexistente, duas contas e concorrência |
| Finalizar sessão/cardio e perder resposta | Reenvio criava outro registro | UUID por sessão, snapshot persistido antes do envio e replay do mesmo resultado | SQL concorrente, teste de rascunhos e navegador com resposta perdida + reload |
| Iniciar app com token vencido | Refresh ignorava timeout e falhas de rede apagavam tokens | Prazo de 12s, erro recuperável, credenciais preservadas em falhas transitórias | Clock/fetch controlados e navegador: timeout, offline, 503, retry |
| Login/cadastro rejeitado | Splash desmontava formulário e perdia o erro | Formulário permanece montado, valores e erro visíveis | Navegador com respostas 401/400 sintéticas |
| Cadastro sem peso/altura | Campos opcionais criavam valores e uma medição presumidos | Campo omitido permanece nulo, medição somente quando informada | Rotas reais com serviços isolados: campos omitidos, fornecidos e inválidos |
| Excluir conta com arquivos | Auth bloqueava usuários proprietários de objetos Storage | Remover somente os objetos próprios via Storage API, revogar sessões e excluir usuário | Serviços isolados: 250 arquivos, subpastas, paginação e falhas parciais |
| Metas/documentos indisponíveis | Falha era apresentada como nenhum registro | Loading, erro com retry, vazio após sucesso e recuperação de dados | GET 503 seguido de sucesso no navegador |
| Anamnese indisponível | Defaults podiam sobrescrever respostas não carregadas | Não editar/salvar antes de consultar respostas com sucesso | GET 503 sem campos editáveis, retry preservando fixture |
| Formulários e modais | Labels sem associação, botões sem nome e foco no fundo | Nomes acessíveis, dialog nativo, foco inicial/retorno e fundo inerte | Axe A/AA, teclado, Escape e foco programático |
| Navegação e mensagens | Nova tela/salvamento não anunciado | Título por view, foco no main, status e alertas apropriados | Navegação/back, árvore acessível e inspeção de regiões de status |
| Senhas comprometidas | Proteção nativa indisponível no Free | Rejeitar senhas conhecidas no cadastro/reset do FOCO sem transmitir a senha ao provedor | Testes offline do range, padding, timeout e erro de formato |

## Banco e implantação

A migração `atomic_workouts_and_sessions` é aditiva. Não deduplica nem apaga
histórico. Cria três RPCs `SECURITY INVOKER`, com `auth.uid()`, permissões apenas
para `authenticated`, locks por usuário e chave de replay por conta. Erros não
caem no fluxo antigo de gravações parciais.

Ordem de implantação: migração validada → Edge Function → frontend. A versão
nova da API aceita clientes anteriores usando identidade determinística pelo
usuário, início exato e ficha. Não há deduplicação por aproximação de horário.
O frontend novo conserva o payload completo da primeira finalização. Edições
posteriores não transformam um retry em outro treino.

A exclusão só ocorre após confirmação explícita da pessoa no app. Em falha
parcial, a conta continua identificada como existente e o erro explica que a
limpeza deve ser concluída; arquivos já removidos não são recuperados. Os testes
automatizados nunca excluem contas reais.

## Proteção de senha e limites conhecidos

O Pwned Passwords usa consulta k-anonymous: SHA-1 em memória para consulta, apenas
os cinco primeiros caracteres do hash enviados, resposta com padding, sem cookies,
sem senha/hash nos logs. Não substitui o armazenamento seguro do Supabase Auth.
Uma falha do provedor devolve 503 e impede cadastro/redefinição até nova tentativa,
sem alterar a senha existente. Documentação: <https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange>.

O controle **nativo** de senhas vazadas do Supabase exige Pro; a organização atual
é Free. O advisor correspondente continuará aberto. A proteção do FOCO cobre as
rotas do aplicativo, não chamadas diretas à API Auth. Nenhum plano pago foi
contratado. Referência: <https://supabase.com/docs/guides/auth/password-security>.

## Verificação reproduzível

`package-lock.json` fixa o caminho npm usado pelo CI. Executar `npm ci`,
`npm run lint`, `npm run build` e as suítes existentes. Novos scripts:

- `test:auth-reliability`, `test:session-replay`, `test:password-security`, `test:edge-reliability`.
- `test:backend-transactions`: Docker local, PostgreSQL 17 descartável, sem portas publicadas nem credenciais de produção.
- `test:audit-browser`, `test:session-retry-browser`: preview local na porta 4173,
  Playwright e Axe, API inteiramente interceptada com fixtures sintéticas.

No ambiente cloud, `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` seleciona o
browser instalado. `FOCO_BROWSER_PROXY_BRIDGE=1` pode usar Node com proxy/CA
herdados para buscar assets HTTPS; TLS continua verificado. Os testes não chamam
IA paga, não enviam e-mail e não escrevem no backend publicado.

Feito e testado: registrar os resultados finais no PR e nos artefatos de CI.
Pendente de validação externa: dispositivos reais, leitor de tela real, fluxo
completo Auth/Storage/Edge com duas contas dedicadas e geração de treino com IA.
Não iniciado: contratação de plano Pro ou alteração de escopo comercial.
