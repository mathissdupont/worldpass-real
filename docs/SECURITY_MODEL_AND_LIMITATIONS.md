# Security Model and Limitations

This document describes how authentication, credential signing/verification, and data storage work today, based on the codebase. The project is early-stage and intentionally honest about risks and missing features.

## Authentication

- Web uses email/password auth with session or JWT returned from backend (see `backend/auth` and `web/src/lib/auth.js`).
- Protected routes in the web app check local session and roles (issuer/admin) derived from orgs.
- No advanced features like refresh tokens rotation or device binding are guaranteed in MVP.

## Credential Signing and Verification

- DID method: local DID generation and key storage; Ed25519-based signing is present in `backend/core/crypto_ed25519.py` and related modules.
- Issuance: issuer endpoints construct VC payloads and sign them.
- Verification: backend verifies signatures and basic VC validity; selective disclosure is basic.
- Revocation: MVP may rely on local flags/metadata; full revocation registries are not implemented yet.

## Data Storage

- Sensitive data is intended to be stored primarily on-device (client side) for MVP, with server keeping minimal metadata/config.
- Backend storage uses SQLite or similar lightweight persistence.
- Encryption approaches (AES-256, etc.) are referenced; ensure alignment with `backend/core` modules and tests.

## Current Limitations and Risks

- No formal security audit.
- Limited rate limiting and DoS protection.
- Key rotation and recovery flows are not complete.
- Revocation and advanced lifecycle management are minimal.
- Experimental endpoints and flows may change without notice.
- Environment handling and secret management are basic; production hardening required.

## Future Work

- Stage 2: optional on-chain attestations via EAS on Polygon (Amoy → mainnet).
- Stronger issuer key management and rotation procedures.
- Hardened authentication (refresh token rotation, MFA options).
- Formal revocation registries and transparency logs.
- Better rate limiting, monitoring, and incident response playbooks.

Cross-links:
- `ARCHITECTURE_OVERVIEW.md`
- `BACKEND_API_REFERENCE.md`
- `ROADMAP_MVP_vs_STAGE2_EAS.md`
