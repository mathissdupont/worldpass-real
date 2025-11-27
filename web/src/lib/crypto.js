// web/src/lib/crypto.js

// --- Argon2 (WASM) ---
import { hash as argon2Hash, ArgonType } from 'argon2-browser';
import argon2WasmURL from 'argon2-browser/dist/argon2.wasm?url';

const enc = new TextEncoder();
const dec = new TextDecoder();

// --- yardımcılar ---
// --- base64url yardımcıları (güvenli) ---
const toU8 = (buf) => (buf instanceof Uint8Array ? buf :
  buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf));

export const b64u = (buf) => {
  const b = toU8(buf);
  let s = ""; for (let i=0;i<b.length;i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};

export const b64uToBytes = (s) => {
  if (!s || typeof s !== 'string') throw new Error('bad_b64u');
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;                  // 👈 Uint8Array döndür
};


// DID (did:key:z + pk b64url)
export function didFromPk(pkBytes){
  return `did:key:z${b64u(pkBytes)}`;
}

const PBKDF2_ROUNDS = 300_000;

async function derivePbkdf2Key(password, salt) {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ROUNDS },
    baseKey,
    256,
  );
  return crypto.subtle.importKey('raw', new Uint8Array(bits), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function deriveKey(password, salt /* Uint8Array */, preference = 'auto') {
  const normalized = (preference || 'auto').toLowerCase();
  const wantsArgon = normalized === 'argon2id' || (normalized === 'auto' && typeof WebAssembly !== 'undefined');

  if (wantsArgon) {
    try {
      const res = await argon2Hash({
        pass: password,
        salt,
        time: 3,
        mem: 64 * 1024,
        parallelism: 2,
        hashLen: 32,
        type: ArgonType.Argon2id,
        wasmPath: argon2WasmURL,
      });
      const keyBytes = new Uint8Array(res.hashHex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));
      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
      return { key: cryptoKey, kdf: 'argon2id' };
    } catch (err) {
      if (normalized === 'argon2id') throw err;
      console.warn('Argon2 derivation failed, falling back to PBKDF2:', err?.message || err);
    }
  }

  const cryptoKey = await derivePbkdf2Key(password, salt);
  return { key: cryptoKey, kdf: 'pbkdf2-sha256' };
}

// Keystore (v2 / PBKDF2-SHA256 + AES-GCM)
export async function encryptKeystore(password, payloadObj) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const { key } = await deriveKey(password, salt, 'pbkdf2-sha256');
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payloadObj)));
  return { kty: 'wpks', version: 2, kdf: 'pbkdf2-sha256', salt: b64u(salt), nonce: b64u(iv), ct: b64u(ct) };
}

export async function decryptKeystore(password, blob) {
  const requestedKdf = (blob.kdf || 'argon2id').toLowerCase();
  if (!['argon2id', 'pbkdf2-sha256'].includes(requestedKdf)) throw new Error('unsupported_kdf');

  const salt = b64uToBytes(blob.salt);
  const iv = b64uToBytes(blob.nonce);
  const ct = b64uToBytes(blob.ct);
  const { key } = await deriveKey(password, salt, requestedKdf);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(dec.decode(pt));
}

// Ed25519
import nacl from 'tweetnacl';
export function ed25519Generate(){
  const kp = nacl.sign.keyPair();
  return { sk: kp.secretKey, pk: kp.publicKey };
}
export function ed25519Sign(sk, msgBytes){
  return nacl.sign.detached(new Uint8Array(msgBytes), new Uint8Array(sk));
}
