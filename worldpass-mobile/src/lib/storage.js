// Secure storage for credentials and keys
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIALS_KEY = 'worldpass_credentials';
const IDENTITY_KEY = 'worldpass_identity_v1';
const ISSUER_TEMPLATES_CACHE_KEY = 'worldpass_issuer_templates_cache';

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

function upsertCredential(list, credential) {
  const key = credential?.jti || credential?.id;
  if (!key) {
    return [credential, ...list];
  }
  const filtered = list.filter(c => (c?.jti || c?.id) !== key);
  return [credential, ...filtered];
}

export async function addCredential(credential) {
  const credentials = await getCredentials();
  const updated = upsertCredential(credentials, credential);
  await saveCredentials(updated);
  return updated;
}

export async function deleteCredential(credentialId) {
  const credentials = await getCredentials();
  const filtered = credentials.filter(c => (c?.jti || c?.id) !== credentialId);
  await saveCredentials(filtered);
  return filtered;
}

export async function clearCredentials() {
  await AsyncStorage.removeItem(CREDENTIALS_KEY);
}

// Export all credentials as JSON string
export async function exportCredentials() {
  const credentials = await getCredentials();
  const identity = await getIdentity();
  const exportData = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    user_did: identity?.did || "",
    credentials: credentials
  };
  return JSON.stringify(exportData, null, 2);
}

// Import credentials from JSON string (bulk import)
export async function importCredentials(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const credentials = await getCredentials();
    
    // Check if it's a single credential or a bundle
    let toImport = [];
    if (data.credentials && Array.isArray(data.credentials)) {
      // Bundle format from export
      toImport = data.credentials;
    } else if (data['@context'] || data.type) {
      // Single credential
      toImport = [data];
    } else {
      throw new Error("Invalid credential format");
    }
    
    // Add each credential, replacing duplicates
    let updated = credentials;
    for (const credential of toImport) {
      updated = upsertCredential(updated, credential);
    }
    
    await saveCredentials(updated);
    return { success: true, count: toImport.length, credentials: updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function clearAllData() {
  await clearCredentials();
  await clearIdentity();
}

// Issuer templates cache (offline support)
export async function saveIssuerTemplatesCache(templates = []) {
  try {
    await AsyncStorage.setItem(
      ISSUER_TEMPLATES_CACHE_KEY,
      JSON.stringify(Array.isArray(templates) ? templates : [])
    );
  } catch (err) {
    console.warn('Failed to cache issuer templates', err?.message || err);
  }
}

export async function getIssuerTemplatesCache() {
  try {
    const raw = await AsyncStorage.getItem(ISSUER_TEMPLATES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read cached issuer templates', err?.message || err);
    return [];
  }
}
