// web/src/lib/crypto.js

// --- Argon2 (WASM) ---
import { hash as argon2Hash, ArgonType } from "argon2-browser";
import argon2WasmURL from "argon2-browser/dist/argon2.wasm?url";

import nacl from "tweetnacl";

const enc = new TextEncoder();
const dec = new TextDecoder();

// --- base64url helpers ---
const toU8 = (buf) =>
  buf instanceof Uint8Array
    ? buf
    : buf instanceof ArrayBuffer
      ? new Uint8Array(buf)
      : new Uint8Array(buf);

export const b64u = (buf) => {
  const b = toU8(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const b64uToBytes = (s) => {
  if (!s || typeof s !== "string") throw new Error("bad_b64u");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out; // Uint8Array
};

// DID (did:key:z + pk b64url)
export function didFromPk(pkBytes) {
  return `did:key:z${b64u(pkBytes)}`;
}

// --- KDF ---
const PBKDF2_ROUNDS = 300_000;

async function derivePbkdf2Key(password, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ROUNDS },
    baseKey,
    256,
  );
  return crypto.subtle.importKey(
    "raw",
    new Uint8Array(bits),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function deriveKey(password, salt /* Uint8Array */, preference = "auto") {
  const normalized = (preference || "auto").toLowerCase();
  const wantsArgon =
    normalized === "argon2id" ||
    (normalized === "auto" && typeof WebAssembly !== "undefined");

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

      const keyBytes = new Uint8Array(
        res.hashHex.match(/.{1,2}/g).map((h) => parseInt(h, 16)),
      );

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      );

      return { key: cryptoKey, kdf: "argon2id" };
    } catch (err) {
      if (normalized === "argon2id") throw err;
      console.warn("Argon2 failed, falling back to PBKDF2:", err?.message || err);
    }
  }

  const cryptoKey = await derivePbkdf2Key(password, salt);
  return { key: cryptoKey, kdf: "pbkdf2-sha256" };
}

// --- Keystore helpers ---
function assertKeystoreBlob(blob) {
  if (!blob || typeof blob !== "object") throw new Error("bad_keystore");
  if (blob.kty !== "wpks") throw new Error("bad_keystore");
  if (blob.version !== 2) throw new Error("unsupported_version");

  const kdf = (blob.kdf || "").toLowerCase();
  if (!["argon2id", "pbkdf2-sha256"].includes(kdf)) throw new Error("unsupported_kdf");

  if (typeof blob.salt !== "string" || typeof blob.nonce !== "string" || typeof blob.ct !== "string") {
    throw new Error("bad_keystore");
  }

  const salt = b64uToBytes(blob.salt);
  const nonce = b64uToBytes(blob.nonce);
  const ct = b64uToBytes(blob.ct);

  if (salt.length !== 16) throw new Error("bad_keystore");
  if (nonce.length !== 12) throw new Error("bad_keystore");
  if (ct.length < 1) throw new Error("bad_keystore");

  return { kdf, salt, nonce, ct };
}

function aadFor(blobLike) {
  // Metadata’yı ciphertext’e bağla (format karışmasın)
  const kdf = (blobLike.kdf || "").toLowerCase();
  return enc.encode(`wpks|v2|${kdf}|${blobLike.salt}|${blobLike.nonce}`);
}

// Keystore encrypt (v2)
export async function encryptKeystore(password, payloadObj, kdfPreference = "pbkdf2-sha256") {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const saltB64u = b64u(salt);
  const nonceB64u = b64u(iv);

  const pref = (kdfPreference || "pbkdf2-sha256").toLowerCase();
  const { key, kdf } = await deriveKey(password, salt, pref);

  const blobLike = { kdf, salt: saltB64u, nonce: nonceB64u };
  const pt = enc.encode(JSON.stringify(payloadObj));

  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aadFor(blobLike) },
    key,
    pt,
  );

  return {
    kty: "wpks",
    version: 2,
    kdf,
    salt: saltB64u,
    nonce: nonceB64u,
    ct: b64u(ct),
  };
}

export async function decryptKeystore(password, blob) {
  const { kdf, salt, nonce, ct } = assertKeystoreBlob(blob);
  const { key } = await deriveKey(password, salt, kdf);

  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce, additionalData: aadFor(blob) },
      key,
      ct,
    );
    const obj = JSON.parse(dec.decode(pt));
    if (!obj || typeof obj !== "object") throw new Error("bad_payload");
    return obj;
  } catch {
    // Yanlış şifre / bozuk dosya
    throw new Error("bad_password_or_corrupt");
  }
}

// --- Ed25519 ---
export function ed25519Generate() {
  const kp = nacl.sign.keyPair();
  // TweetNaCl: secretKey 64 byte, ilk 32 byte seed
  return { sk: kp.secretKey, pk: kp.publicKey };
}

export function ed25519Sign(sk, msgBytes) {
  return nacl.sign.detached(new Uint8Array(msgBytes), new Uint8Array(sk));
}
