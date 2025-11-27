import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { decryptKeystore } from '../lib/crypto';
import { getIdentity as loadIdentity, saveIdentity as persistIdentity, clearIdentity as wipeIdentity } from '../lib/storage';
import { linkDid } from '../lib/api';

const IdentityContext = createContext({
  identity: null,
  loading: true,
  error: null,
  linking: false,
  setIdentity: async () => {},
  clearIdentity: async () => {},
  importFromKeystore: async () => {},
});

export function IdentityProvider({ children }) {
  const { user } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linking, setLinking] = useState(false);
  const lastLinkedDid = useRef(null);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await loadIdentity();
      setIdentity(stored);
    } catch (err) {
      console.warn('Failed to load identity', err);
      setError(err?.message || 'identity_load_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!user) {
      lastLinkedDid.current = null;
    }
  }, [user?.id]);

  const setIdentityPersistent = useCallback(async (value) => {
    if (value) {
      await persistIdentity(value);
      setIdentity(value);
    } else {
      await wipeIdentity();
      setIdentity(null);
      lastLinkedDid.current = null;
    }
  }, []);

  const clearIdentity = useCallback(async () => {
    await setIdentityPersistent(null);
  }, [setIdentityPersistent]);

  const importFromKeystore = useCallback(async (password, blob) => {
    const next = await decryptKeystore(password, blob);
    await setIdentityPersistent(next);
    return next;
  }, [setIdentityPersistent]);

  useEffect(() => {
    if (!identity?.did || !user?.id) {
      return;
    }
    if (identity.did === lastLinkedDid.current) {
      return;
    }

    let cancelled = false;
    setLinking(true);
    setError(null);

    (async () => {
      try {
        await linkDid(identity.did);
        if (!cancelled) {
          lastLinkedDid.current = identity.did;
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'failed_to_link_did';
          if (message === 'did_already_set' || message === 'did_already_linked') {
            lastLinkedDid.current = identity.did;
            setError(null);
          } else {
            setError(message);
          }
        }
      } finally {
        if (!cancelled) {
          setLinking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity?.did, user?.id]);

  const value = useMemo(() => ({
    identity,
    loading,
    error,
    linking,
    setIdentity: setIdentityPersistent,
    clearIdentity,
    importFromKeystore,
  }), [identity, loading, error, linking, setIdentityPersistent, clearIdentity, importFromKeystore]);

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
