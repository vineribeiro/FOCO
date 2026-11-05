# Auditoria de skills para FOCO (05/11/2026)

## Contexto
O FOCO é uma PWA fitness com fluxo de registro de treino e dados pessoais. Estas ferramentas são **instruções para agentes**, não recursos que surgem automaticamente para usuários. Adicionar skill ≠ instalar biblioteca de animação ≠ desenhar telas ≠ homologar produto.

| Ferramenta | Papel e decisão | Uso permitido | Conflito evitado |
|---|---|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | **Orquestrador de design**; configuração de contexto reproduzida em PRODUCT.md e DESIGN.md | Critique/audit/polish com execução local quando CLI estiver disponível | Não copiar o design da própria ferramenta ou tratá-la como runtime do FOCO |
| [Hue](https://github.com/dominikmartn/hue) | **Referência de sistema visual**; usar apenas para atualizar o `DESIGN.md` | Gerar propostas a partir da identidade FOCO aprovada | Não redefinir tokens aprovados por automação |
| [Jakub Krehel](https://github.com/jakubkrehel/skills) | **Revisores especializados**; subconjunto versionado | Acessibilidade, layout, tipografia, cores, copy, UI, interface e design fiel | Um único dono por disciplina; não aplicar presets concorrentes |
| [LottieFiles Motion](https://github.com/LottieFiles/motion-design-skill) | **Manter skill instalada** | Entradas, feedbacks, acessibilidade; `src/foco-motion.css` | Não duplicar motion engine nem criar animações decorativas |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | **Adiar para LP de marketing** | Landing page comercial, quando houver brief, imagens licenciadas e evidências | Regra "uma seção por tela" não cabe em app de treino |
| [Hallmark](https://github.com/nutlope/hallmark) | **Auditoria editorial pontual** | Revisar campanha/LP, sem aplicar automaticamente um tema | Conflitos com identidade e interface operacional |
| [Craftwork Wizard](https://craftwork.design/mcp) | **Não instalar `--all` automaticamente** | Buscar assets comerciais após verificar conta, licença, consentimento e escopo | O wizard pode alterar configuração global de agentes/MCP; assets podem depender de plano/licença |

## Instalação e escopo
- `$impeccable init` é comando **de um agente Codex com Impeccable instalado**, não comando de terminal. Instalação oficial: `npx impeccable install`. Os arquivos `PRODUCT.md` e `DESIGN.md` deste PR foram criados manualmente a partir do código, sem afirmar que o binário/hook foi executado.
- `npx skills add nutlope/hallmark -g.` contém ponto final indevido; para instalação global é `npx skills add nutlope/hallmark -g`. **Não instalar globalmente num projeto compartilhado.**
- O clone `~/.agents/skills/hue` afeta a estação do desenvolvedor. A referência fica documentada até haver uso concreto.
- `npx -y @craftwork-design/wizard@latest add --all` instala skill para agentes detectados; configurar o MCP é etapa distinta. Não conectar contas, aceitar termos ou baixar assets premium sem autorização.
- As instruções de Jakub instaladas no repositório são cópias de texto e referências para agentes; nenhum script de terceiros é executado em CI.
- Instalação local e configuração de hooks externas a este PR continuam **pendentes** quando exigirem acesso ao computador/cliente do desenvolvedor.

## Licenciamento
- Jakub Krehel: MIT, manter licença e atribuição. LottieFiles: MIT. Hue: MIT. Hallmark: MIT. Taste Skill: MIT. Impeccable: Apache-2.0; não redistribuir seus binários como se fossem próprios.
- Licença de **skill** não licencia automaticamente imagens, fontes ou assets gerados/baixados pela ferramenta.
- A marca FOCO e materiais do próprio usuário são sempre prioritários; registrar origem, licença, autorização e atribuição de imagens/ícones/ilustrações externos antes do lançamento.

## Prioridade técnica (produto 2027)
1. Consistência da jornada e fluxo de treino sem perdas.
2. Autenticação/privacidade, proteção da API, integridade e confirmação real dos dados.
3. Auditoria WCAG 2.2 AA, variações de estado, performance mobile.
4. Fidelidade do layout às referências e identidade FOCO.
5. Microanimações, ilustrações e assets premium.
6. LP de venda, preço/assinatura e experiência comercial somente com requisitos definidos.

## Processo
Cada PR declara qual skill governa a mudança, que arquivos foram alterados e que testes provaram o resultado. Nenhum benchmark, automação ou política aqui representa uma homologação independente de segurança, proteção de dados ou acessibilidade.

## 05/11/2026 — Integração documental de quatro skills adicionais
As pastas `.agents/skills/impeccable`, `.agents/skills/hue`, `.agents/skills/taste-skill` e `.agents/skills/hallmark` agora contêm seus `SKILL.md`, **referências selecionadas** e cópias das respectivas licenças. Isto é uma instalação **de instruções versionadas para agentes**, não do pacote de linha de comando completo. Links e atribuição preservados.

- Impeccable: autoriza consultoria de UX, navegação e polimento do aplicativo, respeitando `DESIGN.md`; seu launcher `scripts/impeccable` **não** foi incluído nem executado.
- Hue: documenta criação de linguagem visual, mas mudar logo/paleta/tema exige avaliação de design e comprovação em UI.
- Taste/Hallmark: exclusivos de superfícies de aquisição/venda; não injetar JavaScript, templates, imagens ou dependências deles no treino.
- Jakub + Lottie: continuam responsáveis por verificações concretas e movimento; sem qualquer motor de animação adicional no runtime.
- Craftwork: permanece não instalado; requer auditoria dos assets comerciais e eventual conta/permissão.

Critério para declarar algo "implementado": código executável, CI verde e verificação visual/funcional. Critério para declarar "pronto para vender": gates de segurança, acessibilidade, licenças e beta real documentados.
