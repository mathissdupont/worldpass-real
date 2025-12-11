import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Network from 'expo-network';

const OfflineContext = createContext({
  isOffline: false,
  networkType: null,
  lastChangeAt: null,
  refresh: async () => {},
});

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false);
  const [networkType, setNetworkType] = useState(null);
  const [lastChangeAt, setLastChangeAt] = useState(null);

  const updateState = useCallback((state) => {
    const nextOffline = !(state?.isConnected && state?.isInternetReachable !== false);
    setIsOffline(nextOffline);
    setNetworkType(state?.type || null);
    setLastChangeAt(new Date().toISOString());
  }, []);

  const refresh = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      updateState(state);
      return state;
    } catch (err) {
      console.warn('Network state check failed', err?.message || err);
      setIsOffline(false);
      return null;
    }
  }, [updateState]);

  useEffect(() => {
    refresh();
    // Handle SDK 54+ API (addNetworkStateListener) and fall back if older name is present
    const sub = (Network.addNetworkStateListener || Network.addNetworkStateChangeListener)?.(updateState);
    return () => sub && sub.remove && sub.remove();
  }, [refresh, updateState]);

  const value = useMemo(() => ({
    isOffline,
    networkType,
    lastChangeAt,
    refresh,
  }), [isOffline, networkType, lastChangeAt, refresh]);

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
