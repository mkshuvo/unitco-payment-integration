# API Key Management & Connectivity Status — Design

Last updated: 2025-08-20T17:13:39+06:00

## Architecture Overview
- Backend (NestJS 11)
  - `ApiKeysModule` with `ApiKey` entity (TypeORM), `ApiKeysService`, `ApiKeysController` (routes under `/keys`).
  - `IntegrationModule` with `UnitIntegrationService` and `IntegrationController` (route: `GET /integration/unit/status`).
  - Uses existing `CryptoService` (AES-GCM) for at-rest encryption of secrets.
  - Transactional activation to enforce single-active-key invariant.
- Database (MySQL 8.4 via TypeORM)
  - New table `api_keys` for storing provider keys (initial provider: `UNIT`).
  - Unique fingerprint index and status index.
- Frontend (Next.js 15 + MUI 6)
  - Admin status page: `web/app/status/page.tsx` shows connectivity and active key fingerprint.
  - Next.js rewrites route `^/api/(.*)` on Web to API container (`http://api:3000/$1`) so the browser can use `http://localhost:56483/api/...` seamlessly.
- Networking
  - Web on host `56483` proxies to API on host `41873` (via Docker Compose network and Next.js rewrites).

## Module and Component Design
### Backend — ApiKeysModule
- Entity: `ApiKey`
- DTOs:
  - `CreateApiKeyDto { provider: 'UNIT'; name: string; description?: string; secret: string }`
  - `UpdateApiKeyDto { name?: string; description?: string; secret?: string }`
  - `ActivateApiKeyDto { id: string }`
- Service responsibilities:
  - Encrypt `secret` with AES-GCM via `CryptoService` (Nonce+Tag handling).
  - Compute `fingerprintSha256` of raw secret and a display `mask`.
  - CRUD operations; soft validations (e.g., duplicate fingerprint -> 409).
  - `activateKey(id)`: transactionally set one ACTIVE, all others INACTIVE.
- Controller routes (proxied by Web as `/api/keys/*`):
  - `GET /keys/` → list keys (no secret)
  - `POST /keys/create` → create key
  - `PUT /keys/edit/:id` → update key
  - `DELETE /keys/delete/:id` → delete key (guard: cannot delete only ACTIVE unless another is activated or force flag is provided)
  - `POST /keys/activate` → activate key

### Backend — IntegrationModule (Unit)
- `UnitIntegrationService`
  - `getActiveKey()` fetches ACTIVE key, decrypts with `CryptoService`.
  - `checkConnectivity()` performs lightweight Unit API request using decrypted secret.
  - Configurable path `UNIT_STATUS_CHECK_PATH` (default: `/customers?limit=1`) and `UNIT_BASE_URL`.
  - Returns `{ connectivity, checkedAt, activeKey, latencyMs, message }`.
- `IntegrationController`
  - `GET /integration/unit/status` → returns status payload for Web `/status` page.

### Frontend — Next.js
- Rewrites in `web/next.config.mjs`:
  ```js
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://api:3000/:path*' }
    ];
  }
  ```
- Pages/Components
  - `web/app/status/page.tsx`
    - Fetches `/integration/unit/status` via `/api/integration/unit/status` (rewritten to API).
    - Displays: connectivity UP/DOWN badge, latency, checkedAt, active key name + fingerprint mask, latest error message.
    - Refresh action (manual) and optional auto-refresh (SWR) every 30s.

## Data Model
### TypeORM Entity (ApiKey)
- Table: `api_keys`
- Columns
  - `id: uuid, primary`
  - `provider: enum('UNIT')`
  - `name: varchar(120) not null`
  - `description: varchar(512) null`
  - `secretEncrypted: varbinary` (ciphertext including nonce+tag, base64 in app-level if preferred)
  - `mask: varchar(64)` (e.g., `UNIT-****-****-ABCD`)
  - `fingerprintSha256: char(64) unique` (hex string)
  - `status: enum('ACTIVE','INACTIVE','REVOKED') default 'INACTIVE'`
  - `lastUsedAt: datetime null`
  - `createdAt, updatedAt: datetime`
