# Frontend Web Overview

WorldPass Web is a React app (Vite) with routes for landing, auth, issuer console, wallet, and verification. The UX aims for clarity and an honest early-stage tone.

## Routing

Key routes (see `web/src/App.jsx`):
- `/` — Landing page
- `/login`, `/register` — Auth pages
- `/issuer/console/*` — Issuer dashboard, credentials, templates, settings, webhooks
- `/verify`, `/verifier` — Verification views
- Protected app routes: `/account/*`, `/profile`, `/credentials`, `/present`, `/settings`
- Payment demos: `/pay/*`

## Pages and Components

- Landing: animated hero, features, how-it-works, security, FAQ, CTA, footer.
- Issuer Console: `IssuerLayout` + pages (Dashboard, Credentials, Templates, Settings, Webhooks).
- Wallet Views: display credentials, present/share via QR.
- Verify Screens: scan/verify and show results.

## API Communication

- Central API helpers reside in `web/src/lib/*.js` (e.g., `api.js`, `auth.js`).
- Base URL and proxy are defined in Vite config and environment vars.
- Error handling: simple try/catch with basic user feedback; MVP-level robustness.

## UI/UX Notes

- Dark theme default; motion/animation via Framer Motion.
- Early-stage copy emphasizes limitations and realistic expectations.
- Analytics helper `src/lib/evt.js` can be enabled via env flags; no-ops in dev.

Cross-links:
- `ARCHITECTURE_OVERVIEW.md` for system context.
- `BACKEND_API_REFERENCE.md` for endpoints.
