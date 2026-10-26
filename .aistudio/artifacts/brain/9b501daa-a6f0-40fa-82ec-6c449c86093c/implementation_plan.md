# Plano de Implementação: Cronômetro Automático de Descanso com Alertas Sonoros e Modo de Execução FOCO

## 1. Visão Geral

Com base nas suas escolhas:
1. **Prioridade:** Experiência de execução prática do treino com cronômetro sonoro de descanso.
2. **Impacto:** Disparo automático do tempo de recuperação ao concluir cada série com alerta sonoro e vibração tátil.
3. **Identidade Visual:** Manter rigorosamente o design atual monocromático de alta fidelidade (preto profundo, grafite e platina emissiva), sem dispersões.

Transformaremos a experiência de treino em uma ferramenta de precisão cirúrgica para a academia, garantindo que o atleta controle intervalos entre séries sem precisar sair do app ou olhar constantemente para a tela.

---

## 2. Componentes e Funcionalidades a Serem Desenvolvidos

### A. Motor de Áudio Sintetizado e Feedback Tátil (`src/utils/soundEngine.ts`)
- **Web Audio API Nativa:** Sons de alta definição sintetizados diretamente no navegador (`AudioContext`, `OscillatorNode`, filtros de envelope harmônico suave) sem depender de download de arquivos MP3 que podem falhar ou ser bloqueados por conexões lentas na academia.
- **Assinatura Sonora FOCO:**
  - *Beep de contagem regressiva (3, 2, 1):* tom curto suave de 440Hz / 600Hz.
  - *Alerta de término de descanso (GO / Série Iniciada):* acorde duplo límpido de alta definição (880Hz + 1174Hz) que se destaca no fone de ouvido ou no alto-falante.
  - *Click mecânico sutil:* feedback ao marcar série como concluída.
- **Vibração Mobile:** Suporte à API nativa `navigator.vibrate` com padrão tátil pulsado `[120, 80, 250]ms` para treinos com o celular no bolso ou no suporte do aparelho.
- **Gerenciamento de Áudio no iOS/Android:** Inicialização automática do contexto de áudio no primeiro clique para evitar bloqueios de autoplay do Safari/Chrome mobile.
- **Interruptor de Silencioso:** Botão rápido no timer para alternar entre som ativado / mudo instantaneamente.

### B. Módulo de Cronômetro de Descanso Inteligente (`src/components/RestTimerHUD.tsx`)
- **Disparo Automático:** Ao marcar o checkbox de qualquer série como realizada, o cronômetro inicia imediatamente com a duração recomendada para aquele exercício (ex: 60s para isolados, 90s a 120s para compostos).
- **Interface Não-Intrusiva (Zero Sobreposição Mobile):**
  - Barra de descanso persistente flutuante ou acoplada no rodapé da visualização de treino, com padding de segurança (`safe-area-inset-bottom`) para não cobrir botões de salvar ou inputs de carga.
  - Indicador circular ou linear minimalista de progresso em branco puro e grafite.
  - Ajustes rápidos em 1 toque: `+15s`, `-15s`, `Pausar / Retomar` e `Pular Descanso`.
  - Configuração rápida da duração padrão (30s, 45s, 60s, 90s, 120s, 180s ou personalizado).

### C. Aprimoramentos na Interface de Execução do Treino (`src/components/ActiveWorkoutView.tsx`)
- **Ergonomia para Dedos na Academia:**
  - Áreas de toque ampliadas (mínimo 44x44px) nos botões de conclusão de série.
  - Inputs numéricos de carga (kg) e repetições otimizados com auto-seleção de texto para edição rápida com uma mão.
- **Cálculo Instantâneo de 1RM Estimado (One Rep Max):**
  - Cálculo automático da carga máxima estimada (fórmula Brzycki/Epley) ao preencher peso e repetições, exibindo a intensidade relativa.
- **Histórico Comparativo da Série Anterior:**
  - Exibição discreta em cinza médio do peso e repetições registrados na sessão anterior para facilitar a progressão de carga (sobrecarga progressiva).

---

## 3. Plano de Arquitetura e Arquivos

| Arquivo | Ação | Responsabilidade |
| :--- | :--- | :--- |
| `src/utils/soundEngine.ts` | **Criar** | Gerador de beeps com Web Audio API, controle de volume, mute e vibração tátil nativa. |
| `src/components/RestTimerHUD.tsx` | **Criar** | HUD do cronômetro de descanso com controles de tempo (+15s/-15s), progresso visual e alertas sonoros sincronizados. |
| `src/types/workout.ts` | **Ajustar** | Tipagem para tempo de descanso por exercício, preferências de som e histórico de execução. |
| `src/components/ActiveWorkoutView.tsx` | **Aprimorar** | Integração do disparo automático na conclusão da série, botões de toque rápido e estimativa de 1RM. |
| `src/App.tsx` | **Ajustar** | Gerenciamento global do estado do timer para que continue contando mesmo navegando entre abas do app. |

---

## 4. Verificação e Validação

1. **Testes de Áudio e Vibração:**
   - Garantir que o `AudioContext` seja destravado com interação do usuário sem gerar avisos no console.
   - Validar bips nos segundos 3, 2, 1 e sinal longo ao zerar.
   - Testar o botão de Mudo.
2. **Testes de Usabilidade Mobile:**
   - Conferir que o timer não bloqueia a rolagem de tela nem sobrepõe campos de peso/repetição em telas de 375px a 430px.
   - Testar acréscimo e redução rápida de tempo (+15s / -15s).
3. **Build e TypeScript:**
   - Executar `compile_applet` e `lint_applet` para assegurar 0 erros de tipagem e integridade completa.

---

Aguardando sua confirmação para iniciar a implementação no código.
