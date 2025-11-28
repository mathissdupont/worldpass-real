# UI & UX Refresh Plan (2025-11-28)

## 1. Goals
- Align **web** (`worldpass/web`) and **mobile** (`worldpass-mobile`) visuals around one design system (colors, spacing, typography).
- Simplify navigation so wallet, verifier, issuer, and admin flows are discoverable without nested menus.
- Improve perceived performance via skeletons, optimistic updates, and consistent toasts.
- Raise accessibility baseline (WCAG AA, dynamic text, screen-reader labels).

## 2. Design System Updates
1. **Color tokens** (shared in Tailwind + React Native):
   - Primary `indigo-600 #4f46e5`, Accent `violet-500 #8b5cf6`, Success `emerald-500`, Warning `amber-500`, Danger `rose-500`.
   - Derive CSS variables in `web/src/index.css` and React Native theme context.
2. **Typography**:
   - Web: `Inter` (weights 400/500/600/700). Mobile: use `Inter` via Expo Google Fonts.
   - Set consistent heading scale (H1 32px, H2 24px, H3 20px, body 15/16px).
3. **Spacing & radius**:
   - Base unit 4px. Card radius 16px, button radius 12px, chip radius 999px.
4. **Components**:
   - Buttons: primary, secondary, outline, ghost, destructive variants with identical hover/pressed states.
   - Cards: `shadow-md` equivalent on web, `elevation:4` on mobile.
5. **Documentation**: maintain a Storybook (web) + Expo gallery screen to preview tokens and components.

## 3. Navigation & IA Changes
### Web
- Convert top-level nav to four buckets: **Wallet**, **Verifier**, **Issuer**, **Admin**. Secondary nav inside each bucket.
- Promote critical actions ("Issue Credential", "Present", "Verify") into the global header.
- Add breadcrumbs to admin/issuer subsections.

### Mobile
- Bottom tabs: `Wallet`, `Present`, `Verify`, `Settings`. Move Login/Register into auth stack.
- Within `Settings`, create sections for `Account`, `Security`, `Payments`, `About` for parity with `Settings.jsx`.

## 4. Key Screens to Refresh
| Screen | Pain point | Refresh action |
| --- | --- | --- |
| Wallet list (web & mobile) | Mixed spacing, inconsistent badges | Adopt new card template, add issuer avatars, highlight DID mismatch states. |
| Presentation wizard (web) | Dense text, stepper not obvious | Replace accordion with progress timeline + inline tips panels. |
| Scanner/present (mobile) | Dark-only camera overlay, no instructions | Introduce gradient overlay, add status chips, show DID being used. |
| Admin Issuers (web) | Table overload | Add segmented list with filters + quick actions drawer. |
| Settings/Profile (both) | Different layout/fields | Use unified section cards, consistent switches, profile completion meter. |

## 5. Interaction Enhancements
1. **Skeleton loaders** for Wallet, VC detail, Transactions.
2. **Toast system**: single hook for success/info/error, consistent placement.
3. **Microcopy** review: unify tone (friendly + concise) and ensure bilingual strings exist in `t()` dictionaries.
4. **Empty states**: create illustration set (wallet empty, no transactions, no credentials) with CTA buttons.
5. **Animations**: limit to 200ms ease-in-out, use `react-native-reanimated` on mobile for Present/Verify transitions.

## 6. Accessibility Checklist
- Ensure color contrast ratio ≥ 4.5:1 for body text.
- Provide focus outlines on web buttons/inputs (currently suppressed in some components).
- Add `accessibilityLabel` & `accessibilityHint` to camera, share, and delete buttons in mobile screens (`WalletScreen`, `ScannerScreen`, `VCQRScreen`).
- Support dynamic font sizes via `StyleSheet.flatten` (no hard-coded `fontSize` without scaling).
- Test keyboard navigation on web modals (trap focus, Escape closes, etc.).

## 7. Delivery Roadmap
| Sprint | Deliverables |
| --- | --- |
| Sprint 1 | Ship shared tokens, typography, button/card components; update Wallet + Settings screens on both platforms. |
| Sprint 2 | Refresh Present/Verify flows (web + mobile), including new stepper UX and NFC affordances. |
| Sprint 3 | Update admin/issuer dashboards, transactions pages, and add empty-state illustrations. |
| Sprint 4 | Accessibility hardening, skeleton loaders, final polish, update design docs & Storybook/Expo gallery. |

## 8. Success Metrics
- 🚀 **Task success rate** for Present/Verify flows ≥ 95% in usability tests.
- 🎯 **Time to first credential share** reduced by 30% on mobile (analytics event `share_vc_success`).
- ♿ **Accessibility audits**: achieve WCAG AA, no critical Lighthouse a11y findings.
- 📊 **NPS uplift**: +10 points post-refresh among pilot users.

## 9. Next Steps
1. Sync with design to update Figma library using the tokens above.
2. Create tracking issues per sprint in GitHub Projects.
3. Schedule cross-functional review (design + eng + product) before starting Sprint 1.
