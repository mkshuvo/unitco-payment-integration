---
# Unit Customer Token Integration — Design

## 1. Architecture Overview
- Frontend (`web/` Next.js 15, React 19)
  - Page `web/app/banking/customer-token/page.tsx` orchestrates a 4‑step flow: resolve → verify → token → embed.
  - Component `web/components/UnitWhiteLabel.tsx` renders `<unit-elements-white-label-app>` with `customer-token` attribute.
  - API client `web/lib/api.ts` calls backend under `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:41873`).
  - Unit UI script is injected via helpers in `web/lib/unit.ts` (env, theme, language URLs).
- Backend (`src/` NestJS 11)
  - Controller `src/integration/integration.controller.ts` exposes endpoints under `/integration/unit/...`.
  - Service `src/integration/unit.service.ts` integrates with Unit:
    - Status check via Unit SDK `customers.list({ limit: 1 })` with a 5s timeout.
    - REST calls for search, verification, token creation with 5s abort controllers and JSON:API headers.
  - DTOs in `src/integration/dto/*.ts` enforce input validation.
  - Data: `src/entities/user.entity.ts` includes `unit_customer_id` unique mapping.
  - API key management through `ApiKeysService` with env fallback to `UNIT_API_KEY`.
- Infra
  - MySQL 8.4, Redis 7 via Docker Compose.
  - API exposed on `http://localhost:41873`, Web on `http://localhost:56483` in compose.

## 2. Component Design
- Frontend
  - `CustomerTokenBankingPage` state machine:
    - resolve → set `customerId`.
    - send verification → set `verificationToken`.
    - create token → set `customerToken` and pass to `UnitWhiteLabel`.
    - listen for `unitOnLoad` errors (401) to mark token expired and prompt re‑issue.
  - `UnitWhiteLabel` supports both `jwt-token` and `customer-token` attrs; we use `customer-token` in this flow.
- Backend
  - `IntegrationController` methods:
    - `GET /integration/unit/status`
    - `POST /integration/unit/customers/resolve`
    - `POST /integration/unit/customers/:id/token/verification`
    - `POST /integration/unit/customers/:id/token`
  - `UnitService` implements timeouts, JSON:API headers, and error logging; API key resolution uses DB first then env.

## 3. Data Model
- `users` table (`User` entity):
  - `id` (PK, int), `email` (unique), `password_hash`, optional `full_name`, `is_active`, `last_login_time`.
  - `unit_customer_id` (varchar(64), unique, nullable) — linkage to Unit Customer.
  - timestamps: `created_time`, `updated_time`, soft delete `deleted_time`.

## 4. API Contracts
- Status
  - GET `/integration/unit/status` → 200
    - Response: `{ status: 'UP'|'DOWN', checkedAt: string, responseTimeMs: number, target: string, reason?: string }`
- Resolve Customer
  - POST `/integration/unit/customers/resolve` → 200
    - Request: `{ email: string, userId?: number }`
    - Response: `{ email: string, customerId: string | null, persisted: boolean }`
    - Errors: 400 `User not found`, 400 `Unit customer already linked to another user`.
- Create 2FA Verification
  - POST `/integration/unit/customers/:id/token/verification` → 201
    - Request: `{ channel: 'sms'|'call', phone?: { countryCode: string; number: string }, locale?: string }`
    - Response: `{ verificationToken: string }`
    - Errors: 4xx/5xx mapped from Unit; message redacted but actionable.
- Create Customer Token
  - POST `/integration/unit/customers/:id/token` → 201
    - Request (either 2FA or JWT):
      - 2FA: `{ scope: string, verificationToken: string, verificationCode: string, expiresIn?: number }`
      - JWT: `{ scope: string, jwtToken: string, expiresIn?: number }`
    - Response: `{ token: string, expiresIn: number }`
    - Errors: 400 if neither 2FA nor JWT supplied; 4xx/5xx mapped from Unit.

Notes:
- Headers to Unit: `Accept: application/vnd.api+json`, `Content-Type: application/vnd.api+json`, `X-Accept-Version: V2024_06`.
- 5s timeout on all outbound calls with descriptive logging (no secrets).

