# User Login and Roles (Normal + Admin/Accountant) — Requirements

## Feature overview
- Build authentication and role-based access control (RBAC) for two user classes:
  - Normal users (aka Providers)
  - Admin/Accountant users (aka Staff)
- Normal users can:
  - Authenticate
  - Add a bank account (must be validated via Unit)
  - Initiate a payment/transfer from Unit to their own validated bank account (subject to limits/policy)
- Admin/Accountant users can:
  - Create and manage users
  - Add a bank account for any user (validated via Unit)
  - Create a payment for any user as per `pay_accounting_payment` requirements
  - Transfer funds from Unit to a user’s bank account
  - View the mapping of user → bank accounts, and bank validation status

## Key objectives
- Secure, modern auth aligned with OWASP best practices
- Clear separation of concerns between roles (least privilege)
- Unit integration for bank account tokenization/validation and ACH payments
- Full auditability of user, bank, and payment actions

---

## Tech stack decisions (aligned with current repo)
- Backend: NestJS 11 (existing: `@nestjs/*`), TypeScript 5.9, TypeORM 0.3.x, MySQL 8
- Frontend: Next.js 15 + Material UI (existing `web/`)
- Auth:
  - Password hashing: Argon2id (per OWASP Password Storage Cheat Sheet)
  - Tokens: JWT Access + Refresh
  - Transport: httpOnly, secure cookies for tokens (SSR-friendly)
  - RBAC: Simple role guard (`NORMAL`, `ADMIN`, `ACCOUNTANT`)
- Validation: Zod (already present) and class-validator for DTOs
- Sensitive data: AES-GCM field-level encryption for banking details (align with `docs/project_plan/design_implementation_plan.md`)
- Unit integration: `@unit-finance/unit-node-sdk` (already used)

Versions (planned):
- argon2 ^0.41
- @nestjs/passport ^11, passport-jwt ^4, jsonwebtoken ^9
- csurf ^1.x (CSRF), helmet ^7.x (headers) — if needed on server side

---

## User types and permissions
- Roles
  - NORMAL: Default. Can only act on their own profile and bank accounts.
  - ADMIN: Full staff capabilities including user management and payments.
  - ACCOUNTANT: Same as ADMIN for payments/bank visibility, but cannot assign ADMIN role.

- Permission matrix (high level)
  - NORMAL
    - Auth: login/logout, refresh tokens
    - Bank: add/manage own bank accounts; must be validated via Unit (counterparty ACTIVE)
    - Payments: can create ad-hoc transfers to their own validated bank account within policy limits
    - Visibility: only their own data
  - ADMIN/ACCOUNTANT
    - Users: create, deactivate, assign roles (ACCOUNTANT cannot grant ADMIN)
    - Bank: add/manage bank accounts for any user; view validation status
    - Payments: create/pay per `pay_accounting_payment` rules; transfer from Unit source to user’s bank
    - Visibility: view user↔bank mappings and validation statuses

---

## Functional requirements

### Authentication
- Local credentials (email/username + password) login endpoint
- Password hashing with Argon2id using OWASP-recommended parameters (memory-cost, iterations, parallelism tuned for Node 20)
- JWT-based sessions:
  - Access token (short TTL, e.g., 15 minutes)
  - Refresh token (longer TTL, e.g., 7–30 days), rotation on every refresh
  - Both delivered via httpOnly, Secure, SameSite=Lax cookies (domain env-configurable)
- Logout endpoint that invalidates refresh token server-side
- Password reset (request + confirm) framework with signed, time-limited token; email transport can be mocked in dev (out of scope to integrate an email provider in v1, but API endpoints and flows should exist)

### RBAC and authorization
- Role claims embedded in access token
- Nest guards:
  - `JwtAuthGuard` for authentication
  - `RolesGuard` to enforce route-level role permissions
- Audit logging decorator for sensitive operations (bank add, payment create, user create)

### User management (Admin/Accountant)
- Create user: email, name, temp password (force change on first login optional)
- Assign roles: NORMAL (default), ADMIN, ACCOUNTANT
- Deactivate/reactivate user
- List/search users with pagination and filters (role, status)

### Bank accounts and validation (Unit)
- Add bank for a user (self for NORMAL, any user for ADMIN/ACCOUNTANT)
- Validation via Unit:
  - Create Unit counterparty from provided bank details
  - Persist `unit_counterparty_id` and status in `bank_account` (see design doc mapping)
  - Status states: PENDING, ACTIVE, REJECTED
  - Optional ownership verification (micro-deposits or prenote if available); block payments until ACTIVE or policy allows capped exceptions
- Masked responses: never expose full routing/account; expose `mask`, bank name, statuses
- Only ADMIN/ACCOUNTANT can view global user→bank mappings + validation statuses

### Payments
- NORMAL user payments (self-serve):
  - Create a transfer to their own validated bank account only
  - Requires `unit_counterparty_status='ACTIVE'` and account `status='ACTIVE'`
  - Limits: env-configurable per-transaction and daily caps; block if over limit
  - On submit: create `pay_accounting_payment` entry and initiate Unit ACH Credit with Idempotency-Key
- Admin/Accountant payments:
  - Create/approve payments for any user per `pay_accounting_payment` rules
  - Can target the user’s primary validated bank account or any validated account
  - Manage returns/retries per ACH R-codes

