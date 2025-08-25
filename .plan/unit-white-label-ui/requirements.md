# Unit White‑Label UI (Banking) — Requirements

Last updated: 2025-08-24T03:12:26+06:00

## Feature Overview
- Embed Unit Ready‑to‑Launch Banking white‑label UI to onboard new end‑users and display their banking info inside our web app.
- Deliver a dedicated route `GET /banking` in the Next.js app that hosts `<unit-elements-white-label-app>`.
- Support sandbox and production environments, theming, token handling, and CSP.

## Functional Requirements
- Host white‑label app at `web/app/banking/page.tsx`.
- Load Unit web components script from CDN:
  - Sandbox: `https://ui.s.unit.sh/release/latest/components-extended.js`
  - Production: `https://ui.unit.co/release/latest/components-extended.js`
  - Select via `NEXT_PUBLIC_UNIT_UI_ENV` = `sandbox | prod` (default: `sandbox`).
- Pass JWT to component via `jwt-token` attribute.
  - Default to `demo.jwt.token` in sandbox if no token provided (per Unit docs).
  - Optional: in a later phase, fetch a real JWT from backend or IdP and pass through.
- Theming via `settings-json` attribute (JSON string) with brand color and button radius.
- CSP: add `<meta http-equiv="Content-Security-Policy" ...>` allowing Unit/Zendesk/Plaid as per docs, plus `ui.s.unit.sh`/`ui.unit.co` for scripts.
- Cleanup on logout: remove `unitCustomerToken` and `unitVerifiedCustomerToken` from `localStorage`.
- Handle `unitOnLoad` event; if 401 error (expired token), prompt for re-auth/refresh.

## Non‑Functional Requirements
- Environment toggling without rebuilds (env inject at build; documented per Next.js). Minimal risk: changing UI env requires rebuild.
- Accessibility: rely on Unit component’s built‑in accessibility; ensure page landmarks/headings.
- Performance: load script with `afterInteractive`; render component after script load.

## User Stories & Acceptance Criteria
- As a new user, I can open `/banking` and complete onboarding (application form) in sandbox.
  - AC: Component renders and shows Application Form when the JWT is not recognized as an existing user.
- As a returning user, I can open `/banking` and view my accounts/cards.
  - AC: When a valid JWT represents an existing Unit user, the component shows accounts and activity.
- As an operator, I can brand the component.
  - AC: Primary color and button radius take effect via `settings-json`.
- As an engineer, I can see token expiration and trigger re‑auth.
  - AC: `unitOnLoad` error 401 is logged and a UI hint is shown.

## Tech Stack Decisions (validated)
- Frontend: Next.js 15 (App Router), React 18, MUI 6.
- Unit Web SDK: `components-extended.js` from Unit CDN (latest), white‑label app tag `<unit-elements-white-label-app>`.
- Token: JWT via `jwt-token` attribute. Sandbox demo token is `demo.jwt.token`. For production, configure IdP/JWKS in Unit Dashboard.

## Compliance & Security
- OTP: Unit performs OTP before sensitive actions; sandbox OTP code: `000001`.
- JWT: RS256 with `iss`, `sub`, `exp` claims when using custom/IdP JWT; configure JWKS/Issuer in Unit Dashboard.
- Storage: clear `unitCustomerToken` and `unitVerifiedCustomerToken` on logout.
- CSP: allow Unit/Zendesk/Plaid domains; restrict others.

## Integration Points
- Unit Dashboard (Sandbox):
  - Org Settings → Application Form (configure)
  - Org Settings → JWT Settings (JWKS + Issuer)
  - Org Settings → Integrations (Plaid creds for ACH debit)
- Optional endpoints (future):
  - End‑User Setup hook for prefill/role management (Unit will call our endpoint with Authorization: Bearer <JWT>)

## Constraints & Assumptions
- Without JWT configuration at Unit, production users cannot log in; sandbox demo token is acceptable for preview/testing only.
- We do not store PII from the component; it is hosted UI communicating with Unit.

## Acceptance Testing
- `/banking` renders, script loads from proper environment, and component appears.
- New user path shows Application Form; OTP `000001` completes flows in sandbox.
- Returning user path shows account info (requires valid JWT and Unit config).
- `unitOnLoad` error 401 is handled; logout clears local storage tokens.
