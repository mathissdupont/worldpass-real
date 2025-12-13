import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { 
  getCredentials as loadStoredCredentials, 
  addCredential as storeCredential, 
  deleteCredential as removeStoredCredential, 
  clearCredentials as wipeStoredCredentials,
  exportCredentials as exportStoredCredentials,
  importCredentials as importStoredCredentials
} from '../lib/storage';
import { useAuth } from './AuthContext';
import { listUserVCs, addVCToWallet, deleteUserVC } from '../lib/api';

const WalletContext = createContext({
  credentials: [],
  loading: true,
  error: null,
  refresh: async () => {},
  addCredential: async () => {},
  deleteCredential: async () => {},
  clearWallet: async () => {},
  exportCredentials: async () => {},
  importCredentials: async () => {},
});

export function WalletProvider({ children }) {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCredentials = useCallback(async () => {
    try {
      setError(null);
      
      // Try to load from backend first if user is authenticated
      if (user) {
        try {
          const backendVCs = await listUserVCs();
          if (backendVCs && Array.isArray(backendVCs.vcs)) {
            setCredentials(backendVCs.vcs);
            return;
          }
        } catch (err) {
          console.warn('Failed to load credentials from backend, using local storage:', err?.message || err);
        }
      }
      
      // Fallback to local storage
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
  }, [user]);

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
    
    // Add to backend if user is authenticated
    if (user) {
      try {
        await addVCToWallet(credential);
      } catch (err) {
        console.warn('Failed to add credential to backend, storing locally:', err?.message || err);
      }
    }
    
    // Also store locally
    const updated = await storeCredential(credential);
    setCredentials(updated);
  }, [user]);

  const deleteCredential = useCallback(async (credentialId) => {
    if (!credentialId) return;
    
    // Delete from backend if user is authenticated
    if (user) {
      try {
        await deleteUserVC(credentialId);
      } catch (err) {
        console.warn('Failed to delete credential from backend:', err?.message || err);
      }
    }
    
    // Also delete locally
    const updated = await removeStoredCredential(credentialId);
    setCredentials(updated);
  }, [user]);

  const clearWallet = useCallback(async () => {
    await wipeStoredCredentials();
    setCredentials([]);
  }, []);

  const exportCredentials = useCallback(async () => {
    return await exportStoredCredentials();
  }, []);

  const importCredentials = useCallback(async (jsonString) => {
    const result = await importStoredCredentials(jsonString);
    if (result.success) {
      setCredentials(result.credentials);
    }
    return result;
  }, []);

  const value = useMemo(() => ({
    credentials,
    loading,
    error,
    refresh,
    addCredential,
    deleteCredential,
    clearWallet,
    exportCredentials,
    importCredentials,
  }), [credentials, loading, error, refresh, addCredential, deleteCredential, clearWallet, exportCredentials, importCredentials]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