### Visibility and links
- ADMIN-only: navigation link and page to list users with their bank accounts and validation statuses (global mapping)
- ACCOUNTANT: may view bank validation status only within contextual flows (e.g., when creating a payment or adding a bank); no global mapping link/page
- NORMAL users can only see their own bank accounts

### Observability & audit
- Structured logs with redaction of PII and secrets
- Audit trail for: user create/update, bank add/verify, payment create/submit/update

---

## Non-functional requirements
- Security
  - OWASP Top 10 mitigations
  - Argon2id for passwords; rotate refresh tokens; revoke on logout; httpOnly cookies
  - CSRF protection for state-changing requests from browser clients (double-submit or SameSite strategy)
  - CORS locked down to known origins in dev/prod
  - Input validation using Zod/class-validator; rigorous server-side validation for bank fields
  - Encryption-at-rest for bank details via AES-GCM; key in ENV (`ENCRYPTION_KEY`), consider KMS in prod
  - Secrets via environment; no secrets committed
- Performance/scale
  - Token verification O(1); cache public keys if future JWKS added
  - DB indices for user lookup, bank account user_id, counterparty unique index
- Reliability
  - Idempotency for payment submission; resilient to retries
  - Webhooks idempotent processing (if used in later phases)
- Compliance & privacy
  - PII minimization; data retention policy for sensitive bank info
  - GDPR readiness (export/delete on request) where applicable

---

## Data model (delta)
- users
  - id, email (unique), password_hash, name, status (ACTIVE/INACTIVE), created/updated
- roles
  - id, name (ADMIN/ACCOUNTANT/NORMAL)
- user_roles (user_id, role_id)
- sessions or user_tokens (for refresh token rotation; store hashed refresh token + metadata)
- bank_account (existing/extended per design doc)
  - unit_counterparty_id (nullable unique), unit_counterparty_status, mask, is_primary, status, method, currency, encrypted fields
- pay_accounting_payment (existing)
  - use fields for method `unit_ach`, `paid_tracking_id`, `paid_notes`, `paid` timestamp, etc.

---

## API endpoints (high-level)
- Auth
  - POST /auth/login
  - POST /auth/refresh
  - POST /auth/logout
  - POST /auth/password/request-reset
  - POST /auth/password/confirm-reset
- Users (ADMIN, ACCOUNTANT limited)
  - POST /admin/users
  - PATCH /admin/users/:id (roles, status)
  - GET /admin/users (list/search)
- Banks
  - POST /users/me/banks/ach (NORMAL)
  - POST /admin/users/:id/banks/ach (ADMIN/ACCOUNTANT)
  - GET /users/me/banks
  - GET /admin/users/:id/banks (ADMIN/ACCOUNTANT; contextual access)
  - GET /admin/banks (ADMIN only; list user↔bank mappings)
- Payments
  - POST /users/me/payments (NORMAL; to own validated bank)
  - POST /admin/users/:id/payments (ADMIN/ACCOUNTANT)
  - GET /admin/payments (search)

---

## Validation rules (banking highlights)
- US ACH routing number: 9 digits + checksum
- Account number: 4–17 digits; store encrypted; mask last 4
- Holder name: required; address required (line1, city, state, zip for US)
- Only `ACTIVE` bank accounts with `unit_counterparty_status='ACTIVE'` are payout-eligible

---

## Error states (examples)
- AUTH_INVALID_CREDENTIALS
- AUTH_ACCOUNT_INACTIVE
- BANK_INVALID_ROUTING
- BANK_UNIT_COUNTERPARTY_REJECTED
- BANK_VERIFICATION_REQUIRED
- PAYMENT_AMOUNT_LIMIT_EXCEEDED
- PAYMENT_BANK_NOT_ELIGIBLE

---

## Environment & config
- JWT_ACCESS_TTL, JWT_REFRESH_TTL, JWT_SECRET (or asymmetric keys later)
- COOKIE_DOMAIN, COOKIE_SECURE, COOKIE_SAMESITE
- ENCRYPTION_KEY (AES-GCM)
- UNIT_API_KEY, UNIT_API_URL
- PAYMENT_LIMIT_SINGLE, PAYMENT_LIMIT_DAILY

---

## Accessibility requirements (web)
- Keyboard navigable forms and dialogs (MUI)
- Proper labels and aria-* for inputs and errors
- Visible focus states; color contrast AA

---

## Assumptions & constraints
- No SSO in v1; local credentials only
- Email delivery for password reset may be mocked in dev
- Payments execute via Unit ACH only (USD) in v1
- Normal user ad-hoc payments are allowed but must respect limits and require validated bank

---

## Acceptance criteria (samples)
- Normal user can login, add ACH bank with valid routing, see it as PENDING/ACTIVE, and initiate a payment within limits
- Admin can create a user, add a bank for them, and submit a payment; payment recorded in `pay_accounting_payment` with proper tracking id
- Admin can list users with bank accounts and see validation status; normal users cannot access others’ data
- Passwords are stored via Argon2id; tokens via httpOnly cookies; logout/refresh flows work; audit logs recorded

---

## Testing strategy (high-level)
- Unit tests: validators (routing checksum), auth services (hash/verify, token rotation), RBAC guards
- Integration tests: auth endpoints, bank-add flow (mock Unit SDK), payment submission with idempotency
- E2E: Normal and Admin journeys

---

## Out of scope (v1)
- Social/OAuth login
- Plaid-style bank verification
- Multi-tenant orgs or advanced approval workflows
