/**
 * Motor de Áudio e Feedback Tátil FOCO
 * Utiliza a Web Audio API nativa para síntese sonora pura (sem dependência de arquivos externos).
 * Garante performance instantânea, zero latência e funcionamento offline na academia.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private hapticsEnabled = true;

  constructor() {
    // Carregar preferência salva no localStorage
    try {
      const savedMute = localStorage.getItem('foco_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      this.hapticsEnabled = localStorage.getItem('foco_haptics_enabled') !== 'false';
    } catch {
      // Ignore localStorage exceptions in restricted contexts
    }
  }

  /**
   * Inicializa ou destrava o AudioContext em resposta a um gesto do usuário.
   */
  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('foco_audio_muted', String(muted));
    } catch {
      // Ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
    try { localStorage.setItem('foco_haptics_enabled', String(enabled)); } catch { /* storage unavailable */ }
  }

  /**
   * Feedback de vibração, independente do áudio e opcional.
   */
  public vibrate(pattern: number | number[] = [80, 50, 100]): void {
    if (this.hapticsEnabled && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignora caso dispositivo não suporte
      }
    }
  }

  /**
   * Sintetizador harmônico flexível com envelope ADSR.
   */
  private playTone(
    frequencies: number[],
    duration: number,
    type: OscillatorType = 'sine',
    gainMultiplier: number = 1
  ): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(this.volume * gainMultiplier, now + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(ctx.destination);

      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(masterGain);
        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Erro ao reproduzir sintetizador Web Audio:', e);
    }
  }

  /**
   * Beep para a contagem regressiva final (3, 2, 1 segundos restantes).
   * Tom curto e focado de alta precisão.
   */
  public playCountdownBeep(secondsLeft: number): void {
    this.vibrate(60);
    if (secondsLeft === 3) {
      this.playTone([480], 0.12, 'triangle', 0.6);
    } else if (secondsLeft === 2) {
      this.playTone([540], 0.12, 'triangle', 0.7);
    } else if (secondsLeft === 1) {
      this.playTone([640], 0.14, 'triangle', 0.85);
    }
  }

  /**
   * Alerta duplo de término do descanso (GO! / Próxima Série).
   * Acorde esportivo ascendente com brilho e ressonância.
   */
  public playRestFinishedChime(): void {
    this.vibrate([150, 80, 200, 80, 300]);
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primeira nota brilhante
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(this.volume * 0.8, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      gain1.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now); // Mi5 (E5)
      osc1.connect(gain1);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Segunda nota dominante aguda e prolongada (acorde de ação)
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.001, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(this.volume * 0.95, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      gain2.connect(ctx.destination);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15); // Si5 (B5)
      osc2.connect(gain2);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);

      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318.51, now + 0.15); // Mi6 (E6)
      osc3.connect(gain2);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.65);
    } catch (e) {
      console.warn('Erro ao reproduzir acorde de término:', e);
    }
  }

  /**
   * Click tátil ao marcar série concluída ou ajustar valores.
   */
  public playCheckmarkClick(): void {
    this.vibrate(35);
    this.playTone([800, 1200], 0.04, 'sine', 0.35);
  }

  /**
   * Som de celebração ao concluir o treino inteiro.
   */
  public playWorkoutCompletedChime(): void {
    this.vibrate([100, 60, 150, 60, 250]);
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.1;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(this.volume * 0.7, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
        gain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.connect(gain);
        osc.start(time);
        osc.stop(time + 0.4);
      });
    } catch (e) {
      console.warn('Erro ao reproduzir fanfarra:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
