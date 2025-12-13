// API client for WorldPass backend
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDID } from './storage';

// Use local backend for web testing, production for native
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || '').replace(/\/$/, '')
  || (Platform.OS === 'web' ? 'http://localhost:8000' : 'https://worldpass-beta.heptapusgroup.com');

const ACCOUNT_PROFILE_ENDPOINT = '/api/user/profile';
const PROFILE_DATA_ENDPOINT = '/api/user/profile-data';
const AUTH_CHALLENGE_ENDPOINT = '/api/auth/challenge';
const AUTH_VERIFY_ENDPOINT = '/api/auth/verify';

export async function getToken() {
  return await AsyncStorage.getItem('user_token');
}

export async function setToken(token) {
  await AsyncStorage.setItem('user_token', token);
}

export async function clearToken() {
  await AsyncStorage.removeItem('user_token');
}

export async function apiRequest(endpoint, options = {}) {
  const token = await getToken();
  let walletDid = null;
  try {
    walletDid = await getDID();
  } catch (err) {
    console.warn('Failed to read wallet DID', err?.message || err);
  }
  const headers = {
    'Content-Type': 'application/json',
    'expo-platform': Platform.OS,
    ...options.headers,
  };
  
  if (token) {
    headers['X-Token'] = token;
  }
  if (walletDid) {
    headers['X-Wallet-Did'] = walletDid;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

function normalizeUserPayload(rawUser = {}) {
  const displayName = (rawUser.display_name || rawUser.displayName || '').trim();
  const fullName = [rawUser.first_name, rawUser.last_name]
    .filter(Boolean)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  const fallbackFromEmail = rawUser.email ? rawUser.email.split('@')[0] : '';
  const derivedName = displayName || fullName || fallbackFromEmail;

  return {
    ...rawUser,
    displayName,
    name: derivedName,
  };
}

// User APIs
export async function didAuthChallenge(did, audience = 'worldpass-mobile') {
  return apiRequest(AUTH_CHALLENGE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ did, audience }),
  });
}

export async function didAuthVerify({ did, challenge, signature, displayName }) {
  const data = await apiRequest(AUTH_VERIFY_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ did, challenge, signature, displayName }),
  });
  if (data.token) {
    await setToken(data.token);
  }
  return data;
}

export async function getUserProfile() {
  const account = await apiRequest(ACCOUNT_PROFILE_ENDPOINT);
  let profileData = {};

  try {
    const profileResp = await apiRequest(PROFILE_DATA_ENDPOINT);
    profileData = profileResp?.profile_data || {};
  } catch (err) {
    console.warn('Failed to fetch extended profile data', err?.message || err);
  }

  return {
    ...normalizeUserPayload(account?.user || account || {}),
    profile_data: profileData,
  };
}

export async function updateUserProfile(updates = {}) {
  const accountPayload = {};
  const profileDataIncluded = Object.prototype.hasOwnProperty.call(updates, 'profile_data');

  if (
    Object.prototype.hasOwnProperty.call(updates, 'display_name') ||
    Object.prototype.hasOwnProperty.call(updates, 'displayName') ||
    Object.prototype.hasOwnProperty.call(updates, 'name')
  ) {
    const desiredName =
      updates.display_name ?? updates.displayName ?? updates.name;
    if (typeof desiredName === 'string') {
      accountPayload.display_name = desiredName.trim();
    }
  }

  ['email', 'theme', 'avatar', 'phone', 'lang', 'otp_enabled'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      accountPayload[key] = updates[key];
    }
  });

  let latestAccount;
  if (Object.keys(accountPayload).length > 0) {
    const accountResp = await apiRequest(ACCOUNT_PROFILE_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(accountPayload),
    });
    latestAccount = normalizeUserPayload(accountResp?.user || accountResp || {});
  }

  let latestProfileData;
  if (profileDataIncluded) {
    const profileResp = await apiRequest(PROFILE_DATA_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ profile_data: updates.profile_data || {} }),
    });
    latestProfileData = profileResp?.profile_data || updates.profile_data || {};
  }

  return {
    ...(latestAccount || {}),
    ...(profileDataIncluded ? { profile_data: latestProfileData } : {}),
  };
}

export async function linkDid(did) {
  return apiRequest('/api/user/did-link', {
    method: 'POST',
    body: JSON.stringify({ did }),
  });
}

// Credential APIs
export async function lookupCredential(recipientId) {
  return apiRequest(`/api/recipient/lookup/${recipientId}`);
}

