# Matriz de testes beta FOCO PRO

Cada caso deve registrar: dispositivo, navegador, commit, usuário sintético/consentido, data, resultado, captura, issue e responsável. **Sem evidência = não testado.**

| ID | Jornada | Cenário crítico | Esperado |
|---|---|---|---|
| AUTH-01 | Conta | Criar, sair, entrar novamente | Perfil e treinos íntegros |
| AUTH-02 | Conta | Refresh token expirado | Recuperação clara, sem limpar dados incorretamente |
| AUTH-03 | Conta | Solicitar recuperação de senha | Link de uso único, tratamento de erros |
| AUTH-04 | Privacidade | Tentar acessar arquivos e treinos de outra conta | Negação em API e storage |
| AUTH-05 | Privacidade | Excluir conta com documentos | Política de eliminação aplicada e comprovada |
| PLAN-01 | Ficha | Gerar ficha e voltar após logout | Mesmos dados gravados |
| PLAN-02 | Ficha | Personalizar exercícios | Guardar ordem, séries, repetições e carga |
| PLAN-03 | Ficha | Alterar "só hoje" versus "sempre" | Escopo respeitado sem duplicar |
| PLAN-04 | Ficha | Trocar treino do dia | Calendário original preservado |
| SESSION-01 | Sessão | Iniciar, registrar séries, descansar, finalizar | Persistência antes da confirmação |
| SESSION-02 | Sessão | Ficar offline e reconectar | Sem perda silenciosa ou duplicação |
| SESSION-03 | Sessão | Trocar aba/bloquear tela | Cronômetro e estado consistente |
| SESSION-04 | Sessão | Duplo clique no salvar/finalizar | Uma operação efetiva |
| SESSION-05 | Sessão | Exercício sem carga | Nenhum campo de kg obrigatório |
| CARDIO-01 | Cardio | Fazer cardio em dia de descanso | Plano semanal inalterado |
| CARDIO-02 | Cardio | Pausar/retomar, fechar e reabrir | Duração real, estado local recuperável |
| CARDIO-03 | Cardio | Salvar com rede ausente | Falha explícita, rascunho preservado |
| HOME-01 | Modalidades | FOCO em Casa e complementares | Aberturas separadas, sem mistura |
| DATA-01 | Evolução | Medições e upload OKOK | Valores rastreáveis, unidade correta |
| DATA-02 | Evolução | Arquivo inválido/tamanho máximo | Validação e erro compreensíveis |
| DATA-03 | Evolução | Falha do modelo de IA | Sem dados inventados, retry seguro |
| UI-01 | Acessibilidade | Teclado e foco em fluxo inteiro | Interação concluída sem mouse |
| UI-02 | Acessibilidade | Leitor de tela, nome/estado dos botões | Sem ambiguidade |
| UI-03 | Acessibilidade | Redução de movimento | Animações suprimidas |
| UI-04 | Responsividade | 320, 390, 768, 1440px | Sem controle cortado ou sobreposto |
| UI-05 | Perf. | Dispositivo intermediário e rede lenta | Controles responsivos durante treino |
| RIGHTS-01 | Comercial | Fotos, fontes, ícones e exercícios | Licença rastreável por asset |
| LEGAL-01 | LGPD | Consentimento/finalidade e direitos | Linguagem e comportamento reais |
| OPS-01 | Operação | Falha no deploy/rollback | Versão anterior recuperável |
| OPS-02 | Observabilidade | Incidente sem PII nos logs | Diagnóstico seguro e acionável |

**Automatização atual não comprova todos os itens.** Até existir prova e auditoria formal, manter pendências explícitas.
