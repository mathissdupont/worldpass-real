// Secure storage for credentials and keys
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIALS_KEY = 'worldpass_credentials';
const IDENTITY_KEY = 'worldpass_identity_v1';

// Secure storage (for sensitive data)
export async function saveSecureItem(key, value) {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureItem(key) {
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key) {
  await SecureStore.deleteItemAsync(key);
}

// Identity management
export async function saveIdentity(identity) {
  await saveSecureItem(IDENTITY_KEY, JSON.stringify(identity));
}

export async function getIdentity() {
  const raw = await getSecureItem(IDENTITY_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearIdentity() {
  await deleteSecureItem(IDENTITY_KEY);
}

export async function saveDID(did) {
  const current = (await getIdentity()) || {};
  current.did = did;
  await saveIdentity(current);
}

export async function getDID() {
  return (await getIdentity())?.did ?? null;
}

export async function savePrivateKey(privateKey) {
  const current = (await getIdentity()) || {};
  current.sk_b64u = privateKey;
  await saveIdentity(current);
}

export async function getPrivateKey() {
  return (await getIdentity())?.sk_b64u ?? null;
}

// Credentials storage
export async function saveCredentials(credentials) {
  await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function getCredentials() {
  const data = await AsyncStorage.getItem(CREDENTIALS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addCredential(credential) {
  const credentials = await getCredentials();
  credentials.push(credential);
  await saveCredentials(credentials);
}

export async function deleteCredential(credentialId) {
  const credentials = await getCredentials();
  const filtered = credentials.filter(c => c.jti !== credentialId);
  await saveCredentials(filtered);
}

export async function clearAllData() {
  await AsyncStorage.removeItem(CREDENTIALS_KEY);
  await clearIdentity();
}
