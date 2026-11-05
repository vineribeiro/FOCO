# Regra ativa de mídia — FOCO 2.3
A **ExerciseDB/AscendAPI é a ÚNICA fonte de catálogo, GIF e demonstração de exercícios** para a interface. Não reativar FOCO curated grid, ExercisePhaseGallery, RepDB ou SVGs antigos como fallback. Os treinos persistidos e os dados técnicos internos necessários ao motor/compatibilidade são exceções: não deletar nem substituir dados reais do usuário. GIFs e metadados da API não devem ser baixados em massa nem persistidos; atribuir AscendAPI, obedecer uso não comercial.

# Atualização de escopo — 05/11/2026
**FOCO é agora um projeto pessoal NÃO COMERCIAL. Não existe lançamento de venda previsto para 2027.** Respeitar licenças e atribuições, incluindo a ExerciseDB OSS. A galeria externa é exclusivamente de leitura em tempo real e não pode persistir dados de terceiros. Essa decisão prevalece sobre referências antigas de plano comercial em documentos históricos.

# FOCO — Regra de desenvolvimento para agentes

Leia `PRODUCT.md` e `DESIGN.md` antes de propor mudanças. O FOCO está em **beta real não comercial**. Aplicar os critérios técnicos de qualidade independentemente de haver venda; o documento histórico `docs/FOCO_PRO_2027.md` não representa um plano atual de comercialização.

## Skill principal e arbitragem
- **FOCO PRO (obrigatória neste projeto):** `.agents/skills/foco-pro/SKILL.md`. Ela escolhe as disciplinas e impede regras conflitantes.
- **Auditoria de interface:** `.agents/skills/better-interface/SKILL.md`.
- **Acessibilidade:** `.agents/skills/better-accessibility/SKILL.md`, antes de efeitos.
- **Layout:** `.agents/skills/better-layout/SKILL.md`.
- **Tipografia:** `.agents/skills/better-typography/SKILL.md`.
- **Cores e contraste:** `.agents/skills/better-colors/SKILL.md`.
- **Copy e erros:** `.agents/skills/better-writing/SKILL.md`.
- **Superfícies, ícones e polimento:** `.agents/skills/better-ui/SKILL.md`.
- **Reprodução de referências aprovadas:** `.agents/skills/build-design/SKILL.md`.
- **Estados e stress:** `.agents/skills/state-machine/SKILL.md` e `.agents/skills/break/SKILL.md`.
- **Motion:** `.agents/skills/motion-design/SKILL.md` e `docs/FOCO_MOTION_SYSTEM.md`.
- **Impeccable:** processo de direção de design, se CLI/harness instalado. `PRODUCT.md` e `DESIGN.md` contêm o contexto, mas **não** afirmam que `impeccable init` ou hooks rodaram.
- **Hue:** referência sob demanda para evoluir o design system; propostas precisam preservar a marca aprovada.
- **Taste e Hallmark:** não redesenhar o app autenticado. São opcionais para LP comercial e auditoria visual específica.
- **Craftwork:** somente assets com licença auditada; não instalar wizard/MCP nem acessar contas automaticamente.

## Precedência
1. Segurança, dados verdadeiros, privacidade e acessibilidade.
2. Comportamento esperado, referência validada e a experiência em academia.
3. `PRODUCT.md`, `DESIGN.md`, `src/foco-pro-tokens.css`.
4. Revisor especializado dono do domínio; motion-design decide apenas timing/choreography.
5. Ferramentas externas apenas sob demanda, sem sobrepor marca ou decisões de produto.

## Processo obrigatório
Definir fluxo/estado e impacto → branch/PR → implementar sem alterar backend sem necessidade → `npm run lint` → `npm run build` → `npm run test:ui-ux` → `npm run test:motion` → `npm run test:pro-quality` → visual QA com dados sintéticos → testar em dispositivos reais quando aplicável.

Nenhum gerador pode criar resultados, depoimentos, contagens, arquivos de terceiros ou promessas clínicas fictícias. Nunca commitar secrets. Nenhuma modificação visual pode perder rascunhos/séries em andamento. Diferencie **FOCO em Casa**, **Exercícios complementares** e **Cardio**.

Outros detalhes: `docs/FOCO_SKILLS_DECISIONS.md`, `docs/FOCO_PRO_TEST_MATRIX.md`.

## FOCO 2.0: protagonistas e hierarquia sem conflitos
Cada mudança de interface **deve** começar por `foco-pro`, que arbitra a atividade e escolhe um líder técnico:
1. **Impeccable (modo Operate):** direção de UX do app autenticado; aplicar `.agents/skills/impeccable/SKILL.md` e `reference/mode-operate.md` quando compatíveis com `DESIGN.md`.
2. **Hue:** linguagem visual derivada do FOCO, apenas ao propor alterações de `DESIGN.md` ou tokens; `.agents/skills/hue/SKILL.md`.
3. **Jakub (better-*):** dono dos critérios concretos de acessibilidade, layout, cor, tipografia, copy, componentes e estados.
4. **LottieFiles Motion:** dono do timing e das microinterações funcionais; `.agents/skills/motion-design/SKILL.md`.
5. **Taste + Hallmark:** líderes somente na futura landing page e comunicação comercial, **não** dentro da tela de registro de treino.

Quando recomendações divergirem: integridade e segurança de dados > ergonomia e WCAG > design aprovado > tokens > timing > gosto e decoração. Propostas de Hue/Impeccable não podem substituir a identidade FOCO automaticamente; nenhuma skill de marketing tem autoridade para tornar o app operacional "uma seção por tela".

Impeccable, Hue, Taste e Hallmark estão versionados em **subconjuntos documentais**, com licença na respectiva pasta. Binários, scripts, browsers, MCPs e instaladores globais **não** foram executados nem configurados por isso. `docs/FOCO_2_0_DELIVERY.md` distingue o que funciona daquilo que ainda falta.
