# Architecture Overview

WorldPass is an MVP-first digital identity project comprising a React-based web frontend, a mobile client (React Native/Expo), and a Python/FastAPI backend. The design prioritizes simplicity and clarity over scale, with an honest approach to limitations.

## High-Level Components

- Frontend
  - Web Issuer Console: manage issuers, templates, credentials, and settings.
  - Web/Mobile Wallet: view/import credentials; basic presentation flows.
  - Verifier screens: QR-based verification UI and results.
- Backend (FastAPI)
  - Auth: login/register and session/JWT flows.
  - DID/VC issuance APIs: create, sign, and return verifiable credentials.
  - Verification APIs: verify presented credentials; QR flow support.
  - Storage: minimal app data persistence (e.g., SQLite) and config.
- Workers/Background tasks
  - At MVP there are no dedicated queue workers; periodic tasks are minimal or handled synchronously. If cron-like flows appear, they will be documented as experimental.

## Data Flows

### 1) User Registration and Login

1. User navigates to the web app (Landing → Register/Login).
2. Frontend calls backend `auth` endpoints with email/password.
3. Backend validates credentials, issues session/JWT, and returns user context.
4. Frontend stores session locally and routes to account/profile.

### 2) Issuer Creates a Credential

1. Issuer logs into the Issuer Console.
2. Issuer selects a template or fills a form to define VC fields.
3. Frontend submits the credential request to backend issuer APIs.
4. Backend signs the credential using issuer keys (DID method per implementation), persists minimal metadata, and returns the VC.

### 3) Wallet Imports/Displays a Credential

1. User uses the wallet view to import or retrieve a VC (from issuer or local import).
2. VC is stored client-side (MVP focus) and rendered in wallet components.
3. Presentation helpers allow QR-based sharing of a subset of fields (if supported).

### 4) Verifier Checks a Credential (Online Verify Flow)

1. Verifier opens the verify screen and scans a QR or receives a payload.
2. Frontend posts the VC or presentation to backend verify APIs.
3. Backend verifies signature and validity; returns status and details.
4. Frontend displays pass/fail and relevant metadata.

## EAS / On-Chain Integration (Stage 2)

- Future work: optional on-chain attestation via Ethereum Attestation Service (EAS).
- Target network: Polygon Amoy testnet first, possibly mainnet later.
- Integration will be feature-flagged and not required for core MVP flows.
- See `ROADMAP_MVP_vs_STAGE2_EAS.md` for planned schemas and integration points.

## Cross-Links

- API: see `BACKEND_API_REFERENCE.md`.
- Security: see `SECURITY_MODEL_AND_LIMITATIONS.md`.
- Roadmap: see `ROADMAP_MVP_vs_STAGE2_EAS.md`.
