// src/lib/profileApi.js
// Helper module for profile-related backend API calls

const API_BASE = "/api";

function getWalletDid() {
  try {
    const storedIdentity = localStorage.getItem("worldpass_identity");
    if (!storedIdentity) return null;
    const parsed = JSON.parse(storedIdentity);
    return parsed?.did || null;
  } catch (err) {
    console.warn("Failed to read wallet DID", err);
    return null;
  }
}

function withWalletHeaders(headers = {}) {
  const walletDid = getWalletDid();
  if (walletDid) {
    return { ...headers, "X-Wallet-Did": walletDid };
  }
  return headers;
}

// Request deduplication: track in-flight requests
let pendingUpdateRequest = null;
let pendingUpdateTimer = null;

// Debounce timer for batching updates
const DEBOUNCE_DELAY = 500; // ms

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
    headers: withWalletHeaders({
      "X-Token": token,
    }),
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
 * Update user profile on backend (immediate, no debouncing)
 * @param {string} token - Auth token
 * @param {Object} patch - Profile fields to update
 * @returns {Promise<Object>} Updated profile data
 */
async function updateProfileImmediate(token, patch) {
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
    headers: withWalletHeaders({
      "Content-Type": "application/json",
      "X-Token": token,
    }),
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

/**
 * Update user profile on backend with debouncing and deduplication
 * @param {string} token - Auth token
 * @param {Object} patch - Profile fields to update
 * @param {Object} options - Options { immediate: boolean }
 * @returns {Promise<Object>} Updated profile data
 */
export async function updateProfile(token, patch, options = {}) {
  // If immediate flag is set, bypass debouncing
  if (options.immediate) {
    return updateProfileImmediate(token, patch);
  }

  // Cancel any pending debounced update
  if (pendingUpdateTimer) {
    clearTimeout(pendingUpdateTimer);
    pendingUpdateTimer = null;
  }

  // If there's already a request in flight, wait for it
  if (pendingUpdateRequest) {
    try {
      await pendingUpdateRequest;
    } catch {
      // Ignore errors from previous request
    }
  }

  // Create a new debounced request
  return new Promise((resolve, reject) => {
    pendingUpdateTimer = setTimeout(async () => {
      pendingUpdateTimer = null;
      
      // Create the request promise
      pendingUpdateRequest = updateProfileImmediate(token, patch);
      
      try {
        const result = await pendingUpdateRequest;
        pendingUpdateRequest = null;
        resolve(result);
      } catch (error) {
        pendingUpdateRequest = null;
        reject(error);
      }
    }, DEBOUNCE_DELAY);
  });
}
