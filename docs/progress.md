# Project Progress

Date: 2025-08-14

## Backend (NestJS)

- Auth & Registration
  - Public customer registration: `POST /api/auth/register`
  - Login with JWT: `POST /api/auth/login`
  - Roles: `admin`, `accountant`, `customer` (RBAC in place)

- Bank Accounts
  - Endpoints (admin/accountant only for now):
    - Upsert: `POST /api/bank-accounts`
    - Validate: `POST /api/bank-accounts/validate`
  - Auto-validation during upsert: IBAN checksum or basic local checks
  - Status set to `valid` or `invalid` before persisting

- Payouts
  - Endpoint: `POST /api/payouts/submit` (admin/accountant)
  - Preconditions: unpaid payment, user exists, validated bank account
  - Idempotency: returns `already_initiated` if an audit with `initiated` exists
  - Audit trail: creates `payout_audit` rows for `initiated` and submission outcome
  - Balance/Budget Gate:
    - Uses BalanceService to ensure available funds before initiating
    - Supports Adyen Balance Platform balance fetch when configured
    - Falls back to `AVAILABLE_PAYOUT_BUDGET` env or unlimited if unset

- Webhooks
  - Endpoint: `POST /api/webhooks/adyen`
  - HMAC verification using `ADYEN_HMAC_KEY` (hex) against JSON payload
  - Updates `pay_accounting_payment.paid` on success events and appends to `payout_audit`

- Adyen Integration Abstraction
  - `AdyenService.submitPayout()` currently a safe stub
  - Wired into `PayoutsService.submit()` with idempotency and audits (PSP reference placeholder)

## Configuration & Environment

- Expected envs (subset):
  - DB_* for MySQL connection
  - JWT_SECRET
  - ADYEN_HMAC_KEY (webhook verification)
  - AVAILABLE_PAYOUT_BUDGET (fallback for payout gating)
  - ADYEN_USE_BALANCE_PLATFORM=true (to fetch balance from Adyen)
  - ADYEN_API_KEY, ADYEN_BALANCE_ACCOUNT_ID, ADYEN_ENV (Balance Platform)

## Current Decision

- Use Adyen for Platforms (Balance Platform) for scalable payouts to many recipients.

## Status Summary

- Core backend flows implemented and building cleanly
- Bank account auto-validation on save: done
- Payout initiation with balance/budget check and audits: done
- Webhook with HMAC: done
- Balance Platform balance fetch: implemented when envs provided
- Live payout call: pending (stub in place)

## Notable Security Notes

- Bank details stored in DB without field-level encryption (to be improved)
- Owner-only customer endpoints not yet exposed (admin/accountant only for now)
- Webhook HMAC in place; signature construction is simplified for current payload format

