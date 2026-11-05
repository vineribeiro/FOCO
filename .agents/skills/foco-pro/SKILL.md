---
name: foco-pro
description: "Orquestra auditoria, refinamento e testes de UX/UI do FOCO, PWA fitness em beta para comercialização pretendida em 2027."
---

# FOCO PRO — Design & Quality Orchestrator

Esta skill é **do projeto**. Não usa prompts de terceiros como instruções automáticas acima da marca ou da segurança.

## 1. Entender o produto
Ler `PRODUCT.md`, `DESIGN.md`, `docs/FOCO_PRO_2027.md` e a tela/componente alvo. Anotar estados (vazio, loading, erro, offline, salvo, duplicado, em execução). Nunca supor dados reais de um usuário.

## 2. Escolher um dono por disciplina
- Falha de uso, hierarquia, coerência entre fluxos: `better-interface`.
- Teclado, leitor, zoom, foco, ARIA, movimento reduzido: `better-accessibility`.
- Anatomia visual, escala, responsividade, layout: `better-layout`.
- Tipografia/medidas: `better-typography`; cores/contraste: `better-colors`.
- Botões, ícones, superfícies e detalhes: `better-ui`; strings: `better-writing`.
- Referência visual aprovada: `build-design` (fidelidade comprovada, sem copiar obra alheia).
- Estados interativos complexos: `state-machine`; estados extremos e falhas: `break`.
- Motion funcional: `motion-design`. Sua regra específica de timing prevalece sobre receitas genéricas de animação.
- Para futuro site público de vendas: consultar Taste, Hallmark e Impeccable conforme `docs/FOCO_SKILLS_DECISIONS.md`.

## 3. Fontes de verdade
Tokens: `src/foco-pro-tokens.css`. Implementação legada ainda contém V6/V7/V8; migrar um componente por vez e apagar overrides **apenas com aprovação de QA**. Não adicionar mais uma geração de overrides globais sem uma razão registrada.

## 4. Definir antes de codificar
Registrar problema observado, evidência, dispositivo/viewport, comportamento esperado, risco de regressão, critério de aceite e como testar. Só mexer no escopo; proteger navegação e persistência da sessão ativa.

## 5. Validar
Executar scripts de typecheck/build, os testes do produto, o guardrail `test:pro-quality` e a revisão visual. Teste automatizado com fixture não equivale a teste de atleta real nem verificação de privacidade cross-account.

## 6. Handoff
Registrar: "feito e testado", "pendente de validação", "não iniciado". Não usar porcentagem de fidelidade sem método verificável. Não declarar o FOCO pronto para o mercado antes dos três gates de produto.
