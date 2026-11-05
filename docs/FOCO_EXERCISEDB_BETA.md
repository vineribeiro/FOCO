# FOCO beta 2026 — ExerciseDB / AscendAPI V1 (não comercial)

## O que foi integrado
- Um componente reutilizável `ExerciseDBPreview` disponível em **todos os exercícios das telas de detalhes** na Biblioteca, na aba **Execução** de treinos e nos **Exercícios complementares** expandidos.
- Não adiciona GIFs em todas as miniaturas (economia de memória, dados móveis e requisições). Só faz a consulta após o toque em **Ver demonstração GIF**.
- Um resultado só é mostrado quando o **nome da variação** corresponde exatamente a um alias inglês explícito ou ao mapeamento RepDB já curado. Movimento parecido não é suficiente. GIF ausente, bloqueio de CORS, `429` ou erro de rede preservam as imagens e instruções atuais.
- API: `GET https://oss.exercisedb.dev/api/v1/exercises/search?search=...` (1 consulta por toque, cache temporário em memória, sem armazenamento permanente de material externo).
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
- Não faça download em massa de GIFs e não os inclua no repositório.

## Cobertura real
O botão está disponível para **cada exercício com visualização detalhada**. Os **254 exercícios curados têm nomes de consulta configurados**, e uma regressão offline garante essa cobertura de candidatos. Porém **não existem 254 GIFs homologados**: só uma correspondência exata confirmada na API permite exibir a mídia. O motor consulta o provedor e aceita só equivalências exatas. Os primeiros mapeamentos manuais cobrem movimentos frequentes; os demais aproveitam slugs já curados do RepDB, quando disponíveis. Não mostrar GIF para variação distinta e nem criar conteúdo fictício.
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
