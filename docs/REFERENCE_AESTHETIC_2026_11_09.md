# FOCO — direção estética aprovada em 09/11/2026

## Referência e alcance

O usuário enviou uma prancha com dez telas de um aplicativo FOCO e pediu que o
app seguisse essa estética. A imagem é a referência de composição, densidade e
materiais desta entrega. As proporções são estimadas: uma área de tela de cerca
de 250px na prancha corresponde a um viewport de 390px (escala aproximada de
1,56). Não há arquivo Figma ou medidas exatas; não afirmar fidelidade percentual.

FOCO PRO arbitra; Build Design orienta a leitura da referência; better-layout,
better-ui e better-accessibility orientam implementação e ergonomia. Sem novas
dependências ou folha global de tema. Atualizar os donos CSS existentes.

## Mapeamento e aceite

| Elemento | Aplicação no FOCO | Verificação |
| --- | --- | --- |
| Preto profundo e lima vivo | Canvas #080A07, superfícies neutras #191C15, acento existente #D5FF40 agora canônico | Screenshot e contraste Axe |
| Home compacta | Cabeçalho 44px, saudação/nome 25–32px, hero 272–320px no celular, ação pill48px; semana imediatamente depois | 320/390/768/1440px, CTA sem sobrepor navegação |
| Superfícies | Bordas neutras discretas, raios14–20px, sem brilho/contorno verde em todos os cards | Comparação visual com a prancha |
| Navegação | Cinco ícones com nomes acessíveis, indicação da página atual | Teclado/ARIA e uma seleção por destino |
| Onboarding | Cinco segmentos para cinco estados reais, escolhas com contorno de seleção, altura ajustável | Controle nativo por teclado, valor real e campos preservados |
| Agenda e detalhes | Linhas compactas, semana navegável, detalhe com um título e mídia exata do exercício | Datas±7dias, conclusões no intervalo correto, variante RepDB |
| Sessão | Campos e ações próximos, mídia com dimensões controladas, controles44px, inputs≥16px | Séries, resposta perdida, reload, UUID/retry e armazenamento |
| Evolução | Peso/gráfico reais e quatro métricas antes do resumo auxiliar; período unificado | Filtros7dias/1ano e relatório OKOK sincronizados |
| Perfil | Avatar72px com iniciais reais, nome20px, três estatísticas e linhas compactas | Edição/exclusão, rótulos, foco e diálogo nativo |
| Auth | Fotografia editorial e formulário direto, sem cartões promocionais duplicados | Login/cadastro/recuperação e preservação das credenciais |

## Diferenças deliberadas em relação à imagem

- Fotografias decorativas continuam usando a fonte Unsplash já documentada. O
  retrato da prancha não foi recortado, e imagens de terceiros não foram copiadas.
- Ilustrações de exercícios usam somente WebP originais RepDB Free, com crédito,
  equipamento e variação corretos. Não são fotos/animações premium da referência.
- A semana mantém sete dias funcionais. Não remover sábado/domingo para reproduzir
  os cinco cartões visíveis na imagem.
- Nomes, percentuais e medições são dados reais ou estados vazios. Não inserir
  métricas da prancha nem apresentar plano PRO/pagamento inexistente.
- O ajuste de altura é um slider nativo funcional com unidade cm. Não exibir uma
  régua ou alternância ft decorativas sem funcionamento.
- Alvos44px e textos de campos móveis≥16px prevalecem sobre a densidade da prancha.

## Estado e validação

Frontend `2026-11-09-v24-reference4`, versão visual2.4. Nenhuma alteração de
backend ou modelo de dados. Testar lint/build, guardrails UI/motion/qualidade,
OKOK, suites sintéticas de layout/acessibilidade/recuperação, screenshots da
referência e smoke publicado. O PR/CI registra os resultados finais. Emulação
Chromium não equivale a teste em aparelho ou leitor de tela real.
