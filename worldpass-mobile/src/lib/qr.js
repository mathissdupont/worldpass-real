/**
 * QR code utilities for WorldPass mobile
 * Matches web implementation using react-native-qrcode-svg
 */

/**
 * Parse QR code data and determine its type
 * @param {string} data - Raw QR data
 * @returns {{type: string, data: any, raw: string}}
 */
export function parseQRData(data) {
  if (!data || typeof data !== 'string') {
    return { type: 'unknown', data: null, raw: data };
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(data);
    
    // Check if it's a DID
    if (parsed.did && typeof parsed.did === 'string' && parsed.did.startsWith('did:')) {
      return { type: 'did', data: parsed, raw: data };
    }
    
    // Check if it's a Verifiable Credential
    if (parsed['@context'] || parsed.type?.includes('VerifiableCredential') || parsed.credentialSubject) {
      return { type: 'credential', data: parsed, raw: data };
    }
    
    // Check if it's a credential offer/issuance link
    if (parsed.offer || parsed.credentialOffer || parsed.issuance) {
      return { type: 'offer', data: parsed, raw: data };
    }
    
    // Check if it's a verification request
    if (parsed.challenge || parsed.verificationRequest || parsed.request) {
      return { type: 'verification_request', data: parsed, raw: data };
    }
    
    // Check if it's a presentation
    if (parsed.type?.includes('VerifiablePresentation') || parsed.verifiableCredential) {
      return { type: 'presentation', data: parsed, raw: data };
    }
    
    // Generic JSON
    return { type: 'json', data: parsed, raw: data };
  } catch (err) {
    // Not JSON
  }
  
  // Check if it's a plain DID
  if (data.startsWith('did:')) {
    return { type: 'did', data: { did: data }, raw: data };
  }
  
  // Check if it's a URL
  if (data.startsWith('http://') || data.startsWith('https://')) {
    return { type: 'url', data: { url: data }, raw: data };
  }
  
  // Unknown format
  return { type: 'unknown', data: data, raw: data };
}

/**
 * Format data for QR encoding
 * @param {any} data - Data to encode (object will be JSON stringified)
 * @returns {string}
 */
export function formatForQR(data) {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}

/**
 * Create a credential QR payload
 * @param {object} credential - VC object
 * @returns {string}
 */
export function createCredentialQR(credential) {
  return formatForQR(credential);
}

/**
 * Create a DID QR payload
 * @param {string} did - DID string
 * @param {object} metadata - Optional metadata (name, etc.)
 * @returns {string}
 */
export function createDIDQR(did, metadata = {}) {
  return formatForQR({
    did,
    ...metadata,
  });
}

/**
 * Create a verification request QR payload
 * @param {object} request - Verification request
 * @returns {string}
 */
export function createVerificationRequestQR(request) {
  return formatForQR({
    verificationRequest: true,
    ...request,
  });
}
