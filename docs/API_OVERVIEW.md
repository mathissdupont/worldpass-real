# WorldPass API Overview (Mobile-Facing)

Base URL (prod): `https://worldpass-beta.heptapusgroup.com`
API prefix: `/api`

Use this document to build the mobile app end-to-end without touching localhost. All examples target production base URL.

---
## Authentication (DID-based, passwordless)

**Flow:**
1) Client sends DID and audience → gets a signed challenge.
2) Client signs challenge with Ed25519 private key (never leaves device).
3) Client verifies signature → receives JWT token.

**Endpoints**
- `POST /api/auth/challenge`
  - Body: `{ "did": "did:key:z...", "audience": "worldpass-mobile" }`
  - Response: `{ "challenge": "WorldPass Auth\nDID: ...", "nonce": "...", "expires_at": 1700000000 }`
- `POST /api/auth/verify`
  - Body: `{ "did": "did:key:z...", "challenge": "...", "signature": "<base64url-ed25519>", "displayName": "Alice" }`
  - Response: `{ "token": "<jwt>", "user": {...}, "message": "authenticated" }`

**Headers after login**
- `X-Token: <jwt>`
- `Content-Type: application/json`

**Notes**
- Audience for mobile: `worldpass-mobile`
- Nonce expires in ~5 minutes; re-request challenge if expired.
- DID is the primary identifier; email is optional.

---
## User Profile

**Endpoints**
- `GET /api/user/profile`
  - Headers: `X-Token`
  - Response shape: `{ user: { id, email, did, display_name, theme, avatar, phone, lang, otp_enabled, email_verified } }`
- `POST /api/user/profile`
  - Headers: `X-Token`
  - Body (any subset): `{ email?, display_name?, theme?, avatar?, phone?, lang?, otp_enabled? }`
  - Response: same as GET

### Profile Data (extended)
- `GET /api/user/profile-data`
- `POST /api/user/profile-data`
- Headers: `X-Token`
- Purpose: structured profile data blob (useful for richer attributes).

---
## Verifiable Credentials (VC)

Key capabilities:
- Issue (issuer endpoints)
- Revoke
- Export user credentials
- Verify VC payloads

**Important mobile-facing endpoints**
- `GET /api/verify` (verify VC payload) — send VC JSON, receive verification result.
- `POST /api/vc/export` (if exposed) — exports user VCs as JSON bundle (requires auth).

> Tip: When scanning a VC QR, send the embedded VC JSON to `/api/verify` and show the verification result.

---
## Payments (Mock Provider for MVP)

Base path: `/api/payment`

**Headers:** `X-Token`

**Create Payment Intent**
- `POST /api/payment/intent`
- Body: `{ "amount_minor": 1990, "currency": "TRY", "description": "WorldPass Pay", "return_url": "https://worldpass-beta.heptapusgroup.com/pay/return" }`
- Response: `{ "transaction_id": 123, "redirect_url": "https://...mock-provider..." }`

**Webhook (server-to-server, already handled by backend)**
- `POST /api/payment/webhook/mock`
- Body: `{ "provider_tx_id": "abc", "internal_tx_id": 123, "status": "success|failed" }`
- Header: `X-Webhook-Secret`

**List Transactions**
- `GET /api/payment/transactions?status=pending|success|failed`
- Response: `{ "transactions": [ { id, user_id, amount_minor, currency, description, status, provider, provider_tx_id, created_at, updated_at } ] }`

Notes:
- `amount_minor` is in minor units (e.g., kuruş/cents).
- User identity prefers DID; falls back to numeric user id.

---
## Issuer APIs (for VC issuance flows)

Base path: `/api/issuer`

Typical flows (high level):
- Register issuer, approve issuer
- Issue VC to subject DID
- Revoke VC

Mobile app usually consumes issued VC (via QR/NFC) and calls `/api/verify` to validate. If you build issuer features into mobile, call the issuer endpoints with proper auth (issuer API key / JWT).

---
## Blockchain Proof Layer (hash anchoring)

Base path: `/api/blockchain`
- Register VC hash on proof ledger
- Revoke VC hash
- Verify VC hash

For mobile consumption, verification is typically via `/api/verify`; direct blockchain endpoints are optional unless you expose advanced trust UI.

---
## Common Patterns

**Auth header**
```
X-Token: <jwt-from-/auth/verify>
Content-Type: application/json
Accept: application/json
```

**Error format**
```
{ "detail": "error_code_or_message" }
```

**Rate limits (SlowAPI)**
- Auth: default limits
- Payments: `/payment/intent` 10/min, `/payment/webhook/mock` 100/min, `/payment/transactions` 30/min

---
## Mobile Implementation Cheatsheet

1) **Sign-in**
   - `POST /api/auth/challenge` with DID
   - Sign challenge with Ed25519 (private key stays on device)
   - `POST /api/auth/verify` with signature → store `token`

2) **Fetch user profile**
   - `GET /api/user/profile` with `X-Token`

3) **List transactions**
   - `GET /api/payment/transactions` with `X-Token`

4) **Create payment intent**
   - `POST /api/payment/intent` with body above → open `redirect_url` in WebView or external browser

5) **Verify credential from QR/NFC**
   - Take VC JSON payload → `GET /api/verify` (or corresponding verify endpoint) → display result

---
## Base URLs (production-only)
- API: `https://worldpass-beta.heptapusgroup.com/api`
- Return URL example for payments: `https://worldpass-beta.heptapusgroup.com/pay/return`

Use these production URLs in the mobile app; avoid localhost for builds.
