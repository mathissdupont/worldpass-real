# Subject DID vs Issuer ID - Quick Reference

## Key Concepts

### Issuer ID (`issuer.id`)
- **Database Primary Key**: Internal auto-incremented integer in the `issuers` table
- **Purpose**: System-level reference for database joins and queries
- **Visibility**: Backend-only, not exposed in VCs
- **Example**: `123` (integer)

### Issuer DID (`issuer.did`)
- **W3C Standard Identifier**: Decentralized identifier for the issuing organization
- **Purpose**: Public identifier used in Verifiable Credentials
- **Format**: `did:key:z<base64url>` or `did:web:domain`
- **Stored In**: `issuer` field of VC JSON
- **Example**: `did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK`

### Subject DID (`credentialSubject.id`)
- **Holder's Identity**: DID of the person/entity receiving the credential
- **Purpose**: Binds credential to specific holder
- **Format**: Same as issuer DID (typically `did:key:z...`)
- **Stored In**: `credentialSubject.id` field of VC
- **Example**: `did:key:z6MktKwz7Ge1Yxzr4JHavN33byJh4shZkWNZjpJWvRWLczsK`

### Recipient ID (`recipient_id`)
- **System Handle**: Short unique code for credential delivery/retrieval
- **Purpose**: QR/NFC scanning, URL sharing without revealing DIDs
- **Format**: Base64URL encoded random bytes (12 bytes → ~16 chars)
- **Stored In**: `issued_vcs.recipient_id` (database only)
- **Example**: `kR3tZ9mP2wQ7vX4n`

## Usage Context

### When Issuing a VC:
```javascript
POST /api/issuer/issue
{
  "vc": {
    "issuer": "<issuer.did>",          // Public DID of issuing org
    "credentialSubject": {
      "id": "<subject.did>",            // Holder's DID
      "name": "Jane Doe",
      "studentId": "12345"
    }
  },
  "template_id": 7                      // Optional: issuer_templates.id
}
```

### Database Records:
```sql
-- Issuer record
issuers: id=42, did="did:key:zABC...", name="University X"

-- Issued credential
issued_vcs: 
  vc_id="vc-123",
  issuer_id=42,                         -- FK to issuers.id
  subject_did="did:key:zXYZ...",        -- From credentialSubject.id
  recipient_id="kR3tZ9mP2wQ7",          -- QR/link handle
  template_id=7                         -- Optional FK to issuer_templates.id
```

### Verification Flow:
1. **Presentation**: Holder signs with their private key (proves ownership of subject DID)
2. **VC Signature**: Verifier checks issuer's signature using issuer DID public key
3. **Binding Check**: Confirms `credentialSubject.id` matches holder's DID
4. **Revocation**: Queries `vc_status` using `vc_id` (jti)

## Common Mistakes to Avoid

❌ **Wrong**: Using `issuer.id` (integer) in VC JSON  
✅ **Right**: Use `issuer.did` (string DID)

❌ **Wrong**: Exposing `issuer_id` to frontend as issuer identifier  
✅ **Right**: Use `issuer.did` for public-facing operations

❌ **Wrong**: Storing subject_did as foreign key to users.id  
✅ **Right**: Store as plain text; lookup user by `users.did` when needed

❌ **Wrong**: Using recipient_id as credential identifier  
✅ **Right**: Use `vc_id` (jti) for revocation; recipient_id only for delivery

## API Consistency

### Frontend Should Use:
- `issuer.did` when displaying issuer info
- `subject.did` when showing credential holder
- `recipient_id` only for QR codes / share links

### Backend Internally Uses:
- `issuer_id` for joins (`issued_vcs.issuer_id → issuers.id`)
- `subject_did` as plain text (no FK constraint)
- `template_id` optional FK to issuer_templates

### Example Response (Credential List):
```json
{
  "credentials": [
    {
      "vc_id": "vc-1701234567",
      "subject_did": "did:key:z...",     // Holder's public DID
      "recipient_id": "kR3tZ9mP2wQ7",    // Delivery handle
      "credential_type": "StudentCard",
      "template_id": 7,                  // Which template was used
      "payload_hash": "a3b2c1...",       // SHA256 integrity
      "created_at": 1701234567
    }
  ]
}
```

## Summary

| Field | Scope | Format | Purpose |
|-------|-------|--------|---------|
| `issuer.id` | Internal DB | Integer | Database FK |
| `issuer.did` | Public VC | DID string | VC issuer field |
| `credentialSubject.id` | Public VC | DID string | Holder binding |
| `recipient_id` | System | Base64URL | Delivery handle |
| `template_id` | Internal | Integer | Schema reference |

**Key Rule**: DIDs go in VCs, IDs stay in database joins.
