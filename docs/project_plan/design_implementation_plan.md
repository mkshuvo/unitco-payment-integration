# Master prompt v3 for agentic IDE

You are a senior full‑stack TypeScript engineer. Build a production‑grade payouts platform for Field Nation to pay 5,000–10,000 providers every Friday at 10:00 AM CST. Backend: NestJS. Frontend: Next.js + Material UI. DB: MySQL. Jobs/locks: Redis + BullMQ. Everything dockerized. Payments executed via Unit’s ACH Origination API to providers’ bank accounts. You must design and implement a rigorous provider bank‑info onboarding flow: validate bank details, verify ownership where possible, create a Unit counterparty, and persist a secure association between provider and bank account using Field Nation’s existing tables (bank_branch, bank_account) plus minimal migrations. Build an idempotent, observable, auditable batch payout pipeline.

---

## 1) Data model integration with existing Field Nation tables

### Required migrations and mapping

- **Add Unit mappings to bank_account:**
  - Add columns:
    - `unit_counterparty_id VARCHAR(128) NULL`
    - `unit_counterparty_status ENUM('PENDING','ACTIVE','REJECTED') DEFAULT 'PENDING' NOT NULL`
    - `mask VARCHAR(8) NULL` — last 4 of account number
    - `is_primary TINYINT(1) DEFAULT 0 NOT NULL`
    - `status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE' NOT NULL`
    - `method ENUM('ACH','WIRE') DEFAULT 'ACH' NOT NULL`
    - `currency CHAR(3) DEFAULT 'USD' NOT NULL`
  - Add indexes:
    - `INDEX idx_bank_account_user (created_by)` — if created_by stores user_id (confirm), else add an explicit user reference column.
    - `UNIQUE INDEX uq_unit_counterparty (unit_counterparty_id)` (nullable unique).
- **Add provider→user association if missing:**
  - If `created_by` is not provider user_id, add `user_id INT UNSIGNED NOT NULL` in bank_account with FK to users table, plus `INDEX idx_bank_account_user (user_id)`.
- **Add Unit metadata to pay_accounting_payment:**
  - Columns:
    - `paid_method` use value `"unit_ach"` for ACH.
    - `paid_tracking_id` store Unit payment id.
    - `paid_notes` append Unit tags/event history summary.
- **bank_branch reuse:**
  - Existing fields (routing, swift, bank_name, address, country) are canonical. Maintain de‑dup with `UNIQUE (country, routing, swift)` if business allows; otherwise retain current indexes and dedupe in service logic.

### Encryption policy alignment

- **Use existing encrypted_* fields in bank_account:**
  - `encrypted_account_number`, `encrypted_account_holder_name`, `encrypted_iban`, `encrypted_swift_code`, `encrypted_sort_code`.
  - Set `encrypted=1` when any sensitive field is stored.
  - Implement AES‑GCM field‑level encryption with key rotation hooks.

---

## 2) Provider bank‑info capture, validation, and Unit counterparty creation

### End‑to‑end flow

- **Step 1: Provider initiates “Add bank account”**
  - Inputs vary by region:
    - US ACH: routing number (9 digits), account number, account type (checking/savings), holder name, address, country=US.
    - International wire: swift (BIC), IBAN or local account + sort code, country, holder name, address.
- **Step 2: Client‑side validation (fast)**
  - US: length/format; routing checksum; account number basic length (4–17) w/ Luhn‑like optional heuristics disabled by default.
  - INTL: SWIFT length (8 or 11), IBAN format and length per country; no actual IBAN content stored in plaintext.
- **Step 3: Server‑side validation (authoritative)**
  - ACH routing checksum re‑calc; disallow known invalid ranges; whitelist country=US.
  - SWIFT regex `^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$`.
  - IBAN mod‑97 check; enforce country‑specific lengths.
  - Dedup branch: lookup `bank_branch` by `(country, routing)` for US or `(swift)` for INTL; create if absent.
- **Step 4: Create or attach bank_account row**
  - Insert with branch_id, encrypted_* fields, holder address, country, `status=ACTIVE`, `method=ACH|WIRE`, `mask=last4(account_number)`.
  - Set `unit_counterparty_status='PENDING'`, `is_primary` per user choice.
