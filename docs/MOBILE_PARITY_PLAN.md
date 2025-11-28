# WorldPass Mobile Parity & UX Improvement Plan

## Executive Summary

This document provides a comprehensive cross-reference of web features vs. mobile implementation status, identifies gaps, and outlines the implementation plan to achieve feature parity between the WorldPass web application (`worldpass/web`) and mobile application (`worldpass-mobile`).

---

## 0. Snapshot (2025-11-28)

| Capability | Web implementation (key files) | Mobile implementation (key files) | Gap / required action |
| --- | --- | --- | --- |
| Identity onboarding & DID linkage | `web/src/pages/Account.jsx`, `web/src/pages/Settings.jsx` support DID creation/import, QR preview, keystore download, and automatic account linking. | `worldpass-mobile/src/screens/IdentityCreateScreen.js`, `IdentityImportScreen.js`, `SettingsScreen.js` cover generation/import and linking but only copy keystore JSON; no QR, rotation, or downloadable file. | Add file export/sharing for `.wpkeystore`, DID QR display, and DID rotation guidance to match the web flow. |
| Wallet & credential management | `web/src/components/VCList.jsx` offers filtering, stats, revoke, QR generation, and JSON download. | `worldpass-mobile/src/screens/WalletScreen.js` + `VCQRScreen.js` show basic list, delete, and QR referencing `jti` but lack filters, stats, revoke, or selective disclosure. | Implement filter/search, issuer facets, inline status checks, revoke flow, and richer QR/export similar to web. |
| Presentation builder | `web/src/pages/Present.jsx` walks through scanning verifier requests, picking VC fields, signing, generating QR/link/NFC, and publishing to `/api/present/upload`. | Mobile has no presentation builder; `VCQRScreen.js` shares only identifier metadata. | Build a mobile “Present” stack supporting request ingestion (QR/NFC), selective disclosure, Ed25519 signing, and share targets (QR/link/NFC). |
| Verifier tooling | `web/src/components/VerifyVC.jsx` & `OfflineVerify.jsx` let verifiers mint challenges, scan NFC/QR, upload files, and call `/api/present/verify`. | `worldpass-mobile/src/screens/ScannerScreen.js` only scans ready-made VCs, verifies once, and saves locally. | Add verifier request builder, challenge QR, offline signature check, and presentation validation flows on mobile. |
| NFC interactions | Present/Verify pages read & write NDEF via `NDEFReader`/`NDEFWriter`. | Mobile project has no NFC package (`expo-nfc`), so all NFC flows are missing. | Reintroduce NFC by wiring `expo-nfc` for request ingestion and presentation sharing; design fallback when hardware unavailable. |
| Sharing/export | Web can download `.wpvc`, `.wpvp`, keystores, and publish links. | Mobile only copies JSON or triggers `expo-sharing` in a few places; no structured exports or downloads. | Standardize share sheet exports for keystore/VC/presentation plus cached QR images, aligning flows with the browser. |
| Security & settings | `web/src/pages/Settings.jsx` includes 2FA setup, avatar upload, theme/lang toggles, backup/clear actions. | Mobile has `ProfileScreen.js` and `TwoFactorScreen.js`, but theme/lang, avatar upload, and backup actions are absent or stubbed. | Extend mobile settings to match theme/language/profile completeness, and keep 2FA UX consistent with the browser. |
| Payments / transactions | `web/src/pages/pay/TransactionsPage.jsx` & `NewPaymentTab.jsx` provide history plus mock payment builder. | `worldpass-mobile/src/screens/TransactionsScreen.js` lists and filters transactions but lacks “New Payment” and plan controls. | Add demo payment flow or clearly state web-only scope; ensure status badges and filters mirror the web semantics. |
| Admin / issuer tooling | `web/src/pages/admin/Issuers.jsx`, `web/src/pages/issuer/*.jsx`, `web/src/pages/tools/WPTEditorPRO.jsx` enable issuer management. | Mobile has no issuer/admin navigation. | Decide if issuer/admin roles are mobile requirements; if yes, mirror the relevant stacks, otherwise document as web-only. |

