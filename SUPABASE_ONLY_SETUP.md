# FOCO — arquitetura sem Render

O frontend publicado no GitHub Pages chama a função `foco-api` no Supabase. O Postgres guarda os dados, o Supabase Auth gerencia sessões e a Edge Function chama os provedores de IA, mantendo as chaves no servidor.

## Segredo obrigatório da IA

No Supabase Dashboard do projeto, abra **Edge Functions → Secrets** e crie:

- Nome: `GROQ_API_KEY`
- Valor: sua chave privada obtida em Groq Console, no plano Free

A geração e a revisão de treinos usam `openai/gpt-oss-20b`. O modelo pode ser configurado por `GROQ_MODEL`, escolhendo um modelo compatível com JSON Schema estrito e `reasoning_effort: low`.

Para continuar lendo fotos e PDFs, mantenha também `GEMINI_API_KEY`, obtida em Google AI Studio. Essas rotas não enviam arquivos à Groq. Enquanto `GROQ_API_KEY` estiver ausente, o fluxo de texto continua usando Gemini; com a chave Groq cadastrada, falhas de texto não reenviam o contexto automaticamente a outro provedor.

Não coloque essa chave no frontend nem no GitHub.

Opcional: para habilitar exclusão definitiva de contas, verifique se a Edge Function tem a variável server-side `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEYS`. Nunca adicione uma secret key ao frontend.

## Deploy

A Edge Function `foco-api` é publicada com `verify_jwt = false` porque ela recebe endpoints públicos de login/cadastro; a própria função valida os tokens Supabase nas rotas privadas. O frontend envia a chave publishable no cabeçalho `apikey` (ela é pública por definição).

O frontend é publicado pelo workflow do GitHub Pages. O fluxo multimodal mantém os modelos Gemini configurados. Não desative o serviço Render até terminar os testes do novo endereço.

## Teste pós-publicação

1. Abra `https://buoefcnkpdrhevzbakze.supabase.co/functions/v1/foco-api/api/system/status`.
2. Confirme `database: "supabase-postgres"`, `ai_status: "configured"`, `ai_provider: "groq"` e `ai_text_status: "configured"`. `ai_media_status` informa separadamente se existe chave para fotos/PDFs. Esses campos verificam configuração, não a validade das chaves ou a disponibilidade do provedor.
3. Acesse o site FOCO, entre/crie uma conta e teste anamnese, criação de ficha, gravação de sessão e análise de um arquivo.
4. Verifique no Supabase se cada gravação apareceu na tabela correspondente.

## Cotas, formato e privacidade

O plano Free da Groq tem limites por requisições e tokens; consulte os valores da sua organização em https://console.groq.com/docs/rate-limits. Não habilite um plano pago para este fluxo sem decisão do responsável pelo projeto. O FOCO não muda o plano da conta.

Para reduzir tokens, a Groq recebe orientação compacta, o catálogo completo com índices e um schema de transporte com chaves curtas. A resposta é expandida no servidor e passa pelas mesmas validações de catálogo, dias, duração, volume e recuperação; nenhuma ficha reprovada é salva automaticamente. O histórico enviado é resumido, e fotos/PDFs permanecem no provedor multimodal.

Quando a Groq responde 429 com `Retry-After` válido de até 25 segundos, o FOCO aguarda o prazo completo, mais uma pequena margem, e tenta uma única vez, desde que restem pelo menos cinco segundos para a geração. A espera e a nova chamada compartilham o limite total de 45 segundos. Sem prazo válido, com prazo maior ou se a segunda chamada também for limitada, o erro de cota é apresentado sem novas chamadas. Solicitações grandes demais (413) têm erro específico e não são repetidas. Esse tratamento respeita a cota do provedor e não altera o plano da conta.

O contexto de texto inclui objetivo, preferências e dados consentidos, sem nome, email, tokens ou IDs de conta. Restrições e métricas corporais continuam seguindo as opções de consentimento existentes. Revise os controles de retenção na conta Groq: https://console.groq.com/docs/your-data. Não habilitar compartilhamento para treinamento nem registrar prompts, respostas brutas ou chaves em logs.
