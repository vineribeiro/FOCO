# FOCO 2.0 — Entrega incremental e rastreabilidade

Corte: 05/11/2026. Produto: beta real, comercialização planejada para 2027. Não confundir **skills de agente** com recursos instalados no celular.

## Estado por eixo — evidência, não marketing
| Eixo | Resultado desta PR | Estado | Próximo aceite |
|---|---|---|---|
| 1. UI 2.0 | Tratamento compartilhado de cores, bordas, exercício ativo e leitura do gráfico | **Parcial implementado** | Consolidar CSS legado V6/V7/V8 em componentes reutilizáveis e comparar telas aprovadas |
| 2. Liquid Glass | Superfícies atuais preservadas; preferência para reduzir transparência e fallback sem blur | **Ampliado** | Medir legibilidade/performance em celulares intermediários |
| 3. UX dos treinos | Prévia limpa, progresso por toque de 44px, última carga efetivamente registrada reutilizável sob comando | **Implementado nesta fase** | Provar salvamento/restauração com rede instável e ajuste de carga no treino real |
| 4. Motion Design | Sistema LottieFiles existente mantido e comportamento de redução de movimento respeitado | **Mantido** | Inspecionar transições físicas em dispositivos reais |
| 5. Anatomia visual | Card principal deixa de embutir galeria, legenda, troca de fases e zoom; guia segue na aba Execução | **Correção implementada** | Validar fotos/atlas de vários exercícios, licença e rigor técnico |
| 6. Evolução corporal | Novo resumo de 30 dias a partir de dados salvos, sobre gráficos já existentes | **Ampliado** | Comparação por grupo muscular e medidas usando fontes auditadas |
| 7. Personalização | Espaçamento compacto/confortável e transparência equilibrada/reduzida, salvos por navegador | **Implementado nesta fase** | Sincronizar preferência por conta somente se houver requisito/consentimento |
| 8. FOCO Intelligence | Insights estritamente descritivos; carga anterior como sugestão de preenchimento, jamais prescrição | **MVP explicável** | Validar recomendações adaptativas e segurança com especialista; nunca prometer recuperação muscular sem dados |
| 9. Compartilhamento | Resumo textual voluntário de 30 dias; Story de treino já existia | **Ampliado** | Templates de Story com prévia, exportação e licenciamento do material |
| 10. Experiência PRO | Novo erro acionável no histórico com retry, accordion acessível, preferências; testes e critérios de aceitação | **Parcial implementado** | Onboarding beta, suporte, privacidade e assinatura/pagamento depois da homologação |

## Bug da tela de treino (relato do usuário)
**Antes:** imagem do Leg Press dentro de `ExerciseIllustration` na modalidade completa, causando fundo claro, legenda, zoom e controles sobre o título e a figura.
**Depois:** `ActiveSessionPage.tsx` usa a variante editorial de mídia; o usuário ainda acessa execução detalhada pela aba Execução e botão de demonstração. `foco-v2-experience.css` isola a ilustração, reserva a área do título e amplia alvos de progresso.
**Teste automático:** `scripts/test-visual-internal.mjs` navega da imagem de supino para um exercício de outro grupo e verifica ausência de controles/legendas dentro da imagem. Teste em um Leg Press real em Android ainda necessário.

## Instalação das skills
- Já existentes: `foco-pro`, 10 módulos Jakub + referências e `motion-design` LottieFiles.
- Adicionadas: `impeccable`, `hue`, `taste-skill`, `hallmark` com `SKILL.md`, referências selecionadas e arquivos de licença.
- Orquestração e arbitragem em `AGENTS.md` e `.agents/skills/foco-pro/SKILL.md`.
- **Limite explícito:** sub-conjuntos documentais versionados; binários do Impeccable, dependências completas de Taste/Hallmark, scripts do Hue, Craftwork Wizard, acessos premium e MCPs não foram instalados. Não executar código de terceiro sem análise de segurança/licença.
- Não é permitido que uma skill mude UX do treino ativo apenas por uma heurística própria de marketing.

## Qualidade e integridade
CI exige TypeScript, build, regressões de treino e segurança, UI/motion, `test:pro-quality`, `test:v2` e inspeção Playwright em viewports com dados sintéticos.
Testes com fixtures demonstram UI e rotas, **não provam** isolamento de contas, conformidade legal, eficácia fisiológica, licenciamento de imagens, nem resiliência com usuários reais.
A liberação comercial segue `docs/FOCO_PRO_2027.md`.
