---
# Unit Customer Token Integration — Requirements

## Feature Overview
Integrate Unit White‑Label UI using customer bearer tokens, enabling end users to authenticate via a short‑lived Unit customer token obtained after a 2FA challenge (SMS/Call) or via a JWT-based SSO flow. The frontend embeds the Unit web component on `web/app/banking/customer-token/page.tsx`; the backend (`src/integration/`) exposes endpoints to resolve customers, initiate 2FA verification, and create customer tokens with strict validation and 5s timeouts.

## Functional Requirements
- Backend REST APIs (NestJS):
  - GET `/integration/unit/status` — Use Unit Node SDK to verify connectivity via `customers.list({ limit: 1 })` with 5s timeout.
  - POST `/integration/unit/customers/resolve` — Resolve Unit customerId by exact email match; optionally persist `unit_customer_id` to `User` if `userId` provided with uniqueness checks.
  - POST `/integration/unit/customers/:id/token/verification` — Start 2FA challenge. Body: `{ channel: 'sms'|'call', phone?: {countryCode, number}, locale?: string }`. Returns `verificationToken`.
  - POST `/integration/unit/customers/:id/token` — Create customer bearer token. Body supports either 2FA (`verificationToken` + `verificationCode`) or SSO (`jwtToken`). Includes `scope` and optional `expiresIn`.
- Frontend (Next.js) customer-token flow:
  - Resolve by email, display resolved `customerId`.
  - Allow sending verification (SMS/Call) with optional phone and locale; display `verificationToken` issued.
  - Accept verification code and request customer token with specified `scope` and `expiresIn`.
  - Embed `<unit-elements-white-label-app customer-token="..." />` once token is issued; react to 401/expiry and prompt re‑issue.
- DTO validation and constraints:
  - `ResolveCustomerDto` validates email; optional `userId` >= 1.
  - `CreateTokenVerificationDto` enforces `channel` in ['sms','call']; optional `phone` object and `locale`.
  - `CreateCustomerTokenDto` enforces `scope` and allows either (`verificationToken` + `verificationCode`) or `jwtToken`; `expiresIn` between 60 and 86400 seconds.
- Unit API integration details:
  - Use `Accept: application/vnd.api+json` and `X-Accept-Version: V2024_06` headers.
  - All outbound calls guarded with ~5s timeouts and descriptive logging (no secrets).
  - API key resolution via DB (active key) with fallback to `UNIT_API_KEY` env.

## Non‑Functional Requirements
- Reliability: Timeouts for remote calls (5s). Graceful error surfaces to UI.
- Security: 2FA gating for customer tokens; JWT SSO as controlled alternative. Mask sensitive data in logs.
- CORS: Allow localhost + Docker mapped ports for development.
- Observability: Minimal structured logs in `UnitService`; include reasons for upstream failures without exposing secrets.
- Performance: Endpoints should respond < 1s under nominal conditions (excluding remote timeouts).

## User Stories & Acceptance Criteria
- As a user, I can resolve my customer record by email.
  - AC: Posting a known email returns `customerId`; unknown email returns `customerId: null`.
- As an operator, I can link a resolved `customerId` to a platform `User`.
  - AC: Providing `userId` persists `unit_customer_id` if unique; duplicate linkage is rejected.
- As a user, I can request a 2FA challenge via SMS or Call.
  - AC: API returns `verificationToken`; errors surface with actionable messages.
- As a user, I can submit the verification code to receive a customer token.
  - AC: API returns `{ token, expiresIn }`; UI embeds Unit component using `customer-token`.
- As a user, I see a clear prompt when the customer token expires and can re‑issue a token.
  - AC: 401 from Unit web component triggers an expiry hint in the UI.
- Status healthcheck reflects Unit availability.
  - AC: `/integration/unit/status` returns `status: 'UP'` on success and `DOWN` with `reason` when not.

## Tech Stack Decisions (versions from codebase)
- Backend: NestJS ^11.1.6, TypeScript ^5.9, TypeORM ^0.3.26, MySQL 8.4, Redis 7, Node >=20.11.
- Frontend: Next.js ^15.4.6, React ^19.1.1, MUI ^7.3.1.
- Unit SDK: `@unit-finance/unit-node-sdk` ^1.3.4 (SDK used for status checks).
- Testing: Jest (backend unit/integration), Playwright (web E2E; config present under `web/playwright.config.ts`).
- Containers: Docker Compose with mapped ports API 41873, Web 56483, MySQL 52719, Redis 60941.

## Environment & Config
- Required env:
  - `UNIT_API_KEY` (server) and `UNIT_BASE_URL` (default `https://api.s.unit.sh`).
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (when JWT SSO is used).
  - DB/Redis connection (docker-compose provides service envs for containers).
  - Frontend: `NEXT_PUBLIC_API_URL` for API base; optional `NEXT_PUBLIC_UNIT_UI_ENV`, `NEXT_PUBLIC_UNIT_THEME_URL`, `NEXT_PUBLIC_UNIT_LANGUAGE_URL`.
- CORS: Enabled for localhost + docker mapped ports in `src/main.ts`.

## Compliance & Security Notes
- Do not log or persist raw customer tokens or verification codes beyond request scope.
- Treat emails as PII; ensure TLS in non‑local environments.
- Honor least‑privilege on Unit API key; rotate regularly; store in DB with encryption at rest.

## Integration Points
- Unit REST API endpoints: `/customers`, `/customers/:id/token/verification`, `/customers/:id/token`, `/application-forms` (existing).
- Unit SDK: `customers.list` for status check (5s timeout wrapper).

## Constraints & Assumptions
- Sandbox environment by default; test customers must exist for end‑to‑end verification.
- 2FA delivery (SMS/Call) relies on Unit’s sandbox behavior; real delivery only in non‑sandbox.
- Token lifetimes are short; frontend should handle expiry and re‑issue UX.

## Risks
- Using fallback `UNIT_API_KEY` may hide DB key misconfigurations; ensure alerts/logging highlight fallback usage.
- Token expiry during active session can disrupt UI if not handled; requires refresh mechanism.

## Open Questions
- Should we implement silent token refresh prior to expiry vs manual re‑issue?
- What default scopes should be granted per role/feature set?

## Out of Scope
- Full SSO JWT minting workflow and identity provider integration.
- Backoffice administration UI for key management (covered by separate plan).

## Acceptance & Verification
- Backend and frontend build clean without type errors.
- Docker Compose services healthy; `/health` returns `{ status: 'ok' }`.
- Smoke tests (`scripts/test-api.js`) pass.
- Manual QA of `/banking/customer-token` completes token issuance and embedding.
