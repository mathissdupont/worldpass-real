# Implementation Workstreams & Testing Logistics (2025-11-28)

This document captures the concrete GitHub issues/PR sequences derived from the parity, NFC, and UI/UX refresh plans. Each section is copy-ready for creating issues in the `worldpass-real` repository. The final section covers device-lab testing logistics that must start as soon as the NFC capability branch is feature-complete.

---

## 1. Issue: "feat(mobile): add NFC capability layer + share orchestrator"
- **Type**: feature
- **Epic linkage**: Mobile parity → NFC & sharing restoration plan (Sections 4–5)
- **Summary**: Introduce a dedicated `src/lib/nfc.ts` helper and `src/lib/share.ts` orchestrator in `worldpass-mobile` so Expo clients can read verifier requests and broadcast signed presentations over NFC, while standardising file/QR exports across keystore/VC/presentation flows.
- **Scope**:
  1. Add `expo-nfc@~2.x`, ensure auto-linking for iOS/Android, and wrap capability detection inside `NfcManager.start()` singleton.
  2. Expose helpers: `isNfcSupported`, `ensureSession()`, `readRequest({timeout})`, and `writePayload({type: 'url'|'json', data})` with informative error codes.
  3. Create `src/lib/share.ts` with `sharePayload({kind, data, filename})` that generates `.wpkeystore`, `.wpvc`, `.wpvp` temporary files via `expo-file-system` and falls back to clipboard when `Sharing.isAvailableAsync()` is false.
  4. Refactor `IdentityCreateScreen`, `IdentityImportScreen`, `VCQRScreen`, and any keystore export entry points to call the share orchestrator instead of ad-hoc clipboard logic.
  5. Telemetry: send `nfc_read_success|failure`, `nfc_write_success|failure`, and `share_payload_success|failure` events to the analytics module so ops can see device coverage.
- **Dependencies/Notes**:
  - Requires PBKDF2 `.wpkeystore` export format (already used on mobile).
  - Guard all NFC calls with feature detection to avoid crashing simulators.
  - Coordinate with security to confirm no private keys ever leave SecureStore.
- **Acceptance Criteria**:
  - `isNfcSupported()` resolves correctly on devices with/without hardware.
  - Users can export keystores/VCs/presentations via native share sheet with proper MIME types.
  - Unit tests for `share.ts` cover filename sanitisation + clipboard fallback.
  - QA checklist from NFC plan §7 passes on at least one Android + one iOS device/emulator.
- **PR Sequence**:
  1. **PR#1**: dependency bump + new helper modules + unit tests.
  2. **PR#2**: screen refactors (Identity + VC QR) to invoke helpers, plus analytics wiring.
  3. **PR#3 (optional)**: copy updates + documentation in `docs/NFC_AND_SHARING_PLAN.md` to mark completion.

## 2. Issue: "feat(mobile): presentation builder stack (QR + NFC ingestion)"
- **Type**: feature/epic
- **Summary**: Build the mobile presentation wizard that mirrors `web/src/pages/Present.jsx`, enabling request ingestion from QR or NFC, selective disclosure, Ed25519 signing, and publishing share targets (QR, link, NFC write, file export).
- **Scope**:
  1. Create a `PresentStack` (tabs or stack navigator) with screens: `RequestScanScreen`, `FieldSelectionScreen`, `ReviewAndSignScreen`, `ShareScreen`.
  2. Reuse the NFC helper for request ingestion and payload writing; fallback to camera scanner (existing `ScannerScreen` logic) for QR detection.
  3. Implement a client-side presentation builder service that accepts verifier challenge JSON, surfaces the requested VC attributes, and leverages existing crypto primitives in `backend/core/crypto_ed25519.py` parity via JS bindings.
  4. Integrate selective disclosure UI (chips/toggles) and show DID being used; include error states for unsupported requests.
  5. Publish outcomes through the share orchestrator (QR image, deep link, `.wpvp` file) and optional login-aware URL, mirroring the web behaviour described in the NFC plan §4.3.
  6. Add Jest coverage for the state machine as well as E2E flows in Detox (scan request → share presentation).
- **Dependencies/Notes**:
  - Depends on issue #1’s NFC/share helpers landing first.
  - Requires updated copy/tokens from the design system workstream.
  - Coordinate with backend for `/api/present/upload` expectations (expiry, authentication).
