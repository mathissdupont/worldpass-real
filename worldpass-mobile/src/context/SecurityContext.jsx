import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const BIOMETRIC_PREF_KEY = 'worldpass_biometric_pref';
const PIN_HASH_KEY = 'worldpass_pin_hash';

const SecurityContext = createContext({
  ready: false,
  locked: false,
  unlocking: false,
  biometricAvailable: false,
  biometricEnabled: false,
  biometricType: null,
  pinSet: false,
  error: null,
  lock: () => {},
  unlockWithBiometric: async () => false,
  unlockWithPin: async () => false,
  updateBiometricPreference: async () => {},
  setPinCode: async () => {},
  clearPinCode: async () => {},
  resetError: () => {},
});

async function hashPin(pin) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `worldpass-pin::${pin}`
  );
}

export function SecurityProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [pinSet, setPinSet] = useState(false);
  const [error, setError] = useState(null);
  const pinHashRef = useRef(null);
  const lockSuspendedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
        const supported = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
        const detectedType = supported.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
          ? 'face'
          : supported.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
            ? 'fingerprint'
            : supported.includes(LocalAuthentication.AuthenticationType.IRIS)
              ? 'iris'
              : null;
        if (mounted) {
          setBiometricAvailable(hasHardware && enrolled && !!detectedType);
          setBiometricType(detectedType);
        }
        const storedPref = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
        const storedPin = await SecureStore.getItemAsync(PIN_HASH_KEY);
        if (mounted) {
          if (storedPin) {
            pinHashRef.current = storedPin;
            setPinSet(true);
          }
          if (storedPref === 'enabled' && hasHardware && enrolled) {
            setBiometricEnabled(true);
          }
          if ((storedPref === 'enabled' && hasHardware && enrolled) || storedPin) {
            setLocked(true);
          }
        }
      } catch (err) {
        console.warn('Security bootstrap failed', err?.message);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const lock = useCallback(() => {
    if (lockSuspendedRef.current) {
      return;
    }
    if (biometricEnabled || pinSet) {
      setLocked(true);
      setError(null);
    }
  }, [biometricEnabled, pinSet]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        lock();
      }
    });
    return () => subscription.remove();
  }, [lock]);

  const updateBiometricPreference = useCallback(async (enable) => {
    try {
      if (enable) {
        if (!biometricAvailable) {
          throw new Error('Bu cihazda biyometrik doğrulama desteklenmiyor.');
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Biyometrik hızlı girişi etkinleştir',
          cancelLabel: 'İptal',
        });
        if (!result.success) {
          throw new Error('Biyometrik doğrulama iptal edildi');
        }
        await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, 'enabled');
        setBiometricEnabled(true);
        lock();
      } else {
        await SecureStore.deleteItemAsync(BIOMETRIC_PREF_KEY);
        setBiometricEnabled(false);
      }
    } catch (err) {
      console.warn('Failed to update biometric preference', err?.message);
      throw err;
    }
  }, [biometricAvailable, lock]);

  useEffect(() => {
    if (!biometricEnabled && !pinSet) {
      setLocked(false);
      setError(null);
    }
  }, [biometricEnabled, pinSet]);

  const unlockWithBiometric = useCallback(async () => {
    if (!biometricEnabled || !biometricAvailable) {
      return false;
    }
    setUnlocking(true);
    setError(null);
    lockSuspendedRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Cüzdan kilidini aç',
        cancelLabel: 'İptal',
        fallbackLabel: 'Cihaz şifresini kullan',
      });
      if (result.success) {
        setLocked(false);
        return true;
      }
      setError(result.error === 'lockout'
        ? 'Çok fazla deneme yapıldı. Face ID / Touch ID kullanmadan önce cihaz kilidini aç.'
        : 'Biyometrik doğrulama başarısız');
      return false;
    } catch (err) {
      setError(err?.message || 'Biyometrik doğrulama iptal edildi');
      return false;
    } finally {
      lockSuspendedRef.current = false;
      setUnlocking(false);
    }
  }, [biometricAvailable, biometricEnabled]);

  const setPinCode = useCallback(async (pin) => {
    const sanitized = (pin || '').trim();
    if (!sanitized) {
      await SecureStore.deleteItemAsync(PIN_HASH_KEY);
      pinHashRef.current = null;
      setPinSet(false);
      return;
    }
    const hashed = await hashPin(sanitized);
    pinHashRef.current = hashed;
    await SecureStore.setItemAsync(PIN_HASH_KEY, hashed);
    setPinSet(true);
    lock();
  }, [lock]);

  const clearPinCode = useCallback(async () => {
    pinHashRef.current = null;
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    setPinSet(false);
  }, []);

  const unlockWithPin = useCallback(async (pin) => {
    if (!pinHashRef.current) {
      return false;
    }
    const hashed = await hashPin(pin || '');
    if (hashed === pinHashRef.current) {
      setLocked(false);
      setError(null);
      return true;
    }
    setError('PIN doğrulanamadı');
    return false;
  }, []);

  const value = useMemo(() => ({
    ready,
    locked,
    unlocking,
    biometricAvailable,
    biometricEnabled,
    biometricType,
    pinSet,
    error,
    lock,
    unlockWithBiometric,
    unlockWithPin,
    updateBiometricPreference,
    setPinCode,
    clearPinCode,
    resetError: () => setError(null),
  }), [ready, locked, unlocking, biometricAvailable, biometricEnabled, biometricType, pinSet, error, lock, unlockWithBiometric, unlockWithPin, updateBiometricPreference, setPinCode, clearPinCode]);

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  return useContext(SecurityContext);
}
