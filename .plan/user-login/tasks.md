# User Login and Roles — Tasks

This plan breaks the approved design into developer-ready tasks with clear dependencies, estimates, and priorities. Each task has companion Mermaid diagrams in `.plan/user-login/tasks_diagram/` as `tasks_<ID>_*.md`.

Legend
- Effort: S≈2–4h, M≈1 day, L≈2–3 days
- Priority: high | medium | low

---

## Task List

### Task Completion Tracking

[x] T00: Registration (Sign-up) endpoints and UI
[x] T01: DB migrations for Auth (users, roles, user_roles, user_tokens)
[x] T02: Seed base roles
[x] T03: AuthModule core (Argon2id, JWT, config)
[x] T04: Login, Refresh (rotation), Logout endpoints
[x] T05: RBAC guards and decorators
[x] T06: Audit logging decorator and service
[x] T07: CryptoService (AES-GCM) + bank encryption helpers
[x] T08: Bank schema deltas + indices
[x] T09: UnitService (SDK) for counterparties + ACH credits
[x] T10: Bank endpoints (self + admin) with Unit validation
[x] T11: Payments (service + endpoints) with Unit ACH
[x] T12: Web auth (login) + protected routing
[ ] T13: Web banking + admin pages
[ ] T14: Web payments flows (self + admin)
[x] T15: Security hardening (CSRF, headers, CORS)
[ ] T16: Testing suite (unit, integration, E2E)
[x] T17: ENV, Docker, CI updates
[ ] T18: Unit "Create Your Account" step alignment (Ready‑to‑Launch)

## Detailed Tasks

- ID: T01
  - Title: DB migrations for Auth (users, roles, user_roles, user_tokens)
  - Description: Create TypeORM entities and initial migrations for `users`, `roles`, `user_roles`, `user_tokens` with indexes and enums per design.
  - Dependencies: none
  - Effort: M
  - Priority: high
  - Acceptance: Migrations run up/down cleanly; tables exist with indices.

- ID: T02
  - Title: Seed base roles
  - Description: Seed `ADMIN`, `ACCOUNTANT`, `NORMAL` into `roles` table; add idempotent seed script.
  - Dependencies: T01
  - Effort: S
  - Priority: high
  - Acceptance: Running seed twice results in same state; roles resolvable in app boots.

- ID: T03
  - Title: AuthModule core (Argon2id, JWT, config)
  - Description: Implement `AuthModule` with Argon2id hashing service, JWT access+refresh config, cookie settings, Zod env validation.
  - Dependencies: T01
  - Effort: M
  - Priority: high
  - Acceptance: App boots; config validated; hashing and sign/verify work in unit tests.

- ID: T04
  - Title: Login, Refresh (rotation), Logout endpoints
  - Description: Implement `/auth/login`, `/auth/refresh`, `/auth/logout` with refresh token rotation (store SHA-256 in `user_tokens`, revoke on logout).
  - Dependencies: T03
  - Effort: M
  - Priority: high
  - Acceptance: Postman/E2E proves cookie issuance, refresh rotation, and logout revocation.

- ID: T05
  - Title: RBAC guards and decorators
  - Description: Implement `JwtAuthGuard`, `RolesGuard`, and `@Roles()` decorator; embed roles into access token.
  - Dependencies: T03, T04
  - Effort: S
  - Priority: high
  - Acceptance: Protected routes enforce role rules in integration tests.

- ID: T06
  - Title: Audit logging decorator and service
  - Description: Implement audit logging for sensitive actions (user create/update, bank add/verify, payment create) with PII redaction.
  - Dependencies: T03
  - Effort: S
  - Priority: medium
  - Acceptance: Actions persist audit events with correlation id.

- ID: T07
  - Title: CryptoService (AES-GCM) + bank encryption helpers
  - Description: Implement AES-GCM field encrypt/decrypt helpers, masking utilities; key sourced from `ENCRYPTION_KEY`.
  - Dependencies: none
  - Effort: S
  - Priority: high
  - Acceptance: Round-trip tests pass; mis-key fails gracefully.

- ID: T08
  - Title: Bank schema deltas + indices
  - Description: Extend `bank_account` with `unit_counterparty_id` (nullable unique), `unit_counterparty_status`, `mask`, `is_primary`, `status`, etc.; ensure indices.
  - Dependencies: T07
  - Effort: S
  - Priority: high
  - Acceptance: Migration applies; entity maps correctly; unique/indexes verified.

