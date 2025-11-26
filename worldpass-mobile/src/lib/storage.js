// Secure storage for credentials and keys
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIALS_KEY = 'worldpass_credentials';
const DID_KEY = 'worldpass_did';
const PRIVATE_KEY = 'worldpass_private_key';

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

// DID management
export async function saveDID(did) {
  await saveSecureItem(DID_KEY, did);
}

export async function getDID() {
  return await getSecureItem(DID_KEY);
}

export async function savePrivateKey(privateKey) {
  await saveSecureItem(PRIVATE_KEY, privateKey);
}

export async function getPrivateKey() {
  return await getSecureItem(PRIVATE_KEY);
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
  await deleteSecureItem(DID_KEY);
  await deleteSecureItem(PRIVATE_KEY);
}
