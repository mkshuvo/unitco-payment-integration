# User Login and Roles — Design

This document translates approved requirements into a concrete architecture and implementation plan for NestJS (API) + Next.js (Web), integrating Unit for bank validation and payments.

---

## 1) Architecture overview

- Components
  - Web App (`web/`, Next.js 15 + MUI)
  - API (`src/`, NestJS 11 + TypeORM + Zod)
  - Database (MySQL 8)
  - Cache/locks (Redis 7, optional for token/session rate limiting)
  - External: Unit API via `@unit-finance/unit-node-sdk`
- Auth model
  - Local credentials → Argon2id password hashing
  - JWT Access (short TTL) + Refresh (long TTL) via httpOnly Secure cookies
  - RBAC: roles NORMAL, ADMIN, ACCOUNTANT enforced via Nest guards
- Sensitive data
  - AES‑GCM encryption for bank account fields; masked responses everywhere
- Observability
  - Structured logs (pino) with PII redaction; audit log events persisted

---

## 2) High‑level diagrams

### 2.1 Component diagram

[Browser] ⇄ [Next.js (SSR + client)] ⇄ [NestJS API] ⇄ [MySQL]
                                   ⇡               ⇡
                              [httpOnly cookies]  [Redis]
                                   ⇣               
                                  [Unit API]

### 2.2 Sequence: Login + token rotation

User → Web: POST /auth/login (email, password)
Web → API: validate; Argon2id verify; issue Access+Refresh; set cookies
User → Web/API: requests with Access; on 401/expiry → Web → API /auth/refresh
API: verify stored hashed refresh token; rotate (invalidate old, issue new); set cookies

### 2.3 Sequence: NORMAL adds bank (US ACH)

User → Web: submit ACH form
Web → API: POST /users/me/banks/ach
API: validate fields → encrypt account number → upsert bank_branch → create bank_account (PENDING) → call Unit to create counterparty → persist `unit_counterparty_id`, status ACTIVE/REJECTED → return masked view

### 2.4 Sequence: ADMIN creates payment for a user

Admin → Web: create payment
Web → API: POST /admin/users/:id/payments
API: validate policy/limits; ensure bank is ACTIVE; create `pay_accounting_payment` row; call Unit ACH Credit with Idempotency‑Key; store Unit id; return item

---

## 3) Data model and schema

### 3.1 Users and roles

- Table: `users`
  - id (PK, bigint unsigned)
  - email (varchar(254), unique)
  - password_hash (varchar(255)) — Argon2id
  - name (varchar(120))
  - status enum('ACTIVE','INACTIVE') default 'ACTIVE'
  - created_time bigint, updated_time bigint
- Table: `roles`
  - id (PK), name enum('ADMIN','ACCOUNTANT','NORMAL') unique
- Table: `user_roles`
  - user_id, role_id (composite PK), indexes on user_id
- Table: `user_tokens` (refresh tokens)
  - id (PK, bigint)
  - user_id (FK users)
  - token_hash (char(64) hex SHA‑256 of refresh token)
  - family_id (char(36) uuid) — for rotation chains
  - user_agent (varchar(255)), ip (varchar(64))
  - expires_at datetime, revoked_at datetime null
  - created_time bigint
  - Index: user_id, family_id, expires_at

TypeORM entities will mirror these with appropriate indices and enums.

### 3.2 Banking (reuse + extensions)

- `bank_branch` and `bank_account` as per `docs/project_plan/design_implementation_plan.md` (mask, method, is_primary, status, unit_counterparty_id, unit_counterparty_status, currency, encrypted_* fields).
- Unique index on `unit_counterparty_id` (nullable unique)
- Index on `user_id` for `bank_account`

### 3.3 Payments

- `pay_accounting_payment` (existing) with fields used:
  - paid_method='unit_ach'
  - paid_tracking_id=<Unit payment id>
  - paid_notes append audit trail
  - paid timestamp when SENT/settled

---

## 4) Security design

- Password hashing: Argon2id
  - Node argon2 options: `{ type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }`
- JWT
  - Access: HS256, TTL 15m
  - Refresh: HS256, TTL 7d (configurable), rotation on use; store SHA‑256 hash in DB; revoke on logout
- Cookies
  - Names: `access_token`, `refresh_token`
  - httpOnly, Secure (true in prod), SameSite=Lax, Path=/
- CSRF
  - For browser POST/PUT/PATCH/DELETE: double‑submit token or CSRF header; enforce for cookie‑auth endpoints
- Input validation
  - DTOs with class‑validator + Zod schemas for complex banking rules
- Secrets
  - ENV only: `JWT_SECRET`, `ENCRYPTION_KEY`, `UNIT_API_KEY` etc.
- Logging
  - Redact routing/account numbers, holder names, tokens; log masks and IDs
- Authorization
  - Nest guards: `JwtAuthGuard` + `RolesGuard(['ADMIN'])` etc.; fine-grained checks in services

---

## 5) API contracts

### 5.1 Auth
- POST `/auth/login`
  - Body: `{ email: string, password: string }`
  - 200: sets cookies; `{ user: { id, email, roles } }`
  - 401: `AUTH_INVALID_CREDENTIALS` | 423: `AUTH_ACCOUNT_INACTIVE`
- POST `/auth/refresh`
  - Cookie: `refresh_token`
  - 200: rotates refresh; sets new cookies; returns `{ ok: true }`
  - 401/403 on invalid/expired/reused tokens (revoke family)
