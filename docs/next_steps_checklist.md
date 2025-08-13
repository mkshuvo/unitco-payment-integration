# Next Steps: Adyen for Platforms Payouts

This checklist captures what we need to implement live payouts via Adyen Balance Platform and finalize the payout flow.

## Environment & Access

- [ ] ADYEN_USE_BALANCE_PLATFORM=true
- [ ] ADYEN_ENV=test (or live when ready)
- [ ] ADYEN_API_KEY with Balance Platform scope/permissions
- [ ] ADYEN_HMAC_KEY for webhook verification (already used)
- [ ] ADYEN_BALANCE_ACCOUNT_ID for the funding account to debit
- [ ] Confirm default currency for the balance account (e.g., EUR, USD)
- [ ] Confirm your Adyen test company account has access to Balance Platform endpoints

## Recipients & Instruments

- [ ] Decide recipient model: a balance account per user vs. paying out directly from a central balance
- [ ] If per-user balances: ensure onboarding/KYC and balance accounts exist per recipient
- [ ] If central balance: confirm compliance approach and record-keeping per recipient
- [ ] Map our `UserBankAccount` to Adyen recipient instrument
  - [ ] Collect fields required by Adyen for the target country/currency
  - [ ] Validate IBAN/local details match Adyen schema

## API Operations (to implement in code)

- [ ] Replace stub in `server/src/payouts/adyen.service.ts` with real Adyen requests
  - [ ] Construct idempotency key per `payment_id`
  - [ ] Build payout/transfer request body (Balance Platform API)
  - [ ] Send using appropriate base URL for `ADYEN_ENV`
  - [ ] Parse response, store `pspReference` (or equivalent) in `payout_audit`
  - [ ] Map and store failure reasons on error
- [ ] Use live balance from Balance Platform in `BalanceService` (already supported with fallback)
- [ ] Keep simulation path when `ADYEN_ENABLE_LIVE_CALLS!==true`

## Webhooks & Reconciliation

- [ ] Confirm event types for payout status updates (e.g., balance platform transfer status)
- [ ] Update `server/src/webhooks/webhooks.service.ts` to parse Balance Platform events
- [ ] Verify HMAC construction aligns with Adyen spec for these events
- [ ] Ensure we idempotently update `pay_accounting_payment.paid` and append `payout_audit`

## Queueing & Reliability

- [ ] Introduce BullMQ + Redis for payout jobs
  - [ ] Job retries with backoff on transient errors
  - [ ] Deduplicated by idempotency key
  - [ ] Worker concurrency limits
- [ ] Add structured logging around external calls and webhook handling

## Frontend & Ops

- [ ] Minimal internal dashboard for payments -> payout submission, status, and audits
- [ ] Admin/accountant UX to review bank accounts and validation status
- [ ] README updates with envs, run steps, and API collection
- [ ] Postman/Bruno collection for testing auth, bank accounts, payouts, and webhooks

## Optional Safety

- [ ] Minimum remaining balance buffer after each payout (configurable)
- [ ] Per-user payout limits (daily/weekly/monthly)
- [ ] Field-level encryption for stored bank details
- [ ] Secrets management (e.g., Doppler, Vault, or platform secrets)
