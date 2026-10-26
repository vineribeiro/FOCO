import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { soundEngine } from '../utils/soundEngine';

interface RestTimerContextType {
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number;
  totalDuration: number;
  exerciseName: string;
  setNumber: number;
  isMuted: boolean;
  autoRestEnabled: boolean;
  setAutoRestEnabled: (enabled: boolean) => void;
  startTimer: (seconds: number, exerciseName?: string, setNumber?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipTimer: () => void;
  addSeconds: (seconds: number) => void;
  toggleMute: () => void;
  testSound: () => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export const RestTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(60);
  const [exerciseName, setExerciseName] = useState<string>('');
  const [setNumber, setSetNumber] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());
  const [autoRestEnabled, setAutoRestEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('foco_auto_rest_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const targetEndTimeRef = useRef<number | null>(null);
  const remainingAtPauseRef = useRef<number>(0);
  const lastBeepSecRef = useRef<number | null>(null);

  const setAutoRestEnabled = (enabled: boolean) => {
    setAutoRestEnabledState(enabled);
    try {
      localStorage.setItem('foco_auto_rest_enabled', String(enabled));
    } catch {
      // Ignore
    }
  };

  const toggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const testSound = () => {
    soundEngine.initContext();
    soundEngine.playCountdownBeep(3);
  };

  const startTimer = useCallback((seconds: number, exName = '', setNum = 1) => {
    soundEngine.initContext();
    const duration = Math.max(5, Math.round(seconds));
    setTotalDuration(duration);
    setTimeRemaining(duration);
    setExerciseName(exName);
    setSetNumber(setNum);
    setIsPaused(false);
    setIsActive(true);

    lastBeepSecRef.current = null;
    targetEndTimeRef.current = Date.now() + duration * 1000;
  }, []);

  const pauseTimer = useCallback(() => {
    if (!isActive || isPaused) return;
    setIsPaused(true);
    remainingAtPauseRef.current = Math.max(0, timeRemaining);
    targetEndTimeRef.current = null;
  }, [isActive, isPaused, timeRemaining]);

  const resumeTimer = useCallback(() => {
    if (!isActive || !isPaused) return;
    soundEngine.initContext();
    setIsPaused(false);
    targetEndTimeRef.current = Date.now() + remainingAtPauseRef.current * 1000;
  }, [isActive, isPaused]);

  const skipTimer = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(0);
    targetEndTimeRef.current = null;
    lastBeepSecRef.current = null;
  }, []);

  const addSeconds = useCallback((delta: number) => {
    setTimeRemaining((prev) => {
      const next = Math.max(0, prev + delta);
      if (next <= 0) {
        skipTimer();
        return 0;
      }
      setTotalDuration((total) => Math.max(next, total + delta));
      if (targetEndTimeRef.current) {
        targetEndTimeRef.current += delta * 1000;
      } else {
        remainingAtPauseRef.current = next;
      }
      return next;
    });
  }, [skipTimer]);

  // High precision timer loop based on Date.now()
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;

      const msLeft = targetEndTimeRef.current - Date.now();
      const secsLeft = Math.ceil(msLeft / 1000);

      if (secsLeft <= 0) {
        // Rest completed!
        setTimeRemaining(0);
        setIsActive(false);
        setIsPaused(false);
        targetEndTimeRef.current = null;
        lastBeepSecRef.current = null;

        // Reproduz o acorde vibrante de finalização do descanso
        soundEngine.playRestFinishedChime();
      } else {
        setTimeRemaining(secsLeft);

        // Dispara beeps nos segundos 3, 2 e 1
        if (secsLeft <= 3 && lastBeepSecRef.current !== secsLeft) {
          lastBeepSecRef.current = secsLeft;
          soundEngine.playCountdownBeep(secsLeft);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  return (
    <RestTimerContext.Provider
      value={{
        isActive,
        isPaused,
        timeRemaining,
        totalDuration,
        exerciseName,
        setNumber,
        isMuted,
        autoRestEnabled,
        setAutoRestEnabled,
        startTimer,
        pauseTimer,
        resumeTimer,
        skipTimer,
        addSeconds,
        toggleMute,
        testSound,
      }}
    >
      {children}
    </RestTimerContext.Provider>
  );
};

export const useRestTimer = (): RestTimerContextType => {
  const context = useContext(RestTimerContext);
  if (!context) {
    throw new Error('useRestTimer must be used within a RestTimerProvider');
  }
  return context;
};
