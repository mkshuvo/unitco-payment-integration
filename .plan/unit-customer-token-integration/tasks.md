---
# Unit Customer Token Integration — Tasks

Follow the Task Completion Tracking Rule. Completed tasks are marked [x].

[x] TASK-001: Backend status check via Unit SDK
    - [x] Implement `UnitService.checkStatus()` using `@unit-finance/unit-node-sdk` `customers.list({ limit: 1 })` with 5s timeout
    - [x] Expose `GET /integration/unit/status`
    - Dependencies: None
    - Estimate: 2h
    - Priority: High

[x] TASK-002: Customer resolution endpoint
    - [x] Implement `POST /integration/unit/customers/resolve`
    - [x] Persist `unit_customer_id` on `User` when `userId` provided; enforce uniqueness
    - [x] DTO: `ResolveCustomerDto` with `email`, optional `userId`
    - Dependencies: TASK-006
    - Estimate: 3h
    - Priority: High

[x] TASK-003: 2FA verification endpoint
    - [x] Implement `POST /integration/unit/customers/:id/token/verification` (sms/call, optional phone + locale)
    - [x] DTO: `CreateTokenVerificationDto`
    - [x] 5s timeout + JSON:API headers
    - Dependencies: TASK-006
    - Estimate: 3h
    - Priority: High

[x] TASK-004: Customer token endpoint
    - [x] Implement `POST /integration/unit/customers/:id/token` supporting 2FA or JWT flows
    - [x] DTO: `CreateCustomerTokenDto` with `scope`, `expiresIn`, and either 2FA or JWT
    - [x] 5s timeout + JSON:API headers
    - Dependencies: TASK-006
    - Estimate: 4h
    - Priority: High

[x] TASK-005: Frontend component for Unit White-Label (customer-token)
    - [x] Update `web/components/UnitWhiteLabel.tsx` to pass `customer-token`
    - [x] React 19 custom element typings in `web/types/unit-elements.d.ts`
    - Dependencies: TASK-010
    - Estimate: 2h
    - Priority: High

[x] TASK-006: Frontend page for customer-token flow
    - [x] Create `web/app/banking/customer-token/page.tsx`
    - [x] Steps: resolve → verification → token → embed UI
    - [x] Show 401/expired banner and prompt re-issue
    - Dependencies: TASK-005, TASK-007
    - Estimate: 6h
    - Priority: High

[x] TASK-007: Frontend API client helpers
    - [x] Implement `resolveUnitCustomer`, `createUnitCustomerTokenVerification`, `createUnitCustomerToken` in `web/lib/api.ts`
    - [x] Use `API_BASE_URL` with `NEXT_PUBLIC_API_URL` fallback
    - Dependencies: None
    - Estimate: 2h
    - Priority: High

[x] TASK-008: CORS and infra wiring
    - [x] CORS allow localhost and docker mapped ports in `src/main.ts`
    - [x] Docker Compose ports and envs (`api` 41873, `web` 56483)
    - Dependencies: None
    - Estimate: 2h
    - Priority: High

[ ] TASK-009: Smoke tests and local verification
    - [ ] Run `node scripts/test-api.js` (health + ACH validation)
    - [ ] Manual QA `/banking/customer-token` flow in browser
    - Dependencies: TASK-008
    - Estimate: 1h
    - Priority: High

[ ] TASK-010: Backend tests (Jest)
    - [ ] Unit tests for `UnitService` (status check timeout, verification, token creation error/success)
    - [ ] Controller tests for DTO validation and error mapping (`integration.controller.spec.ts`)
    - Dependencies: TASK-002, TASK-003, TASK-004
    - Estimate: 4h
    - Priority: High

[ ] TASK-011: Frontend E2E (Playwright)
    - [ ] Install browsers: `npm run playwright:install --prefix web`
    - [ ] Happy path: resolve → verification(sms) → create token → embed UI visible
    - [ ] Expiration path: simulate expired token → expiry banner shown
    - [x] Pre-expiry auto-refresh: schedule T-60s and auto re-issue without user action
    - [ ] Configure baseURL http://127.0.0.1:3123 and reuse server
    - Dependencies: TASK-006, TASK-008
    - Estimate: 6h
    - Priority: High

[ ] TASK-012: Token refresh UX (enhancement)
    - [x] Track `expiresIn`; schedule pre-expiry refresh (e.g., T-60s)
    - [x] Retry/buffer UI state to avoid flicker on refresh
    - Dependencies: TASK-006
    - Estimate: 6h
    - Priority: Medium

[ ] TASK-013: Documentation and diagrams
    - [x] Requirements.md
    - [x] Design.md
    - [x] Tasks.md + Mermaid sequence and flowchart diagrams
    - [ ] README updates (envs, flow usage, troubleshooting)
    - Dependencies: All core tasks
    - Estimate: 3h
    - Priority: Medium

[ ] TASK-014: Staging verification
    - [ ] Deploy to staging; configure `NEXT_PUBLIC_API_URL` and server envs
    - [ ] E2E run in staging against sandbox customers
    - [ ] Monitor logs for Unit errors/timeouts
    - Dependencies: TASK-009, TASK-011, TASK-013
    - Estimate: 1d
    - Priority: Medium