## 5. Workflow (End‑to‑End)
1) User inputs email (and optional platform `userId`).
2) Backend resolves Unit `customerId` by email; optionally persists `unit_customer_id` on the user (with uniqueness checks).
3) User starts verification (sms/call), optionally provides phone and locale; backend returns `verificationToken`.
4) User enters verification code and requests a token; backend calls Unit to issue `{ token, expiresIn }`.
5) Frontend renders `<unit-elements-white-label-app customer-token="..." />`.
6) If Unit signals 401/expired, UI prompts to reissue a token.

## 6. Error Handling Strategy
- Frontend
  - Display MUI `Alert` on failures with sanitized messages.
  - Detect 401 via Unit element `unitOnLoad` event details.
- Backend
  - Translate Unit errors into generic messages; keep specifics in logs with status/title/code only.
  - Use 5s aborts to avoid hung requests; log timeouts distinctly.
  - Validation via class‑validator DTOs; return 400 on invalid inputs.

## 7. Security Measures
- 2FA gating for token issuance by default; JWT path restricted to SSO contexts.
- Do not log API keys, verification codes, or tokens.
- CORS enabled for localhost and Docker ports in `src/main.ts`.
- API Key source: DB (preferred) with env fallback; rotate keys routinely.
- Consider rate limiting `/integration/unit/*` to mitigate brute force (future improvement).

## 8. Deployment Plan
- Local Docker Compose
  - Services: mysql (52719→3306), redis (60941→6379), api (41873→3000), web (56483→3000).
  - `UNIT_BASE_URL` defaults to `https://api.s.unit.sh`; set `UNIT_API_KEY` in `.env`.
  - `NEXT_PUBLIC_API_URL` for web points to `http://localhost:41873` (compose config already sets this).
- Commands
  - Build: `npm run build` (api), `npm run build --prefix web` (web).
  - Run (compose): `docker compose up -d --build`.
  - Health: `GET http://localhost:41873/health` and open `http://localhost:56483/banking/customer-token`.

## 9. Testing Strategy
- Backend (Jest)
  - Unit: `unit.service.spec.ts` — mock `fetch` and `Unit` SDK; test success, timeout, error paths.
  - Controller: `integration.controller.spec.ts` — validate DTOs and error mappings.
- Frontend (Playwright)
  - E2E happy path:
    - Navigate to `/banking/customer-token`.
    - Resolve known email → see `customerId`.
    - Trigger verification (`sms`) → see verification token hint.
    - Enter verification code (sandbox value) → token embedded; Unit UI visible.
  - Expiration path: simulate 401 to show expiry banner.
  - Note: For CI, consider stubbing backend or running sandbox‑ready fixtures.
- Smoke Tests
  - `scripts/test-api.js` for API health and ACH validations (already present).

## 10. Observability & Logging
- Minimal structured logs in `UnitService`:
  - Status checks, timeouts, and high‑level Unit error summaries (status/title/code) only.
- Frontend console logs kept minimal; sensitive data masked via helpers in `web/lib/api.ts`.

## 11. Token Refresh Strategy (Planned)
- Short‑term: manual re‑issue when expired (current UI).
- Mid‑term: track `expiresIn` from backend, schedule pre‑expiry refresh (e.g., T-60s) and re‑embed component.
- Error events: on 401 from Unit element, trigger refresh flow or surface UI to re‑issue.

## 12. Risks & Mitigations
- Token expiry during session → pre‑expiry refresh plan.
- DB key missing → fallback to env is logged; add alerting on fallback usage.
- Sandbox variability for 2FA delivery → provide manual code entry path; document known sandbox codes if available.

## 13. Rollout Plan
- Dev verification locally with Compose.
- Staging with actual sandbox customers; run E2E.
- Monitor logs for Unit error rates and timeouts; tune retry/timeout policies if needed (currently 5s hard abort).

## 14. Diagram Notes
- As per process, the formal Mermaid diagrams will be delivered in `tasks_diagram/` with the tasks:
  - `feature_sequence_mermaid.md` (end‑to‑end flow)
  - `feature_flowchart_mermaid.md` (overall process & decisions)
