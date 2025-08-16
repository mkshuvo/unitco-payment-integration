# Project Progress Report

Last updated: 2025-08-14T01:45:36+06:00

This document tracks implementation progress against `docs/project_plan/design_implementation_plan.md` and provides precise references for an agentic IDE to continue work.

---

## Phase A — Foundations

- [x] Docker + compose
  - Added `Dockerfile` for API using Node LTS (`node:22-alpine`) with healthcheck hitting `GET /health`.
    - File: `Dockerfile`
  - Added `.dockerignore` to slim image context.
    - File: `.dockerignore`
  - Created `docker-compose.yml` with unique, non-consecutive host ports to avoid conflicts.
    - MySQL: host `52719` -> container `3306`
    - Redis: host `60941` -> container `6379`
    - API: host `41873` -> container `3000`
    - Web: host `56483` -> container `3000`
    - File: `docker-compose.yml`
  - Added API health endpoint.
    - File: `src/app.controller.ts` (method `health()` at route `/health`)

- [x] Config module
  - Zod-based environment validation wired globally via `@nestjs/config`.
    - Files: `src/config/env.ts`, `src/app.module.ts`
    - Dependencies added: `@nestjs/config`, `zod` in `package.json`

- [~] Monorepo structure
  - Existing NestJS API at repo root (scripts in `package.json`).
  - Web app scaffold added under `web/` (see Phase E below).

## Phase D — Bank onboarding backend

- [x] Validation helpers
  - Implemented server-side validation algorithms from design plan Section 4.
    - File: `src/bank/validators.ts`
    - Functions: `isValidUsRouting`, `isValidIban`, `isValidSwift`, `maskAccountNumber`, `isValidUsAccountNumber`
    - Country-specific IBAN length validation with comprehensive country mapping

- [x] DTOs and validation
  - Created `AddAchBankDto` with class-validator decorators for comprehensive validation.
    - File: `src/bank/dto/add-ach-bank.dto.ts`
  - Created `BankAccountView` interface for API responses.
    - File: `src/bank/dto/bank-account-view.dto.ts`
  - Added validation pipe to main.ts for automatic DTO validation.

- [x] Encryption utilities
  - Implemented AES-GCM field-level encryption with random nonce.
    - File: `src/crypto/crypto.service.ts`
    - Functions: `encryptField`, `decryptField`, `maskSensitiveData`
    - Secure key management with base64 encoding validation
  - Created crypto module for dependency injection.
    - File: `src/crypto/crypto.module.ts`

- [x] Bank service and controller
  - Implemented `POST /providers/me/bank-accounts/ach` endpoint.
    - File: `src/bank/bank.controller.ts`
    - File: `src/bank/bank.service.ts`
    - File: `src/bank/bank.module.ts`
  - Features:
    - Server-side validation with proper error responses
    - Field-level encryption of sensitive data
    - Mock Unit counterparty creation (10% failure rate for testing)
    - Comprehensive logging with sensitive data redaction
    - Address normalization (trim, uppercase state)
  - Added `GET /providers/me/bank-accounts` endpoint for listing accounts.
  - Added unit tests for service logic.
    - File: `src/bank/bank.service.spec.ts`

## Phase B — Database and migrations

- [x] Database integration
  - Created TypeORM entities for existing tables with Unit-specific additions.
    - File: `src/entities/bank-branch.entity.ts`
    - File: `src/entities/bank-account.entity.ts`
  - Implemented repositories with proper business logic.
    - File: `src/repositories/bank-branch.repository.ts`
    - File: `src/repositories/bank-account.repository.ts`
  - Created database module with TypeORM configuration.
    - File: `src/database/database.module.ts`
  - Added migration for new Unit-specific columns.
    - File: `src/migrations/1703123456789-add-unit-columns.sql`
  - Features:
    - Bank branch deduplication by routing/SWIFT
    - Encrypted field storage with proper key management
    - Primary account management (single primary per user)
    - Unit counterparty status tracking
    - Transactional operations for data consistency

## Phase F — Payout pipeline

- [x] Payout computation service
  - Implemented payout preview computation with mock earnings data.
    - File: `src/payout/payout.service.ts`
    - Methods: `computePayoutPreview`, `createPayoutBatch`, `submitPayoutBatch`
  - Created payout entities for batch and item tracking.
    - File: `src/entities/payout-batch.entity.ts`
    - File: `src/entities/payout-item.entity.ts`
  - Implemented repositories with proper business logic.
    - File: `src/repositories/payout-batch.repository.ts`
    - File: `src/repositories/payout-item.repository.ts`

- [x] Batch preview endpoint
  - Created `GET /providers/me/payouts/preview` endpoint.
    - File: `src/payout/payout.controller.ts`
    - Query parameters: `startDate`, `endDate`
    - Returns estimated payout amount and delivery date

