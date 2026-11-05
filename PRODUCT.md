# FOCO — Product Context

<!-- Fonte de verdade do produto para agentes de design. Revisão inicial: 2026-11-05. -->
## Plataforma
Aplicativo web responsivo/PWA, React + TypeScript + Vite, frontend no GitHub Pages e API conectada ao Supabase. O repositório também contém servidor Node legado; **não assumir que ele é o backend publicado** sem verificar o ambiente.

## Estágio
**Projeto pessoal não comercial em beta real. Não há lançamento comercial planejado.**
Não chamar de produção comercial nem prometer conformidade, eficácia clínica, integrações ou disponibilidade sem evidência de teste.

## Usuários
Pessoas que desejam organizar e registrar sessões de treinamento resistido ou cardiovascular, acompanhar metas e progresso e personalizar treinos. Diferentes níveis de familiaridade com academias, dispositivos móveis e limitações físicas. Não pressupor que dados, objetivos ou limitações de um usuário sejam padrão para todos.

## Tarefas essenciais
1. Criar conta, autenticar e concluir anamnese com clareza sobre dados pessoais.
2. Conferir a ficha semanal, abrir o treino do dia, iniciar a sessão, registrar séries, carga e repetições.
3. Pausar/retomar descanso, substituir exercícios preservando histórico e finalizar sessão com confirmação real.
4. Registrar cardio independente da agenda de musculação e revisar o histórico.
5. Acompanhar evolução, inclusive relatórios corporais enviados, distinguindo dados informados de dados derivados.
6. Usar **FOCO em Casa** (aulas guiadas) separadamente dos **Exercícios complementares** (vacuum, mobilidade, core etc.).
7. Atualizar perfil, revisar preferências, exportar/excluir dados quando essas funções estiverem efetivamente disponíveis.

## Posicionamento
Ferramenta de organização e acompanhamento de treinos com personalização, UX clara, identidade visual forte e controle pelo usuário. Não se apresentar como substituto de avaliação profissional ou como serviço de diagnóstico.

## Compromissos
- **Verdade operacional:** nunca simular confirmação de salvamento, horários, métricas, recuperação, classificação corporal ou treino executado.
- **Segurança:** preservação de dados de uma sessão ativa, autorização por usuário, operações idempotentes quando aplicável e mensagens de erro acionáveis.
- **Autonomia:** editar ficha e exercícios, distinguir “apenas hoje” de “salvar sempre”, sem alterar calendário involuntariamente.
- **Privacidade:** avaliações e anamnese podem conter dados de saúde sensíveis. Reavaliar base legal, finalidade, consentimento quando aplicável, direitos dos titulares e segurança antes da comercialização.
- **Acessibilidade:** meta WCAG 2.2 AA, incluindo teclado, zoom, foco, alvos táteis e movimento reduzido; comprovação prática pendente.
- **Visual:** preservar linguagem escura editorial com acento lima e marca FOCO aprovada; não copiar telas de terceiros.
- **Performance:** treinar com uma mão, em ambiente de academia, sem bloqueios ou efeitos que ocultem controles.

## Fatos confirmados no código (não são garantias comerciais)
- Navegação própria (Home, sessões, agenda, progresso e perfil).
- Cadastro/login, ficha, histórico, cardio, exercícios complementares, aulas em casa, upload de avaliação e preferências.
- Frontend utiliza biblioteca `motion` e CSS; não há obrigação de instalar Lottie player.
- Existem fluxos de autenticação e exclusão de conta no código; testar ponta a ponta e cenários de falha antes de afirmar completude.

## Não objetivos desta etapa
Assinaturas/pagamentos, integrações wearables/OKOK automáticas, rastreamento médico, gamificação, conteúdo premium, promessas de IA e funcionalidades de sistema operacional não comprovadas. Tornam-se escopo apenas com definição de requisitos e testes.

## Critérios de sucesso da beta
Contas isoladas; operações de salvar/recuperar verídicas; nenhuma perda de treino; fluxo completo sem erros críticos; acessibilidade e responsividade verificadas; dados e alegações sustentados; checklist LGPD, licenças e segurança formalizado; usuários reais com consentimento para testes.

## Fonte dos princípios de design
`DESIGN.md`, `docs/FOCO_PRO_2027.md`, `docs/FOCO_SKILLS_DECISIONS.md`.
