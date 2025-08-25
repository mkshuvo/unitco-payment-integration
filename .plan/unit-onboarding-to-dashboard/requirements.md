# Unit Onboarding → Dashboard (White‑Label UI) — Requirements

## Feature Overview
Implement a seamless end‑to‑end flow using Unit’s White‑Label UI so that:
- New users complete onboarding via the Unit Application Form embedded in our app.
- After the customer is created/approved, the user lands in our embedded banking dashboard (White‑Label App) with no manual token entry.
- Authentication for the embedded dashboard is provided by a short‑lived, server‑minted token.

Two supported authentication approaches for the White‑Label App:
- Preferred MVP: Unit Customer Token (customer bearer token) passed as `customer-token` to `<unit-elements-white-label-app>`.
- Alternative/SSO: JWT‑based auth passed as `jwt-token` to `<unit-elements-white-label-app>` (requires Unit‑configured issuer/JWKs or public key).

References (verified):
- White‑Label App (embedding, auth, customer-token support): https://www.unit.co/docs/white-label-uis/white-label-app/
- Customer API Tokens (customer bearer token + verification/JWT options): https://www.unit.co/docs/api/customer-api-tokens/
- Application Form (creation + embedding): https://www.unit.co/docs/white-label-uis/white-label-application-form/

## Functional Requirements
- Application Form:
  - Render `<unit-elements-application-form>` using a backend‑generated application form token from `POST /integration/unit/application-forms` (already implemented in `UnitService.createApplicationForm`).
  - Auto refresh form token before expiration while the user is on the page.
- Detect completion → determine `customerId`:
  - Backend endpoint to fetch Application Form details and included Application, then derive `customerId` when available using Unit SDK `applicationForms.get(id)`.
  - Frontend polls this endpoint after submission until `customerId` is available or failure state reached.
- Mint Customer Token (MVP path):
  - Backend endpoint to mint a Unit Customer Token for the derived `customerId` using Unit SDK `customerToken.createToken(customerId, request)` with server‑controlled scopes and `expiresIn` (<= 86400, default 24h). Short‑lived recommended (e.g., 15–60 minutes).
  - If requested scopes require OTP, support the verification flow using `customerToken.createTokenVerification` followed by `createToken` with `verificationToken` + `verificationCode`.
- Embed White‑Label App:
  - Frontend loads `https://ui.s.unit.sh/release/latest/components-extended.js` (Sandbox) and renders `<unit-elements-white-label-app customer-token="..." theme="..." language="..." />`.
  - On logout, clear `unitCustomerToken` and `unitVerifiedCustomerToken` from `localStorage`.
- Optional SSO path (future):
  - Use JWT instead of customer token by passing `jwt-token` to the component. Configure issuer/JWKs or RS256 public key in Unit, and mint short‑lived JWTs server‑side.

## Non‑Functional Requirements
- Security:
  - All tokens minted server‑side using the Unit API key stored securely.
  - Do not expose API key to frontend. Do not mint tokens in the browser.
  - Use HTTPS only. Implement CORS limits for backend endpoints.
  - Token lifetime minimized and refresh performed when needed.
- Reliability & UX:
  - Clear user feedback during loading/verification states, retries with backoff, and actionable error messages.
  - Automatic transition from onboarding to dashboard upon success with no manual copy/paste.
- Observability:
  - Structured logs for token mint attempts, application form polling, and transitions.
  - Trace correlation IDs (idempotency keys where relevant) for Unit calls.
- Performance:
  - Backend token mint endpoints respond < 500ms p95 when Unit is healthy.
- Accessibility & i18n:
  - Respect language setting for both Application Form and White‑Label App via `language` attribute.

## User Stories & Acceptance Criteria
- As an applicant, I can complete the onboarding form embedded in the app.
  - AC: `<unit-elements-application-form>` renders with valid token and handles expiration transparently.
- As a new customer, I am automatically taken to the embedded banking dashboard after onboarding.
  - AC: Within a few seconds of form completion, the app transitions to the dashboard and renders `<unit-elements-white-label-app>`.
- As a user, I never have to paste tokens.
  - AC: Frontend programmatically obtains the token from backend and mounts the component.