- **Step 5: Create Unit counterparty**
  - Build payload from sanitized inputs (never send plaintext IBAN/account back to UI).
  - On success: persist `unit_counterparty_id`, set `unit_counterparty_status='ACTIVE'`.
  - On error: set `unit_counterparty_status='REJECTED'`, show actionable error.
- **Step 6: Optional verification (ownership)**
  - Strategy A (preferred if available): Unit counterparty verification or prenote. If prenotes supported, send $0 prenote and delay payouts until confirmed.
  - Strategy B (fallback): Two micro‑deposits ACH Credit and require user confirmation of exact cents; hold payouts until verified or allow small capped payouts.
  - Strategy C (enterprise): Plaid‑style external verification behind feature flag (do not implement in v1).
- **Step 7: Finalize**
  - Mark bank account `status=ACTIVE` and `is_primary=1` if chosen.
  - Insert audit_log event “BANK_ACCOUNT_ADDED” with masked data.

---

## 3) API contracts for bank onboarding (NestJS)

### DTOs

```ts
// US ACH
export class AddAchBankDto {
  holderName: string;
  accountType: 'checking' | 'savings';
  routingNumber: string; // 9 digits
  accountNumber: string; // 4-17 digits
  address1: string; address2?: string; city: string; state: string; zip: string; country: 'US';
  makePrimary?: boolean;
  sameDayEligible?: boolean; // informational
}

// International wire
export class AddIntlBankDto {
  holderName: string;
  swift: string; // 8 or 11 chars
  iban?: string; // if country supports
  accountNumber?: string; sortCode?: string; // local scheme
  address1: string; address2?: string; city: string; state?: string; zip?: string; country: string;
  makePrimary?: boolean;
}
```

### Endpoints

- **POST /providers/me/bank-accounts/ach**
  - Validates routing checksum and formats.
  - Upserts bank_branch; creates bank_account encrypted; creates Unit counterparty; returns masked details.
- **POST /providers/me/bank-accounts/international**
  - Validates SWIFT/IBAN; creates branch and account; attempts Unit counterparty (if supported rails configured).
- **PATCH /providers/me/bank-accounts/:id**
  - Actions: `setPrimary`, `deactivate`.
- **GET /providers/me/bank-accounts**
  - Lists masked accounts, statuses, `unit_counterparty_status`.
- **POST /providers/me/bank-accounts/:id/verify**
  - If micro‑deposit strategy is enabled: submit two amounts for verification → mark verified.

### Responses (masked)

```ts
export interface BankAccountView {
  accountId: number;
  bankName: string;
  mask: string; // ****1234
  method: 'ACH' | 'WIRE';
  country: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  unitCounterpartyStatus: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdTime: number;
}
```

---

## 4) Validation algorithms and helpers

### ACH routing checksum

```ts
export function isValidUsRouting(r: string): boolean {
  if (!/^\d{9}$/.test(r)) return false;
  const d = r.split('').map(Number);
  const sum = 3*(d[0]+d[3]+d[6]) + 7*(d[1]+d[4]+d[7]) + (d[2]+d[5]+d[8]);
  return sum % 10 === 0;
}
```

### IBAN mod‑97

```ts
export function isValidIban(ibanRaw: string): boolean {
  const iban = ibanRaw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9]+$/.test(iban) || iban.length < 15 || iban.length > 34) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const expanded = rearranged.replace(/[A-Z]/g, ch => (ch.charCodeAt(0) - 55).toString());
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    remainder = Number(String(remainder) + expanded.slice(i, i + 7)) % 97;
  }
  return remainder === 1;
}
```

### SWIFT/BIC check

```ts
export function isValidSwift(swift: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
}
```

---

## 5) Unit API integration (ACH Origination)

### Create counterparty (recipient)

- **Intent:** Tokenize external bank details into a Unit `counterparty` and store its `id`.
- **Action:** POST to Unit counterparty endpoint with:
  - Attributes: name (holder), country, address.
  - Bank details: For US ACH, routing and account number, accountType; for INTL wire, swift/iban.
- **Store:** `unit_counterparty_id` in `bank_account`, set `unit_counterparty_status`.

### Create ACH Credit payment