- [x] Batch creation + idempotent keying
  - Created `POST /providers/me/payouts/batches` endpoint.
    - File: `src/payout/dto/create-payout-batch.dto.ts`
    - Idempotency key prevents duplicate batch creation
    - Creates batch and individual payout items

- [x] Queueing and submission
  - Created `POST /providers/me/payouts/batches/:batchId/submit` endpoint.
    - Mock Unit API submission with 5% failure rate for testing
    - Updates batch and item statuses appropriately
    - Proper error handling and rollback

- [x] Batch listing
  - Created `GET /providers/me/payouts/batches` endpoint.
    - Returns all payout batches for the user
    - Ordered by creation date (newest first)

- [x] Database schema
  - Added migration for payout tables.
    - File: `src/migrations/1703123456790-create-payout-tables.sql`
    - Proper indexes for performance
    - Foreign key constraints for data integrity

- [x] Testing
  - Created comprehensive test script.
    - File: `scripts/test-payout-api.js`
    - Tests all endpoints including idempotency
    - Validates error handling and edge cases

---

## Phase E — Frontend

- [x] Next.js + MUI app
  - New Next.js 15 app with React 18 and MUI 6.
    - Files:
      - `web/package.json` (Next 15, React 18, MUI 6)
      - `web/next.config.mjs` (with `output: 'standalone'`)
      - `web/tsconfig.json`
      - `web/app/layout.tsx` (MUI ThemeProvider + CssBaseline)
      - `web/app/page.tsx` (Home shell with navigation)
      - `web/app/onboarding/page.tsx` (US ACH onboarding form, client-side validation)
      - `web/lib/validators.ts` (routing checksum + masking)
  - Dockerized web app using Node LTS and Next standalone output.
    - File: `web/Dockerfile`

- [x] API integration
  - Created API client for backend communication.
    - File: `web/lib/api.ts`
    - Functions: `addAchBankAccount`, `getBankAccounts`
    - Sensitive data redaction in logs
    - Proper error handling and type safety
  - Updated onboarding form to call real API endpoint.
    - File: `web/app/onboarding/page.tsx`
    - Replaced mock submission with actual API call
    - Displays real response data (masked account number, bank name, status)

---

## Current runtime status

- [ ] Bring-up command (ready for testing)
  - `docker compose up -d --build`
  - Expected checks:
    - API health: `GET http://localhost:41873/health -> {"status":"ok"}`
    - Bank API: `POST http://localhost:41873/providers/me/bank-accounts/ach` (with valid ACH data)
    - Web root: `http://localhost:56483/`
    - Web onboarding: `http://localhost:56483/onboarding`
    - `docker compose ps` shows all services healthy

- Known local lint/build notes
  - Local TS lints in `web/` about missing modules are expected until running `npm install` inside `web/`. Docker builds will install dependencies.
  - Backend requires `ENCRYPTION_KEY` environment variable (base64 encoded 32-byte key) for field encryption.

---

## Files changed in this iteration

- API: `src/app.controller.ts`, `src/app.module.ts`, `src/config/env.ts`, `src/main.ts`
- Backend: `src/bank/` (complete module), `src/crypto/` (complete module), `src/payout/` (complete module)
- Database: `src/database/`, `src/entities/`, `src/repositories/`, `src/migrations/`
- Root: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `package.json`
- Web: `web/Dockerfile`, `web/package.json`, `web/next.config.mjs`, `web/tsconfig.json`, `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/onboarding/page.tsx`, `web/lib/validators.ts`, `web/lib/api.ts`
- Scripts: `scripts/test-payout-api.js`

---

## Open items / decisions needed

- Stack startup: Ready to test with `docker compose up -d --build` - need to generate `ENCRYPTION_KEY` environment variable.
- Monorepo tooling: Decide whether to introduce pnpm workspaces now vs. keep npm per-package for initial delivery.
- Unit API integration: Replace mock counterparty creation with real Unit API calls.
- Authentication: Implement JWT guards and RBAC (currently using mock guards).
- Webhooks + reconciliation: Implement Unit payment status webhooks and reconciliation (Phase F remaining).
- Scheduler and lock: Implement automated Friday 10 AM CST payouts with distributed locking (Phase F remaining).

---

## Validation references implemented

- Algorithms documented in `docs/project_plan/design_implementation_plan.md` Section 4.
- Client-side US routing checksum: `web/lib/validators.ts:isValidUsRouting`.

---

## Next Steps (see checklist)

See `docs/next_steps_checklist.md` for actionable, checkbox-oriented tasks with file targets.
## Progress Update - 2025-08-16 23:49 +06:00
- Added modules and directories: src/bank/, src/crypto/, src/database/, src/entities/, src/migrations/, src/payout/, src/repositories/
- Updated core app files: src/app.module.ts, src/main.ts
- Web updates: web/app/onboarding/page.tsx; added web/lib/api.ts
- Infra: docker-compose.yml changes; package.json adjustments
- Docs: updated progress log

