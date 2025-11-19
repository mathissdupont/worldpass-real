// /src/lib/auth.js
import { loadProfile, saveProfile } from "./storage";

const KEY_SESSION = "wp_session";
const KEY_TOKEN = "wp_token";
const KEY_USERS   = "wp_users"; // { [email]: { email, name, did, salt_b64, hash_b64, createdAt } }
const API_BASE = "/api";

// --------- helpers ----------
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const rb  = (n=16) => crypto.getRandomValues(new Uint8Array(n));

function getUsers() {
  try { return JSON.parse(localStorage.getItem(KEY_USERS) || "{}"); }
  catch { return {}; }
}
function setUsers(obj) {
  localStorage.setItem(KEY_USERS, JSON.stringify(obj));
}
async function sha256(strOrBytes) {
  const data = strOrBytes instanceof Uint8Array ? strOrBytes : enc.encode(strOrBytes);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

// password hash = SHA256( salt || password )
async function hashPassword(password, saltBytes) {
  const combo = new Uint8Array(saltBytes.length + enc.encode(password).length);
  combo.set(saltBytes, 0);
  combo.set(enc.encode(password), saltBytes.length);
  return sha256(combo);
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
}

export function getUser(email){
  const users = getUsers();
  return users[email.toLowerCase()] || null;
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

export async function verifyUser(email, password) {
  email = (email || "").toLowerCase().trim();
  
export async function verifyUser(email, password) {
  email = (email || "").toLowerCase().trim();
  
  // Authenticate with backend - no localStorage fallback
  const response = await fetch(`${API_BASE}/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
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