- **Endpoint:** POST /payments, `data.type="achPayment"`.
- **Attributes:** `amount` (cents), `currency="USD"`, `direction="Credit"`, `description` (<=10 chars), optional `addenda` (<=80), `sameDay` (bool), `secCode` (e.g., WEB/CCD if enabled), `tags` (include `payoutItemId`, `batchKey`, `providerUserId`).
- **Relationships:** `account` (Unit source account id), `counterparty` (stored id).
- **Idempotency:** Header `Idempotency-Key: <uuid-v4>` per payout item.

### Status mapping (internal)

- **Pending/PendingReview →** item `SUBMITTED` with substatus; watch via webhooks.
- **Sent →** item `SETTLED`; trigger `paid` update in pay_accounting_payment with timestamp.
- **Rejected/Canceled →** item `FAILED`/`CANCELLED` with code.
- **Returned →** item `RETURNED` with ACH R‑code; flag provider to update bank.

### Webhooks

- **Endpoint:** POST /webhooks/unit.
- **Verify:** Signature + timestamp; replay protection using `(external_id, timestamp)` nonce store.
- **Handle events:** `payment.sent`, `payment.returned`, `payment.rejected`, `payment.canceled`.
- **Idempotent processing:** Store raw payload, mark processed, update item and write reconciliation_event.

---

## 6) Extremely detailed task list and exact implementation order

### Phase A — Foundations

1. **Monorepo + tooling**
   - **Tasks:**
     - Initialize pnpm workspaces; set base tsconfig; ESLint/Prettier; commitlint/husky.
     - Shared package `@shared/types` for DTOs and enums.
   - **Checks:**
     - `pnpm -w typecheck` and lint pass.

2. **Docker + compose**
   - **Tasks:**
     - Dockerfiles (api, worker, web) with multistage build; non‑root user; healthcheck curl /health.
     - docker-compose.yml: mysql:8, redis:7, api, worker, web; named volumes; proper depends_on and healthchecks.
   - **Checks:**
     - `docker compose up` shows all healthy; api connects to db; worker connects to redis.

3. **Config module (NestJS)**
   - **Tasks:**
     - Zod schema for env: DB_*, REDIS_URL, UNIT_*, ENCRYPTION_KEY, JWT_*, CRON_TZ, PAYOUT_LIMITS_*.
     - Fail fast if missing.
   - **Checks:**
     - Boot fails with informative error when env var missing.

### Phase B — Database and migrations

4. **Baseline schema ingestion**
   - **Tasks:**
     - Reverse‑engineer existing `bank_branch`, `bank_account`, `pay_accounting_payment` ORM models.
     - Add migrations for new columns (unit_counterparty_id, etc.) and indexes.
   - **Checks:**
     - Migration up/down works; data preserved; new columns nullable.

5. **Encryption utilities**
   - **Tasks:**
     - AES‑GCM helper with key id; store `nonce` and `tag` concatenated; envelope key via KMS (configure later).
     - Service methods `encryptField`, `decryptField`.
   - **Checks:**
     - Round‑trip unit tests; ciphertext differs per call (nonce).

6. **Repositories**
   - **Tasks:**
     - bank_branch repo: findOrCreateByRouting(country, routing) and findOrCreateBySwift(swift).
     - bank_account repo: createEncryptedAccount(userId, branchId, fields…), setPrimary, deactivate, byUser.
     - payment repo for pay_accounting_payment updates.
   - **Checks:**
     - Unit tests: dedupe branch, FK constraints, unique primary per user.

### Phase C — Auth, RBAC, auditing

7. **Auth module**
   - **Tasks:**
     - JWT access/refresh, argon2 hashing; RBAC guard.
     - Audit decorator capturing actor, action, entity, metadata.
   - **Checks:**
     - E2E tests: STAFF can access admin; PROVIDER blocked from ops routes.

### Phase D — Bank onboarding backend

8. **Validation helpers**
   - **Tasks:**
     - Implement `isValidUsRouting`, `isValidIban`, `isValidSwift`, `maskAccountNumber`.
     - Country metadata map for IBAN lengths.
   - **Checks:**
     - Unit tests with valid/invalid fixtures.