- POST `/auth/logout`
  - Clears cookies; revoke active refresh token
- POST `/auth/password/request-reset`
  - Body: `{ email }`; returns 202
- POST `/auth/password/confirm-reset`
  - Body: `{ token, newPassword }`; returns 200

### 5.2 Users (ADMIN, ACCOUNTANT limited)
- POST `/admin/users` (ADMIN or ACCOUNTANT; ACCOUNTANT cannot assign ADMIN)
  - Body: `{ email, name, roles?: ('NORMAL'|'ACCOUNTANT'|'ADMIN')[] }`
- PATCH `/admin/users/:id`
  - Body: `{ roles?, status? }` (ACCOUNTANT cannot grant ADMIN)
- GET `/admin/users` query `{ q?, role?, status?, page?, size? }`

### 5.3 Banks
- POST `/users/me/banks/ach` (NORMAL)
  - Body: `{ holderName, accountType, routingNumber, accountNumber, address..., makePrimary? }`
  - 201: `BankAccountView`
- POST `/admin/users/:id/banks/ach` (ADMIN/ACCOUNTANT)
  - Same body, create for target user
- GET `/users/me/banks`
  - List masked accounts for self
- GET `/admin/users/:id/banks` (ADMIN/ACCOUNTANT; contextual)
  - Masked list for a user
- GET `/admin/banks` (ADMIN only)
  - Paginated global mapping user↔bank with validation status

### 5.4 Payments
- POST `/users/me/payments` (NORMAL)
  - Body: `{ amount: number, bankAccountId?: number }` → defaults to primary
  - Validations: amount > 0, within per‑tx/daily caps; bank ACTIVE and counterparty ACTIVE
- POST `/admin/users/:id/payments` (ADMIN/ACCOUNTANT)
  - Body: `{ amount: number, bankAccountId?: number, notes?: string }`
- GET `/admin/payments` (ADMIN/ACCOUNTANT)
  - Search and filters; includes Unit tracking id/state

Common response object `BankAccountView` and error enums as in requirements.

---

## 6) Implementation details (NestJS)

- Modules
  - `AuthModule`: controllers (`AuthController`), services (`AuthService`), strategies (JWT), guards, token store repo
  - `UsersModule`: user CRUD, roles service
  - `BanksModule`: add/list/manage banks; encryption service; Unit client
  - `PaymentsModule`: create payments; `pay_accounting_payment` integration; Unit ACH
  - `AuditModule`: decorator + service to persist audit events
  - `ConfigModule`: Zod env schema
- Providers
  - `CryptoService` (AES‑GCM): `encryptField(value) -> {ciphertext, iv, tag, keyId}`, `decryptField`
  - `UnitService` (SDK wrapper): `createCounterparty`, `createAchCreditPayment`
  - `RbacGuard` leveraging roles
- Repositories
  - `UserRepo`, `UserTokenRepo`, `RoleRepo`
  - `BankBranchRepo`, `BankAccountRepo`
  - `PaymentRepo` for `pay_accounting_payment`

---

## 7) Implementation details (Next.js)

- Auth client
  - Login page posting to API; manage 401/validation errors
  - Keep state via user info endpoint or decode roles from Access token when available via server actions
- Protected routes
  - Server components fetch with cookies; redirect if unauthenticated/unauthorized
- UI
  - NORMAL: Add Bank form, Manage Banks, Create Payment
  - ADMIN: Users list, user detail (banks/payments), global Banks mapping page (ADMIN‑only link)
  - ACCOUNTANT: No global link; contextual access within user/payment flows

---

## 8) Error handling strategy

- Consistent error codes (e.g., `AUTH_INVALID_CREDENTIALS`, `BANK_INVALID_ROUTING`, `PAYMENT_AMOUNT_LIMIT_EXCEEDED`)
- Map Unit errors to user‑friendly messages, avoid leaking sensitive details
- Validation errors return 400 with field‑level messages
- Unexpected errors return 500 with correlation id

---

## 9) Deployment plan

- Docker Compose (existing) runs MySQL, Redis, API, Web
- ENV additions in `.env`:
  - JWT_ACCESS_TTL, JWT_REFRESH_TTL, JWT_SECRET
  - COOKIE_DOMAIN, COOKIE_SECURE, COOKIE_SAMESITE
  - ENCRYPTION_KEY
  - PAYMENT_LIMIT_SINGLE, PAYMENT_LIMIT_DAILY
- CI/CD (example):
  - Lint → Unit tests → Integration tests → Build Docker images → Compose up in staging → E2E → Promote to prod
- Prod:
  - Use RS256 with JWKS (future enhancement)
  - Secret manager for keys; rotate periodically

---

## 10) Testing approach

- Unit tests: auth services (hash/verify, token), bank validators, encryption round‑trip
- Integration: /auth, /users, /banks, /payments with a mocked Unit client
- E2E: user journeys (NORMAL + ADMIN)
- Security: negative tests (CSRF, missing auth, role violations)

---

## 11) Open questions / risks

- Email delivery system for password reset (mock in v1)
- Account lockout / rate limiting for login brute force (can add Redis token bucket)
- Exact `pay_accounting_payment` schema nuances — confirm field names and limits

---

## 12) Rollout plan

- Feature flag routes under `/auth`, `/admin`, `/users/me` until stable
- Migrations additive and reversible; no destructive changes
- Staged rollout: enable NORMAL flows first, then ADMIN global mapping page
