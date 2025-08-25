# Unit White‑Label UI (Banking) — Design

Last updated: 2025-08-24T03:12:26+06:00

## Architecture
- White‑Label App is a hosted web component from Unit, embedded via `<unit-elements-white-label-app>`.
- Our Next.js route `/banking` loads the Unit script from CDN and renders the component with a JWT.
- The component communicates directly with Unit APIs; no backend proxy is required for base flows.
- Optional enhancements: provide End‑User Setup and Users list endpoints for advanced management.

### Components
- `web/app/banking/page.tsx` — client page that:
  - Loads `components-extended.js` from Unit CDN (sandbox/prod switch via env)
  - Resolves `jwt-token` (env or localStorage), attaches `unitOnLoad` listener
  - Renders `<unit-elements-white-label-app>` with `settings-json`
- `web/app/banking/head.tsx` — CSP meta for Unit/Zendesk/Plaid domains.
- `web/app/page.tsx` — navigation entry to `/banking`.

### Sequence (high-level)
1) User hits `/banking` in Next.js
2) Page loads Unit CDN script
3) Page computes JWT (env or `localStorage` fallback)
4) `<unit-elements-white-label-app jwt-token=...>` mounts
5) If JWT maps to existing user: app shows banking dashboard
6) If JWT maps to a new user: app shows Application Form (onboarding)
7) For sensitive actions, Unit OTP challenge occurs (sandbox code `000001`)
8) On logout, app should remove `unitCustomerToken` & `unitVerifiedCustomerToken`

## Data Model
- None persisted by us in V1. All data flows within Unit UI and APIs.

## API Contracts
- None required for minimal embed.
- Optional (future):
  - End‑User Setup endpoint for prefill & role restrictions (per Unit docs)
  - Users list endpoint for end‑user management in White‑Label App

## Error Handling
- Attach `unitOnLoad` listener and check `e.detail.errors[0].status === '401'` to detect expired/invalid JWT and trigger re‑auth.

## Security
- JWT validation is performed by Unit; configure JWKS/Issuer in Unit Dashboard.
- OTP enforced by Unit before sensitive actions; sandbox OTP: `000001`.
- CSP meta allowing:
  - `connect-src`: `https://*.s.unit.sh` `https://*.unit.co` `https://*.zdassets.com` `https://*.zendesk.com` `https://cdn.plaid.com`
  - `script-src`: self, Unit, Zendesk, Plaid
  - `frame-src`: Zendesk, Plaid
- Clear Unit localStorage tokens on logout.

## Deployment
- Environment variables (web):
  - `NEXT_PUBLIC_UNIT_UI_ENV` = `sandbox | prod` (default sandbox)
  - `NEXT_PUBLIC_UNIT_JWT` (optional) — if present, used as initial jwt-token
- Docker images unchanged; page is static.

## Testing Strategy
- Manual test on sandbox:
  - Verify script loads (network)
  - With default token, component renders
  - OTP code `000001` works
  - 401 handling path displays prompt
- E2E (future): visual checks for embed presence; no deep interaction in CI.