9. **Add ACH bank endpoint**
   - **Tasks (controller/service):**
     - Parse AddAchBankDto; server‑side validations; normalize address (trim, uppercase state).
     - Branch: `findOrCreateByRouting('US', dto.routingNumber)`.
     - Encrypt fields: account number, holder name; store last4 to `mask`.
     - Create bank_account row with `method='ACH'`, `status='ACTIVE'`, `is_primary=dto.makePrimary ?? (no existing accounts)`.
     - Call Unit create counterparty; on success: set `unit_counterparty_id`, `unit_counterparty_status='ACTIVE'`; on failure: set `'REJECTED'` and return 422 with reason.
     - Audit log with masked payload.
   - **Checks:**
     - E2E test: successful path stores encrypted fields and Unit id; invalid routing returns 400; Unit failure returns 422 and does not set counterparty id.

10. **Add international bank endpoint**
    - **Tasks:**
      - Server‑side validation for SWIFT/IBAN/local schemes.
      - Branch via `findOrCreateBySwift(dto.swift)`.
      - Create bank_account with `method='WIRE'`, `currency` per country (default USD blocked), encrypted IBAN/SWIFT.
      - Attempt Unit counterparty if rails enabled; feature‑flag otherwise.
    - **Checks:**
      - Proper rejection when rails disabled; successful creation sets counterparty id.

11. **Set primary / deactivate**
    - **Tasks:**
      - Single primary per user; transactionally unset previous primary; `status='INACTIVE'` on deactivate; disallow deactivate if last active account.
    - **Checks:**
      - Unit tests enforce invariants.

12. **Micro‑deposit verification (optional, feature‑flag)**
    - **Tasks:**
      - If enabled: generate two random cents; create two small ACH Credits; store pending verification with expected amounts (encrypted).
      - Endpoint to confirm amounts; on success mark verified and lift payout hold.
    - **Checks:**
      - Prevent payouts until verified if policy requires.

### Phase E — Frontend for bank onboarding

13. **Provider UI: Add US bank**
    - **Tasks:**
      - MUI form: holder name, routing, account number, account type, address; inline validators; masked input.
      - Submission states and error mapping (invalid routing, Unit errors).
      - Success screen showing bank name (from branch), mask, primary toggle.
    - **Checks:**
      - Form a11y, keyboard nav; copy‑able masked fields disabled.

14. **Provider UI: Add international bank**
    - **Tasks:**
      - Dynamic fields by country; SWIFT/IBAN validators; tooltips for formats.
      - Feature‑flag UI visibility by rails support.
    - **Checks:**
      - Country switch maintains validation schema.

15. **Provider UI: Manage accounts**
    - **Tasks:**
      - List accounts with mask, method, status, unit status; actions to set primary, deactivate; banners for `REJECTED` or verification required.
    - **Checks:**
      - Optimistic updates with rollback on API error.

### Phase F — Payout computation and batch pipeline

16. **Payout computation service**
    - **Tasks:**
      - Pluggable earnings source; aggregate payable per provider; subtract holds/fees; enforce min payout threshold.
      - Exclude providers without ACTIVE primary bank or `unit_counterparty_status!='ACTIVE'`.
    - **Checks:**
      - Fixture‑based unit tests; edge cases: zero/negative, caps.

17. **Batch preview endpoint**
    - **Tasks:**
      - Given a date (default next Friday CST), compute items; check source account balance (if API available) and configured daily limits; produce warnings.
    - **Checks:**
      - CSV export matches UI totals.

18. **Batch creation + idempotent keying**
    - **Tasks:**
      - Create batch with `batch_key=ISO(CST 10:00)`; items with uuid `idempotency_key`; initial status `CREATED`.
    - **Checks:**
      - Creating same `batch_key` twice is a no‑op (return existing).

19. **Queueing and submission (worker)**
    - **Tasks:**
      - Chunk size configurable (default 200); rate limiter to respect Unit QPS; process item:
        - Mark PROCESSING
        - Call Unit ACH Credit with headers including Idempotency‑Key
        - Persist `unit_payment_id`; mark SUBMITTED
      - Retry policy: 5 retries, exp backoff, classify transient vs terminal.
    - **Checks:**
      - Restart worker mid‑batch → no duplicates (idempotency holds).

