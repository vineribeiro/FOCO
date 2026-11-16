# Geração: prioridade de panturrilhas omitida

O usuário recebeu uma rejeição de proposta por ausência de Panturrilhas. O auditor estava bloqueando corretamente a omissão; o gerador dependia de outra inferência para corrigir a ficha. Quando uma falha de disponibilidade do Gemini consumia a primeira tentativa, a resposta Groq já usava a segunda e não restava orçamento para correção.

Critério de aceite: uma nova proposta que passe nas demais verificações e omita somente panturrilhas pode receber uma conclusão local limitada, respeitando os equipamentos declarados e sem outra chamada de IA. Manter o máximo de duas chamadas por pedido, o auditor integral, o tratamento clínico, as fichas salvas, as sessões e a interface 3.0.

## Alteração

- O prompt reserva explicitamente espaço semanal para flexão plantar quando Panturrilhas é uma prioridade e não há condição de alto risco.
- O auditor identifica a omissão com código estruturado; seus critérios e a versão científica 2026.4 permanecem os mesmos.
- Apenas na geração de uma ficha nova, uma omissão isolada de panturrilhas permite testar uma opção do catálogo compatível com academia completa, halteres ou peso corporal/casa.
- Preferir trocar um isolamento cujo grupo continue presente diretamente no mesmo dia. Uma prioridade que ceda um isolamento precisa manter a faixa inicial de volume. A troca não aumenta o número total de séries. Se houver uma vaga, pode-se testar a inclusão de duas séries.
- Cada alternativa precisa passar novamente pela auditoria inteira: duração, contagem de exercícios, tetos, cobertura de todos os grupos/prioridades e recuperação. Nunca retirar compostos ou core para esconder a omissão.
- Restrições/preferências livres, equipamento desconhecido, alto risco ou outro motivo de rejeição impedem a conclusão automática. Respostas explicitamente benignas, como “Sem lesões”, são reconhecidas por correspondência completa.
- A explicação informa exercício, dia, séries e eventual substituição antes da aprovação. A função não grava a ficha. A versão do backend identifica o build `2026-11-16-priority-coverage`.

## Validação

Regressões sintéticas do módulo científico e da rota HTTP real: Gemini 429 seguido de Groq com prioridade ausente passa após conclusão local, mantendo duas chamadas; primário com a mesma omissão passa com uma chamada; apenas o resultado auditado entra no cache. Também cobrir substituição em dia cheio, equipamentos, outras prioridades, restrições de formulário/anamnese, imutabilidade, alto risco e propostas que devem continuar rejeitadas.

Executar typecheck Deno/TypeScript, build, ciência, roteamento, confiabilidade e guardrails de UI. A verificação publicada consulta build/capacidade e proteção de autenticação sem consumir geração paga. Nenhum histórico ou dado real é alterado pelos testes.