Use this snapshot while executing the detailed plan below; keep it updated as features land to maintain a quick-glance dashboard for leadership.

---

## 1. Feature Cross-Reference: Web vs Mobile

### 1.1 Identity (DID) Management

| Feature | Web Status | Mobile Status | Gap |
|---------|------------|---------------|-----|
| DID Creation | ✅ Implemented (`IdentityCreate.jsx`) | ❌ Missing | **Full implementation needed** |
| DID Import (Keystore) | ✅ Implemented (`IdentityLoad.jsx`) | ✅ Implemented (`IdentityImportScreen.js`) | Complete |
| DID Export | ✅ Download as `.wpkeystore` | ⚠️ Partial (copy only) | **Export to file needed** |
| Account Linking | ✅ Automatic DID-account linking | ✅ Implemented (`linkDid` API) | Complete |
| DID Rotation | ✅ Implemented | ❌ Missing | **Full implementation needed** |
| Profile Editing (display name) | ✅ Implemented (`Account.jsx`) | ⚠️ Partial (view only) | **Edit screen needed** |
| Visual ID Card | ✅ Implemented (`VisualIDCardVertical.jsx`) | ❌ Missing | **Component needed** |
| QR Code Display | ✅ Dynamic QR generation | ❌ Missing | **QR generation needed** |

### 1.2 Profile & Account Data

| Feature | Web Status | Mobile Status | Gap |
|---------|------------|---------------|-----|
| Display Name Edit | ✅ Inline editing | ❌ Missing | **Edit form needed** |
| Email Edit | ✅ Implemented (`Profile.jsx`) | ❌ Missing | **Form field needed** |
| Phone Edit | ✅ Implemented | ❌ Missing | **Form field needed** |
| Avatar Upload | ✅ Implemented (`Settings.jsx`) | ❌ Missing | **Image picker needed** |
| Theme Selection | ✅ Light/Dark/System | ❌ Missing | **Theme context needed** |
| Language Selection | ✅ English/Turkish | ❌ Missing | **i18n integration needed** |
| Social Links (Instagram, Twitter, etc.) | ✅ Implemented | ❌ Missing | **Profile fields needed** |
| Bio Text | ✅ Implemented | ❌ Missing | **Text area needed** |
| Profile Export (JSON) | ✅ Implemented | ❌ Missing | **Share/export feature** |

### 1.3 VC (Verifiable Credential) Management

| Feature | Web Status | Mobile Status | Gap |
|---------|------------|---------------|-----|
| VC List View | ✅ Full features (`VCList.jsx`) | ✅ Basic (`WalletScreen.js`) | **Enhance with filtering** |
| VC Detail View | ✅ JSON preview | ✅ Modal with JSON | Complete |
| VC QR Sharing | ✅ QR generation | ❌ Missing | **QR display screen needed** |
| Manual JSON Import | ✅ Implied | ❌ Missing | **Import screen needed** |
| VC Revocation | ✅ Implemented | ❌ Missing | **Revoke API integration** |
| Status Check | ✅ Badge indicators | ⚠️ Partial | **Status API integration** |
| Issuance (via templates) | ✅ Implemented | ❌ Missing (N/A for mobile wallet) | Mobile is wallet-only |
| Search/Filter | ✅ Type filters, text search | ❌ Missing | **Filter UI needed** |
| Download VC | ✅ `.wpvc` file | ❌ Missing | **Share/export feature** |
| Offline QR Display | ✅ Implemented | ❌ Missing | **Offline-first QR generation** |

### 1.4 Security

| Feature | Web Status | Mobile Status | Gap |
|---------|------------|---------------|-----|
| 2FA Setup (TOTP) | ✅ QR + verification (`Settings.jsx`) | ❌ Missing | **Full 2FA flow needed** |
| 2FA Enable/Disable | ✅ Implemented | ❌ Missing | **API integration needed** |
| Password Change | ✅ Demo placeholder | ❌ Missing | **Password change flow** |
| Password Reset | ✅ Demo placeholder | ❌ Missing | **Reset flow needed** |
| Biometric Unlock | ❌ Not applicable | ✅ Implemented (toggle only) | Mobile-specific |
| Audit Log Viewing | ❌ Not implemented | ❌ Missing | **Future feature** |
| Session Management | ✅ Token-based | ✅ Token-based | Complete |
| Logout + Clear State | ✅ Implemented | ✅ Implemented | Complete |
| X-Wallet-Did Header | ✅ All API calls | ✅ All API calls | Complete |

