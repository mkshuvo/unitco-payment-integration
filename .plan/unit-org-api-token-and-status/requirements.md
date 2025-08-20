# Unit Org API Token & Identity Status — Requirements

## Feature Overview
- Implement a robust flow to verify Unit connectivity via the identity endpoint and to create/manage Org API Tokens per Unit documentation.
- After admin login, the backend can request an Org API token for the authenticated Unit org user, store it securely (encrypted at rest), and expose minimal admin endpoints for lifecycle (create/list/revoke) in sandbox/dev. In production, tokens are managed on the backend only.
- Frontend (Next.js) will temporarily hold an ephemeral token in a Zustand store only in dev/sandbox for manual testing; production disables client-side persistence of secrets.

## Functional Requirements
- Status Check
  - Endpoint: `GET /integration/unit/status` (existing) must use the official Unit SDK `@unit-finance/unit-node-sdk`.
  - Lightweight call: `Unit.customers.list({ limit: 1 })` against `{UNIT_BASE_URL}` for connectivity.
  - Defaults: `UNIT_BASE_URL=https://api.s.unit.sh` (versionless base URL).
  - Headers: Managed by the SDK (JSON:API). Provide `Authorization: Bearer <active_token>` via SDK constructor; no manual `Accept` header needed.
  - Timeout: 5s. Response: `UP|DOWN`, response time, target (SDK call), optional reason; never expose secrets.
  - Note: Keep `UNIT_STATUS_CHECK_PATH=/identity` config for diagnostics/manual checks, but the status endpoint uses the SDK by default.
- Org API Token Management (Admin-only, guarded)
  - Create: `POST /unit/org-api-tokens`
    - Inputs (JSON): `description` (string), `scope` (space-delimited scopes), `expiration` (RFC3339), optional `sourceIp` (comma-delimited, no spaces), optional `resources` (restricted resources).
    - Behavior: Backend resolves Unit `userId` via `GET /identity` (or via mapped auth context), then calls Unit `POST https://api.s.unit.sh/users/:userId/api-tokens` with JSON:API payload and headers.
    - Headers to Unit: `Authorization: Bearer <active_token>`, `Content-Type: application/vnd.api+json`, `Accept: application/vnd.api+json`, `Idempotency-Key: <uuid>`.
    - Returns: The newly created token resource; if `attributes.token` is present, handle as secret (mask in logs; DO NOT persist unless explicitly requested). If persist requested, encrypt at rest.
  - List: `GET /unit/org-api-tokens` → proxies `GET https://api.s.unit.sh/users/:userId/api-tokens` and/or reads local persisted metadata. No secrets in responses.
  - Revoke: `DELETE /unit/org-api-tokens/:tokenId` → proxies `DELETE https://api.s.unit.sh/users/:userId/api-tokens/:tokenId` and updates local metadata if persisted.
- Secret Handling & Storage
  - All tokens treated as secrets. No plaintext in logs, traces, or error messages.
  - If persisted, encrypt using AES-GCM with `ENCRYPTION_KEY` (already implemented in `CryptoService`).
  - Persist only minimal metadata (description, createdAt, expiration, lastUsed if applicable), and the encrypted token value if requested.
- Frontend (Dev/Sandbox only)
  - Zustand v5 store slice `useUnitAuthStore` with in-memory token by default; optional sessionStorage persistence via `persist` middleware for dev.
  - Token cleared on sign out or tab close. For production builds, persistence disabled and token never stored client-side.
  - All API calls from web use backend endpoints; direct calls to Unit from client are forbidden in production.

## Non-Functional Requirements
- Security: OWASP top 10 mitigations, CSRF for state-changing backend endpoints, strong input validation (Zod), rate limiting on admin endpoints, idempotency for create.
- Reliability: 5s timeout on upstream calls, retries for transient 5xx with jitter (non-create), structured error handling.
- Observability: Redact sensitive headers. Log status code, latency, and endpoint. Add basic metrics counters and timers.
- Performance: Status check <2s p95; token creation <3s p95 in sandbox.
- Compatibility: Node 20+ global fetch, NestJS v11, Next.js 15.

## User Stories & Acceptance Criteria
- As an admin, I can check Unit status and see `UP` within 2s when Unit is reachable.
  - AC: `GET /integration/unit/status` returns 200 with `status=UP` when `GET /identity` returns 200.
  - AC: Returns `DOWN` with `reason` on non-2xx, timeout, or missing key; no secrets leaked.
- As an admin, I can create an Org API token with a description, scope, and expiration.
  - AC: Backend sends JSON:API payload to Unit and includes `Idempotency-Key`.
  - AC: Response includes token metadata, and plaintext token never logged.
- As an admin, I can list and revoke Org API tokens.
  - AC: `GET` lists tokens without revealing secrets; `DELETE` revokes and returns 200.
- As a developer, in sandbox I can temporarily store the token in Zustand to test manual calls.
  - AC: Dev build persists to sessionStorage; prod build disables persistence and never stores token client-side.
- As a security officer, I can confirm tokens are encrypted at rest when persisted and are rotated/expired per policy.

## Tech Stack Decisions (versions)
- Backend: NestJS `^11.0.1`, TypeScript `^5.7.3`, Node `>=20.11` (global fetch), TypeORM `^0.3.20`, MySQL `8.4` (container), Zod `^3.23.8`.
- Frontend: Next.js `^15.4.6`, React `^19.1.1`, TypeScript `^5.9.2`, Zustand `^5.0.8`, MUI `^7.3.x`.
- Crypto: AES-GCM via existing `CryptoService` using `ENCRYPTION_KEY`.

## Integration Points
- Unit Endpoints
  - `GET https://api.s.unit.sh/identity` (status check + resolve `userId`).
  - `POST https://api.s.unit.sh/users/:userId/api-tokens` (create), `GET` list, `DELETE` revoke.
- Backend Modules
  - `IntegrationController` → status.
  - New `UnitTokensController` (proposed) with `UnitService` methods for create/list/revoke.
  - Reuse `ApiKeysService` crypto if persisting secrets; optionally introduce `UnitOrgApiToken` entity for clearer typing.
- Config
  - `.env`/compose defaults: `UNIT_BASE_URL=https://api.s.unit.sh`, `UNIT_STATUS_CHECK_PATH=/identity`.

## Security & Compliance
- GDPR: PII may be present in identity payloads; do not log payload bodies. Provide data minimization and access control.
- SOC 2: Secrets management, audit logs for admin actions (create/revoke), least privilege scopes.
- PCI-DSS: Not directly in scope (no PAN storage/processing). Treat tokens as secrets; transport over TLS only.

## Constraints & Assumptions
- An initial admin-level Unit token is available (env or DB) to bootstrap identity and token creation.
- Real auth/RBAC is pending and will replace the mock admin guard.
- Sandbox/dev flows may differ from production hardening (no client-side token).

## Risks & Mitigations
- Incorrect base URL or headers cause 404 → use versionless base `https://api.s.unit.sh` and `Accept: application/vnd.api+json`.
- Token exposure in logs → central redaction and never log Authorization or token-bearing bodies.
- Long-lived tokens → enforce expirations; rotate and revoke.

## Open Questions
- Persist new org tokens in DB or treat as ephemeral only? If persisting, create a dedicated `UnitOrgApiToken` entity vs reusing `ApiKey`.
- Will `userId` be sourced from `GET /identity` or from our future auth context mapping?

## Deliverables
- This requirements document (approval gate).
- Upon approval: Design (architecture, schema, API contracts) followed by developer-ready tasks.
