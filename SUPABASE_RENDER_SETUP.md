# FOCO: ativar persistência gratuita (Render + Supabase)

O backend FOCO pode usar o Supabase Postgres para guardar o estado da aplicação, sem depender de disco persistente pago no Render. A versão atual usa uma única linha JSON como snapshot, uma solução simples para o MVP/uso pessoal; não é o modelo relacional final para escalar para muitos usuários.

## 1. Criar/abrir um projeto Supabase gratuito

1. Abra https://supabase.com/dashboard/ e selecione um projeto existente ou crie um projeto Free.
2. Abra **SQL Editor**.
3. Copie e execute o conteúdo inteiro de `supabase/migrations/20261027_foco_app_state.sql` deste repositório.
4. Confirme que foi criada a tabela `public.foco_app_state`.

Não é necessário executar as migrações antigas para ativar esse armazenamento JSON do backend atual. Elas preparam tabelas relacionais para uma migração futura, mas o código de runtime ainda usa a API de snapshot `foco_app_state`.

## 2. Configurar o serviço backend do Render

No dashboard Render, abra o Web Service que atende `foco-api-xuj2.onrender.com`, depois vá a **Environment** e adicione:

- `SUPABASE_URL`: URL do projeto Supabase, em Project Settings → API (formato `https://<project-ref>.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta de servidor do projeto Supabase (em Project Settings → API Keys; use a chave `service_role` legada se essa for a disponível no painel).

A chave `service_role` tem privilégios elevados: mantenha-a **somente no backend do Render**. Não a coloque em `NEXT_PUBLIC_*`, no frontend, em código versionado, screenshots ou mensagens de chat.

**Não altere nem remova o `JWT_SECRET` já configurado**: trocá-lo invalida os tokens de sessão atuais. Preserve também `GEMINI_API_KEY`.

Salve as variáveis e faça **Manual Deploy → Deploy latest commit** se o serviço não publicar automaticamente quando o GitHub receber um commit.

## 3. Validar a implantação

Abra:

https://foco-api-xuj2.onrender.com/api/system/status

Depois de a nova versão estar ativa, o retorno deve incluir:

- `remote_storage_configured: true`
- `remote_storage_ready: true`
- `storage_persistent: true`
- `supabase_sync_available: true`

Se o serviço não iniciar, abra **Render → Logs**. Se o erro mencionar que a tabela não existe, execute a migração SQL da etapa 1. Se mencionar autenticação de API, confira URL e chave no Environment.

## 4. Dados e primeiro arranque

Na primeira conexão, se o snapshot remoto ainda não existir, o backend tenta inicializar o Supabase com o arquivo JSON local que conseguir ler. Se o arquivo local já não tiver a conta antiga, o Supabase não consegue reconstruir esses dados; a recuperação exige um backup anterior. Não sobrescreva tabelas ou arquivos antigos antes de verificar se há dados úteis.

Depois de `remote_storage_ready: true`, teste cadastro/login, salve a anamnese, gere uma ficha, salve-a e recarregue a página. Então, reinicie/reimplante o serviço e confirme que a conta e a ficha continuam disponíveis.

## Limitações do plano gratuito

- O Render Free pode adormecer depois de inatividade e o primeiro acesso pode demorar para acordar. O sistema de arquivos local não é persistente nesse plano.
- O Supabase Free pode pausar projetos com baixa atividade por uma semana e não fornece backups automáticos para download. Exporte backups periodicamente se os dados forem importantes.
- Este snapshot é destinado a um MVP de instância única. Não é uma arquitetura relacional otimizada para múltiplas instâncias/concorrrência alta.

Referências oficiais:
- Render Free: https://render.com/docs/free
- Supabase Billing/Free Plan: https://supabase.com/docs/guides/platform/billing-on-supabase
