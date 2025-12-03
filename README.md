# WorldPass

A decentralized digital identity system with verifiable credentials, built with modern web and mobile technologies.

## Overview

WorldPass is a comprehensive digital identity platform that provides:
- **Web Application**: Full-featured web interface for identity management
- **Mobile Application**: iOS and Android apps for on-the-go access
- **Backend API**: Python/FastAPI backend with SQLite database
- **Browser Extension**: Chrome/Edge extension for seamless authentication
- **CLI Tools**: Command-line utilities for administration

## Repository Structure

```
worldpass-real/
├── web/              # React web application (Vite + React)
├── mobile/           # React Native + Expo mobile app (iOS & Android)
├── backend/          # Python FastAPI backend
├── extension/        # Browser extension
├── cli/              # Command-line tools
└── docs/             # Documentation
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The backend will start on `http://localhost:8000`.

### Web Application

```bash
cd web
npm install
npm run dev
```

The web app will start on `http://localhost:5173`.

### Mobile Application

```bash
cd mobile
npm install
npm start
```

Follow the Expo instructions to run on iOS simulator, Android emulator, or physical device.

See [mobile/README.md](mobile/README.md) for detailed mobile app documentation.

## Features

### Core Functionality
- ✅ User registration and authentication
- ✅ Decentralized Identifier (DID) management
- ✅ Verifiable Credentials issuance and verification
- ✅ Profile management
- ✅ Two-factor authentication (2FA)
- ✅ Secure credential storage with encryption

### Platforms
- ✅ Web (React + Vite)
- ✅ Mobile (React Native + Expo for iOS and Android)
- ✅ Browser Extension (Chrome/Edge)
- ✅ Command-line tools

## Mobile App

The mobile app provides native iOS and Android access to WorldPass:

- **Authentication**: Secure login with token storage
- **Profile Management**: View and manage user profile
- **Credentials**: List and manage verifiable credentials
- **Offline Support**: Token persistence for offline access

Key features:
- Built with React Native and Expo for cross-platform development
- Uses expo-secure-store for encrypted token storage
- Bottom tab navigation for easy access to main features
- Matches web app's color scheme and design language

For detailed mobile app documentation, see [mobile/README.md](mobile/README.md).

## Technology Stack

### Frontend (Web)
- React 19
- Vite
- TailwindCSS
- React Router

### Mobile
- React Native
- Expo SDK
- React Navigation
- TypeScript

### Backend
- Python 3.x
- FastAPI
- SQLite with encryption
- JWT authentication
- Pydantic for validation

### Identity Standards
- W3C Decentralized Identifiers (DIDs)
- W3C Verifiable Credentials (VCs)
- Ed25519 cryptographic signatures

## Development

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Git

### Environment Setup

1. Clone the repository
2. Set up backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
3. Set up web app:
   ```bash
   cd web
   npm install
   npm run dev
   ```
4. (Optional) Set up mobile app:
   ```bash
   cd mobile
   npm install
   npm start
   ```

## Documentation

- [Mobile App README](mobile/README.md) - Mobile app setup and usage
- [Deployment Guide](DEPLOY.md) - Production deployment instructions
- [Audit Report](AUDIT_REPORT.md) - Security audit findings
- [DID vs Issuer ID](SUBJECT_DID_VS_ISSUER_ID.md) - Technical documentation

## On-Chain Issuer (Polygon + EAS) — Feature (Optional)

This repository includes an optional on-chain integration for anchoring Verifiable Credential (VC) events (issue/revoke) on Polygon testnet using Ethereum Attestation Service (EAS). This keeps VC contents off-chain for privacy, while providing on-chain proofs and revocation.

What goes on-chain
- VC hash (bytes32) of a canonicalized VC payload (proof removed, keys sorted)
- Issuer DID, Subject DID, Active flag (bool)
- Attestation UID and tx hash can be stored in backend DB for lookup

Folder structure
- `scripts/onchain/eas/` — lightweight EAS microservice (Node.js + Express)
  - `server.js` — `/attest`, `/revoke`, `/resolve` endpoints
  - `.env.example` — environment template (RPC URL, private key, EAS addresses)
  - `package.json` — dependencies: `eas-sdk`, `ethers`, `express`
- `backend/onchain.py` — Python helpers to hash VC and call the EAS microservice

How it works (high level)
1) Issue VC (backend):
   - Canonicalize VC JSON (remove `proof`, sort keys), compute `sha256`
   - Call EAS service `/attest` with `{ vcHash, issuerDid, subjectDid, active: true }`
   - Persist `{ uid, txHash, vcHash }` along with your VC record
2) Revoke VC (backend):
   - Call `/revoke` with `uid`; persist revoke tx in DB
3) Verify VC (backend/mobile):
   - Verify signature locally as usual
   - Resolve `uid` or recompute `vcHash` and query EAS to ensure `active == true` and not revoked

Environment variables (EAS service)
Create `scripts/onchain/eas/.env` from `.env.example`:
- `RPC_URL` — Polygon Amoy RPC (Alchemy/Infura)
- `WALLET_PRIVATE_KEY` — Issuer wallet private key (test wallet)
- `EAS_CONTRACT_ADDRESS` — EAS contract address on Amoy (defaults in example)
- `SCHEMA_UID` — Deployed EAS schema UID for VC attestations
- `PORT` — Service port (default 5055)

Run the EAS service
```powershell
cd scripts/onchain/eas
copy .env.example .env
# Fill RPC_URL, WALLET_PRIVATE_KEY, SCHEMA_UID
npm install
npm start
```

Backend wiring (Python)
- Set `EAS_SERVICE_URL` in backend environment (e.g., `http://localhost:5055`)
- Use `backend/onchain.py`:
  - `eas_attest(vc, issuer_did, subject_did)`
  - `eas_revoke(uid)`
  - `eas_resolve(uid)`

Status
- This is a feature scaffolding: ready to configure and turn on when needed.
- Default product flow remains fully functional without on-chain writes.

Notes
- Keep VC contents off-chain for privacy. Only hash and status go on-chain.
- You can later switch to EAS entirely or replace with a minimal custom registry contract if requirements change.

## Security

WorldPass implements multiple security layers:
- End-to-end encryption for sensitive data
- Secure token storage (SecureStore on mobile, localStorage on web)
- JWT-based authentication
- Two-factor authentication support
- DID-based identity verification

## Contributing

This is a private repository. For questions or issues, contact the repository owner.

## License

Proprietary - All rights reserved.
