import React, { useState } from 'react';
import { useRestTimer } from '../context/RestTimerContext';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const RestTimerHUD: React.FC = () => {
  const {
    isActive,
    isPaused,
    timeRemaining,
    totalDuration,
    exerciseName,
    setNumber,
    isMuted,
    pauseTimer,
    resumeTimer,
    skipTimer,
    addSeconds,
    toggleMute,
    startTimer,
  } = useRestTimer();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!isActive) return null;

  const progressPercent = totalDuration > 0
    ? Math.min(100, Math.max(0, ((totalDuration - timeRemaining) / totalDuration) * 100))
    : 0;

  const formatDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isFinalCountdown = timeRemaining <= 3 && timeRemaining > 0;

  return (
    <aside
      aria-label="Cronômetro de descanso"
      className={`fixed left-2 right-2 max-w-md mx-auto z-40 transition-all duration-300 ease-out ${
        isExpanded ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-5' : 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-5'
      }`}
    >
      <div
        className={`rounded-2xl border bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl transition-all duration-200 overflow-hidden ${
          isFinalCountdown
            ? 'border-white animate-pulse shadow-[0_0_30px_rgba(255,255,255,0.25)]'
            : 'border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Top Slim Progress Indicator */}
        <div className="w-full h-1 bg-white/10 relative overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-linear ${
              isFinalCountdown ? 'bg-white' : 'bg-neutral-200'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Bar Content */}
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Countdown Display & Context */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Circular Mini Visualizer */}
              <div
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                  isFinalCountdown
                    ? 'bg-white text-black border-white scale-105'
                    : 'bg-[#141414] text-white border-white/20'
                }`}
              >
                <span className="font-mono font-black text-sm tabular-nums tracking-tight">
                  {timeRemaining}s
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isPaused ? 'bg-neutral-500' : 'bg-white animate-ping'
                    }`}
                  />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold block truncate">
                    {isPaused ? 'Pausado' : 'Descanso Ativo'}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white truncate max-w-[150px] sm:max-w-[190px]">
                  {exerciseName ? `${exerciseName} · Série #${setNumber}` : 'Intervalo de Recuperação'}
                </h4>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Quick +/- 15s */}
              <button
                onClick={() => addSeconds(-15)}
                className="min-h-11 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-[11px] font-mono font-bold border border-white/10 transition-colors cursor-pointer"
                title="Reduzir 15s"
              >
                -15s
              </button>
              <button
                onClick={() => addSeconds(15)}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-[11px] font-mono font-bold border border-white/10 transition-colors cursor-pointer"
                title="Aumentar 15s"
              >
                +15s
              </button>

              {/* Pause/Play Toggle */}
              <button
                onClick={isPaused ? resumeTimer : pauseTimer}
                className="foco-touch rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={isPaused ? 'Retomar descanso' : 'Pausar descanso'}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              </button>

              {/* Skip / Next Set Button */}
              <button
                onClick={skipTimer}
                className="min-h-11 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md transition-all cursor-pointer"
                title="Finalizar descanso e ir para a próxima série"
              >
                <span>GO!</span>
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>

              {/* Expand Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="foco-touch text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title={isExpanded ? 'Recolher detalhes' : 'Mais ajustes'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Drawer Options */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 font-mono uppercase tracking-wider">
                  Presets Rápidos de Intervalo:
                </span>
                <button
                  onClick={toggleMute}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-neutral-900 text-neutral-500 border-white/10'
                      : 'bg-white/10 text-white border-white/20'
                  }`}
                  title={isMuted ? 'Ativar alerta sonoro' : 'Silenciar áudio'}
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  <span>{isMuted ? 'Mudo' : 'Som On'}</span>
                </button>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {[30, 45, 60, 90, 120].map((presetSecs) => (
                  <button
                    key={presetSecs}
                    onClick={() => startTimer(presetSecs, exerciseName, setNumber)}
                    className={`py-1.5 rounded-lg font-mono text-[11px] font-black border transition-colors cursor-pointer ${
                      totalDuration === presetSecs
                        ? 'bg-white text-black border-white'
                        : 'bg-[#141414] text-neutral-300 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {presetSecs}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
