// /src/lib/auth.js
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
  
  // Also save to chrome.storage.local if extension is available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ worldpass_token: token }).catch(() => {
      // Silently fail if not in extension context
    });
  }
}

export function isAuthed(){ return !!getSession()?.email; }

export function setSession({ email, token }){
  localStorage.setItem(KEY_SESSION, JSON.stringify({ email, at: Date.now() }));
  if (token) {
    setToken(token);
  }
  // profile'e de yansıt
  const p = loadProfile() || {};
  saveProfile({ ...p, email });
}

export function clearSession(){ 
  localStorage.removeItem(KEY_SESSION); 
  localStorage.removeItem(KEY_TOKEN);
  emitTokenChanged(null);
  
  // Also remove from chrome.storage.local if extension is available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove(['worldpass_token', 'worldpass_credentials', 'last_sync']).catch(() => {
      // Silently fail if not in extension context
    });
  }
}

export async function registerUser({ email, firstName, lastName, password, did }) {
  email = email.toLowerCase().trim();
  
  // Register with backend - no localStorage fallback
  const response = await fetch(`${API_BASE}/user/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      firstName,
      lastName,
      password,
      did: did || "",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Registration failed" }));
    if (error.detail === "email_already_registered") {
      throw new Error("Email already registered.");
    }
    throw new Error(error.detail || "Registration failed. Please check your connection.");
  }

  const data = await response.json();
  
  // Store token and session
  setToken(data.token);
  setSession({ email, token: data.token });
  
  // Store user info in profile
  const name = `${firstName} ${lastName}`.trim();
  const p = await loadProfile().catch(() => ({}));
  await saveProfile({ ...p, email, displayName: name });
  
  return { email, name, did: did || "" };
}

export async function verifyUser(email, password, otpCode) {
  email = (email || "").toLowerCase().trim();
  
  const body = { email, password };
  if (otpCode) body.otp_code = otpCode;
  
  // Authenticate with backend - no localStorage fallback
  const response = await fetch(`${API_BASE}/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Authentication failed" }));
    if (error.detail === "invalid_credentials") {
      return null; // Invalid credentials
    }
    throw new Error(error.detail || "Authentication failed. Please check your connection.");
  }

  const data = await response.json();
  
  // Store token
  setToken(data.token);
  
  return { 
    email: data.user.email, 
    name: `${data.user.first_name} ${data.user.last_name}`.trim(),
    did: data.user.did 
  };
}