- Indexes
  - `UNIQUE (fingerprintSha256)`
  - `INDEX (status)`

### Migration Plan
- Create `1703123456791-create-api-keys-table.sql` with DDL above.
- Seed: none by default.

## API Contracts (Detailed)
- `GET /keys/`
  - 200 OK: `Array<ApiKeyView>` where `ApiKeyView = { id, provider, name, description?, mask, fingerprint: string, status, lastUsedAt?, createdAt }`.
- `POST /keys/create`
  - Body: `{ provider: 'UNIT', name: string, description?: string, secret: string }`
  - 201 Created: `ApiKeyView`
  - Errors: 400 (validation), 409 (duplicate fingerprint)
- `PUT /keys/edit/:id`
  - Body: `{ name?, description?, secret? }`
  - 200 OK: `ApiKeyView`
  - Errors: 400, 404 (not found), 409 (duplicate fingerprint on rotate)
- `DELETE /keys/delete/:id`
  - 204 No Content
  - Errors: 400 (cannot delete when it is sole ACTIVE), 404
- `POST /keys/activate`
  - Body: `{ id: string }`
  - 200 OK: `{ id, status: 'ACTIVE' }`
  - Behavior: in a DB transaction, set given key ACTIVE and all others INACTIVE. Returns 404 if id not found.

## Status Contract
- `GET /integration/unit/status`
  - 200 OK: `{ connectivity: 'UP'|'DOWN', checkedAt: string, activeKey?: { id, name, fingerprint }, latencyMs?: number, message?: string }`
  - 503 Service Unavailable on upstream errors; body still includes sanitized `message`.

## Workflows
- Create Key
  1. Validate DTO → compute fingerprint & mask → encrypt secret → save → return view.
- Activate Key
  1. Begin transaction → set all ACTIVE→INACTIVE → set chosen id→ACTIVE → commit.
- Status Check
  1. Load ACTIVE → decrypt → call Unit API → measure latency → map to UP/DOWN → update `lastUsedAt` on success (optional) → return.

## Error Handling Strategy
- Validation via class-validator; Zod at config boundaries.
- Map DB unique constraint to HTTP 409.
- Redact `secret` from any error context.
- Use `HttpException` with meaningful messages and machine-readable codes.

## Security Measures
- AES-GCM field encryption via `CryptoService`; base64 `ENCRYPTION_KEY` from env.
- Do not log secrets; include unit tests for redaction and encryption round-trip.
- Optional: simple rate limit on `/keys/*` and `/integration/*` (future).
- Guard routes with existing mock admin guard; TODO to replace with JWT RBAC.

## Deployment Plan
- API
  - Add `ApiKeysModule` and `IntegrationModule` to `AppModule`.
  - Add migration for `api_keys`.
  - Config: `UNIT_BASE_URL` (e.g., `https://api.s.unit.sh/v1`) and `UNIT_STATUS_CHECK_PATH` (default `/customers?limit=1`).
- Web
  - Add rewrite for `/api/:path*` to `http://api:3000/:path*` in `web/next.config.mjs`.
  - Implement `web/app/status/page.tsx` UI.
- Docker Compose
  - No port changes. Ensure `ENCRYPTION_KEY` present for API.

## Observability
- Structured logs with correlation id (add middleware if not present).
- Metrics: count UP/DOWN results; expose via `/health` extension (future).

## Risks & Mitigations
- Duplicate secrets → fingerprint unique constraint, 409 response.
- No active key → status returns DOWN; UI instructs to add/activate.
- Unit API rate limiting → backoff in service and avoid frequent polling; UI manual refresh + 30s interval.

## Rollback Plan
- Revert feature module imports and routes.
- Drop `api_keys` table (data loss acceptable if reverting).
