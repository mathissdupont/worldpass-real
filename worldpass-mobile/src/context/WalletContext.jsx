import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCredentials as loadStoredCredentials, addCredential as storeCredential, deleteCredential as removeStoredCredential, clearCredentials as wipeStoredCredentials } from '../lib/storage';
import { useAuth } from './AuthContext';

const WalletContext = createContext({
  credentials: [],
  loading: true,
  error: null,
  refresh: async () => {},
  addCredential: async () => {},
  deleteCredential: async () => {},
  clearWallet: async () => {},
});

export function WalletProvider({ children }) {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCredentials = useCallback(async () => {
    try {
      setError(null);
      const stored = await loadStoredCredentials();
      if (Array.isArray(stored)) {
        setCredentials(stored);
      } else {
        setCredentials([]);
      }
    } catch (err) {
      setError(err?.message || 'wallet_load_failed');
      setCredentials([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!user) {
        setCredentials([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      await loadCredentials();
      if (!cancelled) {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [user, loadCredentials]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadCredentials();
    setLoading(false);
  }, [loadCredentials]);

  const addCredential = useCallback(async (credential) => {
    if (!credential) return;
    const updated = await storeCredential(credential);
    setCredentials(updated);
  }, []);

  const deleteCredential = useCallback(async (credentialId) => {
    if (!credentialId) return;
    const updated = await removeStoredCredential(credentialId);
    setCredentials(updated);
  }, []);

  const clearWallet = useCallback(async () => {
    await wipeStoredCredentials();
    setCredentials([]);
  }, []);

  const value = useMemo(() => ({
    credentials,
    loading,
    error,
    refresh,
    addCredential,
    deleteCredential,
    clearWallet,
  }), [credentials, loading, error, refresh, addCredential, deleteCredential, clearWallet]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
