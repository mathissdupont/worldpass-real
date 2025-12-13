/**
 * WorldPass Client-Side Encryption
 * ================================
 * 
 * Encrypts credentials before sending to IPFS
 * User holds decryption keys - zero-knowledge architecture
 */

import { ec as EC } from 'elliptic';
import CryptoJS from 'crypto-js';

const ec = new EC('secp256k1');

/**
 * Generate encryption keypair from user's DID
 * @param {string} userDID - User's DID
 * @returns {Object} { privateKey, publicKey }
 */
export function generateEncryptionKeys(userDID) {
  // Derive keypair from DID (in production, use proper key derivation)
  const hash = CryptoJS.SHA256(userDID).toString();
  const keyPair = ec.keyFromPrivate(hash);
  
  return {
    privateKey: keyPair.getPrivate('hex'),
    publicKey: keyPair.getPublic('hex')
  };
}

/**
 * Encrypt credential with user's public key
 * @param {Object} credential - VC object to encrypt
 * @param {string} publicKey - Recipient's public key (hex)
 * @returns {string} Encrypted data (base64)
 */
export function encryptCredential(credential, publicKey) {
  const jsonString = JSON.stringify(credential);
  
  // Generate ephemeral key for this encryption
  const ephemeralKey = ec.genKeyPair();
  const sharedSecret = ephemeralKey.derive(ec.keyFromPublic(publicKey, 'hex').getPublic());
  
  // Use shared secret as AES key
  const key = CryptoJS.SHA256(sharedSecret.toString(16)).toString();
  const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
  
  return JSON.stringify({
    ephemeralPublicKey: ephemeralKey.getPublic('hex'),
    ciphertext: encrypted
  });
}

/**
 * Decrypt credential with user's private key
 * @param {string} encryptedData - Encrypted data (JSON string)
 * @param {string} privateKey - User's private key (hex)
 * @returns {Object} Decrypted credential
 */
export function decryptCredential(encryptedData, privateKey) {
  const { ephemeralPublicKey, ciphertext } = JSON.parse(encryptedData);
  
  // Derive shared secret
  const keyPair = ec.keyFromPrivate(privateKey);
  const ephemeralPubKey = ec.keyFromPublic(ephemeralPublicKey, 'hex');
  const sharedSecret = keyPair.derive(ephemeralPubKey.getPublic());
  
  // Decrypt with shared secret
  const key = CryptoJS.SHA256(sharedSecret.toString(16)).toString();
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8);
  
  return JSON.parse(decrypted);
}

/**
 * Store encrypted credential to IPFS via backend
 * @param {Object} credential - VC to store
 * @param {string} userPublicKey - User's public key
 * @returns {Promise<Object>} { ipfs_cid, tx_hash }
 */
export async function storeCredentialDistributed(credential, userPublicKey) {
  const encrypted = encryptCredential(credential, userPublicKey);
  
  const response = await fetch('/api/credentials/store-distributed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': localStorage.getItem('token')
    },
    body: JSON.stringify({
      vc_id: credential.id,
      encrypted_payload: encrypted,
      issuer_did: credential.issuer,
      subject_did: credential.credentialSubject.id
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to store credential');
  }
  
  return await response.json();
}

/**
 * Retrieve and decrypt credential from IPFS
 * @param {string} ipfsCID - IPFS Content Identifier
 * @param {string} userPrivateKey - User's private key
 * @returns {Promise<Object>} Decrypted credential
 */
export async function retrieveCredentialDistributed(ipfsCID, userPrivateKey) {
  const response = await fetch(`/api/credentials/retrieve-distributed/${ipfsCID}`, {
    headers: {
      'X-Token': localStorage.getItem('token')
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to retrieve credential');
  }
  
  const { encrypted_data } = await response.json();
  return decryptCredential(encrypted_data, userPrivateKey);
}

/**
 * Verify credential integrity on blockchain
 * @param {string} vcId - Credential ID
 * @param {string} ipfsCID - IPFS CID
 * @returns {Promise<boolean>} True if verified
 */
export async function verifyCredentialIntegrity(vcId, ipfsCID) {
  const response = await fetch('/api/credentials/verify-integrity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vc_id: vcId, ipfs_cid: ipfsCID })
  });
  
  if (!response.ok) {
    return false;
  }
  
  const { verified } = await response.json();
  return verified;
}

/**
 * Get user's encryption keys from DID (stored in localStorage)
 * @param {string} userDID - User's DID
 * @returns {Object} { privateKey, publicKey }
 */
export function getUserEncryptionKeys(userDID) {
  const stored = localStorage.getItem(`encryption_keys_${userDID}`);
  
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Generate new keys
  const keys = generateEncryptionKeys(userDID);
  localStorage.setItem(`encryption_keys_${userDID}`, JSON.stringify(keys));
  
  return keys;
}
