---
# Unit Org API Token & Identity Status — Design

## Architecture Overview
- Backend (NestJS v11)
  - `IntegrationModule` with `IntegrationController` and `UnitService`.
  - New `UnitTokensModule` with `UnitTokensController` and `UnitTokensService`.
  - Reuse `ApiKeysService` + `CryptoService` for secret encryption if persisting tokens.
- Frontend (Next.js 15)
  - Dev-only store: `useUnitAuthStore` (Zustand v5), ephemeral token slice for manual testing.
  - All calls go through backend APIs; no direct Unit calls in production.
- Data
  - Optional DB entity `UnitOrgApiToken` for persisted org tokens (encrypted `secret`), metadata only in responses.

## Key Decisions
- Status check uses official SDK: `Unit.customers.list({ limit: 1 })` for lightweight connectivity.
- Versionless base URL by default: `https://api.s.unit.sh` (no `/v1`).
- Idempotent create operations using `Idempotency-Key` header.
- No secret logging; redact headers and bodies.
- Client-side token storage disabled in production builds.

## Modules and Responsibilities
- `UnitService`
  - `checkStatus()` → Uses Unit SDK (`new Unit(token, baseUrl)`) and calls `customers.list({ limit: 1 })` with a 5s timeout. Default base=`https://api.s.unit.sh`.
  - `resolveIdentity()` → GET `/identity` and return `{ userId, orgId, ... }` subset (internal helper).
- `UnitTokensService`
  - `createOrgApiToken(dto)` → Resolve `userId` via identity, POST `/users/:userId/api-tokens` (JSON:API), handle `Idempotency-Key`, optionally persist encrypted token.
  - `listOrgApiTokens()` → GET `/users/:userId/api-tokens` and/or combine with local metadata.
  - `revokeOrgApiToken(tokenId)` → DELETE `/users/:userId/api-tokens/:tokenId` and update local metadata.
- `UnitTokensController` (Admin-only)
  - `POST /admin/unit/org-api-tokens`
  - `GET /admin/unit/org-api-tokens`
  - `DELETE /admin/unit/org-api-tokens/:tokenId`
  - Guarded by `MockAdminGuard` (to be replaced by real RBAC later).

## API Contracts
- GET `/integration/unit/status` → 200
  - Response: `{ status: 'UP'|'DOWN', checkedAt: ISO, responseTimeMs: number, target: string, reason?: string }`.
- POST `/admin/unit/org-api-tokens` → 201
  - Request JSON:
    ```json
    {
      "description": "Production token",
      "scope": "customers applications",
      "expiration": "2026-12-31T23:59:59Z",
      "sourceIp": "1.2.3.4,5.6.7.8",
      "resources": [ { "type": "account", "id": "acc_123" } ]
    }
    ```
  - Response JSON (no plaintext token in logs; only in response when provided by Unit, and never persisted unless explicitly requested):
    ```json
    {
      "id": "19",
      "description": "Production token",
      "createdAt": "2025-08-20T10:51:09Z",
      "expiration": "2026-12-31T23:59:59Z",
      "token": "v2.public..." // may be present once
    }
    ```
- GET `/admin/unit/org-api-tokens` → 200
  - Response: array of token metadata (no token secret).
- DELETE `/admin/unit/org-api-tokens/:tokenId` → 200
  - Response: updated token metadata.

## Unit HTTP Details
- Base URL: `https://api.s.unit.sh` (default) or override via `UNIT_BASE_URL`.
- Status check: `Unit.customers.list({ limit: 1 })` via SDK.
- Headers to Unit (SDK): Managed by the SDK (JSON:API). Provide `Authorization: Bearer <active_token>` via `Unit` constructor.
- For create: `Content-Type: application/vnd.api+json`, `Idempotency-Key: <uuid>`
- JSON:API payload for create:
  ```json
  {
    "data": {
      "type": "apiToken",
      "attributes": {
        "description": "Production token",
        "scope": "customers applications",
        "expiration": "2026-12-31T23:59:59Z",
        "sourceIp": "1.2.3.4,5.6.7.8",
        "resources": [ { "type": "account", "id": "acc_123" } ]
      }
    }
  }
  ```

## Data Model (optional persistence)
- `UnitOrgApiToken` (table: `unit_org_api_tokens`)
  - `id` (pk, string from Unit or local pk)
  - `description` (string)
  - `scope` (string)
  - `expiration` (datetime, nullable)
  - `sourceIp` (string, nullable)
  - `resources` (json, nullable)
  - `secretEncrypted` (text, nullable)
  - `createdAt` (datetime)
  - `revokedAt` (datetime, nullable)
  - Indexes on `revokedAt`, `expiration`.

## Workflows
- Status
  1. `IntegrationController` → `UnitService.checkStatus()`.
  2. `UnitService` loads active key via `ApiKeysService.getActivePlaintext()`.
  3. Instantiate SDK: `new Unit(token, baseUrl)`; call `customers.list({ limit: 1 })`; race with a 5s timeout.
  4. Success → `UP`; errors/timeouts → `DOWN` with reason (from `UnitError` when available).
- Create Token
  1. Controller validates DTO (Zod/class-validator) + `MockAdminGuard`.
  2. `UnitService.resolveIdentity()` → `userId`.
  3. Build JSON:API payload from DTO; set `Idempotency-Key`.
  4. POST to Unit; on 201, optionally persist `token` encrypted; return sanitized response.
- List/Revoke Token
  - Proxy to Unit and merge with local metadata if persisted.

## Error Handling
- Map Unit 4xx/5xx to structured errors; include `status`, `code`, `message` (no bodies logged).
- Timeouts → 504-like error to client; status view shows `DOWN` and `reason`.
- Retries: for GET list/status on 5xx (1 retry with jitter). No retry on create with same idempotency key.

## Security
- No plaintext secrets in logs. Redact `Authorization` and JSON bodies containing `attributes.token`.
- CSRF protection for admin POST/DELETE; rate limiting.
- Scopes: keep minimal; recommend short expirations; allow IP restriction.
- Production: disable client-side token storage; only backend holds and uses tokens.

## Deployment Plan
- docker-compose env defaults:
  - `UNIT_BASE_URL=https://api.s.unit.sh`
  - `UNIT_STATUS_CHECK_PATH=/identity`
- Code changes:
  - Refactor `UnitService.checkStatus()` to use the Unit SDK (`customers.list({ limit: 1 })`) instead of raw HTTP.
  - Add `UnitTokensModule` (service + controller) and DTOs.
  - Optional TypeORM migration for `unit_org_api_tokens`.
- CI/CD: run `npm run build` (api, web), `dotnet` not applicable; docker builds pass. Add tests.

## Testing Strategy
- Unit tests: `UnitService.checkStatus()` mocking SDK `customers.list` to simulate success, timeout, and error (`UnitError`).
- Integration tests: controller e2e for status and token endpoints with nock/vcr-style mocks.
- Frontend tests: Zustand slice behavior (dev-only persistence), API client wiring.

## Observability
- Add basic metrics: `unit_status_ok_count`, `unit_status_latency_ms`, `unit_create_token_count`, `unit_http_errors_total`.
- Structured logs with correlation/idempotency IDs.

## Rollout & Backout
- Feature-flag the new token endpoints.
- Backout: revert env defaults to previous values; disable token endpoints.
