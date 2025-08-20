# API Key Management & Status — Developer Tasks

This plan decomposes the approved design into actionable, developer-ready tasks with IDs, dependencies, estimates, and priorities.

Conventions:
- Priority: P0 (blocker), P1 (high), P2 (normal), P3 (low)
- Estimates are rough person-hours.
- All backend code under `src/` (NestJS 11, TypeORM 0.3.x, MySQL 8.4).
- All frontend code under `web/` (Next.js 15, App Router, React 18, MUI 6).

## 0) Prereqs & Infra

- ID: PRE-001
  - Description: Add Unit config envs to Compose
  - Details:
    - Add `UNIT_BASE_URL` (e.g., `https://api.s.unit.sh/v1`) and `UNIT_STATUS_CHECK_PATH` (default `/customers?limit=1`) to `docker-compose.yml` → `services.api.environment`.
  - Paths: `docker-compose.yml`
  - Dependencies: None
  - Estimate: 0.5h
  - Priority: P1

- ID: PRE-002
  - Description: Add config schema keys for Unit API
  - Details:
    - Update `src/config/env.ts` `EnvSchema` with optional `UNIT_BASE_URL`, `UNIT_STATUS_CHECK_PATH`.
    - Ensure values plumb via `ConfigModule` as needed.
  - Paths: `src/config/env.ts`
  - Dependencies: PRE-001
  - Estimate: 0.5h
  - Priority: P1

- ID: PRE-003
  - Description: Ensure `ENCRYPTION_KEY` is set across environments
  - Details:
    - Confirm existing Compose value works; add `.env.example` entry with instructions to generate (via `scripts/generate-encryption-key.js`).
  - Paths: `.env.example`, `scripts/generate-encryption-key.js`
  - Dependencies: None
  - Estimate: 0.5h
  - Priority: P2

## 1) Database & Entities

- ID: DB-001
  - Description: Create `ApiKeyEntity`
  - Details:
    - `src/entities/api-key.entity.ts` with fields per design: `id (uuid)`, `name`, `encryptedSecret`, `iv`, `authTag`, `mask`, `fingerprint`, `isActive`, `createdAt`, `updatedAt`, `deletedAt`.
    - Index: unique on `fingerprint`. Soft delete via `deletedAt`.
  - Paths: `src/entities/api-key.entity.ts`
  - Dependencies: PRE-003
  - Estimate: 1h
  - Priority: P1

- ID: DB-002
  - Description: Migration for `api_keys` table
  - Details:
    - Add TypeORM migration to create table + indexes.
    - If no DataSource exists, add `data-source.ts` at repo root using env vars; add npm script aliases for `typeorm-ts-node-esm` or local `ts-node` invocation.
    - Commands (to be wired in scripts):
      - Generate (manual preferred): `npm run typeorm:migration:create --name CreateApiKeys`
      - Run: `npm run typeorm:run`
    - Note: If CLI setup is out of scope now, implement migration class manually and run via application bootstrap task (fallback).
  - Paths: `data-source.ts` (if needed), `src/migrations/*`
  - Dependencies: DB-001
  - Estimate: 2h
  - Priority: P1

## 2) Backend Module: API Keys

- ID: API-001
  - Description: Scaffold `ApiKeysModule`
  - Details:
    - Create module, controller, service, DTOs under `src/api-keys/`.
    - Wire module into `AppModule`.
  - Paths: `src/api-keys/*`, `src/app.module.ts`
  - Dependencies: DB-001, DB-002
  - Estimate: 1h
  - Priority: P1

- ID: API-002
  - Description: Implement `CryptoService` integration
  - Details:
    - Use existing `src/crypto/crypto.service.ts` AES-GCM methods.
    - On create/update: encrypt secret, compute `mask` (last 6 chars visible), compute SHA-256 `fingerprint` (hex, first 12 shown externally), never log plaintext.
  - Paths: `src/api-keys/api-keys.service.ts`
  - Dependencies: API-001
  - Estimate: 1.5h
  - Priority: P1

