# FOCO Anatomy Engine v3 — geração e publicação segura

## Objetivo

Uma prancha anatômica **individual para cada um dos 254 exercícios** dos 15 arquivos JSON.
O projeto usa `exercise.id` como chave estável; jamais associa uma imagem a um exercício apenas por semelhança parcial do nome.

O padrão aprovado pelo design:

- Figura atlética adulta neutra, representação de musculatura de superfície em 3D.
- Equipamento do exercício exato, preto ou cinza, com posicionamento plausível.
- Parte superior: posições **inicial** e **final** grandes, com mesma câmera/equipamento.
- Parte inferior: vistas frontal, posterior, lateral e ampliação de músculos relevantes.
- Peitoral/primários em grafite `#101010`; secundários em `#555555`; outros em cinza `#D9D9D9`.
- Fundo branco `#FFFFFF`, nenhuma cor, nenhum texto dentro da imagem.
- Formato final: **um atlas 16:9 em alta resolução por exercício**, exibido pelo app somente depois de aprovação humana.

## Estado atual e controles

`public/anatomy/v3/manifest.json` tem 254 exercícios cadastrados, inicialmente como `pending`. A presença de um registro nesse arquivo **não significa** que a imagem já foi gerada.

| Estado | Significado | Aparece no aplicativo? |
|---|---|---|
| `pending` | Aguardando geração | Não |
| `needs_review` | Arquivo criado, aguardando inspeção | Não |
| `rejected` | Reprovado por erro visual ou anatômico | Não |
| `approved` | Arquivo conferido com revisor e hash | Sim |

O aplicativo mantém uma **foto legada claramente rotulada** enquanto não houver atlas aprovado, preservando o conteúdo educativo. Para imagens não encontradas, mostra um estado neutro de indisponibilidade. Esse fallback não é uma validação de precisão biomecânica.

## Gerar sem custos (padrão seguro)

```bash
npm install
npm run anatomy:generate -- --max-images=254
npm run anatomy:generate -- --group=01_peito --max-images=12
npm run audit:anatomy
```

A operação padrão cria `anatomy-generation-plan.json` com todos os prompts e **não chama API de imagem**.

## Geração real usando Google Gemini

A sintaxe abaixo inicia requisições reais e possivelmente **pagas**:

```bash
export GEMINI_API_KEY="sua-chave-secreta"
npm run anatomy:generate -- --execute --accept-costs --group=01_peito --max-images=12
```

Também é possível gerar um exercício:

```bash
npm run anatomy:generate -- --execute --accept-costs --id=peito_supino_reto_barra --max-images=1
```

Para usar a referência de identidade visual aprovada:

```bash
npm run anatomy:generate -- --execute --accept-costs --id=peito_supino_reto_barra --max-images=1 --reference=/caminho/da/referencia.png
```

Recomendação: começar com **1–3 imagens para controle de qualidade**, sem disparar a coleção de 254 de uma vez. O script grava imagens em `public/anatomy/v3/{exercise_id}.png` (ou `.jpg/.webp` conforme o formato retornado), registra modelo, hash SHA-256 e marca como `needs_review`.

**O script não conhece o preço real** do serviço escolhido. A flag `--max-images` limita a quantidade de pedidos, não o valor cobrado por imagem. Consulte cotação, limites, licenças e termos do provedor antes de iniciar uma execução paga. A chave API nunca deve aparecer em commits nem no frontend.

### Via GitHub Actions

A ação manual **FOCO - Generate anatomy atlases** oferece modo `PREVIEW` e modo `I_ACCEPT_COSTS`. O modo pago exige configurar o segredo `GEMINI_API_KEY` no repositório. O arquivo gerado fica em uma branch separada `anatomy-review-output` para revisão, nunca entra automaticamente na versão pública.

## Revisão anatômica

Um profissional humano competente deve verificar por imagem:

1. Correspondência com o **exercício e sua variação exata**.
2. Equipamento e biomecânica: alavancas, pegas, amplitude, trajetória, apoio de pés/coluna.
3. Músculos primários/auxiliares corretos; sem destaque sobre músculos ocultos.
4. Sem mãos, articulações, braços ou pernas distorcidos.
5. Mesmo personagem e perspectiva nas duas posições.
6. Visibilidade dos músculos e qualidade legível em celular e desktop.

Somente após validar e adicionar a imagem ao branch atual:

```bash
npm run anatomy:generate -- --approve=peito_supino_reto_barra --reviewer=Nome-Responsavel
npm run audit:anatomy
npm run lint
npm run build
```

Para rejeitar:

```bash
npm run anatomy:generate -- --reject=peito_supino_reto_barra --reviewer=Nome-Responsavel --review-note=Falha-de-biomecanica
```

A revisão deve ser feita sobre a **imagem individual em resolução plena**. Pôsteres com muitos exercícios e texto gerado por IA não são substitutos aceitáveis: texto pode conter erros, movimentos ficam pequenos e as fases perdem legibilidade.

## Cobertura e integração

- Fonte de verdade: `public/01_peito.json` ... `public/15_funcionais_e_cardio.json`.
- Manifestações de exercícios são gerenciadas por `public/anatomy/v3/manifest.json`.
- `src/data/anatomyAssets.ts` resolve somente `status=approved`.
- `src/components/ExerciseIllustration.tsx` mostra atlas aprovado ou a versão legada explicitamente identificada, com zoom em tela cheia.
- `scripts/audit-anatomy-v3.mjs` valida 254 IDs e caminhos de arquivos aprovados.
- `.github/workflows/validate.yml` roda verificações de compilação, cadastro e prompts, sem gerar imagens pagas.

**Limite técnico:** produzir 254 imagens de qualidade e aprová-las exige uma rotina efetiva de processamento/revisão — o código, o plano de prompts e um pôster de referência não são 254 arquivos visuais prontos.
