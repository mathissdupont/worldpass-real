# WorldPass Mobile App

React Native + Expo mobile application for iOS and Android. This app provides mobile access to the WorldPass digital identity system.

## Features

- **Authentication Flow**: Login with email and password
- **Secure Token Storage**: Uses `expo-secure-store` for encrypted storage
- **Auto-Login**: Automatically logs in if a valid token exists
- **Bottom Tab Navigation**: 
  - Home: Welcome dashboard
  - Credentials: List of verifiable credentials (dummy data for now)
  - Profile: User profile information fetched from backend API
- **Logout**: Clear session and return to login screen

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode (or use Expo Go app)
- For Android: Android Studio with emulator setup (or use Expo Go app)

## Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### Backend URL

The app is configured to connect to the backend API. By default, it uses `http://localhost:8000/api`.

To change the backend URL, edit `src/constants/config.ts`:

```typescript
export const API_BASE_URL = 'http://your-backend-url:8000/api';
```

**Note for development:**
- For iOS Simulator: `http://localhost:8000/api` works fine
- For Android Emulator: Use `http://10.0.2.2:8000/api` (Android emulator's localhost)
- For physical devices: Use your computer's local IP address (e.g., `http://192.168.1.100:8000/api`)

## Running the App

### Development Mode

Start the Expo development server:

```bash
npm start
# or
npx expo start
```

This will open the Expo DevTools in your browser. From there you can:

- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with Expo Go app on your physical device

### Platform-Specific Commands

Run on iOS:
```bash
npm run ios
```

Run on Android:
```bash
npm run android
```

Run on Web (for testing only):
```bash
npm run web
```

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts          # API client for backend calls
│   ├── components/            # Reusable components (future)
│   ├── constants/
│   │   ├── config.ts          # App configuration
│   │   └── theme.ts           # Color scheme and styling constants
│   ├── navigation/
│   │   └── MainTabs.tsx       # Bottom tab navigation
│   ├── screens/
│   │   ├── LoginScreen.tsx    # Login/authentication screen
│   │   ├── HomeScreen.tsx     # Home/dashboard screen
│   │   ├── CredentialsScreen.tsx  # Credentials list screen
│   │   └── ProfileScreen.tsx  # User profile screen
│   └── utils/
│       └── storage.ts         # Secure storage utilities
├── App.tsx                    # Main app entry point
├── app.json                   # Expo configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

## Main Entry Point

The main entry point is `App.tsx` in the root of the mobile folder. It:
1. Checks for existing authentication on app start
2. Shows login screen if not authenticated
3. Shows main app with tabs if authenticated

## API Integration

The app uses the same backend endpoints as the web app:

- **Login**: `POST /api/user/login`
  - Request: `{ email, password, otp_code? }`
  - Response: `{ token, user: { email, first_name, last_name, did } }`

- **Get Profile**: `GET /api/user/profile`
  - Headers: `X-Token: <auth_token>`
  - Response: `{ user: { display_name, email, phone, avatar, otp_enabled, lang, theme } }`

- **Update Profile**: `POST /api/user/profile`
  - Headers: `X-Token: <auth_token>`
  - Request: `{ display_name?, email?, phone?, avatar?, lang?, theme? }`

## Color Scheme

The app uses the same color palette as the web application:

- **Light Mode** (default):
  - Background: `#f7f7f8`
  - Panel: `#ffffff`
  - Brand: `#111827`
  - Accent: `#0ea5e9`

- **Dark Mode** (not yet implemented):
  - Background: `#0e1116`
  - Panel: `#12171f`
  - Brand: `#8aa4ff`

Colors are defined in `src/constants/theme.ts`.

## Development Notes

### Current Status

✅ Completed:
- Expo + TypeScript project setup
- Authentication flow with login screen
- Secure token storage
- Bottom tab navigation
- Home, Credentials, and Profile screens
- API integration for user profile
- Color scheme matching web app

🚧 To be implemented:
- Real credentials fetching from backend
- Credential detail view
- Profile editing
- 2FA/OTP support in login
- Dark mode support
- Error boundaries and better error handling
- Offline mode
- Push notifications
- Deep linking

### Testing

To test the app:

1. Make sure your backend is running at `http://localhost:8000`
2. Start the mobile app with `npm start`
3. Try logging in with existing credentials from the web app
4. Navigate through the tabs to see different screens
5. Check the Profile tab to see real data from the backend

### Troubleshooting

**Cannot connect to backend:**
- Check if backend is running
- Verify the API_BASE_URL in `src/constants/config.ts`
- For Android emulator, use `http://10.0.2.2:8000/api`
- For physical devices, use your computer's local IP

**Build errors:**
- Delete `node_modules` and run `npm install` again
- Clear Expo cache: `npx expo start --clear`

**Token/Authentication issues:**
- Clear app data on the device/emulator
- Check backend logs for authentication errors

## License

Part of the WorldPass project.