export async function verifyCredential(vc) {
  return apiRequest('/api/verify', {
    method: 'POST',
    body: JSON.stringify({ vc }),
  });
}

// Issuer APIs
export async function getIssuerToken() {
  return await AsyncStorage.getItem('issuer_token');
}

export async function setIssuerToken(token) {
  await AsyncStorage.setItem('issuer_token', token);
}

export async function clearIssuerToken() {
  await AsyncStorage.removeItem('issuer_token');
}

export async function issuerApiRequest(endpoint, options = {}) {
  const token = await getIssuerToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['X-Token'] = token;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function registerIssuer(data) {
  const result = await issuerApiRequest('/api/issuer/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (result.token) {
    await setIssuerToken(result.token);
  }
  return result;
}

export async function loginIssuer(data) {
  const result = await issuerApiRequest('/api/issuer/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (result.token) {
    await setIssuerToken(result.token);
  }
  return result;
}

export async function getIssuerProfile() {
  return issuerApiRequest('/api/issuer/profile');
}

export async function updateIssuerProfile(data) {
  return issuerApiRequest('/api/issuer/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getIssuerStats() {
  return issuerApiRequest('/api/issuer/stats');
}

export async function listIssuerCredentials(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `/api/issuer/credentials?${query}` : '/api/issuer/credentials';
  return issuerApiRequest(endpoint);
}

export async function listIssuerTemplates() {
  return issuerApiRequest('/api/issuer/templates');
}

export async function createIssuerTemplate(template) {
  return issuerApiRequest('/api/issuer/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export async function updateIssuerTemplate(templateId, updates) {
  return issuerApiRequest(`/api/issuer/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteIssuerTemplate(templateId) {
  return issuerApiRequest(`/api/issuer/templates/${templateId}`, {
    method: 'DELETE',
  });
}

// Template management for regular users (from web api.js)
export async function createTemplate(template) {
  return apiRequest('/api/user/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

export async function listTemplates() {
  return apiRequest('/api/user/templates');
}

export async function updateTemplate(templateId, updates) {
  return apiRequest(`/api/user/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTemplate(templateId) {
  return apiRequest(`/api/user/templates/${templateId}`, {
    method: 'DELETE',
  });
}

export async function lookupRecipient(recipientId) {
  return apiRequest(`/api/recipient/${recipientId}`);
}

// Challenge APIs (for offline VC verification)
export async function newChallenge(audience = 'worldpass-mobile', exp_secs = 120) {
  return apiRequest('/api/challenge/new', {
    method: 'POST',
    body: JSON.stringify({ audience, exp_secs }),
  });
}

// Presentation verification
export async function verifyPresentation(presentation) {
  return apiRequest('/api/present/verify', {
    method: 'POST',
    body: JSON.stringify(presentation),
  });
}

// Payment APIs
export async function createPaymentIntent(data) {
  return apiRequest('/api/payment/intent', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listTransactions(status) {
  const endpoint = status
    ? `/api/payment/transactions?status=${status}`
    : '/api/payment/transactions';
  return apiRequest(endpoint);
}

// 2FA APIs
export async function setup2FA() {
  return apiRequest('/api/user/2fa/setup', { method: 'POST' });
}

export async function enable2FA(otp_code) {
  return apiRequest('/api/user/2fa/enable', {
    method: 'POST',
    body: JSON.stringify({ otp_code }),
  });
}

export async function disable2FA(otp_code) {
  return apiRequest('/api/user/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ otp_code }),
  });
}

// VC Management APIs
export async function exportUserCredentials() {
  const token = await getToken();
  const walletDid = await getDID();
  const headers = {
    'X-Token': token,
    'X-Wallet-Did': walletDid,
  };

  const response = await fetch(`${API_BASE}/api/vc/export`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Export failed');
  }

  return response.json();
}

export async function addVCToWallet(vc) {
  return apiRequest('/api/user/vc/add', {
    method: 'POST',
    body: JSON.stringify({ vc }),
  });
}

export async function listUserVCs() {
  return apiRequest('/api/user/vcs');
}

export async function deleteUserVC(vc_id) {
  return apiRequest(`/api/user/vcs/${vc_id}`, {
    method: 'DELETE',
  });
}

// Share token for QR/NFC sharing
export async function createShareToken(vc_id, expires_in_secs = 300) {
  return apiRequest('/api/share/token', {
    method: 'POST',
    body: JSON.stringify({ vc_id, expires_in_secs }),
  });
}

export async function getSharedVC(token) {
  return apiRequest(`/api/share/${token}`);
}
