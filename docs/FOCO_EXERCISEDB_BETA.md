# FOCO beta 2026 — ExerciseDB / AscendAPI V1 (não comercial)

## O que foi integrado
- Um componente reutilizável `ExerciseDBPreview` disponível em **todos os exercícios das telas de detalhes** na Biblioteca, na aba **Execução** de treinos e nos **Exercícios complementares** expandidos.
- Não adiciona GIFs em todas as miniaturas (economia de memória, dados móveis e requisições). Só faz a consulta após o toque em **Ver demonstração GIF**.
- Um resultado só é mostrado quando o **nome da variação** corresponde exatamente a um alias inglês explícito ou ao mapeamento RepDB já curado. Movimento parecido não é suficiente. GIF ausente, bloqueio de CORS, `429` ou erro de rede preservam as imagens e instruções atuais.
- API: `GET https://oss.exercisedb.dev/api/v1/exercises/search?search=...` (1 consulta inicial por toque, com no máximo 1 segunda consulta para uma variação aprovada; **sem guardar respostas, IDs de terceiros ou URLs de GIF**, nem em memória após o término da consulta).
- GIF: permitido somente do host `https://static.exercisedb.dev`, no caminho `/media/<id>.gif`.
- Atribuição explícita para AscendAPI / ExerciseDB ao lado da demonstração. GIF 180p, **não** ilustração premium validada ou orientação técnica profissional.
- Não altera os 254 IDs curados, backend, catálogo original, histórico, prescrição, músculos, treinamento por IA, nem fotos anatômicas próprias.

## Licenciamento — BLOQUEIO OBRIGATÓRIO
Documentação oficial: https://oss.exercisedb.dev/docs
**A API V1 gratuita é permitida para protótipos, projetos pessoais e não comerciais, mas não pode ser usada em produto comercial/SaaS sem licença paga.**
- Em builds normais o recurso é **desligado** por padrão.
- O workflow de deploy **beta não comercial** passa `VITE_FOCO_EXERCISEDB_NONCOMMERCIAL_BETA=true`.
- Qualquer ambiente pago precisa definir `VITE_FOCO_COMMERCIAL_MODE=true` (desabilita o recurso mesmo se o outro flag estiver presente) e retirar o flag beta do deploy.
- Antes de 2027 remover o flag de `.github/workflows/deploy.yml` e revisar termos, preço, armazenamento de mídia e permissão comercial. Isso deve fazer parte do gate de release.
- **Não faça download em massa de GIFs e não os inclua no repositório.**
- A política oficial de [cache](https://docs.ascendapi.com/guides/caching) exige que o plano autorize armazenamento. A integração usa `cache: no-store` para buscas, não grava respostas nem URLs de mídia no FOCO e evita pré-carregamento. A cache HTTP interna do navegador segue os cabeçalhos do CDN e não é implementada pelo aplicativo.
- Caso o provedor altere termos, CORS ou disponibilidade do endpoint gratuito, desligar a feature beta em vez de buscar alternativas não licenciadas.

## Cobertura real
O botão está disponível para **cada exercício com visualização detalhada**, mas o usuário deve tocar para consultar. Ele aparece nos painéis de Biblioteca, Execução e Complementares; não ativa GIF em miniaturas nem pré-carrega uma lista inteira. Os **254 exercícios curados têm nomes de consulta configurados**, e uma regressão offline garante essa cobertura de candidatos. Porém **não existem 254 GIFs homologados**: só uma correspondência exata confirmada na API permite exibir a mídia. O motor consulta o provedor e aceita só equivalências exatas. Os primeiros mapeamentos manuais cobrem movimentos frequentes; os demais aproveitam slugs já curados do RepDB, quando disponíveis. Não mostrar GIF para variação distinta e nem criar conteúdo fictício.
O endpoint gratuito tem limites e pode estar temporariamente indisponível. A execução do FOCO nunca depende dele.

## Comandos
- `npm run test:edb`: teste local/CI sem chamadas à API.
- `npm run test:edb:live`: consulta **opcional** de 1 exercício à API pública para verificar formato e disponibilidade. Pode retornar `429`; não executado automaticamente no CI para respeitar limites.
- `VITE_FOCO_EXERCISEDB_NONCOMMERCIAL_BETA=true npm run dev`: teste local. Necessita suporte a CORS no navegador.
- `VITE_FOCO_COMMERCIAL_MODE=true npm run build`: build com prévia gratuita bloqueada.

## Critérios adicionais de beta
1. Confirmar em Android/desktop a requisição e mídia real para pelo menos um supino, leg press e aparelho distinto.
2. Contabilizar matches por variação (e cobertura de GIFs realmente carregados), sem afirmar que todos foram atendidos.
3. Validar técnica e correspondência com profissional antes de usar ilustração para instruir execução.
4. Testar `429`, falha de CORS, rede offline e usuários com preferência por movimento reduzido.
5. Revalidar licença, segurança e infraestrutura antes de monetizar.

## Verificação real do endpoint (05/11/2026)
Consulta pontual de metadados efetuada no GitHub Actions, execução [#42082901557](https://github.com/vineribeiro/FOCO/actions/runs/42082901557), sem baixar nem armazenar GIFs:
- `barbell bench press`: HTTP **200**, CORS `*`, 7 resultados; variação exata retornada.
- `sled 45 degree leg press`: HTTP **200**, CORS `*`, 7 resultados; nome `sled 45° leg press` retornado, equivalente via normalização.
- `leg press`: HTTP **200**, CORS `*`; retornou variações diferentes, que o match estrito **não pode aceitar**.
- `leg extension`: HTTP **503** no momento do teste, sem resultado garantido.

Isso confirma **acesso real e duas correspondências**, mas não prova que todos os 254 exercícios tenham GIF, nem garante estabilidade futura da API. A integração mantém o fallback local/RepDB.
O diagnóstico live deve ser executado **somente manualmente quando necessário** (`npm run test:edb:live`); não se faz polling externo em cada PR para respeitar limites do serviço.