### 1.5 Issuer & Admin Tools

| Feature | Web Status | Mobile Status | Recommendation |
|---------|------------|---------------|----------------|
| Issuer Registration | ✅ Full flow | ❌ N/A | Desktop-only feature |
| Issuer Dashboard | ✅ Full analytics | ❌ N/A | Desktop-only feature |
| Template Manager | ✅ WPT Editor | ❌ N/A | Desktop-only feature |
| Credential Issuance | ✅ Full form | ⚠️ View-only | **Consider read-only view** |
| Admin Issuer Approval | ✅ Implemented | ❌ N/A | Desktop-only feature |
| Webhooks Management | ✅ Implemented | ❌ N/A | Desktop-only feature |

### 1.6 Payments / Plan Management

| Feature | Web Status | Mobile Status | Gap |
|---------|------------|---------------|-----|
| Transaction History | ✅ Full list (`TransactionsPage.jsx`) | ❌ Missing | **Transactions screen** |
| New Payment | ✅ Demo flow | ❌ Missing | **Payment demo screen** |
| Plan Selection | ✅ Mock integration | ❌ Missing | **Plan selection UI** |
| Payment Notifications | ✅ Toasts | ❌ Missing | **Push notifications setup** |

---

## 2. Detailed Gap Analysis & Implementation Plan

### 2.1 Identity Management Screens

#### 2.1.1 DID Creation Screen (`IdentityCreateScreen.js`)
**Required components:**
- Generate new DID using Ed25519 key pair
- Encrypt with user-provided password using PBKDF2
- Save to SecureStore
- Link to account automatically

**Backend calls:**
- `POST /api/user/did-link` - Link DID to account

**Data handling:**
- Use `@noble/ed25519` for key generation
- PBKDF2 (not Argon2) for iOS compatibility
- SecureStore for private key storage

**UX Notes:**
- Step-by-step wizard
- Password strength indicator
- Recovery phrase display (optional)

#### 2.1.2 DID Rotation Screen (`IdentityRotateScreen.js`)
**Required components:**
- Warning about VC revocation
- Confirmation modal
- Progress indicator for revocation
- New DID generation flow

**Backend calls:**
- `POST /api/status/revoke` - Revoke all VCs (batch)
- `POST /api/user/did-link` - Link new DID

**UX Notes:**
- Clear warning about consequences
- Show list of VCs to be revoked
- Require re-authentication

#### 2.1.3 Visual ID Card Component (`VisualIDCard.js`)
**Required components:**
- Render DID with QR code
- Display name prominently
- Gradient background matching web branding
- Avatar display

**Libraries needed:**
- `react-native-qrcode-svg` for QR generation

### 2.2 Profile Editing Screen (`ProfileScreen.js`)

**Required fields:**
- Display name (TextInput)
- Email (TextInput, email keyboard)
- Phone (TextInput, phone keyboard)
- Avatar (ImagePicker)
- Bio (TextInput multiline)
- Social links (Instagram, Twitter, LinkedIn, GitHub, Website)

**Backend calls:**
- `GET /api/user/profile/data` - Load profile
- `POST /api/user/profile/data` - Save profile

**UX Notes:**
- Inline editing with save button
- Form validation
- Success/error toasts
- Progress bar for profile completion

### 2.3 VC Management Enhancements

#### 2.3.1 VC Filter Component
**Features:**
- Type-based filtering (chips)
- Text search
- Date range filter
- Issuer filter

#### 2.3.2 VC QR Share Screen (`VCQRScreen.js`)
**Features:**
- Generate QR from VC JSON
- Download/share QR image
- Copy VC JSON

**Libraries needed:**
- `react-native-qrcode-svg`
- `react-native-share`

