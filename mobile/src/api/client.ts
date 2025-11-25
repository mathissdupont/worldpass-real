/**
 * API client for WorldPass backend
 * Mirrors the endpoints used by the web app
 */

import { API_BASE_URL } from '../constants/config';
import { getToken } from '../utils/storage';

/**
 * User login
 * POST /api/user/login
 */
export async function loginUser(email: string, password: string, otpCode?: string) {
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      password,
      ...(otpCode && { otp_code: otpCode }),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(error.detail || 'Authentication failed');
  }

  return await response.json();
}

/**
 * Fetch user profile
 * GET /api/user/profile
 */
export async function fetchUserProfile() {
  const token = await getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'GET',
    headers: {
      'X-Token': token,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch profile' }));
    throw new Error(error.detail || 'Failed to fetch profile');
  }

  const data = await response.json();
  
  // Transform backend response to frontend format
  return {
    displayName: data.user.display_name || '',
    email: data.user.email || '',
    phone: data.user.phone || '',
    avatar: data.user.avatar || '',
    otpEnabled: !!data.user.otp_enabled,
    lang: data.user.lang || 'en',
    theme: data.user.theme || 'light',
  };
}

/**
 * Update user profile
 * POST /api/user/profile
 */
export async function updateUserProfile(profileData: {
  displayName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  lang?: string;
  theme?: string;
}) {
  const token = await getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  // Transform frontend format to backend format
  const payload: any = {};
  if (profileData.displayName !== undefined) payload.display_name = profileData.displayName;
  if (profileData.email !== undefined) payload.email = profileData.email;
  if (profileData.phone !== undefined) payload.phone = profileData.phone;
  if (profileData.avatar !== undefined) payload.avatar = profileData.avatar;
  if (profileData.lang !== undefined) payload.lang = profileData.lang;
  if (profileData.theme !== undefined) payload.theme = profileData.theme;

  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(error.detail || 'Failed to update profile');
  }

  return await response.json();
}

/**
 * Get user profile data (encrypted personal data)
 * GET /api/user/profile-data
 */
export async function getUserProfileData() {
  const token = await getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/user/profile-data`, {
    method: 'GET',
    headers: {
      'X-Token': token,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile data');
  }

  return await response.json();
}
