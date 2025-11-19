// src/lib/profileApi.js
// Helper module for profile-related backend API calls

const API_BASE = "/api";

/**
 * Fetch user profile from backend
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Profile data
 */
export async function fetchProfile(token) {
  if (!token) {
    throw new Error("Token required");
  }

  const response = await fetch(`${API_BASE}/user/profile`, {
    method: "GET",
    headers: {
      "X-Token": token,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch profile");
  }

  const data = await response.json();
  
  // Transform backend response to frontend format
  return {
    displayName: data.user.display_name || "",
    email: data.user.email || "",
    phone: data.user.phone || "",
    avatar: data.user.avatar || "",
    otpEnabled: !!data.user.otp_enabled,
    lang: data.user.lang || "en",
    theme: data.user.theme || "light",
  };
}

/**
 * Update user profile on backend
 * @param {string} token - Auth token
 * @param {Object} patch - Profile fields to update
 * @returns {Promise<Object>} Updated profile data
 */
export async function updateProfile(token, patch) {
  if (!token) {
    throw new Error("Token required");
  }

  // Transform frontend format to backend format
  const payload = {};
  if (patch.displayName !== undefined) payload.display_name = patch.displayName;
  if (patch.email !== undefined) payload.email = patch.email;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (patch.avatar !== undefined) payload.avatar = patch.avatar;
  if (patch.otpEnabled !== undefined) payload.otp_enabled = patch.otpEnabled;
  if (patch.lang !== undefined) payload.lang = patch.lang;
  if (patch.theme !== undefined) payload.theme = patch.theme;

  const response = await fetch(`${API_BASE}/user/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Token": token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update profile");
  }

  const data = await response.json();
  
  // Return the updated profile in frontend format
  return {
    displayName: data.user.display_name || patch.displayName || "",
    email: data.user.email || patch.email || "",
    phone: data.user.phone || patch.phone || "",
    avatar: data.user.avatar || patch.avatar || "",
    otpEnabled: data.user.otp_enabled !== undefined ? !!data.user.otp_enabled : !!patch.otpEnabled,
    lang: data.user.lang || patch.lang || "en",
    theme: data.user.theme || patch.theme || "light",
  };
}
