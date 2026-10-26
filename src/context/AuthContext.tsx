import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Profile } from '../types';
import { api, getStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authLoadError: string | null;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setUser(data.user);
        setProfile(data.profile);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Não foi possível validar a sessão.';
        console.warn('Could not restore FOCO session:', err);
        setUser(null);
        setProfile(null);
        if (message.includes('demorou para responder') || message.includes('conectar ao servidor')) {
          // Keep the token when this is a network/server timeout; this is not proof
          // that the user's session is invalid.
          setAuthLoadError(message);
        } else {
          removeStoredToken();
          setAuthLoadError(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
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
    removeStoredToken();
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        authLoadError,
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
