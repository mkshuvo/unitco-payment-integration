# Unit Org API Token & Identity Status — Tasks

This plan converts the approved requirements and design into developer-ready tasks. Each item includes ID, description, dependencies, estimate, and priority.

- ID: UT-001
  - Description: Refactor `UnitService.checkStatus()` to use `@unit-finance/unit-node-sdk` (`new Unit(token, baseUrl)`) and call `customers.list({ limit: 1 })` with a 5s timeout. Default base URL: `https://api.s.unit.sh`.
  - Dependencies: ConfigService, ApiKeysService
  - Estimate: 1h
  - Priority: High
  - Status: Completed

- ID: UT-002
  - Description: Update `docker-compose.yml` defaults to `UNIT_BASE_URL=https://api.s.unit.sh` and `UNIT_STATUS_CHECK_PATH=/identity`.
  - Dependencies: N/A
  - Estimate: 0.5h
  - Priority: High
  - Status: Completed

- ID: UT-003
  - Description: Add `scripts/unit-identity-check.js` using `@unit-finance/unit-node-sdk` to call `/identity` with `Accept: application/vnd.api+json`.
  - Dependencies: `@unit-finance/unit-node-sdk`
  - Estimate: 1h
  - Priority: High
  - Status: Completed

- ID: UT-004
  - Description: Implement `UnitTokensModule` (Nest). Endpoints:
    - POST `/admin/unit/users/:userId/api-tokens` (idempotency header support)
    - GET `/admin/unit/users/:userId/api-tokens`
    - DELETE `/admin/unit/users/:userId/api-tokens/:tokenId`
  - Dependencies: Unit SDK `orgTokens`, MockAdminGuard
  - Estimate: 1.5d
  - Priority: High

- ID: UT-005
  - Description: Integrate `CryptoService` to optionally encrypt and store created org tokens. Add config flag for persistence vs ephemeral.
  - Dependencies: `CryptoService`, DB layer (ApiKey-like entity or a new table)
  - Estimate: 1d
  - Priority: High

- ID: UT-006
  - Description: Add rate limiting + CSRF protections for admin endpoints. Keep `MockAdminGuard` until RBAC is ready.
  - Dependencies: Nest middleware/guards, `@nestjs/throttler` (or custom)
  - Estimate: 0.5d
  - Priority: Medium

- ID: UT-007
  - Description: Frontend (Next.js) — Implement Zustand v5 store for dev/sandbox-only token persistence and UI to invoke create/list/revoke.
  - Dependencies: Next.js app, Zustand 5, API routes above
  - Estimate: 1.5d
  - Priority: Medium

- ID: UT-008
  - Description: Update docs/README with security guidance (no plaintext logging), environment guidance, and operational runbooks.
  - Dependencies: N/A
  - Estimate: 0.5d
  - Priority: Medium

- ID: UT-009
  - Description: Resolve npm deprecations by upgrading Jest toolchain (Jest 30 + ts-jest 30) to eliminate `glob@7`/`inflight`.
  - Dependencies: Node 20+, TypeScript 5
  - Estimate: 0.5d
  - Priority: Medium

- ID: UT-010
  - Description: Add unit and E2E tests for Unit status and token endpoints (mock HTTP with nock/MSW for negative/timeout cases).
  - Dependencies: Jest, Supertest
  - Estimate: 1d
  - Priority: High

- ID: UT-011
  - Description: Add structured logging + redaction for headers (no secrets) and consistent error mapping for Unit SDK errors.
  - Dependencies: Logger, error filters
  - Estimate: 0.5d
  - Priority: Medium

- ID: UT-012
  - Description: CI updates to run tests for API + web, plus health checks. Verify zero warnings and produce coverage report.
  - Dependencies: CI provider
  - Estimate: 0.5d
  - Priority: Medium

- ID: UT-013
  - Description: Deployment plan: Docker image build and compose, env propagation for Unit vars, and app health-checks.
  - Dependencies: Docker/Compose
  - Estimate: 0.5d
  - Priority: Medium

## Acceptance Criteria
- `/integration/unit/status` returns UP with valid token; DOWN with clear reasons otherwise.
- Admin token endpoints function per API contracts with idempotency and secure handling.
- No plaintext tokens logged. Optional encryption works.
- Jest upgrade removes `glob@7`/`inflight` from dependency tree.
- CI green with unit + E2E passing.
