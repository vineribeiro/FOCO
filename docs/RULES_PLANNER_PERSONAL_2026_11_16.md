# FOCO 3.1 — motor automático e Personal

O proprietário pediu para retirar a montagem de fichas da IA e usar a IA como um personal para dúvidas. Escopo: montagem automática, revisão de ciclo, chat e acesso pelo Início/menu. Preservar fichas, histórico, sessões, importação de arquivos, edição manual e o visual aprovado.

## Motor de regras

`automaticPlanner.mjs` contém modelos e escolhas versionados a partir do dossiê FOCO LAB, sem uma chamada externa. Isso não é certificação profissional individual das fichas. A geração escolhe exercícios do catálogo com equipamentos explícitos, reserva cobertura dos grandes grupos e prioridades, distribui a semana e confere volume, recuperação e tempo. Não inventa carga inicial ou desempenho. Exercícios compatíveis presentes na própria ficha têm preferência para manter continuidade.

Frequências: corpo inteiro distribuído para 2–3 dias; superior/inferior para quatro; superior/inferior com corpo inteiro para cinco; empurrar/puxar/pernas para seis. Sete dias incluem recuperação ativa. Os padrões e faixas são heurísticas do produto, não regras clínicas universais.

O tempo informado é um teto na estimativa. O motor não força a contagem mínima cosmética da geração antiga: regras científicas, cobertura e duração têm precedência. Prioridades têm trabalho direto; a dose pode ficar abaixo da faixa inicial por tempo/recuperação, com aviso no resumo. Condições incompatíveis devolvem um conflito claro, sem cobrar uma tentativa de IA nem salvar uma ficha incompleta. Restrições clínicas ou preferências livres que o motor não interpreta exigem revisão/manual; nunca são descartadas silenciosamente.

`POST /api/workouts/preview` gera a proposta; o antigo `/api/ai/generate-workout` é um alias de regras para clientes em cache. Aprovar continua sendo a operação explícita de salvar/ativar. Revisão de ciclo também usa regras e registros do período, e mantém recomendações pendentes até aprovação. Relatos livres passaram ao Personal.

## Personal FOCO

`POST /api/ai/personal` recebe a pergunta e até oito mensagens anteriores. Usa a base FOCO LAB versionada e referências LAB verificadas pelo servidor. Respostas usam as cotas existentes Gemini/Groq, com duas tentativas totais no máximo e teto de saída específico do chat. Abrir a tela ou montar ficha não chama IA.

Compartilhar ficha/histórico começa desmarcado. Quando marcado, o servidor busca somente a experiência, ficha ativa e amostras de séries recentes do usuário autenticado, com limites. O contexto exclui nome/e-mail, anamnese clínica, avaliações e métricas corporais. O usuário pode informar uma condição na própria pergunta. Referências inexistentes e afirmações de que o assistente executou mudanças são rejeitadas. Sinais agudos recebem orientação imediata antes de leituras de treino ou inferência.

O Personal é uma interface de conversa, sem ferramentas de gravação ou acesso a outra conta. Não ativa fichas, altera cargas ou registra séries. Explica registros e possibilidades para revisão; não diagnostica nem faz avaliação presencial. A conversa fica no sessionStorage da conta por até 24 horas, com opção de limpar. Logout limpa as conversas da aba. Erros mantêm a pergunta sem reenvio automático.

## Aceite e verificação

- Motor funciona sem chaves de IA e com transporte externo bloqueado; resultados idênticos para o mesmo contexto.
- Matrizes de frequência, duração, nível e prioridades, equipamentos/exclusões, condições incompatíveis e segurança. Auditoria integral e tempo máximo em todos os resultados aceitos.
- Rotas HTTP reais com Auth/DB/provedores sintéticos: geração e revisão com zero inferência, ausência de gravação na prévia/chat, isolamento de contexto e resposta com referências.
- Navegador 320/390/768/1440: montar, recuperar proposta, aprovar, conversar, referências, escolha de contexto, quota sem perda de pergunta e limpeza no logout. Axe nos fluxos novos, mais regressões gerais.
- Build/HTML/runtime/cache PWA 3.1 sincronizados. Verificar função publicada, arquivos e endpoints protegidos. Testes de IA são sintéticos; não comprovam saldo/disponibilidade de uma cota real. Dispositivo físico não está coberto por emulação.