#### 2.3.3 VC Import Screen (`VCImportScreen.js`)
**Features:**
- Paste JSON input
- File picker for `.wpvc` files
- Validation before save

#### 2.3.4 VC Revocation Flow
**Backend calls:**
- `POST /api/status/revoke` - Revoke credential

**UX Notes:**
- Confirmation modal
- Clear warning about irreversibility

### 2.4 Security Screens

#### 2.4.1 Two-Factor Authentication Screen (`TwoFactorScreen.js`)
**Setup flow:**
1. Call `POST /api/user/2fa/setup` - Get secret + otpauth URL
2. Display QR code for authenticator app
3. Show manual secret for copy
4. Verify with 6-digit code
5. Call `POST /api/user/2fa/enable` - Enable 2FA

**Disable flow:**
1. Confirm with password or current TOTP
2. Call `POST /api/user/2fa/disable`

**Libraries needed:**
- `react-native-qrcode-svg` for setup QR

#### 2.4.2 Password Change Screen (`PasswordChangeScreen.js`)
**Fields:**
- Current password
- New password
- Confirm new password

**Backend calls:**
- `POST /api/user/password` (to be implemented)

#### 2.4.3 Audit Log Screen (`AuditLogScreen.js`)
**Features:**
- List of security events
- Filter by event type
- Date range filter

**Backend calls:**
- `GET /api/user/audit-log` (to be implemented)

### 2.5 Payments Screens

#### 2.5.1 Transactions List Screen (`TransactionsScreen.js`)
**Features:**
- List transactions with status badges
- Filter by status (all/success/pending/failed)
- Summary stats

**Backend calls:**
- `GET /api/payments/transactions`

#### 2.5.2 New Payment Screen (`NewPaymentScreen.js`)
**Features:**
- Amount input
- Description
- Card details (demo)
- Processing animation

**Backend calls:**
- `POST /api/payments/pay`

### 2.6 Settings Enhancements

#### 2.6.1 Theme Selector
**Features:**
- Light/Dark/System toggle
- Persist to AsyncStorage
- Apply globally via context

#### 2.6.2 Language Selector
**Features:**
- Language picker (English/Turkish)
- Persist preference
- Apply translations

**Libraries needed:**
- `i18n-js` or similar

---

## 3. UI/UX Improvement List

### 3.1 Branding Consistency
- [ ] Use consistent primary color: `#4f46e5` (Indigo 600)
- [ ] Use consistent gradient: `from-indigo-500 to-violet-600`
- [ ] Standard border radius: 12px for cards, 10px for buttons
- [ ] Consistent shadows and elevation

### 3.2 Navigation Improvements
- [ ] Add Profile tab to bottom navigation
- [ ] Add Payments as nested stack in Settings
- [ ] Add Security as nested stack in Settings
- [ ] Consider drawer navigation for complex flows

### 3.3 Empty States
- [ ] Design consistent empty state illustrations
- [ ] Add call-to-action buttons in empty states
- [ ] Use skeleton loaders during data fetching

### 3.4 Toast/Notification System
- [ ] Implement global toast context
- [ ] Success/error/info toast variants
- [ ] Auto-dismiss with optional persistence

### 3.5 Form UX
- [ ] Input validation with inline errors
- [ ] Loading states on submit buttons
- [ ] Keyboard-aware scroll views
- [ ] Auto-focus and tab navigation

### 3.6 Accessibility
- [ ] Ensure proper accessibility labels
- [ ] Support dynamic type sizes
- [ ] Test with screen readers
- [ ] Ensure color contrast compliance

---

## 4. Backend/Infrastructure Action Items

### 4.1 Required API Endpoints (New or Modified)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/user/password` | POST | Change password | To be implemented |
| `/api/user/audit-log` | GET | Security audit log | To be implemented |
| `/api/user/2fa/setup` | POST | Setup 2FA | ✅ Exists |
| `/api/user/2fa/enable` | POST | Enable 2FA | ✅ Exists |
| `/api/user/2fa/disable` | POST | Disable 2FA | ✅ Exists |
| `/api/user/profile/data` | GET/POST | Profile data | ✅ Exists |
| `/api/payments/transactions` | GET | List transactions | ✅ Exists |
| `/api/status/revoke` | POST | Revoke credential | ✅ Exists |