- **Acceptance Criteria**:
  - User can ingest verifier request via QR or NFC and share a signed presentation without leaving the app.
  - Selective disclosure honours the requested fields and prevents leaking extra claims.
  - Offline mode still allows QR-based exchange with cached credentials.
  - Telemetry events (`presentation_build_start|success|failure`) emitted with request type metadata.
- **PR Sequence**:
  1. **PR#1**: Navigator scaffolding + request ingestion stubs (QR + NFC) + placeholder screens.
  2. **PR#2**: Presentation builder service + selective disclosure UI + signing integration.
  3. **PR#3**: Share screen outputs (QR render, deep link, `.wpvp` export) + analytics + docs/tests.

## 3. Issue: "chore(design): shared design tokens + cross-platform theming"
- **Type**: chore/design-system
- **Summary**: Establish one set of design tokens (colors, typography, spacing, radius, shadows) that both web and mobile consume, aligning with the UI & UX Refresh plan §2 and navigation updates §3.
- **Scope**:
  1. Create `design-tokens.json` (or `tokens.js`) at repository root or `web/src/lib/theme/` containing the canonical palette: Indigo 600 primary, Violet 500 accent, Emerald 500 success, Amber 500 warning, Rose 500 danger, greys, radii, spacing units.
  2. Wire tokens into `web/src/index.css`, Tailwind config, and primary components (`Button`, `Card`, `NavBar`). Remove ad-hoc hex codes in favour of CSS variables.
  3. In `worldpass-mobile`, add a `theme` context exporting the same token names; update `App.jsx` (or equivalent) plus key components/screens (Wallet, Settings) to consume the tokens.
  4. Add documentation snippet to `docs/UI_UX_REFRESH_PLAN.md` referencing the shared source of truth and instructions for extending tokens.
  5. Optional: add Storybook stories (web) and an Expo Gallery screen to visualise the tokens and component variants.
- **Dependencies/Notes**:
  - Coordinate with design to ensure Figma tokens map 1:1.
  - Consider using Style Dictionary if automation is desired, but start with manual JSON to unblock engineers.
- **Acceptance Criteria**:
  - Single token file drives both platforms; lint checks fail if duplicate colors reappear (e.g., via ESLint custom rule or stylelint search).
  - Buttons/cards/headings across wallet + settings match the specs in the UI/UX plan (spacing, radius, typography scale).
  - Documentation exists for adding new tokens + verifying contrast ratios.
- **PR Sequence**:
  1. **PR#1**: Introduce token file + apply to web foundational styles.
  2. **PR#2**: Consume tokens in mobile theme context + update at least Wallet + Settings screens.
  3. **PR#3**: Add documentation + Storybook/Expo gallery previews + linting guardrails.

---

## 4. Device-Lab Testing Schedule (post NFC branch)
- **Pre-requisites**: `feature/mobile-nfc` branch contains merged PR#1 and PR#2 from Issue 1, smoke-tested in Expo Go & release builds.
- **Devices** (reserved via device lab calendar):
  - Pixel 7 (Android 14) – NFC read/write baseline.
  - Samsung S22 (Android 13) – vendor-specific NFC quirks.
  - iPhone 13 (iOS 17) – validate background tag reading limitations.
  - iPhone SE (iOS 16) – low-end performance, confirm share sheet fallback.
- **Test Window**: Target Week 3 from NFC plan (Dec 9–13). Block 2-hour slots per device; include at least one engineer plus QA.
- **Test Cases**:
  1. NFC request ingestion success/failure (airplane mode, permission denied, hardware missing).
  2. Presentation write to NFC tag, read on web verifier.
  3. Share orchestrator behaviour when Sharing API unavailable.
  4. Regression smoke for Identity export, Wallet QR sharing, Presentation builder happy path.
- **Ownership**:
  - Test lead: @samet for Android, @mathissdupont for iOS.
  - Results to be logged in `docs/NFC_AND_SHARING_PLAN.md` under a new "QA" section.
- **Follow-ups**: If blockers appear, open bug tickets referencing Issue 1/2 labels; escalate hardware-specific concerns to ops.

---

> Once these issues are created in GitHub Projects, link them to the existing parity epic and update each plan doc when milestones ship.