- ID: API-003
  - Description: CRUD Endpoints
  - Details:
    - `POST /api/keys` create (returns id, name, mask, fingerprint, isActive, timestamps).
    - `GET /api/keys` list with pagination (`limit`, `offset`).
    - `GET /api/keys/:id` details (no plaintext).
    - `PATCH /api/keys/:id` update name/secret (re-encrypt if secret provided).
    - `DELETE /api/keys/:id` soft delete.
  - Paths: `src/api-keys/api-keys.controller.ts`, DTOs
  - Dependencies: API-002
  - Estimate: 2h
  - Priority: P1

- ID: API-004
  - Description: Activate Endpoint (transactional)
  - Details:
    - `POST /api/keys/:id/activate`: in a single transaction, set all `isActive=false`, set target `isActive=true` (idempotent), unlocks with unique business rule: only one active key.
    - Use `QueryRunner` with repeatable read and retries on deadlock.
  - Paths: `src/api-keys/api-keys.service.ts`
  - Dependencies: API-003
  - Estimate: 1.5h
  - Priority: P1

- ID: API-005
  - Description: Mock admin guard
  - Details:
    - `MockAdminGuard` for management endpoints only (keys CRUD/activate). Toggle via env or simple header check.
  - Paths: `src/auth/mock-admin.guard.ts`, wire to routes
  - Dependencies: API-003
  - Estimate: 0.5h
  - Priority: P2

## 3) Backend Module: Integration Status

- ID: INT-001
  - Description: Scaffold `IntegrationModule` + controller/service
  - Details:
    - `GET /integration/unit/status` returns UP/DOWN with metadata.
    - Uses `fetch` (Node 20+) to call `${UNIT_BASE_URL}${UNIT_STATUS_CHECK_PATH}` with `Authorization: Bearer <activeKeyPlain>`.
    - Timeout 5s, handle 2xx as UP else DOWN, include reason.
  - Paths: `src/integration/*`
  - Dependencies: API-004, PRE-002
  - Estimate: 2h
  - Priority: P1

- ID: INT-002
  - Description: Config plumbing and redaction
  - Details:
    - Redact Authorization and response bodies in logs.
    - Add basic circuit-breaker style backoff (simple exponential backoff on transient 429/5xx for max ~2 retries for this on-demand check).
  - Paths: `src/integration/unit.service.ts`
  - Dependencies: INT-001
  - Estimate: 1h
  - Priority: P2

## 4) Frontend

- ID: FE-001
  - Description: Add API rewrites/proxy
  - Details:
    - Update `web/next.config.mjs` with `async rewrites()`:
      - If `process.env.DOCKER` or `NODE_ENV==='production'`: proxy `/api/:path*` → `http://api:3000/:path*`.
      - Else (local dev): proxy `/api/:path*` → `http://localhost:41873/:path*`.
  - Paths: `web/next.config.mjs`
  - Dependencies: PRE-001
  - Estimate: 0.5h
  - Priority: P1

- ID: FE-002
  - Description: Status Page UI
  - Details:
    - Add `web/app/status/page.tsx` per design. Poll every 30s and allow manual refresh.
    - Call `/integration/unit/status` via `web/lib/api.ts` helper.
    - Show UP/DOWN with details, guide to add/activate key if none active.
  - Paths: `web/app/status/page.tsx`, `web/lib/api.ts`
  - Dependencies: INT-001
  - Estimate: 1.5h
  - Priority: P1

## 5) Testing

- ID: TEST-001
  - Description: Unit tests — ApiKeysService
  - Details:
    - Validate encryption path (no plaintext persisted), mask/fingerprint correctness, duplicate fingerprint → 409.
  - Paths: `src/api-keys/__tests__/*.spec.ts`
  - Dependencies: API-002
  - Estimate: 2h
  - Priority: P1

