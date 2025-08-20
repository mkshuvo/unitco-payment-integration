# API Key Management & Connectivity Status — Requirements

Last updated: 2025-08-20T15:51:29+06:00

## Feature Overview
- Provide a secure way to store and manage one or more Unit integration API keys in the database.
- Exactly one key can be "active" at a time; the active key is used by backend integrations.
- Expose a status page at `http://localhost:56483/status` showing live connectivity to Unit using the active key.
- Expose Web-accessible endpoints (via the web app port 56483) for API key CRUD and activation:
  - `GET  http://localhost:56483/api/keys/` — list keys
  - `POST http://localhost:56483/api/keys/create` — create key
  - `PUT  http://localhost:56483/api/keys/edit/:id` — update key metadata or replace secret
  - `DELETE http://localhost:56483/api/keys/delete/:id` — delete key
  - `POST http://localhost:56483/api/keys/activate` — activate one key (deactivates prior active)

Note: For architecture consistency, these web endpoints will proxy to backend NestJS routes (running on 41873) via Next.js rewrites. The actual data processing and DB access occurs in the API container.

## Goals & Non-Goals
- Goals
  - Secure at-rest storage (AES-GCM) of API key material.
  - Strict log redaction and masking; never log raw secret.
  - Single-active-key invariant with transactional update.
  - Simple admin UI in web to manage keys and view status.
  - Health/status check that exercises a minimal Unit API call using the active key.
- Non-Goals
  - Full RBAC and production-grade auth (will use existing mock guard until auth lands).
  - Multi-tenant key partitioning (V1 targets single-tenant project scope).

## User Stories & Acceptance Criteria
- As an admin, I can create a Unit API key so integrations can authenticate.
  - AC: `POST /api/keys/create` persists an encrypted secret, stores a fingerprint, and returns masked representation.
- As an admin, I can view all keys so I understand what’s configured.
  - AC: `GET /api/keys/` returns id, name, provider, mask, status, createdAt, lastUsedAt, fingerprint; never returns raw secret.
- As an admin, I can edit a key’s name/description or rotate the secret.
  - AC: `PUT /api/keys/edit/:id` updates metadata or replaces secret (re-encrypts) and updates mask/fingerprint.
- As an admin, I can delete a key I no longer need.
  - AC: `DELETE /api/keys/delete/:id` removes the key unless it’s the only active one (guarded with validation/error).
- As an admin, I can activate exactly one key at a time.
  - AC: `POST /api/keys/activate` sets the specified key ACTIVE and any previously ACTIVE to INACTIVE atomically.
- As an admin, I can see live connectivity status.
  - AC: `GET /status` page shows: Active key name/fingerprint, last successful ping timestamp, current connectivity (UP/DOWN), and latest error if any.

## Data Model (Conceptual)
- Table: `api_keys`
  - `id` (PK, uuid)
  - `provider` (enum: 'UNIT')
  - `name` (varchar, required)
  - `description` (varchar, optional)
  - `secret_encrypted` (varbinary/blob) — AES-GCM ciphertext (nonce+tag included)
  - `mask` (varchar) — e.g., `UNIT-****-****-ABCD`
  - `fingerprint_sha256` (char(64)) — SHA-256 hex of the raw secret; used for uniqueness and display
  - `status` (enum: ACTIVE | INACTIVE | REVOKED) — at most one ACTIVE
  - `is_active` (bool, derived alias of status or explicit field)
  - `last_used_at` (datetime)
  - `created_at` (datetime)
  - `updated_at` (datetime)
  - Indexes: unique on `fingerprint_sha256`, partial/compound index on `(status)`

## API Contracts (High-Level)
- `GET /api/keys/`
  - 200: `[ { id, provider, name, description, mask, fingerprint, status, lastUsedAt, createdAt } ]`
- `POST /api/keys/create`
  - body: `{ provider: 'UNIT', name, description?, secret }`
  - 201: `{ id, provider, name, description, mask, fingerprint, status }`
- `PUT /api/keys/edit/:id`
  - body: `{ name?, description?, secret? }`
  - 200: `{ id, provider, name, description, mask, fingerprint, status }`
- `DELETE /api/keys/delete/:id`
  - 204: no body
- `POST /api/keys/activate`
  - body: `{ id }`
  - 200: `{ id, status: 'ACTIVE' }`

Note: All responses exclude `secret`.

## Status Page Contract
- Route: `GET /status` (web UI)
- Backing API: `GET /integration/unit/status`
  - 200: `{ connectivity: 'UP'|'DOWN', checkedAt, activeKey: { id, name, fingerprint }, latencyMs, message? }`
  - Behavior: Performs a lightweight Unit API call using the active key; records latency and result. On failure returns DOWN with error message (sanitized).

## Security Requirements
- Secrets encrypted at rest using existing `CryptoService` (AES-GCM) with `ENCRYPTION_KEY`.
- Secrets never logged; DTO pipes enforce redaction in logs.
- Store `mask` and `fingerprint_sha256` for display/identification; do not expose raw secret.
- Transactions for activation to enforce single-active invariant.
- Basic input validation using class-validator.
- API endpoints guarded (temporary: mock admin guard). TODO: replace with JWT RBAC.

## Compliance & Privacy
- API keys are secrets; treat as sensitive data (protect at rest, in transit, minimal exposure).
- Logs must not contain secrets; ensure redaction.
- GDPR/PCI-DSS: Not directly applicable to API keys, but follow general security hygiene.

## Tech Stack Decisions
- Backend: NestJS 11, TypeORM 0.3.x, MySQL 8.4, Node 22.
- Frontend: Next.js 15 (App Router), React 18, MUI 6.
- Proxy: Next.js rewrites to route `/api/*` on `web` to `api` container.
- Crypto: Node crypto + AES-GCM, base64 key from `ENCRYPTION_KEY`.

## Integration Points
- Backend provides persistence and integration logic (`/keys/*`, `/integration/unit/status`).
- Web app proxies `/api/*` to backend and renders admin UI for `/status` and key management pages.

## Constraints & Assumptions
- Exactly one ACTIVE key at any time.
- A valid `ENCRYPTION_KEY` is configured for both encrypt & decrypt.
- If no ACTIVE key exists, status returns DOWN with guidance.
- Initial auth uses mock admin guard; production auth to follow.

## Acceptance Testing
- CRUD endpoints return correct payloads without `secret`.
- Activation switches active key atomically; previous active becomes INACTIVE.
- Status page shows UP after creating/activating a valid key and DOWN for invalid key.
- Logs contain no plaintext secrets.

## Open Questions
- Should delete be hard-delete or soft-delete? (default: hard-delete; consider soft-delete later)
- Max keys retained? (default: unlimited; consider cap later)
- Background health check vs on-demand only? (default: on-demand; consider periodic job later)
