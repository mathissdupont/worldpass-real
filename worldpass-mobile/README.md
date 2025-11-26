# WorldPass Mobile

React Native + Expo mobile app for WorldPass verifiable credentials system.

## Features

- 📱 **Wallet**: Store, inspect, and manage verifiable credentials
- 📷 **QR Scanner**: Scan QR codes to receive and verify credentials
- 🔐 **Secure Storage**: Credentials encrypted with Expo SecureStore
- 🔒 **Biometric Auth**: Optional Face ID/Touch ID protection
- 👤 **Auth Flow**: Email/password login & registration with token storage
- ⚡ **Cross-Platform**: Runs on iOS and Android

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
├── navigation/
│   └── AppNavigator.js      # Tab navigation setup
├── screens/
│   ├── LoginScreen.js       # Email/password sign in
│   ├── RegisterScreen.js    # Account creation
│   ├── WalletScreen.js      # Credential list + detail modal
│   ├── ScannerScreen.js     # QR code scanner (BarCodeScanner API)
│   └── SettingsScreen.js    # Profile, DID, security & sign-out
└── lib/
    ├── api.js               # Backend API client
    └── storage.js           # Secure storage helpers
└── context/
    └── AuthContext.jsx      # Auth provider & hooks
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
- Login/Register: `/api/user/login`, `/api/user/register`
- Profile: `/api/user/profile`
- Verify VC: `/api/verify`
- Lookup: `/api/recipient/lookup/:id`

Authentication uses JWT token in `X-Token` header.
