# Unit White‑Label UI (Banking) — Tasks

Last updated: 2025-08-24T03:39:39+06:00

[x] TASK-001: Create `/banking` page embedding Unit White‑Label App
    [x] Add `web/app/banking/page.tsx` with `<unit-elements-white-label-app>`
    [x] Load Unit script `components-extended.js` from CDN (env‑based domain)
    [x] Pass `jwt-token` from `NEXT_PUBLIC_UNIT_JWT` or `localStorage`
    [x] Add minimal theming via `settings-json`
    [x] Handle `unitOnLoad` errors (JWT expired -> UI hint)

[x] TASK-002: Add CSP meta for Unit/Zendesk/Plaid
    [x] Create `web/app/banking/head.tsx` with CSP from docs

[x] TASK-003: Navigation updates
    [x] Add header/nav link to `/banking` in `web/app/page.tsx`
    [x] Add CTA button to go to `/banking`

[x] TASK-004: Env configuration
    [x] Document `NEXT_PUBLIC_UNIT_UI_ENV` (sandbox|prod) in `README.md`
    [x] Support `NEXT_PUBLIC_UNIT_JWT` fallback via `getEnvJwt()` and `getStoredJwt()` in `web/lib/unit.ts`

[x] TASK-005: Logout cleanup helper (optional)
    [x] Provide snippet in `README.md` using `clearUnitStorage()` from `web/lib/unit.ts`

[x] TASK-007: Sandbox-only CSP hardening
    [x] Restrict `web/app/banking/head.tsx` CSP to `*.s.unit.sh` only (remove `*.unit.co`)

[ ] TASK-006: Advanced (future)
    [ ] End‑User Setup endpoint (prefill/role restrictions)
    [ ] End‑users list endpoint for management
    [ ] Switch to production CDN and JWT once Unit Dashboard is configured
