import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { hash as argon2Hash, ArgonType } from 'argon2-browser';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/utils';

const enc = new TextEncoder();
const dec = new TextDecoder();

let wasmBinaryPromise = null;

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
  let normalized = str.replace(/-/g, '+').replace(/_/g, '/');
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

async function deriveKey(password, salt) {
  if (!password || !salt) {
    throw new Error('missing_kdf_params');
  }

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

export async function encryptKeystore(password, payload) {
  if (!password) throw new Error('missing_password');
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = await deriveKey(password, salt);
  const aes = gcm(key, nonce);
  const plaintext = enc.encode(JSON.stringify(payload));
  const ciphertext = aes.encrypt(plaintext);
  return {
    kty: 'wpks',
    version: 2,
    kdf: 'argon2id',
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
  if (blob.kdf && blob.kdf !== 'argon2id') {
    throw new Error('unsupported_kdf');
  }
  const salt = base64UrlToBytes(blob.salt);
  const nonce = base64UrlToBytes(blob.nonce);
  const ciphertext = base64UrlToBytes(blob.ct);
  const key = await deriveKey(password, salt);
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