### 4.2 Push Notifications Setup
- Configure Firebase Cloud Messaging (FCM) for Android
- Configure Apple Push Notification service (APNs) for iOS
- Add notification endpoints to backend
- Implement notification preferences

### 4.3 Offline Support Considerations
- Cache credentials locally (already done via AsyncStorage)
- Queue API requests when offline
- Sync on reconnection
- Offline QR generation (no network needed)

---

## 5. Technical Requirements

### 5.1 PBKDF2 Keystore Handling
- Mobile uses PBKDF2-SHA256 (300,000 iterations)
- Argon2 keystores from web need re-export as PBKDF2
- Clear error message for unsupported keystore formats

### 5.2 SecureStore Limitations
- iOS: Keychain (encrypted, hardware-backed)
- Android: Encrypted SharedPreferences
- Size limit: ~2KB per item (split large data if needed)

### 5.3 Dependencies to Add

```json
{
  "dependencies": {
    "react-native-qrcode-svg": "^6.2.0",
    "react-native-share": "^10.0.0",
    "react-native-image-picker": "^7.0.0",
    "i18n-js": "^4.3.0"
  }
}
```

### 5.4 Error Handling
- Network errors: Show retry option
- Auth errors: Redirect to login
- Validation errors: Inline field errors
- Server errors: Generic error with support contact

### 5.5 Caching Strategy
- Credentials: AsyncStorage (encrypted via SecureStore for keys)
- Profile: AsyncStorage with TTL
- Transactions: In-memory only (refresh on navigate)

---

## 6. Testing Plan

### 6.1 Unit Tests
- Crypto functions (key generation, encryption/decryption)
- API client methods
- Storage helpers
- Validation utilities

### 6.2 Integration Tests (API)
- Authentication flow
- Profile CRUD
- Credential operations
- Payment flow

### 6.3 E2E Tests (Detox/Expo)
- Login/Register flow
- Import keystore flow
- Scan QR and save credential
- View credential details
- Settings changes

---

## 7. Prioritized Task List

### Phase 1: Core Identity & Profile (High Priority)
1. ✅ Identity Import (already implemented)
2. DID Creation Screen
3. Profile Edit Screen
4. Visual ID Card Component
5. DID QR Display

### Phase 2: VC Management (High Priority)
1. VC List Enhancements (filter, search)
2. VC QR Share Screen
3. VC Status Check Integration
4. VC Revocation Flow

### Phase 3: Security (Medium Priority)
1. 2FA Setup/Enable/Disable
2. Password Change Flow
3. Enhanced Logout (clear all state)

### Phase 4: Payments (Medium Priority)
1. Transaction History Screen
2. Payment Demo Screen

### Phase 5: Settings & UX (Lower Priority)
1. Theme Selector
2. Language Selector
3. Empty State Designs
4. Toast System
5. Accessibility Improvements

### Phase 6: Advanced Features (Future)
1. DID Rotation
2. Audit Log
3. Push Notifications
4. Offline Queueing

---

## 8. Execution Sprints

### Sprint 1 – Shared design foundations (2025-11-28)
- Introduced `shared/design-tokens.js` as the single source of truth for colors, typography, radii, and spacing; web now injects these tokens dynamically via `web/src/lib/theme.js` to eliminate palette drift.
- Extended the Expo app’s `ThemeContext` to consume the same tokens, refreshed Wallet + Settings screens, aligned toast/navigation colors, and exposed a user-facing light/dark/system picker.
- Reworked bottom navigation to `Wallet / Present / Verify / Settings` and added a Present landing screen placeholder ahead of the upcoming presentation builder workstream.

## 9. Conclusion

This plan outlines a comprehensive approach to achieving feature parity between the WorldPass web and mobile applications. The prioritized task list ensures critical functionality is implemented first, while maintaining a consistent user experience across platforms.

The mobile app should remain focused on its primary role as a **credential wallet**, while administrative functions (issuer management, template creation, admin tools) remain desktop-only features.
