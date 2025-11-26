import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginApi, register as registerApi, getUserProfile, clearToken } from '../lib/api';
import { clearAllData } from '../lib/storage';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await getUserProfile();
      setUser(profile);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      console.warn('Failed to refresh profile', err.message);
      throw err;
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      setError(null);
      await loginApi(email, password);
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'login_failed');
      throw err;
    }
  }, [refreshProfile]);

  const signUp = useCallback(async (name, email, password) => {
    try {
      setError(null);
      await registerApi(email, password, name);
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'register_failed');
      throw err;
    }
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await clearToken();
    await clearAllData();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [user, loading, error, signIn, signUp, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
