# Next Steps Checklist (Agentic)

This task list aligns with `docs/project_plan/design_implementation_plan.md`. Each item includes concrete file targets and acceptance checks.

## Phase A — Foundations

- [ ] Introduce workspace tooling (optional now; recommended soon)
  - Goal: pnpm workspaces with shared package for DTOs
  - Files:
    - `pnpm-workspace.yaml` (root)
    - `packages/shared/package.json`
    - `packages/shared/src/index.ts` (DTOs/enums from plan §3)
  - Acceptance:
    - `pnpm -w install` and `pnpm -w typecheck` succeed
  - Note: If staying with npm for now, defer this to later.

## Phase D — Bank onboarding backend

- [ ] Add DTOs and validation helpers
  - Files:
    - `src/bank/dto/add-ach-bank.dto.ts`
    - `src/bank/validators.ts` (server-side routing, IBAN, SWIFT, masks)
    - `src/bank/bank.controller.ts`
    - `src/bank/bank.service.ts`
    - `src/bank/bank.module.ts`
  - Acceptance:
    - Invalid routing returns 400; valid path stores encrypted fields (mock persistence for now).

- [ ] Implement POST /providers/me/bank-accounts/ach (skeleton)
  - Files:
    - `src/bank/bank.controller.ts` (route handler)
    - `src/bank/bank.service.ts` (business logic)
    - `src/crypto/crypto.service.ts` (AES-GCM helper stubs per plan §2)
  - Acceptance:
    - End-to-end returns masked details with `unitCounterpartyStatus='PENDING'` (before Unit integration).
    - Logging redacts sensitive data.

- [ ] Encryption utilities (minimal stub)
  - Files:
    - `src/crypto/crypto.module.ts`
    - `src/crypto/crypto.service.ts` (encryptField, decryptField; TODO: KMS)
  - Acceptance:
    - Unit tests: round-trip works; unique ciphertexts (nonce).

- [ ] Repositories (stub interfaces while DB schema WIP)
  - Files:
    - `src/repo/bank-account.repo.ts`
    - `src/repo/bank-branch.repo.ts`
  - Acceptance:
    - In-memory or simple MySQL access (configurable) with clear interfaces.

## Phase E — Frontend

- [ ] Wire onboarding form to API
  - Files:
    - `web/app/onboarding/page.tsx` (submit to API)
    - `web/lib/api.ts` (fetch wrapper; redaction in logs)
  - Acceptance:
    - Valid data hits API; errors displayed (INVALID_ROUTING_NUMBER, UNIT_COUNTERPARTY_REJECTED).

- [ ] Accounts management page
  - Files:
    - `web/app/accounts/page.tsx`
    - Displays `BankAccountView` list (masked), actions: set primary, deactivate (hooks only until API ready)
  - Acceptance:
    - UI renders list with statuses and actions; optimistic UI with rollback stubs.

## Phase B — Database and migrations

- [ ] Capture existing schema and create additive migrations
  - Files:
    - `migrations/2025xxxx_add_bank_account_columns.sql`
  - Columns: `unit_counterparty_id`, `unit_counterparty_status`, `mask`, `is_primary`, `status`, `method`, `currency`; indexes per plan §1.
  - Acceptance:
    - Migration up/down works in a test database; data preserved.

## Phase F — Payout pipeline (planning step)

- [ ] Define batch item and state model (types only for now)
  - Files:
    - `packages/shared/src/payout.ts` (if workspaces) or `src/payout/types.ts`
  - Acceptance:
    - Types cover SUBMITTED/SETTLED/RETURNED mapping; idempotency fields.

## Ops and Run

- [ ] Start stack (upon approval)
  - Command: `docker compose up -d --build`
  - Verify:
    - `GET http://localhost:41873/health` -> `{ "status": "ok" }`
    - Web: `http://localhost:56483/`

## Notes for implementers

- Use Node 22 LTS, MySQL 8.4, Redis 7-alpine everywhere.
- Always redact sensitive bank data in logs.
- Keep endpoints idempotent and add basic correlation IDs in logs (TODO in API).
