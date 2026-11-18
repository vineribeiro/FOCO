# FOCO 3.9 — execução da auditoria de marca

Pedido do proprietário: implementar todos os achados B01–B10 da revisão de 18/11/2026 (`work/brand-superaudit-2026-11-18/RELATORIO.md`). Base: FOCO 3.8 / `ad2ca3c`. A direção visual de `DESIGN.md` continua válida.

## Evidência e aceite antes de alterar

- B01: busca da biblioteca recebe foco visível por teclado, com contraste verificável e suporte a forced-colors.
- B02: bordas de campos distinguíveis por pelo menos 3:1 dos fundos adjacentes; reutilizar o token de controle.
- B03: selecionar exercício-alvo e confirmar substituição com contexto de conta/ficha/dia. Usar criação atômica de nova versão pelo contrato existente; histórico anterior preservado. Dia, posição e programação dos demais movimentos não mudam; carga do novo movimento começa em zero. Não gravar na conta real durante QA.
- B04: dois movimentos exatos de extensão de punho com barra/polia recebem mídia própria, instruções PT-BR e associação estável. Não usar imagens RepDB como referência de geração; não trocar extensão por flexão. Revisão visual e origem documentadas, sem alegar certificação profissional.
- B05–B07: título curto do treino e grupos legíveis; metadados úteis maiores; pessoa/exercício com área visual útil maior nos cartões e no destaque do dia. Preservar figura/aparelho e controles.
- B08–B10: biblioteca começa pela busca e movimentos; linguagem de montagem/revisão/salvamento centrada na tarefa, com explicação acessível dos papéis de Método FOCO eIA. Prévia preservada em falhas; erros acionáveis sem detalhe técnico bruto.

## Estados e riscos

Normal, vazio, carregando, erro de rede, foco de teclado, movimento sem mídia, confirmação/cancelamento de substituição, conta/contexto alterado e envio duplicado. Riscos principais: modificar treino errado, copiar classificação muscular/carga indevida, esconder controles ao ampliar imagens, misturar autoria de mídia e perder prévia em erro.

FOCO PRO organiza a entrega; disciplinas de acessibilidade, layout, tipografia, cores e escrita seguem suas skills locais. Trabalho dividido em fluxo de substituição, texto/biblioteca, mídia e sistema visual. Sem alteração de backend planejada: versão de ficha usa o contrato de criação já existente.

## Validação planejada

Lint → build → UI/UX → motion → FOCO PRO; testes significativos de substituição e erros; cobertura por ID/PT-BR/mídia; navegador sintético em 320/390/768/1440px, teclado e contraste computado; PR/CI e publicação do frontend/PWA. Aparelhos físicos e parecer biomecânico continuam fora da verificação automatizada.

## Entrega

### Feito e testado antes da publicação

Os dez achados foram implementados. O foco da busca é visível e as bordas de campos usam o token de contraste. Títulos do detalhe usam dia e grupos completos em chips. Os cartões têm área maior para a figura; a Home usa o movimento do dia e apresenta a meta semanal em texto legível sem cobrir a imagem. A biblioteca prioriza busca/catálogo, e montagem/revisão usam ajuda contextual para explicar regras/IA.

A substituição seleciona o alvo e exige “Substituir e ativar nova versão”. Revalida conta, prazo e snapshot da ficha ativa antes do envio, preserva dia/posição/programação dos demais exercícios e começa a carga do novo movimento em zero. Cancelamento/saída descartam a intenção; clique repetido e confirmação perdida não criam outra versão no reenvio examinado.

Duas variações próprias de extensão de punho foram adicionadas com quatro posições originais, manifesto, hashes e texto PT-BR. Coleção:169IDs/334posições/60WebPs,3.542.858bytes; catálogo712(708RepDB+4FOCO). As imagens anteriores não foram reprocessadas. Ver `docs/FOCO_HUMAN_WRISTS_2026_11_18.md`.

- Lint/build, UI/UX, motion, FOCO PRO, contrato da sessão e ativos da marca aprovados.
- Testes unitários de mensagens de erro e substituição aprovados; regressões de mídia por ID e PT-BR aprovadas. Matriz de108contextos do gerador encontrou mídia humana exata em todas as escolhas examinadas, sem representar estatística real de uso.
- Quinze cenários de marca aprovados; os novos checks confirmam foco e contraste nas quatro larguras, título curto, espaço útil para a ilustração e movimento no destaque.
- Browser de texto: respostasHTTP500semcorpo na montagem/importação/revisão mostram recuperação acionável e conservam as prévias testadas.
- Browser de substituição em320/390/768/1440px aprovado: seleção, confirmação, cancelamento, falha/retry, ficha alterada, duplo clique e resposta perdida. Quatro movimentos por dia e prescrições dos demais exercícios preservados; confirmação sem violaçõesAxe na largura390.

### Pendente de validação

Na abertura do PR: conclusão da revisão ampliada de telas, CI e entrega do artefato público. Resultados finais da publicação ficam no registro da entrega e nos workflows do PR. Aparelhos físicos, Safari/iOS, leitor de tela real e parecer biomecânico continuam sem verificação física nesta rodada.

### Não iniciado

Não faz parte desta entrega expandir os demais movimentos sem mídia humana, criar animações ou alterar o backend, histórico ou motor de treino. Todos os testes de interface usam dados sintéticos e não gravam na conta real.
