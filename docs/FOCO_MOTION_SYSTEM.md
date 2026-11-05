# FOCO — Motion Design System v1

## Integração e referência
- Skill: [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill), licença MIT.
- Cópia integral dos arquivos de orientação em `.agents/skills/motion-design/`. Essa skill orienta agentes; não injeta animações no aplicativo.
- O FOCO já utiliza a dependência `motion`; esta primeira fase utiliza CSS nativo, sem incluir player, mídia ou novas dependências de execução.
- Futuras alterações visuais devem consultar `.agents/skills/motion-design/SKILL.md` e seguir os princípios abaixo.

## Personalidade e parâmetros
**Premium**: motion discreto, preciso, previsível e funcional. Aplicar o acento verde ao estado sem movimento excessivo.
- Feedback tátil: 140 ms; elementos: 260 ms; destaque: 420 ms.
- Easing padrão: `cubic-bezier(.4,0,.2,1)`; entradas: `cubic-bezier(.2,0,0,1)`.
- Preferir `transform`, `opacity`, `border-color` e `box-shadow`. Evitar animar propriedades que provoquem layout thrashing.
- Não simular dados, contagem regressiva, progresso nem duração em animação.

## Onde aplicar
| Área | Solução | Prioridade | Status |
|---|---|---|---|
| Navegação entre páginas | Entrada breve sem bloquear a interação | P0 | Implementado |
| Home / Treino do dia | Hero prioritário, semana e atalhos em sequência curta | P0 | Implementado |
| Barra inferior | Estado ativo e resposta tátil | P0 | Implementado |
| Descanso entre séries | HUD entra apenas no início; dígitos estáveis | P0 | Implementado |
| Cardio | Destaque discreto ao rodar; feedback ao registrar | P0 | Implementado |
| Minha evolução | Entrada suave do gráfico real, sem alterar valores | P1 | Implementado |
| Séries concluídas | Checkmark apenas após sucesso no estado de dados | P1 | Próxima fase |
| Modais e formulários | Motion + auditoria de foco/Escape/teclado | P2 | Próxima fase |
| Login/onboarding | Identidade animada sem atrasar sessão | P2 | Próxima fase |
| Compartilhar treino | Story estático como base; exportações animadas futuras | P3 | Em avaliação |

## Não negociar
1. Respeitar `prefers-reduced-motion: reduce`, inclusive na splash e nos legados.
2. Manter áreas de toque, navegação por teclado, foco e semântica ARIA.
3. Não aplicar pulsos permanentes ao relógio; eles distraem e desperdiçam bateria.
4. Usar hover exclusivamente em dispositivos com ponteiro fino.
5. Não tocar em API, Supabase, treino, séries ou armazenamento local por motivos decorativos.
6. Testar 320–430px, desktop, preferências de acessibilidade e uso durante treino ativo.
7. Não chamar isso de 'animação Lottie' sem arquivo Lottie e player em execução.

## Verificação
`npm run lint`, `npm run build`, `npm run test:ui-ux`, `npm run test:motion` e teste visual manual antes de aprovar a publicação.
