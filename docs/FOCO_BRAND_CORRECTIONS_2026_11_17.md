# FOCO 3.7 — correções da auditoria de marca

Pedido autorizado: corrigir os 15 achados da auditoria de 17/11/2026 e publicar. Referência inicial: commit 03d3af1, FOCO 3.6. Direção visual preservada: DESIGN.md e foco-pro-tokens.css.

## Evidência e critérios antes da implementação

Auditoria local: 21 rotas (20 telas distintas), 320/390/768/1440 px, 168 cenários; 240 declarações de botão. Relatório de origem: work/branding-audit-2026-11-17/RELATORIO.md.

| Achados | Comportamento esperado e aceite |
| --- | --- |
| F01 | Texto legível no selo do perfil, ausência de OKOK e guia da sessão; contraste medido pelo Axe sem violações nesses estados. |
| F02 | Montagem e revisão descritas como regras FOCO; Personal descrito como assistente de dúvidas. Leitura de arquivos continua identificada como IA. |
| F03 | Falha de consulta na revisão oferece tentar novamente e não aparece como ausência de revisões. |
| F04 | Atalhos do perfil correspondem ao destino; dados corporais abre avaliação corporal. Não oferecer integrações/notificações inexistentes. |
| F05 | Densidade altera de fato os espaçamentos dos cartões. Retirar transparência sem aplicação na direção opaca atual. Preferência continua local. |
| F06–F08 | Abertura, atualização, reconexão, erro, metadados e ícones usam a marca atual. Build não recria ícones da paleta antiga. Release do atualizador sincronizado no build. |
| F09–F10 | Famílias/pesos corretos; componentes da biblioteca e diálogos com tokens. Botões primários, secundários, ícones, seleção e destruição distinguíveis. |
| F11–F12 | Nomes de destinos consistentes, modos de autenticação com título adequado, interface e complementares em PT-BR, mantendo IDs de mídia. |
| F13 | Autoria FOCO e RepDB descritas corretamente, mantendo a atribuição legal visível. |
| F14 | Cards exportáveis compartilham marca vetorial, paleta e fontes locais. Não publicar ou compartilhar automaticamente. |
| F15 | Botões de ícone com nome da ação e alvo de 44 px; mostrar senha não encobre a digitação. |

## Estados e riscos

Cobrir carregando, vazio, erro, reconexão, salvo, desabilitado, modal aberto, sessão em andamento, descanso, edição e proposta. Usar fixtures na fronteira HTTP; nenhum dado pessoal ou cota de IA real.

Maior risco: precedência do CSS legado após a folha canônica, especialmente as imagens e o painel claro da sessão. Migrar papéis de cor/tipo na folha do atlas, carregar antes do proprietário visual e verificar os enquadramentos da coleção existente. Evitar seletores que modifiquem todos os botões sem distinguir cartões e ações.

Outros riscos: regressão de rascunhos ao recarregar, renomear um movimento perdendo seu ID, confirmação de exclusão confundida com salvar, geração de PNG divergente do SVG. Não alterar contratos de persistência, IDs técnicos, histórico ou backend. Preservar os avisos de atualização sobre formulários ainda não salvos.

## Verificação e entrega

Branch: fix/foco-brand-consistency. Executar lint, build, ui-ux, motion, pro-quality; regressões de marca com dados sintéticos, acessibilidade, imagens e sessão; PR, CI e publicação. Atualizar este documento com resultados efetivamente observados e limitações.

## Feito e testado — 18/11/2026

Os 15 achados foram implementados na versão 3.7. O atualizador, a abertura, os avisos e a recuperação compartilham a marca; PNG/SVG e metadados são sincronizados no build. Ações destrutivas têm variante própria. Densidade tem efeito visível e persistente; transparência sem função foi retirada. Montagem/revisão são descritas como regras, enquanto o Personal e a leitura de arquivos mantêm a identificação de IA. Atalhos, títulos, tradução de complementares e créditos foram corrigidos.

- Lint/build e ui-ux/motion/pro-quality/session-contract aprovados; novo teste de ativos de marca aprovado.
- Auditoria visual com fixtures: 144 estados, incluindo todas as 21 rotas nas quatro larguras; nenhum overflow global, fonte fora das famílias aprovadas ou violação Axe nos estados examinados.
- Nova regressão de marca: 15 cenários aprovados, incluindo guia da sessão nas quatro larguras, contraste, ícones, falha/retry de revisão, destino corporal, densidade persistida, autenticação, exclusão, metadados e exportação PNG real 1080 × 1920.
- Regressões existentes: 13 casos de formulários/autenticação, 41 de layout/navegação e quatro larguras de montagem/Personal aprovados.
- Sessão/cardio: resposta perdida e reload preservam a identidade de reenvio; falha de armazenamento impede envio sem snapshot seguro.
- Coleção humana: 167 IDs, 330 posições e 59 WebPs com hashes preservados; player, biblioteca e cartões nas quatro larguras, incluindo fallback da mesma variação, aprovados no navegador.
- Motor por regras: 304 contextos validados; catálogo PT-BR, atlas e cache do Personal aprovados. Nenhuma escrita externa nem consumo real de IA nos testes de interface.

## Pendente de validação

Publicação aguarda CI e verificação do artefato público. Aparelhos físicos, leitor de tela real, instalação pelo sistema operacional e compartilhamento nativo continuam sem verificação física; o download da imagem foi testado no navegador. Esta entrega não certifica disponibilidade, biomecânica ou conformidade integral.
