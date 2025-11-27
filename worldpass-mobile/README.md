# WorldPass Mobile

React Native + Expo mobile app for WorldPass verifiable credentials system.

## Features

### Core Features
- 📱 **Wallet**: Store, inspect, and manage verifiable credentials
- 📷 **QR Scanner**: Scan QR codes to receive and verify credentials
- 🔐 **Secure Storage**: Credentials encrypted with Expo SecureStore
- 🔒 **Biometric Auth**: Optional Face ID/Touch ID protection
- 👤 **Auth Flow**: Email/password login & registration with token storage
- ⚡ **Cross-Platform**: Runs on iOS and Android

### Identity Management
- 🆔 **DID Creation**: Generate new Ed25519-based decentralized identifiers
- 📥 **Identity Import**: Load `.wpkeystore` files with PBKDF2 encryption
- 📤 **Identity Export**: Export your identity for backup or migration
- 🔗 **Account Linking**: Automatically link DID to your WorldPass account
- 🎴 **Visual ID Card**: Beautiful gradient ID card with QR code display

### Profile & Account
- ✏️ **Profile Editing**: Full profile management with display name, email, phone, etc.
- 🌐 **Social Links**: Add Instagram, Twitter, LinkedIn, GitHub, and more
- 📊 **Profile Progress**: Track your profile completion

### Security
- 🛡️ **Two-Factor Authentication (2FA)**: TOTP-based 2FA with QR setup
- 🔑 **Biometric Unlock**: Face ID / Touch ID support
- 🔄 **Session Management**: Secure token-based authentication

### Credential Management
- 📋 **VC List**: View all your verifiable credentials
- 📱 **QR Sharing**: Generate QR codes to share credentials
- 🔍 **Detail View**: Full JSON inspection with copy functionality
- 🗑️ **Delete**: Remove credentials from your wallet

### Payments
- 💳 **Transaction History**: View all your payments
- 📈 **Stats**: Transaction count, success rate, total amount
- 🔍 **Filtering**: Filter by status (all, success, pending, failed)

## Prerequisites

- Node.js 18+ 
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Studio (any OS)
- Expo Go app (for physical device testing)

## Installation

```bash
cd worldpass-mobile
npm install
```

## Configuration

`src/lib/api.js` automatically picks the right backend URL for development
(`10.0.2.2` for Android emulators, `localhost` for iOS/web). Update the
constants there if you want to target a different environment (e.g.,
`https://staging.worldpass.tech`).

## Running the App

### Expo Go (Easiest)

```bash
npx expo start
```

Then:
1. Install Expo Go on your phone (iOS/Android)
2. Scan the QR code from terminal

### iOS Simulator (Mac only)

```bash
npx expo start --ios
```

### Android Emulator

```bash
npx expo start --android
```

Make sure Android Studio is installed and an emulator is running.

## Project Structure

```
src/
├── components/
│   ├── ui.js                # Reusable UI components
│   └── VisualIDCard.js      # Visual identity card component
├── context/
│   ├── AuthContext.jsx      # Auth provider & hooks
│   ├── IdentityContext.jsx  # DID/identity management
│   ├── ThemeContext.jsx     # Theme (light/dark/system)
│   └── ToastContext.jsx     # Toast notifications
├── lib/
│   ├── api.js               # Backend API client
│   ├── crypto.js            # Cryptographic utilities
│   └── storage.js           # Secure storage helpers
├── navigation/
│   └── AppNavigator.js      # Tab & stack navigation setup
└── screens/
    ├── LoginScreen.js       # Email/password sign in
    ├── RegisterScreen.js    # Account creation
    ├── WalletScreen.js      # Credential list + detail modal
    ├── ScannerScreen.js     # QR code scanner
    ├── SettingsScreen.js    # Profile, DID, security & sign-out
    ├── ProfileScreen.js     # Full profile editing
    ├── IdentityImportScreen.js  # Import .wpkeystore
    ├── IdentityCreateScreen.js  # Create new DID
    ├── TwoFactorScreen.js   # 2FA setup/enable/disable
    ├── TransactionsScreen.js    # Payment history
    └── VCQRScreen.js        # Credential QR sharing
```

## Building for Production

### Android APK

```bash
eas build --platform android --profile preview
```

### iOS IPA

```bash
eas build --platform ios --profile preview
```

Requires Expo Application Services (EAS) account. See: https://docs.expo.dev/build/setup/

## Permissions

The app requires:
- **Camera**: For QR code scanning
- **Biometric**: For wallet unlock (optional)

## Troubleshooting

### "Cannot connect to Metro bundler"
- Make sure phone and computer are on same WiFi
- Try tunnel mode: `npx expo start --tunnel`

### "Camera not working"
- Check app permissions in device settings
- Restart the app after granting permissions

### "API requests failing"
- Verify backend URL in `src/lib/api.js`
- For Android emulator, use `10.0.2.2` instead of `localhost`
- For iOS simulator, use `localhost`
- For physical devices, use your computer's local network IP

## Backend Integration

The app connects to WorldPass backend at:
- **Auth**: `/api/user/login`, `/api/user/register`
- **Profile**: `/api/user/profile`
- **DID Link**: `/api/user/did-link`
- **2FA**: `/api/user/2fa/setup`, `/api/user/2fa/enable`, `/api/user/2fa/disable`
- **Verify VC**: `/api/verify`
- **Payments**: `/api/payments/transactions`
- **Lookup**: `/api/recipient/lookup/:id`

Authentication uses JWT token in `X-Token` header and wallet DID in `X-Wallet-Did` header.
