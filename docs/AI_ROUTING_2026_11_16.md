# FOCO: geração com Gemini e Groq

## Problema e critério de aceite

A função publicada v36 usava Groq para todo texto quando GROQ_API_KEY estava presente, enquanto o GitHub e a interface ainda anunciavam Gemini. Tentativas aninhadas podiam fazer quatro chamadas por pedido. O auditor aprovava semanas sem grupos prioritários e a justificativa de divisão era escolhida só pela frequência.

O fluxo deve autenticar antes de qualquer chamada, usar no máximo duas chamadas externas em 55 segundos, alternar uma vez em caso de cota/indisponibilidade, aplicar a mesma validação às duas IAs e preservar fichas e sessões existentes. Estados: carregamento, resposta validada, proposta recuperada, correção limitada, reserva, cota indisponível e rejeição da proposta. A interface preserva layout e controles existentes.

## Implementação

- Gemini é o principal padrão; Groq é a reserva para texto. Usam as chaves já configuradas. AI_PRIMARY_PROVIDER permite inverter a preferência sem mudar código. Não há contratação nem alteração de plano de cobrança.
- Uma chamada por tentativa de transporte. No máximo duas por pedido, somando reserva e correção. Se a primeira proposta tem erro de formato/dose, uma correção no mesmo provedor usa o último crédito de tentativa; um bloqueio de segurança é terminal.
- Cota, timeout, falha de rede ou indisponibilidade podem acionar a reserva uma vez. Retry-After não é encurtado. Cooldown e cache são locais à instância da Edge Function, sem promessa de consistência global entre instâncias.
- Cache de dez minutos, até 32 propostas validadas por instância, com SHA-256 de conta, operação, contexto, schema e modelos. Pedidos idênticos simultâneos compartilham trabalho; contas diferentes não compartilham propostas. Regeneração explícita ignora resultado pronto. Dados clínicos não aparecem em chaves de cache ou logs.
- Logs registram provedor, modelo, código de resultado e tokens informados pelo provedor, sem prompt, chave ou identificador da conta. Não estimam saldo ou custo quando não há informação do fornecedor.
- Fotos/PDFs continuam no Gemini; o modelo alternativo Gemini pode usar a segunda tentativa de disponibilidade. Arquivos não são enviados à Groq.
- A interface informa o provedor efetivo. A proposta não salva pode ser recuperada por dez minutos na mesma aba, conta e contexto, sem chamar IA. Mudanças de parâmetros/anamnese/perfil invalidam a recuperação. “Gerar outra proposta” solicita regeneração; salvar não chama IA.
- Motor 2026.4: prioridades explícitas precisam ter algum trabalho direto/indireto; pedidos gerais precisam cobrir os grandes grupos; sete dias precisam incluir recuperação ativa; compostos de iniciantes começam em seis repetições. Não há mínimo universal de séries imposto. Essas regras afetam novas propostas de IA e revisões, sem reescrever fichas salvas ou impedir edição manual.
- A justificativa descreve os grupos efetivamente encontrados por dia. O resumo compacto inclui fonte e regras LAB versionadas. A negação de um sintoma não cancela outro sintoma afirmativo.

## Validação

Testes sintéticos de transporte e rotas reais: sucesso primário, reserva por 429/timeout, esgotamento dos dois, cooldown, orçamento total, correção, segurança, cache, concorrência, isolamento de contas, metadados, prioridades e sintomas. Testes de rascunho cobrem contexto, conta, expiração e armazenamento bloqueado.

Executar também lint, build, training-science, edge-reliability, ui-ux, motion, pro-quality e navegador com dados sintéticos. Testes simulados não comprovam disponibilidade real de uma cota externa. A publicação precisa conferir status do backend e frontend; validação em celular físico permanece pendente.

## Limites

As cotas dos fornecedores são independentes e finitas. A reserva melhora disponibilidade e não garante uso ilimitado. Não foi implementada prescrição clínica autônoma nem gerador completo sem IA. Dados históricos não foram alterados. Rastreio de tokens está nos logs e na resposta, sem nova tabela ou migração de banco.
