# Verifiable Credential (VC) Format & Signature Specification

## Overview

WorldPass uses **Verifiable Credentials (VCs)** with **Ed25519Signature2020** proofs for secure, cryptographically-verifiable identity attestations. This document specifies the exact format used throughout the system.

## Credential Structure

### Complete VC Example

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "type": [
    "VerifiableCredential",
    "UniversityDegreeCredential"
  ],
  "issuer": "did:key:zMVwW63obqGmbJVCWvtvt4FBVDJGTwQS2QiSUevbF38A",
  "issuanceDate": "2024-01-15T10:30:00Z",
  "credentialSubject": {
    "id": "did:key:z6MkTestSubject123456789",
    "degree": "Bachelor of Science",
    "name": "Alice Smith",
    "graduationDate": "2024-05-15"
  },
  "jti": "vc-1234567890-abc123",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-15T10:30:05Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:key:zMVwW63obqGmbJVCWvtvt4FBVDJGTwQS2QiSUevbF38A#key-1",
    "jws": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJd...",
    "issuer_pk_b64u": "MVwW63obqGmbJVCWvtvt4FBVDJGTwQS2QiSUevbF38A"
  }
}
```

## Field Specifications

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@context` | Array<String> | Yes | JSON-LD context, must include W3C VC context |
| `type` | Array<String> | Yes | Must include "VerifiableCredential" plus specific type(s) |
| `issuer` | String (DID) | Yes | DID of the credential issuer |
| `issuanceDate` | String (ISO8601) | Yes | When the credential was issued |
| `credentialSubject` | Object | Yes | Claims about the credential subject |
| `credentialSubject.id` | String (DID) | Yes | DID of the credential subject/holder |
| `jti` | String | Yes | Unique identifier for this credential |
| `expirationDate` | String (ISO8601) | No | When the credential expires (optional) |
| `proof` | Object | Yes | Cryptographic proof of authenticity |

### Proof Object (Ed25519Signature2020)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | String | Yes | Must be "Ed25519Signature2020" |
| `created` | String (ISO8601) | Yes | When the signature was created |
| `proofPurpose` | String | Yes | Purpose of the proof, typically "assertionMethod" |
| `verificationMethod` | String | Yes | DID URL pointing to the verification key |
| `jws` | String | Yes | Base64URL-encoded signature (detached JWS) |
| `issuer_pk_b64u` | String | Yes | Issuer's public key (Base64URL) for verification |

## Cryptographic Process

### 1. Key Generation (During Issuer Approval)

```python
# Generate Ed25519 keypair
sk_bytes, pk_bytes = Ed25519Signer().generate_keypair()

# Convert to Base64URL encoding
sk_b64u = base64.urlsafe_b64encode(sk_bytes).decode().rstrip("=")
pk_b64u = base64.urlsafe_b64encode(pk_bytes).decode().rstrip("=")

# Generate DID from public key
issuer_did = f"did:key:z{pk_b64u}"
```

### 2. Signing Process

```python
def sign_vc(vc_body: Dict, signer: Signer, sk: bytes, 
            issuer_pk_b64u: str, verification_method: str) -> Dict:
    # 1. Create JWS header
    header = {"alg": "EdDSA", "typ": "JWT"}
    
    # 2. Prepare payload (VC without proof)
    payload = {**vc_body}  # Copy of VC without proof field
    
    # 3. Create signing message
    msg = b64u(json_encode(header)) + "." + b64u(json_encode(payload))
    
    # 4. Sign the message
    signature = signer.sign(sk, msg.encode())
    
    # 5. Create proof object
    proof = {
        "type": "Ed25519Signature2020",
        "created": datetime.utcnow().isoformat() + "Z",
        "proofPurpose": "assertionMethod",
        "verificationMethod": verification_method,
        "jws": b64u(signature),
        "issuer_pk_b64u": issuer_pk_b64u
    }
    
    # 6. Add proof to VC
    payload["proof"] = proof
    return payload
```

### 3. Verification Process

```python
def verify_vc(vc_signed: Dict, signer: Signer) -> Tuple[bool, str, str, str]:
    # 1. Extract proof
    proof = vc_signed.get("proof", {})
    jws = proof.get("jws")
    issuer_pk_b64u = proof.get("issuer_pk_b64u")
    
    if not (jws and issuer_pk_b64u):
        return False, "missing_proof", None, None
    
    # 2. Reconstruct the signed message
    header = {"alg": "EdDSA", "typ": "JWT"}
    payload = {k: v for k, v in vc_signed.items() if k != "proof"}
    msg = b64u(json_encode(header)) + "." + b64u(json_encode(payload))
    
    # 3. Verify signature
    try:
        sig = base64_decode(jws)
        pk = base64_decode(issuer_pk_b64u)
        signer.verify(pk, msg.encode(), sig)
    except Exception:
        return False, "invalid_signature", None, None
    
    # 4. Extract issuer and subject
    issuer = vc_signed.get("issuer")
    subject = vc_signed.get("credentialSubject", {}).get("id")
    
    return True, "ok", issuer, subject
```