- ID: T09
  - Title: UnitService (SDK) for counterparties + ACH credits
  - Description: Wrap `@unit-finance/unit-node-sdk` for `createCounterparty` and `createAchCreditPayment`; support idempotency and 5s timeout.
  - Dependencies: T03
  - Effort: S
  - Priority: high
  - Acceptance: Mocked SDK tests pass; real call path toggled via config flag.

- ID: T10
  - Title: Bank endpoints (self + admin) with Unit validation
  - Description: POST `/users/me/banks/ach`, POST `/admin/users/:id/banks/ach`, GET lists. Validate inputs; encrypt account number; create Unit counterparty; persist status.
  - Dependencies: T07, T08, T09, T05
  - Effort: M
  - Priority: high
  - Acceptance: Integration tests show PENDING→ACTIVE mapping; masked responses; role checks enforced.

- ID: T11
  - Title: Payments (service + endpoints) with Unit ACH
  - Description: Implement POST `/users/me/payments`, POST `/admin/users/:id/payments`, GET `/admin/payments`; enforce limits; ensure bank eligibility; use idempotency.
  - Dependencies: T05, T09, T10
  - Effort: M
  - Priority: high
  - Acceptance: Payment rows created with Unit tracking id; negative tests for limits and ineligible banks.

- ID: T12
  - Title: Web auth (login) + protected routing
  - Description: Create Next.js login page; handle 401; store session via cookies; protect routes in server components.
  - Dependencies: T04, T05
  - Effort: S
  - Priority: high
  - Acceptance: Manual flow succeeds; unauthorized redirected.

- ID: T13
  - Title: Web banking + admin pages
  - Description: NORMAL: Add bank form + list; ADMIN/ACCOUNTANT: add bank for user, list user banks; ADMIN: global mapping page.
  - Dependencies: T10, T12
  - Effort: M
  - Priority: high
  - Acceptance: Screens functional with validation and masked displays.

- ID: T14
  - Title: Web payments flows (self + admin)
  - Description: NORMAL: create payment to validated bank; ADMIN/ACCOUNTANT: create/manage payments; show Unit tracking.
  - Dependencies: T11, T12, T13
  - Effort: M
  - Priority: high
  - Acceptance: Happy-path and error states handled; UI constraints match limits.

- ID: T15
  - Title: Security hardening (CSRF, headers, CORS)
  - Description: Add CSRF strategy (double-submit or SameSite policy), Helmet headers, strict CORS in dev/prod.
  - Dependencies: T04, T12
  - Effort: S
  - Priority: medium
  - Acceptance: State-changing API calls protected; E2E negative test passes.

- ID: T16
  - Title: Testing suite (unit, integration, E2E)
  - Description: Unit for hashing, token rotation, validators; integration for auth/banks/payments (mock Unit); E2E journeys for NORMAL and ADMIN.
  - Dependencies: T04, T10, T11
  - Effort: M
  - Priority: high
  - Acceptance: CI green; coverage thresholds met.

- ID: T17
  - Title: ENV, Docker, CI updates
  - Description: Ensure `.env` keys present (JWT, COOKIE_*, ENCRYPTION_KEY, PAYMENT_LIMIT_*); Docker compose wiring; CI stages: lint, test, build, E2E.
  - Dependencies: T03, T07, T11
  - Effort: S
  - Priority: medium
  - Acceptance: `docker compose up -d --build` boots; pipeline passes.

---

## Notes
- All Unit interactions use `@unit-finance/unit-node-sdk` with 5s timeouts; idempotency on payment create.
- Sensitive data is never logged; use redaction and masks.
- Add-on: Rate limiting and account lockouts (future hardening) can extend T15.

---

- ID: T00
  - Title: Registration (Sign‑up) endpoints and UI
  - Description: Implement `/auth/register` with server-side validation (email uniqueness, password policy), Argon2id hashing, and Next.js registration page. Optional: email verification token stubs for future.
  - Dependencies: T01, T03
  - Effort: S
  - Priority: high
  - Acceptance: API returns 201; user row created; Argon2id hash stored; form validates; basic E2E passes.

- ID: T18
  - Title: Unit "Create Your Account" step alignment (Ready‑to‑Launch)
  - Description: Ensure Unit Ready‑to‑Launch → Branding → switch dropdown to "Application Form" and enable the "Create Your Account" step so applicants set credentials during onboarding. Capture configuration evidence (screenshot or doc). Add frontend notes linking this step to our post‑onboarding dashboard flow.
  - Dependencies: T12 (Web auth), T00 (Registration) — to align UX
  - Effort: S
  - Priority: high
  - Acceptance: Verified in Unit dashboard (manual); onboarding walkthrough includes "Create your account"; internal doc updated.
