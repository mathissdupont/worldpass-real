// /src/lib/auth.js
import { loadProfile, saveProfile } from "./storage";

const KEY_SESSION = "wp_session";
const KEY_USERS   = "wp_users"; // { [email]: { email, name, did, salt_b64, hash_b64, createdAt } }

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
export function isAuthed(){ return !!getSession()?.email; }
export function setSession({ email }){
  localStorage.setItem(KEY_SESSION, JSON.stringify({ email, at: Date.now() }));
  // profile'e de yansıt
  const p = loadProfile() || {};
  saveProfile({ ...p, email });
}
export function clearSession(){ localStorage.removeItem(KEY_SESSION); }

export function getUser(email){
  const users = getUsers();
  return users[email.toLowerCase()] || null;
}

export async function registerUser({ email, firstName, lastName, password, did }) {
  email = email.toLowerCase().trim();
  const users = getUsers();
  if (users[email]) throw new Error("Email already registered.");
  if (!did) throw new Error("DID missing. Create/Load a keystore first.");

  const salt = rb(16);
  const hash = await hashPassword(password, salt);

  const name = `${firstName} ${lastName}`.trim();
  users[email] = {
    email, name, did,
    salt_b64: b64(salt),
    hash_b64: b64(hash),
    createdAt: Date.now()
  };
  setUsers(users);

  // profile tarafı (görünüm için)
  const p = loadProfile() || {};
  saveProfile({ ...p, email, displayName: name });
  return users[email];
}

export async function verifyUser(email, password) {
  email = (email || "").toLowerCase().trim();
  const u = getUser(email);
  if (!u) return null;
  const salt = Uint8Array.from(atob(u.salt_b64), c => c.charCodeAt(0));
  const want = Uint8Array.from(atob(u.hash_b64), c => c.charCodeAt(0));
  const got  = await hashPassword(password, salt);
  if (want.length !== got.length) return null;
  for (let i=0; i<want.length; i++) if (want[i] !== got[i]) return null;
  return u;
}
