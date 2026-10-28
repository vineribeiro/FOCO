# FOCO V4 — checklist de qualidade e aceite

Referência: [FOCO_UI_V4_DESIGN_SYSTEM.md](./FOCO_UI_V4_DESIGN_SYSTEM.md).

## Testes automatizados
O fluxo de PR `Validate FOCO TypeScript` executa:
- `npm run lint` (TypeScript);
- `npm run build` (Vite);
- `npm run audit:images`;
- `npm run audit:anatomy`;
- `npm run test:anatomy-review`;
- `npm run audit:anatomy-review-public`;
- `npm run anatomy:generate -- --max-images=254` (validar prompts sem gerar imagens).

Uma compilação verde **não substitui** verificar manualmente funcionalidade e layout em diferentes celulares.

## Inspeção visual obrigatória
Testar em 390×844, 430×932, 768×1024, 1440×900.
- O cabeçalho exibe apenas o logo FOCO e avatar no mobile.
- A barra inferior tem exatamente: Início, Treino, Avaliação, Biblioteca, Perfil; sem sobreposição ao conteúdo ou à safe area.
- Home: hero com overlay claro, saudação, avaliação OKOK, três indicadores reais, semana, quatro ações rápidas; sem números fictícios.
- Sessão: progresso, cronômetro, imagens de duas fases lado a lado quando disponíveis, técnica, séries editáveis, botão de concluir.
- Avaliação: upload PDF/JPG/PNG/WebP; resumo e medições reais de arquivo processado; novo upload acessível e consentimento antes de usar dados na ficha.
- Nova ficha: hero com fotografia mono, quatro cards informativos ligados aos controles, campos completos, foco muscular, proposta de IA e preview de semana somente se existirem dias gerados.
- Biblioteca, Perfil, Progresso, Preferências e Minhas fichas usam os mesmos tokens sem perder as ações anteriores.

## Fluxos de ponta a ponta (exigem conta de teste)
1. Criar conta/entrar/sair; navegação preserva sessão. Nenhuma credencial de teste deve ser incorporada ao app.
2. Preencher anamnese; gerar ficha sem avaliação OKOK e com consentimento explícito para incluir relatório.
3. Subir avaliação OKOK válida, receber análise por IA, voltar ao painel e conferir indicadores; atualização vence em 15 dias.
4. Reabrir avaliação com histórico presente, usar ação “Enviar avaliação OKOK”, enviar outro relatório e conferir nova data.
5. Abrir ficha, iniciar sessão, ajustar carga/repetições, concluir séries, acionar descanso e salvar; recarregar a tela antes de concluir para conferir restauração do rascunho.
6. Verificar imagem RepDB de exercício com duas fases e licença visível, e fallback de movimento sem correspondente.
7. Instalar PWA pelo botão em Configurações, confirmar ícone e navegação.
8. Verificar estado sem ficha, sem avaliação e com APIs indisponíveis.
9. Teclado e leitor de tela: foco visível, rótulos de botões, controles de 44px e sem scroll horizontal na página (exceto semana e tabelas explicitamente roláveis).

## Lacunas de aceite
- O layout no navegador autenticado não foi fotografado automaticamente; precisa de captura visual em dispositivos reais antes de afirmar fidelidade 100%.
- As fotos de herói são Unsplash e apenas decorativas; não são as mesmas imagens renderizadas nos mockups conceituais.
- O relatório OKOK continua sendo analisado pela infraestrutura atual; a camada de UI não altera regras de interpretação biomédica.
- O recurso push com app fechado foi adiado pelo proprietário e não faz parte deste escopo.
- Elementos visuais da proposta aparecem de acordo com dados reais; não preencher com números nem status inventados só para coincidir com a referência.