- ID: TEST-002
  - Description: Unit tests — Activation
  - Details:
    - Ensure exactly one active key after activation; re-activating same id is idempotent; transactional integrity under concurrent calls (mock QueryRunner).
  - Paths: `src/api-keys/__tests__/*.spec.ts`
  - Dependencies: API-004
  - Estimate: 1.5h
  - Priority: P1

- ID: TEST-003
  - Description: E2E tests — Keys CRUD + Activate
  - Details:
    - Use `supertest` with Nest testing module; cover create/list/get/update/delete/activate flows.
  - Paths: `test/api-keys.e2e-spec.ts`
  - Dependencies: API-004, DB-002
  - Estimate: 2h
  - Priority: P1

- ID: TEST-004
  - Description: E2E tests — Integration status
  - Details:
    - Seed active key, mock fetch or hit live if creds provided (behind env flag). Verify UP/DOWN handling and redaction.
  - Paths: `test/integration-status.e2e-spec.ts`
  - Dependencies: INT-001
  - Estimate: 1.5h
  - Priority: P2

## 6) Dev Experience & Scripts

- ID: DX-001
  - Description: NPM scripts for migrations
  - Details:
    - Add scripts:
      - `typeorm:generate`, `typeorm:run`, `typeorm:revert` using `data-source.ts`.
    - Document usage in README.
  - Paths: `package.json`, `README.md`, `data-source.ts`
  - Dependencies: DB-002
  - Estimate: 1h
  - Priority: P2

- ID: DX-002
  - Description: Seed script for a test API key
  - Details:
    - Add `scripts/seed-api-key.ts` to insert a dummy key via service or raw SQL (non-sensitive value) behind `ALLOW_DUMMY_SEED=1` guard.
  - Paths: `scripts/seed-api-key.ts`
  - Dependencies: API-003
  - Estimate: 1h
  - Priority: P3

## 7) Security & Observability

- ID: SEC-001
  - Description: Add redaction to logger
  - Details:
    - Introduce interceptor/middleware to strip `authorization` headers from logs and mask API responses where applicable.
  - Paths: `src/common/logging/*`
  - Dependencies: INT-001
  - Estimate: 1h
  - Priority: P2

- ID: OBS-001
  - Description: Basic metrics counters
  - Details:
    - Count UP/DOWN status checks in memory and expose as part of `/health` JSON for now.
  - Paths: `src/integration/*`, `src/health/*` (if exists) or extend current `/health`
  - Dependencies: INT-001
  - Estimate: 1h
  - Priority: P3

## 8) Deployment

- ID: DEP-001
  - Description: Docker build & compose verification
  - Details:
    - Update compose envs. Build and run `docker-compose up --build`.
    - Verify `http://localhost:56483/status` and API routes function.
  - Paths: `docker-compose.yml`, Dockerfiles
  - Dependencies: FE-002, INT-001
  - Estimate: 1h
  - Priority: P1

## Milestones (Suggested Sequencing)
1) PRE-001 → PRE-002 → DB-001 → DB-002
2) API-001 → API-002 → API-003 → API-004 → API-005
3) INT-001 → INT-002
4) FE-001 → FE-002
5) TEST-001 → TEST-002 → TEST-003 → TEST-004
6) DX-001 → DX-002 → SEC-001 → OBS-001 → DEP-001

## Acceptance Checklist
- Keys stored encrypted (AES-GCM) with IV + auth_tag; mask/fingerprint computed; no plaintext logs.
- Only one active key at a time; activation idempotent and transactional.
- CRUD + activate endpoints implement contracts and guard.
- Status endpoint returns UP/DOWN using active key; frontend page shows live status with 30s polling + manual refresh.
- Docker deployment exposes status page at `http://localhost:56483/status`.
- Tests pass: unit + e2e for keys and status.
- README updated with migration and run instructions.
