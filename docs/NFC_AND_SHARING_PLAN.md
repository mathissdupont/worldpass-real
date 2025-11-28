# NFC & Sharing Restoration Plan (2025-11-28)

## 1. Objectives
- Re-enable **tap-to-request / tap-to-present** NFC flows on both verifier and holder surfaces.
- Ensure **share targets** (QR, files, deep links) behave the same on web and mobile, including offline usage.
- Provide a verifiable audit trail for every shared payload (VC, presentation, keystore).

## 2. Current State (observations)
- **Web** already exposes `NDEFReader` / `NDEFWriter` hooks inside `web/src/pages/Present.jsx` and `web/src/components/VerifyVC.jsx`. These flows work in Chromium-based browsers behind HTTPS but are undocumented for ops teams.
- **Mobile** codebase (`worldpass-mobile`) lacks any NFC package. `grep` confirms no references to `Nfc`, `Ndef`, or `NDEF`. The Expo app therefore cannot scan verifier requests over NFC nor publish presentations.
- Sharing on mobile is inconsistent: `VCQRScreen.js` uses `expo-sharing`, while Identity export only copies JSON to clipboard. There is no central "share orchestrator".

## 3. Required Dependencies
| Platform | Package | Notes |
| --- | --- | --- |
| Mobile | `expo-nfc@~2.x` | Provides `NfcManager`, `Ndef` helpers for read/write. Requires iOS 13+ and Android 6+. |
| Mobile | `expo-sharing` (already installed) | Keep for handing `.wpvc`, `.wpvp`, `.wpkeystore` exports via share sheet. |
| Mobile | `expo-file-system` | Already present; use for temporary files before sharing. |
| Web | None (native APIs) | Ensure we feature-detect and fail gracefully. |

## 4. Implementation Plan – Mobile
1. **Capability detection layer** (`src/lib/nfc.js`):
   - Export helpers: `isNfcSupported`, `readRequest`, `writePayload({type:'url'|'json', data})`.
   - Wrap `NfcManager.start()` with singletons to avoid multiple initialisations.
2. **Request ingestion** (new screen `RequestScanScreen.js` or integrate into upcoming Present flow):
   - Offer camera + NFC toggles similar to the web wizard.
   - When NFC data arrives, parse as JSON or URL and forward to presentation builder state machine.
3. **Presentation broadcast**:
   - After signing payload, let users tap "Write to NFC" to push either URL (published link) or embedded JSON, matching `writeNfc` on web.
   - Maintain fallback instructions when NFC is unavailable.
4. **Share orchestrator** (`src/lib/share.js`):
   - Centralise JSON/file export. Accept `{ kind: 'vc'|'presentation'|'keystore', data, filename }`.
   - Use `expo-file-system` to persist under `FileSystem.cacheDirectory`, then call `Sharing.shareAsync`.
   - Provide copy-to-clipboard fallback if `Sharing.isAvailableAsync()` returns false.
5. **Keystore export parity**:
   - Update `IdentityCreateScreen.js` and `IdentityImportScreen.js` to call share orchestrator for `.wpkeystore` files (PBKDF2 only) instead of showing Alert copy text.
6. **Telemetry & UX**:
   - Emit analytic events for NFC read/write success/failure to detect hardware coverage.
   - Add user education modals explaining NFC availability per device/OS.

## 5. Implementation Plan – Web
1. **Feature detection hardening**:
   - Wrap all `NDEFReader`/`NDEFWriter` usage with `if (!('NDEFReader' in window))` to avoid crashing Safari/Firefox.
   - Surface friendly toasts (`t('nfc_not_supported_desc')`) already exist; ensure they trigger in every branch.
2. **Sharing consistency**:
   - Reuse `qrToDataURL` + `navigator.clipboard.writeText` helpers to standardise download/copy actions.
   - Document the `/api/present/upload` link lifetime so that shared URLs remain valid for the expected SLA.

## 6. Deliverables & Timeline
| Week | Deliverable |
| --- | --- |
| Week 1 | Add `expo-nfc`, capability layer, and share orchestrator. Ship keystore export parity. |
| Week 2 | Build mobile request/present NFC UX, integrate with forthcoming presentation builder. |
| Week 3 | QA on physical devices (Pixel 7, Samsung S22, iPhone 13). Add telemetry dashboards. |
| Week 4 | Harden web feature detection, update docs, final sign-off. |

## 7. Testing Checklist
- [ ] Unit tests for `share.js` (filename sanitising, fallback paths).
- [ ] Jest mocks for `expo-nfc` to validate read/write flows.
- [ ] Manual QA matrix covering: NFC on/off, airplane mode, share sheet unavailable, clipboard fallback.
- [ ] Regression tests for `VCQRScreen` and `IdentityCreateScreen` export buttons.

## 8. Risks & Mitigations
- **Hardware limitations**: Some iPads/iPhones block third-party NFC write; detect and present actionable guidance.
- **Permissions fatigue**: Request NFC permission only when entering the relevant screen; cache consent state.
- **Data leakage**: Ensure we never broadcast full private keys; presentations include only signed payloads. Use content-type tagging inside NDEF records.

## 9. Next Steps
1. Create `nfc` and `share` helper modules.
2. Update product brief to include NFC milestone owners.
3. Schedule device-lab testing slots once implementation PRs merge.
