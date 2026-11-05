# FOCO — Design System Canônico (projeto pessoal não comercial)

**Status:** identidade preservada, consolidação gradual em andamento. Este documento não aprova um redesenho geral.
**Fonte atual de valores:** `src/foco-v6.css`, `src/foco-v7-polish.css`, `src/foco-v8-fidelity.css`, `src/foco-motion.css`. A folha `src/foco-pro-tokens.css` declara a nova nomenclatura sem substituir telas existentes.

## Identidade
Marca FOCO, símbolo/assinatura de três traços angulares; asset: `public/assets/brand/foco-v6-reference-vector.svg`.
Conceito: **performance com clareza**. Personalidade: editorial, técnica, controlada, premium. O protagonismo é do treino e dos dados, não de reflexos ou brilho.

## Tokens semânticos de referência
| Papel | Valor de referência | Regra |
|---|---|---|
| Fundo | `#080A07` | Alto contraste, prioridade à leitura |
| Superfície | `#171B16` | Hierarquia visível sem cartões dentro de cartões |
| Acento | `#C8F040` | Ações primárias e seleção, não toda a interface |
| Texto | `#F7F8F4` | Informações críticas e títulos |
| Texto secundário | `#B5BEAF` | Somente quando contraste suficiente |
| Família principal | Poppins / Plus Jakarta Sans | Revisar escolha final e pesos; evitar três fontes em uma mesma tela |
| Mono/dados | JetBrains Mono / `tabular-nums` | Temporizadores, repetições, carga, distância |
| Raio dos cards | 20–24px conforme componente | Evitar variações gratuitas |
| Toque mínimo preferido | 44×44px | WCAG 2.2 AA exige critérios específicos; 44px é preferência ergonômica |
| Motion | 140/260/420ms | `docs/FOCO_MOTION_SYSTEM.md`, respeitar reduzido |

## Decisões por superfície
- **Operar, não persuadir:** Home autenticada, Sessão, Cardio, Agenda, Evolução, Perfil. Interação imediata e pouco ruído.
- **Persuadir:** futura página pública de lançamento/assinatura, criada em projeto/rota distintos. Taste/Hallmark podem orientar essa superfície, nunca reformatar a sessão ativa.
- **Herói principal:** treino do dia + CTA principal. Não sacrificar agenda, modalidades ou leitura pelo efeito fotográfico.
- **Liquid glass:** usar com parcimônia; blur como tratamento de superfícies pontuais, **nunca** reduzindo legibilidade ou causando lag.
- **Estado de verdade:** carregando, vazio, offline, salvando, erro, sucesso, sem credencial e dados parciais precisam de variantes claras e acessíveis.
- **Densidade de treino:** campos de séries e botões de próximo/pausar sempre utilizáveis em uma mão e na tela pequena.
- **Fotografia:** preferir assets licenciados/documentados; imagens externas não substituem imagens anatômicas precisas ou dados.
- **Marca:** somente imagens/logos próprios ou com licença validada para uso comercial.

## Hierarquia de regras e conflitos
1. Segurança, integridade dos dados e acessibilidade.
2. Requisitos reais do produto e referência visual aprovada.
3. Este `DESIGN.md` e tokens semânticos.
4. `motion-design` para movimento; `better-*` para revisão especializada.
5. Impeccable como processo de direção; Hue para propor atualização da linguagem visual, **nunca para redefinir a marca sem aprovação**.
6. Taste para futura LP; Hallmark para auditoria específica. **Não aplicar presets aleatórios dessas duas skills ao app.**
7. Craftwork apenas quando houver autorização de licença por asset, procedência verificada e necessidade real.

## Proibições
- Copiar layouts, imagens, logos ou marcas de referências.
- Trocar a cor do app sem trabalhar estrutura, composição, tipografia e componentes.
- Fingir métricas, citar depoimentos inexistentes ou simular persistência.
- Interromper uma sessão ao navegar, reiniciar timer sem intenção ou esconder erros do backend.
- Introduzir animação que prejudique ergonomia/tempo de resposta.
- Dependências externas ou assets premium não aprovados.

## Processo de aprovação de UI
Auditoria de estados → definição de um fluxo → referência e tokens → implementação → comparativos em 320/390/768/1440px → teclado/leitor → reduced motion → desempenho → teste com atleta real → assinatura para merge. Não afirmar fidelidade 100% sem validação visual.
