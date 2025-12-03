# Roadmap: MVP vs Stage 2 (EAS)

WorldPass follows a staged roadmap. MVP focuses on off-chain DID/VC lifecycle. Stage 2 introduces optional EAS-based on-chain attestations.

## MVP Scope (Stage 1)

Must work end-to-end:
- Register/login
- Issue VC
- Display VC in wallet
- QR-based verification (online)

Implementation notes:
- All flows operate off-chain.
- Storage is lightweight; issuer and wallet logic favor simplicity.

## Stage 2: EAS on Polygon (Optional Layer)

Planned features:
- Attestation schemas for issued credentials via EAS.
- Revoke/resolve attestations.
- Support for Polygon Amoy testnet first, then consider mainnet.

Backend integration:
- Feature-flagged; not mandatory for core flows.
- Requires env vars, e.g.:
  - `EAS_RPC_URL`
  - `EAS_CONTRACT_ADDRESS`
  - `ISSUER_PRIVATE_KEY`
  - `EAS_SERVICE_URL` (if using a helper service)

Flows:
- Issue VC → optionally write an EAS attestation.
- Revoke VC → optionally write a revocation attestation.
- Verify VC → optionally resolve on-chain attestations.

Emphasis:
- EAS is an optional feature layer, not a requirement for WorldPass to function.

Cross-links:
- `ARCHITECTURE_OVERVIEW.md`
- `SECURITY_MODEL_AND_LIMITATIONS.md`
- `BACKEND_API_REFERENCE.md`
