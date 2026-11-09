import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Profile } from '../types';
import { api, getStoredToken, removeStoredToken, isAuthenticationFailure } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringSession: boolean;
  authLoadError: string | null;
  retrySession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    experience_level?: string;
    current_weight_kg?: number;
    height_cm?: number;
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);

  const restoreController = useRef<AbortController | null>(null);

  const retrySession = useCallback(async () => {
    restoreController.current?.abort();
    const controller = new AbortController();
    restoreController.current = controller;
    setAuthLoadError(null);
    if (!getStoredToken()) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      setIsRestoringSession(false);
      return;
    }
    setIsLoading(true);
    setIsRestoringSession(true);
    try {
      const data = await api.getMe({ signal: controller.signal });
      if (controller.signal.aborted || restoreController.current !== controller) return;
      setUser(data.user);
      setProfile(data.profile);
    } catch (error) {
      if (controller.signal.aborted || restoreController.current !== controller) return;
      setUser(null);
      setProfile(null);
      if (isAuthenticationFailure(error)) {
        removeStoredToken();
        setAuthLoadError(null);
      } else {
        // Offline, 5xx and an incomplete response do not prove invalid credentials.
        setAuthLoadError(error instanceof Error ? error.message : 'Não foi possível validar a sessão. Tente novamente.');
      }
    } finally {
      if (!controller.signal.aborted && restoreController.current === controller) {
        setIsLoading(false);
        setIsRestoringSession(false);
      }
    }
  }, []);

  useEffect(() => {
    // A recovery callback takes precedence over a previously stored login session.
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    let recoveryPending = false;
    try {
      recoveryPending = sessionStorage.getItem('foco_password_recovery_pending') === '1';
      if (recoveryPending) sessionStorage.removeItem('foco_password_recovery_pending');
    } catch {
      // The URL hash is still checked below if sessionStorage is unavailable.
    }
    const hasAuthCallbackError = params.has('error') || params.has('error_description') || params.has('error_code');
    const isRecoveryCallback = params.get('type') === 'recovery' && Boolean(params.get('access_token'));
    if (recoveryPending || hasAuthCallbackError || isRecoveryCallback) {
      removeStoredToken();
      setUser(null);
      setProfile(null);
      setAuthLoadError(null);
      setIsLoading(false);
      setIsRestoringSession(false);
    } else {
      void retrySession();
    }
    return () => restoreController.current?.abort();
  }, [retrySession]);

  const login = async (email: string, password: string) => {
    restoreController.current?.abort();
    setAuthLoadError(null);
    setIsRestoringSession(false);
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setProfile(res.profile);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    full_name: string;
    experience_level?: string;
    current_weight_kg?: number;
    height_cm?: number;
  }) => {
    restoreController.current?.abort();
    setAuthLoadError(null);
    setIsRestoringSession(false);
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      setProfile(res.profile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    restoreController.current?.abort();
    removeStoredToken();
    setIsLoading(false);
    setIsRestoringSession(false);
    setUser(null);
    setProfile(null);
    setAuthLoadError(null);
  };

  const refreshProfile = async () => {
    try {
      const updated = await api.getProfile();
      setProfile(updated);
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  const deleteAccount = async () => {
    await api.deleteAccount();
    setUser(null);
    setProfile(null);
    setAuthLoadError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        isRestoringSession,
        authLoadError,
        retrySession,
        login,
        register,
        logout,
        refreshProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
