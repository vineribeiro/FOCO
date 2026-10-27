# FOCO — arquitetura sem Render

O frontend publicado no GitHub Pages chama a função `foco-api` no Supabase. O Postgres guarda os dados, o Supabase Auth gerencia sessões e a Edge Function chama o Gemini.

## Segredo obrigatório da IA

No Supabase Dashboard do projeto, abra **Edge Functions → Secrets** e crie:

- Nome: `GEMINI_API_KEY`
- Valor: sua chave privada obtida em Google AI Studio

Não coloque essa chave no frontend nem no GitHub.

Opcional: para habilitar exclusão definitiva de contas, verifique se a Edge Function tem a variável server-side `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEYS`. Nunca adicione uma secret key ao frontend.

## Deploy

A Edge Function `foco-api` é publicada com `verify_jwt = false` porque ela recebe endpoints públicos de login/cadastro; a própria função valida os tokens Supabase nas rotas privadas. O frontend envia a chave publishable no cabeçalho `apikey` (ela é pública por definição).

O frontend é publicado pelo workflow do GitHub Pages. O modelo primário padrão é Gemini 3.8 Flash, com Gemini 3.5 Flash-Lite como fallback. Não desative o serviço Render até terminar os testes do novo endereço.

## Teste pós-publicação

1. Abra `https://buoefcnkpdrhevzbakze.supabase.co/functions/v1/foco-api/api/system/status`.
2. Confirme `database: "supabase-postgres"` e `ai_status: "configured"`.
3. Acesse o site FOCO, entre/crie uma conta e teste anamnese, criação de ficha, gravação de sessão e análise de um arquivo.
4. Verifique no Supabase se cada gravação apareceu na tabela correspondente.

A geração de treinos e a análise de PDFs/imagens requerem `GEMINI_API_KEY` nos segredos do Supabase. O armazenamento atual mantém os dados extraídos do arquivo, não necessariamente o arquivo original.
