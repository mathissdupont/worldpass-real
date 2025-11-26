// API client for WorldPass backend
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_API_BASE = Platform.select({
  ios: 'http://localhost:8000',
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || '').replace(/\/$/, '')
  || (__DEV__ ? LOCAL_API_BASE : 'https://worldpass.tech');

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

// User APIs
export async function login(email, password) {
  const data = await apiRequest('/api/user/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    await setToken(data.token);
  }
  return data;
}

export async function register(email, password, name) {
  const data = await apiRequest('/api/user/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  if (data.token) {
    await setToken(data.token);
  }
  return data;
}

export async function getUserProfile() {
  return apiRequest('/api/user/profile');
}

export async function updateUserProfile(updates) {
  return apiRequest('/api/user/profile', {
    method: 'POST',
    body: JSON.stringify(updates),
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