- As a security owner, I require short‑lived tokens and server‑only minting.
  - AC: Token TTL configurable; default ≤ 60 minutes; auto‑refresh path available.
- As a QA, I can test sandbox flows fully.
  - AC: Sandbox base URLs and UI scripts are used; errors surface with meaningful messages; Playwright E2E covers the full flow.

## Tech Stack Decisions (versions from repo)
- Backend: NestJS `^11.1.6`, Node `>=20.11`, TypeScript `^5.9.2`, TypeORM `^0.3.26`.
- Unit Node SDK: `@unit-finance/unit-node-sdk@^1.3.4`.
- Frontend: Next.js `^15.4.6`, React `^19.1.1`, MUI `^7.3.1`.

## Integration Points
- Backend (NestJS):
  - Existing: `POST /integration/unit/application-forms` ⇒ `UnitService.createApplicationForm()`.
  - New:
    - `GET /integration/unit/application-forms/:id` ⇒ Calls `unit.applicationForms.get(id)`; returns Application Form + included Application data (to resolve `customerId`).
    - `POST /integration/unit/customer-tokens` ⇒ Body: `{ customerId: string, scope?: string, expiresIn?: number, resources?: {type: 'card'|'account', ids: string[]}[] }` ⇒ Calls `unit.customerToken.createToken()` and returns `{ token, expiresIn }`.
    - `POST /integration/unit/customer-tokens/verification` ⇒ Body: `{ customerId: string, channel: 'sms'|'call', phone?: { countryCode: string, number: string }, appHash?: string, language?: string }` ⇒ Calls `unit.customerToken.createTokenVerification()` and returns `{ verificationToken }`.
    - `POST /integration/unit/customer-tokens/confirm` ⇒ Body: `{ customerId: string, scope: string, verificationToken: string, verificationCode: string, expiresIn?: number }` ⇒ Calls `unit.customerToken.createToken()` with verification params and returns `{ token, expiresIn }`.
    - Optional for SSO JWT: `POST /integration/unit/jwt` to mint RS256 JWT for `jwt-token` flow (only if this path is chosen).
- Frontend (Next.js):
  - Onboarding page (`web/app/onboarding/application-form/page.tsx`): Continue to embed form. After submission, poll backend `GET /integration/unit/application-forms/:id`; when `customerId` is available, request customer token; navigate to `/banking` and embed white‑label app with `customer-token`.
  - Banking page (`web/app/banking/page.tsx`): Support receiving `customerToken` or pulling it from the backend/session; pass it as `customer-token` into `<UnitWhiteLabel />`.

## Security Measures
- API keys stored only in backend (DB or env). Fallback to `UNIT_API_KEY` env is supported.
- Do not persist customer tokens server‑side; mint on demand and return to client over HTTPS.
- Clear `localStorage` keys `unitCustomerToken` and `unitVerifiedCustomerToken` on logout.
- CSP: allow Unit UI script domain; avoid unsafe-inline.

## Deployment Plan (high level)
- Backend: standard CI build (`nest build`), Docker image (fixed CMD path), deploy.
- Frontend: Next.js build; ensure rewrites proxy `/integration/*` to backend; run E2E in CI.

## Testing Strategy
- Unit tests for token endpoints (mock SDK).
- E2E (Playwright): Application Form → token mint → White‑Label App renders; resilient to sandbox delays.
- Negative tests: failed verification, expired tokens, missing customerId.

## Compliance & Data Protection
- PII handled by Unit components and APIs; do not store sensitive data beyond logs/IDs.
- Respect GDPR best‑effort (data minimization, secure transport, deletion requests handled via Unit where applicable).
- KYC/KYB is orchestrated by Unit flows; no custom storage of ID docs.

## Constraints & Assumptions
- Sandbox base URLs: API `https://api.s.unit.sh`, UI `https://ui.s.unit.sh/release/latest/components-extended.js`.
- White‑Label App can be authenticated either by `customer-token` (MVP) or `jwt-token` (SSO path) — we default to customer token for lower complexity.
- Scopes are configurable; default minimal set for dashboard read/use. If an upgradable scope (requiring OTP) is requested, verification endpoints are required.
