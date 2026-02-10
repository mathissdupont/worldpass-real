// /src/lib/auth.js - DID-based authentication
import { loadProfile, saveProfile } from "./storage";

const KEY_SESSION = "wp_session";
const KEY_TOKEN = "wp_token";
export const TOKEN_CHANGED_EVENT = "wp:token-changed";
const API_BASE = "/api";

function emitTokenChanged(token) {
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(TOKEN_CHANGED_EVENT, { detail: token || null }));
    }
  } catch {
    // ignore
  }
}

// --------- public api ----------
export function getSession(){
  try { return JSON.parse(localStorage.getItem(KEY_SESSION) || "null"); }
  catch { return null; }
}

export function getToken(){
  try { return localStorage.getItem(KEY_TOKEN); }
  catch { return null; }
}

export function setToken(token){
  localStorage.setItem(KEY_TOKEN, token);
  emitTokenChanged(token);
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ worldpass_token: token }).catch(() => {});
  }
}

export function isAuthed(){ 
  return !!getSession()?.did; 
}

export function setSession({ did, displayName, token }){
  localStorage.setItem(KEY_SESSION, JSON.stringify({ did, displayName, at: Date.now() }));
  if (token) {
    setToken(token);
  }
  const p = loadProfile() || {};
  saveProfile({ ...p, did, displayName });
}

export function clearSession(){ 
  localStorage.removeItem(KEY_SESSION); 
  localStorage.removeItem(KEY_TOKEN);
  emitTokenChanged(null);
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove(['worldpass_token', 'worldpass_credentials', 'last_sync']).catch(() => {});
  }
}

/**
 * Authenticate with DID using challenge-response
 * @param {string} did - The user's DID
 * @param {Function} signChallenge - Function that signs the challenge (async)
 * @param {string} displayName - Optional display name
 * @returns {Promise<{token: string, user: object}>}
 */
export async function authenticateWithDID({ did, signChallenge, displayName }) {
  try {
    // 1. Get challenge from backend
    const challengeResp = await fetch(`${API_BASE}/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did, audience: "worldpass-web" })
    });

    if (!challengeResp.ok) {
      throw new Error("Failed to get challenge");
    }

    const { challenge, nonce } = await challengeResp.json();

    // 2. Sign the challenge with user's private key
    // Sign the challenge message returned by the server
    const signature = await signChallenge(challenge);

    // 3. Verify and authenticate
    const authResp = await fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        did,
        // send back the full challenge string so backend can verify the exact message
        challenge,
        signature,
        displayName: displayName || did.slice(0, 20) + "..."
      })
    });

    if (!authResp.ok) {
      const error = await authResp.json().catch(() => ({ detail: "Authentication failed" }));
      throw new Error(error.detail || "Authentication failed");
    }

    const data = await authResp.json();
    
    // Store token and session
    setToken(data.token);
    setSession({ 
      did, 
      displayName: displayName || data.user?.displayName || did.slice(0, 20) + "...",
      token: data.token 
    });
    
    return data;
  } catch (error) {
    console.error("DID authentication failed:", error);
    throw error;
  }
}

/**
 * Update user profile (display name, etc)
 */
export async function updateProfile(updates) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Update failed" }));
    throw new Error(error.detail || "Update failed");
  }

  const data = await response.json();
  
  // Update local session
  const session = getSession();
  if (session && updates.displayName) {
    setSession({ ...session, displayName: updates.displayName });
  }
  
  return data;
}

/**
 * Get current user profile
 */
export async function getUserProfile() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/user/profile`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  return response.json();
}

// Keep for backwards compatibility but deprecate
export async function verifyUser() {
  throw new Error("Email/password authentication is deprecated. Please use DID authentication.");
}

export async function registerUser() {
  throw new Error("Email/password registration is deprecated. Please use DID authentication.");
}
