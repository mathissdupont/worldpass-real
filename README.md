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
