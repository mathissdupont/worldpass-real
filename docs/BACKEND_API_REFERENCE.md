# Backend API Reference

This document derives public API endpoints from the FastAPI router code. Endpoints are grouped by domain and marked experimental if subject to change. This is an MVP; some routes may be incomplete.

Note: Paths and schemas below are inferred from `backend/*.py`. If a route is missing here, it may be internal or experimental.

## Auth

- POST `/api/auth/register`
  - Auth: public
  - Body: `{ email: string, password: string }`
  - Response: `{ ok: boolean, user?: { email }, message?: string }`
  - Status: `200`, `400`
- POST `/api/auth/login`
  - Auth: public
  - Body: `{ email: string, password: string }`
  - Response: `{ ok: boolean, token?: string, user?: { email }, message?: string }`
  - Status: `200`, `401`, `400`
- POST `/api/auth/change-password`
  - Auth: bearer token required
  - Body: `{ oldPassword: string, newPassword: string }`
  - Response: `{ ok: boolean, message?: string }`
  - Status: `200`, `400`, `401`

## Issuer

- POST `/api/issuer/register`
  - Auth: public (MVP), may tighten later
  - Body: issuer org and operator details
  - Response: org/operator registration result
  - Status: `200`, `400`
- POST `/api/issuer/login`
  - Auth: public
  - Body: `{ email, password }`
  - Response: token + issuer context
  - Status: `200`, `401`
- GET `/api/issuer/templates`
  - Auth: bearer token
  - Response: list of templates
  - Status: `200`, `401`
- POST `/api/issuer/templates`
  - Auth: bearer token
  - Body: template schema
  - Response: created template
  - Status: `200`, `400`, `401`
- POST `/api/issuer/issue`
  - Auth: bearer token
  - Body: credential data matching template
  - Response: signed VC (JWT/JSON-LD per implementation)
  - Status: `200`, `400`, `401`
- GET `/api/issuer/credentials`
  - Auth: bearer token
  - Response: list of issued credentials (metadata)
  - Status: `200`, `401`

## Wallet

- GET `/api/wallet/credentials`
  - Auth: bearer token
  - Response: list/displayable credentials
  - Status: `200`, `401`
- POST `/api/wallet/import`
  - Auth: bearer token
  - Body: VC content
  - Response: `{ ok: boolean }`
  - Status: `200`, `400`, `401`

## Verify

- POST `/api/verify`
  - Auth: bearer token (MVP may allow public for demos)
  - Body: presented VC or proof payload
  - Response: verification status `{ valid: boolean, details?: object }`
  - Status: `200`, `400`, `401`
- POST `/api/present`
  - Auth: bearer token
  - Body: selective disclosure/presentation request
  - Response: presentation payload
  - Status: `200`, `400`, `401`

## Payment (Mock Provider)

- GET `/api/mock-provider/*`
  - Auth: varies
  - Purpose: mocked payment provider endpoints for demos
  - Status: `200` or error codes
  - Note: experimental / subject to change

## Notes

- Authentication uses bearer tokens (JWT) in most protected routes.
- Request and response schemas are defined in `backend/*_schemas.py` where present; otherwise inline Pydantic models.
- Some endpoints are explicitly marked experimental and may change.

See also:
- `ARCHITECTURE_OVERVIEW.md`
- `SECURITY_MODEL_AND_LIMITATIONS.md`
