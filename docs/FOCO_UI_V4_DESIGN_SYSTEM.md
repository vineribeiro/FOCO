# FOCO / DESIGN SYSTEM V4 — PREMIUM MONOCHROME

**Fonte visual:** quatro mockups aprovados pelo proprietário em 28/10/2026: Início, Treino em andamento, Avaliação OKOK, Nova ficha. Referência de composição, não de dados de usuário.

## A · Identidade e sistema visual

**Princípio:** o treino é o centro do produto; a avaliação OKOK informa a personalização; a IA é uma camada funcional, não uma decoração. Linguagem editorial fitness premium, monocromática, forte e clara.

| Token | Valor | Uso |
| --- | --- | --- |
| Canvas | `#080808` | fundo da aplicação |
| Painel | `#151515` | cards e controles |
| Painel elevado | `#202020` | destaques |
| Borda | `rgba(255,255,255,.12)` | separadores discretos |
| Texto | `#F6F6F6` | títulos e métricas |
| Secundário | `#AAA` | legendas |
| Terciário | `#777` | dados auxiliares |
| Ação | `#F4F4F4` / `#0B0B0B` | CTA branco com texto escuro |
| Radius cards | 22–26 px | cards principais |
| Radius controles | 12–16 px | inputs e ações |
| Radius pill | 999 px | CTAs e tags |
| Grid | 4 px baseline, steps 8/12/16/24/32 | consistência |
| Tipo | Plus Jakarta Sans 400/500/600/700/800 | textos e interface |
| Dados | JetBrains Mono opcional | cronômetro e números tabulares |
| Altura toque | mínimo 44 px | botões mobile |

### Tipografia
- Logotipo FOCO do próprio repositório; não substituir a marca por texto genérico.
- Headline de página: 28–38 px, peso 800, tracking -0.04em.
- Nome de exercício: 24–30 px, peso 800.
- Headline de card: 18–24 px.
- Corpo: 13–15 px, line-height 1.5–1.65.
- Eyebrow: 10–11 px, uppercase, tracking 0.16em; uso limitado para rótulos.
- Métricas: 24–30 px, peso 800.

### Design de componentes
- **Hero**: fotografia esportiva em escala de cinza, overlay preto gradual, headline, metadados e CTA branco com ícone dentro de cápsula escura.
- **Painel**: fundo grafite, borda sutil, cantos 24 px e sombra de profundidade.
- **Indicadores**: tile compacto, ícone discreto, valor em destaque e legenda legível.
- **Lista semanal**: sete dias em scroll horizontal no mobile; não fabricar divisões musculares.
- **Avaliação**: relatório OKOK como fonte; dados só com medições realmente lidas; IA interpreta, sem diagnóstico.
- **Execução**: imagens início/fim do mesmo exercício, explicação, músculos e erros comuns; mantém registro de série e cronômetro.
- **Nova ficha**: objetivo, nível, frequência, equipamentos e prioridades; autorização explícita para usar OKOK; sem assumir que gerar IA = treino prescrito clinicamente.
- **Navegação**: 5 abas (Início, Treino, Avaliação, Biblioteca, Perfil); destinos avançados acessados por ações contextuais e desktop.
- **Estados**: carregar, vazio, sucesso, erro, sem avaliação, sem ficha, sem conexão; nunca preencher números fictícios.

### Responsividade e ergonomia
- 320–767 px: uma coluna, cards em grid 2–3 quando houver espaço, bottom nav fixa e safe-area.
- 768–1199 px: sidebar + conteúdo 2 colunas, sem nav duplicada.
- 1200+ px: conteúdo até 1100 px, cards responsivos.
- Respeitar `prefers-reduced-motion`, focus ring e contraste; CTA com ao menos 44 px.
- Fotografia é decorativa; a interface deve funcionar com imagens bloqueadas.
- Não colocar controlos falsos; todo CTA deve abrir uma rota/ação existente.

## B · Mapeamento tela a tela

| Tela atual | Mockup | Mudança | Preservar |
| --- | --- | --- | --- |
| `DashboardPage` | Início | saudação, hero de treino, OKOK quinzenal, métricas, semana, ações rápidas | APIs de ficha, sessões, metas, lembrete |
| `ActiveSessionPage` | Treino em andamento | progresso, status de sessão, instrução principal, informação por movimento, séries claras | rascunho, edição de carga, séries, descanso, conclusão |
| `SheetUploadPage` | Avaliação corporal | prioridade visual ao upload OKOK, métricas em tiles, interpretação IA, ponte para ficha | upload seguro, análise, histórico, importação de ficha |
| `NewWorkoutPage` | Nova ficha | hero de IA, grade de opções, semana visual de prévia após geração, resumo de OKOK | formulário de IA/manual, consentimento, salvar |
| `BottomNavBar` | Todas | cinco destinos, ícones e marcador ativo | navegação app |
| `DesktopNav` | Todas | 5 ações principais e extras organizados | rotas secundárias |
| `App` | Todas | topbar premium, avatar, largura otimizada | AuthContext, sessão, rest HUD, rotas |
| `ExerciseExecutionGuide` | Treino | informações mais visíveis, separar imagens e técnica | mapeamento exato, segurança |
| Perfil/biblioteca/progresso | Continuidade | recebem tokens globais e ajustes pontuais | funcionalidades atuais |

## C · Sequência técnica de implementação

1. Base CSS + navegação global + header e componentes reutilizáveis.
2. Dashboard e jornada de avaliação/ficha.
3. Sessão de treino e guia de execução.
4. Alinhamento do formulário de geração e das telas secundárias.
5. Validação `tsc --noEmit` e build em Actions, fluxo de autenticação, upload, treino e responsividade.

## Critérios de fidelidade e aceite
- Comparar em 390 × 844 e 430 × 932 contra as quatro referências.
- O objetivo é reproduzir composição, contraste, tipografia, hierarquia e proporções; **não** reproduzir o frame de iPhone, relógio, valores inventados, avatar fictício ou fotografias não licenciadas.
- Componentes funcionais devem manter comportamento real, sem trocar integrações.
- Nem bioimpedância nem IA devem diagnosticar ou prescrever tratamento; dados sensíveis não entram em URLs, analytics ou imagens decorativas.
- Em ambiente GitHub Pages, deploy só é concluído após workflow verde. Verificação visual manual ainda é necessária antes da declaração de fidelidade total.

## Fontes visuais e licenças
- Fotos editoriais: Unsplash, uso permitido conforme https://unsplash.com/license (fotografia decorativa, nunca material técnico de execução). Créditos recomendados para autores.
- Imagens de execução: RepDB, fonte e atribuição existentes preservadas.
- Logotipo: componentes existentes em `src/components/FocoBrand.tsx`.
