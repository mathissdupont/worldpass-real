# Contributing Guide

WorldPass is an early-stage, MVP-first project. Contributions are welcome. Please keep changes focused and document assumptions.

## Dev Setup

### Backend (FastAPI)
- Python 3.11+
- Create a virtualenv and install dependencies:
  ```bash
  python -m venv .venv
  . .venv/Scripts/activate
  pip install -r backend/requirements.txt
  ```
- Run backend (common example):
  ```bash
  uvicorn backend.app:app --reload
  ```

### Web Frontend (React + Vite)
- Node.js 18+
- Install and run:
  ```bash
  cd web
  npm install
  npm run dev
  ```

### Mobile (React Native/Expo)
- If present, see `worldpass-mobile/README.md` for instructions.

## Coding Style and Tooling
- JavaScript/TypeScript: ESLint config in `web/`.
- Python: follow PEP8 where feasible; format with black if configured.
- Keep PRs small, with clear descriptions.

## PR Checklist
- Tests pass (if present) and app builds.
- Lint passes.
- No secrets in `.env` or committed files.
- Branches and PRs are clearly named.
- Update docs when you change behavior.

## Notes
- Security and scale are intentionally not oversold. Be factual.
- Experimental features should be marked and guarded by flags.

Cross-links:
- `ARCHITECTURE_OVERVIEW.md`
- `BACKEND_API_REFERENCE.md`
- `FRONTEND_WEB_OVERVIEW.md`
- `SECURITY_MODEL_AND_LIMITATIONS.md`