20. **Webhooks + reconciliation**
    - **Tasks:**
      - Endpoint verifies signature; store raw; enqueue processing; idempotent by external_id.
      - Map events: SENT→SETTLED (update pay_accounting_payment: set `paid=NOW()`, `paid_method='unit_ach'`, `paid_tracking_id=UnitId`), RETURNED→RETURNED with R‑code; create reconciliation_event rows.
      - Nightly poller for items without terminal state after SLA; update statuses.
    - **Checks:**
      - Payments table shows paid timestamp only on SENT; replays don’t duplicate updates.

21. **Scheduler and lock**
    - **Tasks:**
      - Compute next Friday 10:00 AM CST (DST‑aware); distributed Redis lock `payout:YYYY-MM-DD`; create/run batch; release lock safely with heartbeat renewal.
    - **Checks:**
      - Multiple app instances → single batch run.

22. **Admin UI for payouts**
    - **Tasks:**
      - Preview screen; run confirmation; batch detail with progress; per‑item drill‑down (webhook history, failure code); retry returned items after bank update.
    - **Checks:**
      - Real‑time progress via polling or SSE.

### Phase G — Observability, quality, and ops

23. **Structured logging**
    - **Tasks:**
      - Pino with redaction (account numbers, names, tokens); correlation ids per request/job; log Unit calls sans sensitive payload.
    - **Checks:**
      - No sensitive fields in logs (scan).

24. **Metrics + dashboards**
    - **Tasks:**
      - Prometheus: counters (items_by_status), histograms (submit_time_ms), gauges (queue_depth), webhook_lag_seconds; Grafana dashboards; alerts (failure rate > 0.5%, webhook lag > 5m).
    - **Checks:**
      - Alert fires when simulated failures introduced.

25. **Testing**
    - **Tasks:**
      - Unit tests for validators, services.
      - Integration tests using Testcontainers (MySQL/Redis).
      - E2E tests for bank add → counterparty → payout submission → webhook settle.
      - Load test with k6 to simulate 10k payouts respecting rate limits.
      - Chaos: kill worker mid‑run; ensure idempotent recovery.
    - **Checks:**
      - Pipelines green; load test within time/limit windows.

26. **Runbooks**
    - **Tasks:**
      - Bank onboarding issues (invalid routing, rejected counterparty).
      - Payout day SOP (prefunding checks, limits, dry‑run, go/no‑go).
      - Returns handling (R‑codes mapping, provider comms template).
    - **Checks:**
      - Tabletop exercises pass.

---

## 7) Concrete SQL and code snippets

### Migration example (MySQL)

```sql
ALTER TABLE bank_account
  ADD COLUMN unit_counterparty_id VARCHAR(128) NULL,
  ADD COLUMN unit_counterparty_status ENUM('PENDING','ACTIVE','REJECTED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN mask VARCHAR(8) NULL,
  ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN method ENUM('ACH','WIRE') NOT NULL DEFAULT 'ACH',
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD';

CREATE UNIQUE INDEX uq_unit_counterparty ON bank_account (unit_counterparty_id);
CREATE INDEX idx_bank_account_user ON bank_account (user_id);
```

### Bank branch upsert (US routing)

```sql
INSERT INTO bank_branch (swift, routing, bank_name, reuse, country, address1, address2, city, state, zip, created_by, created_time, updated_by, updated_time)
VALUES ('', ?, ?, 1, 'US', '', '', '', '', '', ?, UNIX_TIMESTAMP(), ?, UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE updated_time=VALUES(updated_time), updated_by=VALUES(updated_by);
```

### NestJS: add ACH bank controller

