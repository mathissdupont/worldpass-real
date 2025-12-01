import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { hash as argon2Hash, ArgonType } from 'argon2-browser';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const PBKDF2_ROUNDS = 300000;
const SUPPORTED_KDFS = ['argon2id', 'pbkdf2-sha256'];

let wasmBinaryPromise = null;
let ed25519Promise = null;

// Cache ed25519 import for performance
async function getEd25519() {
  if (!ed25519Promise) {
    ed25519Promise = import('@noble/curves/ed25519.js').then(m => m.ed25519);
  }
  return ed25519Promise;
}

function toUint8(value) {
  if (!value) return new Uint8Array();
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer);
  if (typeof value === 'string') return enc.encode(value);
  throw new Error('unsupported_buffer');
}

export function bytesToBase64Url(bytes) {
  const view = toUint8(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  const b64 = (typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64'));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(str) {
  if (!str || typeof str !== 'string') {
    throw new Error('invalid_base64url');
  }
  let normalized = str.trim();
  if (!normalized) {
    throw new Error('invalid_base64url');
  }
  normalized = normalized.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) {
    normalized += '=';
  }
  const binary = (typeof atob === 'function'
    ? atob(normalized)
    : Buffer.from(normalized, 'base64').toString('binary'));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function loadWasmBinary() {
  if (Platform.OS === 'web') {
    return undefined;
  }

  if (!wasmBinaryPromise) {
    wasmBinaryPromise = (async () => {
      try {
        const asset = Asset.fromModule(require('argon2-browser/dist/argon2.wasm'));
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        const fileUri = asset.localUri || asset.uri;
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const buffer = Buffer.from(base64, 'base64');
        return new Uint8Array(buffer);
      } catch (err) {
        console.warn('Falling back to remote argon2 WASM', err?.message || err);
        const response = await fetch('https://cdn.jsdelivr.net/npm/argon2-browser@1.18.0/dist/argon2.wasm');
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    })();
  }

  return wasmBinaryPromise;
}

function ensureWasmLoader() {
  if (Platform.OS === 'web') {
    return;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.loadArgon2WasmBinary !== 'function') {
    globalThis.loadArgon2WasmBinary = () => loadWasmBinary();
  }
}

ensureWasmLoader();

async function deriveArgon2Key(password, salt) {
  const params = {
    pass: password,
    salt: toUint8(salt),
    time: 3,
    mem: 64 * 1024,
    parallelism: 2,
    hashLen: 32,
    type: ArgonType.Argon2id,
  };

  const result = await argon2Hash(params);
  if (result?.hash instanceof Uint8Array) {
    return result.hash;
  }
  if (result?.hashHex) {
    const bytes = new Uint8Array(result.hashHex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(result.hashHex.substr(i * 2, 2), 16);
    }
    return bytes;
  }
  throw new Error('argon2_failed');
}

function derivePbkdfKey(password, salt) {
  return pbkdf2(sha256, toUint8(password), toUint8(salt), {
    c: PBKDF2_ROUNDS,
    dkLen: 32,
  });
}

async function deriveKey(password, salt, preference = 'auto') {
  if (!password || !salt) {
    throw new Error('missing_kdf_params');
  }

  const normalized = typeof preference === 'string' ? preference.toLowerCase() : preference;
  if (normalized && normalized !== 'auto' && !SUPPORTED_KDFS.includes(normalized)) {
    throw new Error('unsupported_kdf');
  }

  const canUseArgon = typeof WebAssembly !== 'undefined';
  if ((normalized === 'auto' || normalized === 'argon2id') && canUseArgon) {
    try {
      const key = await deriveArgon2Key(password, salt);
      return { key, kdf: 'argon2id' };
    } catch (err) {
      if (normalized === 'argon2id') {
        throw err;
      }
      console.warn('Argon2 derivation failed, falling back to PBKDF2:', err?.message || err);
    }
  } else if (normalized === 'argon2id') {
    throw new Error('argon2_unavailable');
  }

  const key = derivePbkdfKey(password, salt);
  return { key, kdf: 'pbkdf2-sha256' };
}

export async function encryptKeystore(password, payload) {
  if (!password) throw new Error('missing_password');
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const { key, kdf } = await deriveKey(password, salt, 'auto');
  const aes = gcm(key, nonce);
  const plaintext = enc.encode(JSON.stringify(payload));
  const ciphertext = aes.encrypt(plaintext);
  return {
    kty: 'wpks',
    version: 2,
    kdf,
    salt: bytesToBase64Url(salt),
    nonce: bytesToBase64Url(nonce),
    ct: bytesToBase64Url(ciphertext),
  };
}

export async function decryptKeystore(password, blob) {
  if (!password) throw new Error('missing_password');
  if (!blob || typeof blob !== 'object') {
    throw new Error('invalid_keystore');
  }
  const requestedKdf = (blob.kdf || 'argon2id').toLowerCase();
  if (!SUPPORTED_KDFS.includes(requestedKdf)) {
    throw new Error('unsupported_kdf');
  }
  const salt = base64UrlToBytes(blob.salt);
  const nonce = base64UrlToBytes(blob.nonce);
  const ciphertext = base64UrlToBytes(blob.ct);
  const { key } = await deriveKey(password, salt, requestedKdf);
  const aes = gcm(key, nonce);
  try {
    const plaintext = aes.decrypt(ciphertext);
    const parsed = JSON.parse(dec.decode(plaintext));
    if (!parsed?.did) {
      throw new Error('missing_did');
    }
    return parsed;
  } catch (err) {
    if (err?.message === 'missing_did') {
      throw err;
    }
    const message = err?.message || '';
    if (/auth/i.test(message) || /decrypt/i.test(message)) {
      throw new Error('invalid_password');
    }
    throw new Error('keystore_decrypt_failed');
  }
}

export function didFromPublicKey(pkBytes) {
  return `did:key:z${bytesToBase64Url(pkBytes)}`;
}

/**
 * Generate a new Ed25519 identity (DID + keypair)
 * @returns {Promise<{did: string, sk_b64u: string, pk_b64u: string}>}
 */
export async function generateIdentity() {
  // Use cached ed25519 import
  const ed25519 = await getEd25519();
  
  // Generate random private key (32 bytes)
  const privateKey = randomBytes(32);
  
  // Derive public key
  const publicKey = ed25519.getPublicKey(privateKey);
  
  // Create DID from public key
  // Using did:key format with multicodec prefix for Ed25519 (0xed01)
  const multicodecPrefix = new Uint8Array([0xed, 0x01]);
  const prefixedPubKey = new Uint8Array(multicodecPrefix.length + publicKey.length);
  prefixedPubKey.set(multicodecPrefix);
  prefixedPubKey.set(publicKey, multicodecPrefix.length);
  
  const did = `did:key:z${bytesToBase64Url(prefixedPubKey)}`;
  
  return {
    did,
    sk_b64u: bytesToBase64Url(privateKey),
    pk_b64u: bytesToBase64Url(publicKey),
  };
}

/**
 * Sign a message with Ed25519
 * @param {Uint8Array|string} skBytes - Private key (32 bytes) in Uint8Array or base64url string
 * @param {Uint8Array|string} message - Message to sign
 * @returns {Promise<Uint8Array>} Signature (64 bytes)
 */
export async function ed25519Sign(skBytes, message) {
  const ed25519 = await getEd25519();
  const sk = typeof skBytes === 'string' ? base64UrlToBytes(skBytes) : toUint8(skBytes);
  const msg = typeof message === 'string' ? enc.encode(message) : toUint8(message);
  return ed25519.sign(msg, sk);
}

/**
 * Verify an Ed25519 signature
 * @param {Uint8Array|string} pkBytes - Public key (32 bytes)
 * @param {Uint8Array|string} message - Original message
 * @param {Uint8Array|string} signature - Signature (64 bytes)
 * @returns {Promise<boolean>}
 */
export async function ed25519Verify(pkBytes, message, signature) {
  const ed25519 = await getEd25519();
  try {
    const pk = typeof pkBytes === 'string' ? base64UrlToBytes(pkBytes) : toUint8(pkBytes);
    const msg = typeof message === 'string' ? enc.encode(message) : toUint8(message);
    const sig = typeof signature === 'string' ? base64UrlToBytes(signature) : toUint8(signature);
    return ed25519.verify(sig, msg, pk);
  } catch (err) {
    console.warn('Signature verification failed:', err?.message || err);
    return false;
  }
}

/**
 * Create JWS message for VC signing (matches backend format)
 * @param {object} header - JWT header
 * @param {object} payload - VC body
 * @returns {string} base64url(header).base64url(payload)
 */
function jwsMessage(header, payload) {
  const headerB64 = bytesToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(enc.encode(JSON.stringify(payload)));
  return `${headerB64}.${payloadB64}`;
}

/**
 * Sign a Verifiable Credential (matches backend core/vc.py format)
 * @param {object} vcBody - VC without proof
 * @param {string} sk_b64u - Issuer's private key (base64url)
 * @param {string} pk_b64u - Issuer's public key (base64url)
 * @param {string} verificationMethod - Verification method (e.g., "did:key:z...#key-1")
 * @returns {Promise<object>} VC with proof section
 */
export async function signVC(vcBody, sk_b64u, pk_b64u, verificationMethod) {
  const header = { alg: 'EdDSA', typ: 'JWT' };
  const payload = { ...vcBody };
  
  // Create JWS message to sign
  const message = jwsMessage(header, payload);
  
  // Sign the message
  const signature = await ed25519Sign(sk_b64u, message);
  
  // Build proof object (matches backend format)
  const proof = {
    type: 'Ed25519Signature2020',
    created: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    proofPurpose: 'assertionMethod',
    verificationMethod,
    jws: bytesToBase64Url(signature),
    issuer_pk_b64u: pk_b64u,
  };
  
  // Return VC with proof
  return {
    ...payload,
    proof,
  };
}

/**
 * Verify a Verifiable Credential signature
 * @param {object} vcSigned - VC with proof section
 * @returns {Promise<{valid: boolean, reason: string, issuer?: string, subject?: string}>}
 */
export async function verifyVC(vcSigned) {
  try {
    const proof = vcSigned?.proof;
    if (!proof) {
      return { valid: false, reason: 'missing_proof' };
    }
    
    const { jws, issuer_pk_b64u } = proof;
    if (!jws || !issuer_pk_b64u) {
      return { valid: false, reason: 'incomplete_proof' };
    }
    
    // Reconstruct the message that was signed
    const header = { alg: 'EdDSA', typ: 'JWT' };
    const payload = { ...vcSigned };
    delete payload.proof;
    
    const message = jwsMessage(header, payload);
    
    // Verify the signature
    const isValid = await ed25519Verify(issuer_pk_b64u, message, jws);
    
    if (!isValid) {
      return { valid: false, reason: 'invalid_signature' };
    }
    
    // Extract issuer and subject
    const issuer = vcSigned.issuer;
    const subject = vcSigned.credentialSubject?.id;
    
    return {
      valid: true,
      reason: 'ok',
      issuer,
      subject,
    };
  } catch (err) {
    console.warn('VC verification error:', err?.message || err);
    return {
      valid: false,
      reason: 'verification_error',
      error: err?.message,
    };
  }
}
