# FOCO Visual 2.1 — mudanças verificáveis

## Motivação
Feedback da beta em 05/11/2026: as últimas versões não apresentavam diferença visual perceptível, apesar dos commits. As mudanças 2.0 foram principalmente de regras de projeto, QA, ajustes locais e ações ocultas em telas secundárias. É incorreto chamar isso de redesenho completo.

## Diferenças visíveis desta entrega
**Home**
- Cabeçalho dividido em marca + assinatura "TRAINING SYSTEM / BETA" e selo clicável `V2.1`.
- Tipografia do cumprimento e nome significativamente maiores.
- Faixa de atividade semanal mostrando **somente métricas reais** de sessões registradas e meta existente.
- Hero maior, com borda e iluminação novas, foto preservada e hierarquia diferente para título e CTA.
- Semana em módulo próprio e quatro atalhos como cartões verticais com ícones em superfícies destacadas.
- FOCO em Casa, cardio, OKOK e exercícios complementares permanecem acessíveis.

**Treino**
- Indicador `FOCO 2.1` ao lado do estado da sessão.
- Card do exercício reconstruído em palco visual, título e legenda separados, botão de execução com rótulo.
- Tratamento com blend multiply apenas nas ilustrações claras (RepDB/Atlas) sobre o fundo escuro; fotos de exercícios permanecem fotografias.
- Bloco de progresso da série, tabs, carga/repetições e descanso com nova escala tipográfica, borda e material.
- CTA permanece no fluxo, sem cobrir descanso ou navegação; tempo de treino e funcionalidade de registro preservados.

**Identificação e cache**
- `src/utils/release.ts` centraliza `2.1` e data de 05/11/2026.
- Preferências informam a versão correta.
- `public/sw.js` muda para `foco-shell-20261105-v21`, invalidando somente caches antigos de assets da PWA e mantendo o histórico no servidor e o armazenamento do usuário.
- `public/atualizar.html` mantém atualização voluntária, sem recarregar automaticamente no meio do treino.

## Testes e limites
- `scripts/test-pro-quality.mjs` exige release, CSS carregado, marcadores e cache novos.
- `scripts/test-visual-internal.mjs` exige rótulo V2.1, geometria nova, mídia isolada e ausência de sobreposição do CTA, nos viewports sintéticos 320/390/768/1440px.
- Playwright captura telas em `.png` na execução de QA, mas isso ainda não certifica qualidade subjetiva nem o render em um Android específico.
- Não se declara "100% fiel" a nenhum mockup sem comparação em aparelho e aprovação do usuário.

## Fluxo de verificação do usuário
1. Em **Início**, procurar o selo **V2.1** no topo direito e o novo bloco "ESTA SEMANA".
2. Em **Treinar**, procurar **FOCO 2.1** junto ao título, card do exercício com título legível e controle de descanso abaixo das séries.
3. Caso o selo não apareça, **depois de salvar o treino em andamento**, abrir `https://vineribeiro.github.io/FOCO/atualizar.html` e tocar **Atualizar FOCO agora**.
4. A ausência do selo significa que a versão anterior continua renderizada; nesse caso, investigar cache/instalação, não prometer que a mudança já está sendo vista.