```ts
@Post('bank-accounts/ach')
@UseGuards(JwtGuard, RoleGuard('PROVIDER'))
async addAch(@Req() req, @Body() dto: AddAchBankDto): Promise<BankAccountView> {
  this.guard.validateAchDto(dto);
  if (!isValidUsRouting(dto.routingNumber)) throw new BadRequestException('INVALID_ROUTING_NUMBER');

  const branch = await this.branchService.findOrCreateByRouting('US', dto.routingNumber, dto);
  const encryptedAcc = await this.crypto.encrypt(dto.accountNumber);
  const encryptedHolder = await this.crypto.encrypt(dto.holderName);

  const ba = await this.bankService.create({
    userId: req.user.id,
    branchId: branch.id,
    holderName: dto.holderName,
    encryptedAccountNumber: encryptedAcc,
    encryptedAccountHolderName: encryptedHolder,
    country: 'US',
    address1: dto.address1, address2: dto.address2, city: dto.city, state: dto.state, zip: dto.zip,
    method: 'ACH',
    mask: dto.accountNumber.slice(-4),
    isPrimary: await this.bankService.shouldBePrimary(req.user.id, dto.makePrimary),
    status: 'ACTIVE'
  });

  try {
    const cp = await this.unit.createCounterparty({
      name: dto.holderName,
      country: 'US',
      address: { line1: dto.address1, line2: dto.address2, city: dto.city, state: dto.state, postalCode: dto.zip },
      ach: { routingNumber: dto.routingNumber, accountNumber: dto.accountNumber, accountType: dto.accountType }
    });
    await this.bankService.attachUnitCounterparty(ba.account_id, cp.id, 'ACTIVE');
  } catch (e) {
    await this.bankService.attachUnitCounterparty(ba.account_id, null, 'REJECTED', e.message);
    throw new UnprocessableEntityException('UNIT_COUNTERPARTY_REJECTED');
  }

  await this.audit.log(req.user.id, 'BANK_ACCOUNT_ADDED', 'bank_account', String(ba.account_id), { mask: ba.mask, method: 'ACH' });

  return this.bankService.toView(ba);
}
```

---

## 8) Mapping payout lifecycle to pay_accounting_payment

- **On batch submission:** Create or update `pay_accounting_payment` rows per provider:
  - `user_id` = provider id
  - `amount` = payout amount (float; also store cents internally)
  - `paid` = NULL initially
  - `paid_method` = 'unit_ach'
  - `paid_tracking_id` = Unit payment id (once known)
  - `paid_notes` = initial “Scheduled in batch <key>”
- **On webhook “payment.sent”:**
  - Set `paid=CURRENT_TIMESTAMP`, ensure not already set (idempotent).
  - Append to `paid_notes`: “Sent via Unit ACH, id=<id>, date=<iso>”.
- **On webhook “payment.returned”:**
  - Keep `paid=NULL`; append return R‑code and reason to `paid_notes`; flag provider record for bank update; expose in admin UI.
- **On retries or re‑submissions:** Update `paid_tracking_id` and append note; never overwrite a non‑null `paid` unless compensating transaction is recorded separately.

---

## 9) Security and privacy tasks (bank data)

- **Least privilege:** Only STAFF with explicit permission can see last4 and bank names; no one can see full account/routing after submission.
- **Transport security:** Enforce HTTPS/TLS 1.2+; HSTS; webhook signature verification mandatory.
- **PII minimization:** Store tokenized `unit_counterparty_id`; keep encrypted account number only as long as necessary per policy; consider periodic purge (retention policy).
- **Secrets:** Store `ENCRYPTION_KEY`, `UNIT_API_KEY`, `UNIT_WEBHOOK_SECRET` in a secret manager, mounted at runtime; rotate on schedule; dual‑control process for rotation.
- **Logging:** Redact routing/account, holder name, IBAN/SWIFT in all logs. Emit masks and counterparty ids only.

---

## 10) Runbooks (bank onboarding and returns)

- **Bank add failure:**
  - Check server‑side validation errors (routing checksum, SWIFT/IBAN).
  - If Unit rejection: common reasons include invalid details or compliance hold; ask provider to confirm details; retry counterparty creation after correction.
- **ACH returns (R‑codes):**
  - R01 (Insufficient Funds): rare on credits; if seen, open incident with Unit.
  - R03 (No Account/Unable to Locate): prompt provider to update account; block auto‑retry to same counterparty.
  - R04 (Invalid Account Number): force re‑entry and verification.
- **Verification pending:**
  - If micro‑deposits enabled: wait 2–3 business days; auto‑cancel verification if not confirmed in 14 days; send reminders.
- **Payout day prechecks:**
  - Confirm Unit source account balance ≥ total + buffer; confirm daily ACH cap not exceeded; run dry‑run preview; lock scheduler; proceed.
- **Incident (webhook outage):**
  - Switch to polling reconciler; extend SLA; communicate to ops; no manual duplicate submissions; rely on idempotency keys.

---
