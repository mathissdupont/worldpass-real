import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { didAuthChallenge, didAuthVerify, getUserProfile, clearToken } from '../lib/api';
import { base64UrlToBytes, bytesToBase64Url, ed25519Sign } from '../lib/crypto';
import { clearAllData } from '../lib/storage';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
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

  const signIn = useCallback(async ({ identity, displayName }) => {
    if (!identity?.did || !identity?.sk_b64u) {
      const err = new Error('identity_missing');
      setError(err.message);
      throw err;
    }

    try {
      setError(null);
      // 1) challenge al
      const { challenge } = await didAuthChallenge(identity.did, 'worldpass-mobile');

      // 2) imzala
      const skBytes = base64UrlToBytes(identity.sk_b64u);
      const msgBytes = new TextEncoder().encode(challenge);
      const sigBytes = await ed25519Sign(skBytes, msgBytes);
      const signature = bytesToBase64Url(sigBytes);

      // 3) verify + token al
      await didAuthVerify({ did: identity.did, challenge, signature, displayName });
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'login_failed');
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
    signOut,
    refreshProfile,
  }), [user, loading, error, signIn, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