## Issuance Flow

### Backend Endpoint: `POST /api/issuer/issue`

**Request:**
```json
{
  "vc": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiableCredential", "CustomType"],
    "issuer": "did:key:z...",
    "issuanceDate": "2024-01-15T10:30:00Z",
    "credentialSubject": {
      "id": "did:key:z...",
      "claim1": "value1"
    },
    "jti": "vc-unique-id"
  },
  "template_id": 123  // Optional
}
```

**Response:**
```json
{
  "ok": true,
  "vc_id": "vc-unique-id",
  "recipient_id": "VupwbMQVU6-210np",
  "vc": {
    // ... complete signed VC with proof
  }
}
```

**Important:** The frontend MUST use the signed VC from the response, not the original unsigned VC.

## Frontend Integration

### Issuing a Credential

```javascript
// 1. Create unsigned VC
const unsignedVC = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiableCredential', credentialType],
  issuer: issuerDid,
  issuanceDate: new Date().toISOString(),
  credentialSubject: {
    id: recipientDID,
    ...customData
  },
  jti: `vc-${Date.now()}-${randomString()}`
};

// 2. Send to backend for signing
const response = await issueCredential(null, unsignedVC, token, templateId);

// 3. ✅ USE the signed VC from response
const signedVC = response.vc;  // This has the proof!

// 4. Store/display the SIGNED VC
await storeCredential(signedVC);
generateQRCode(JSON.stringify(signedVC));
```

### Verifying a Credential

```javascript
// 1. Parse VC (from QR code, file upload, etc.)
const vc = JSON.parse(vcString);

// 2. Check for proof
if (!vc.proof || !vc.proof.jws) {
  throw new Error('VC is missing signature proof');
}

// 3. Send to backend for verification
const result = await verifyPresentation({
  type: "presentation",
  challenge: nonce,
  aud: audience,
  exp: expirationTimestamp,
  holder: {
    did: holderDid,
    pk_b64u: holderPublicKey,
    sig_b64u: holderSignature,
    alg: "Ed25519"
  },
  vc: vc
});

// 4. Check result
if (result.valid && !result.revoked) {
  console.log('✅ Valid credential');
} else {
  console.log('❌ Invalid or revoked credential');
}
```

## Security Considerations

### 1. Signature Verification is Mandatory
- **NEVER** accept a VC without a valid proof
- Always verify signatures before trusting VC claims
- Check revocation status for all VCs

### 2. Key Management
- Issuer private keys (`sk_b64u`) stored securely in database
- Keys generated during issuer approval
- Future: Support for Hardware Security Modules (HSMs)

### 3. Replay Protection
- Challenge-response protocol for presentations
- Nonces expire after configurable TTL
- Used nonces tracked in database

### 4. DID Resolution
- DIDs use `did:key` method for self-contained verification
- Public key embedded in DID: `did:key:z{pk_b64u}`
- No external resolution required

## Revocation

Credentials can be revoked by issuers:

```bash
POST /api/issuer/revoke
{
  "vc_id": "vc-unique-id"
}
```

Verification checks revocation status in `vc_status` table.

## Testing

### Unit Test Example

```python
def test_vc_signature():
    # Issue credential
    response = client.post("/api/issuer/issue", 
                          headers=issuer_headers,
                          json={"vc": unsigned_vc})
    
    signed_vc = response.json()["vc"]
    
    # Verify proof exists
    assert "proof" in signed_vc
    assert signed_vc["proof"]["type"] == "Ed25519Signature2020"
    
    # Verify signature
    valid, reason, _, _ = verify_vc(signed_vc, signer)
    assert valid
    
    # Verify tampering detection
    signed_vc["credentialSubject"]["claim"] = "MODIFIED"
    valid, reason, _, _ = verify_vc(signed_vc, signer)
    assert not valid
```

## Standards Compliance

- **W3C Verifiable Credentials Data Model 1.0**: Core structure
- **Ed25519Signature2020**: Proof format
- **DID Method: did:key**: Decentralized identifier resolution
- **JWS (RFC 7515)**: Signature encoding

## References

- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [Ed25519Signature2020](https://w3c-ccg.github.io/lds-ed25519-2020/)
- [DID Method: did:key](https://w3c-ccg.github.io/did-method-key/)
- [JWS - JSON Web Signature](https://tools.ietf.org/html/rfc7515)
