# Tasks — Unit Application Form Onboarding (Sandbox)

Follow the Application Form Token path. Use short-lived tokens from Unit API; never expose UNIT_API_KEY to the browser.

## Task List

[x] TASK-001: Backend — Create Application Form endpoint
- ID: TASK-001
- Priority: High
- Effort: 2h
- Dependencies: None
- Description: Add `POST /integration/unit/application-forms` to create an Application Form via Unit API and return `{ id, token, expiration }`.
  - [x] Add `createApplicationForm()` to `src/integration/unit.service.ts` (HTTP POST to `https://api.s.unit.sh/application-forms` with idempotency key)
  - [x] Add controller route in `src/integration/integration.controller.ts`
  - [x] Handle errors and map to `{ message }` with appropriate status codes
  - [x] Unit tests for service method (mock/fake `fetch`); test controller happy-path and error-path

[x] TASK-002: Frontend — Embed Application Form page
- ID: TASK-002
- Priority: High
- Effort: 3h
- Dependencies: TASK-001
- Description: Create page `web/app/onboarding/application-form/page.tsx` to fetch `{ id, token }` and render the component.
  - [x] Load extended bundle via `next/script` using `getUnitScriptSrc()` (`web/lib/unit.ts`)
  - [x] Fetch `/integration/unit/application-forms` on mount and store `{ id, token }`
  - [x] Render `<unit-elements-application-form application-form-id={id} application-form-token={token} theme={getThemeUrl()} language={getLanguageUrl()} />`
  - [x] Show loading and friendly error state with retry

[x] TASK-003: Types & CSP updates
- ID: TASK-003
- Priority: Medium
- Effort: 1h
- Dependencies: TASK-002
- Description: Ensure TypeScript and CSP support for the application form element.
  - [x] Extend `web/types/unit-elements.d.ts` to include `'unit-elements-application-form'` with `application-form-id`, `application-form-token`, `theme`, `language`
  - [x] Add `web/app/onboarding/application-form/head.tsx` CSP: allow `https://*.s.unit.sh` in `script-src`, `connect-src`, and `frame-src`

[x] TASK-004: Playwright setup (web/)
- ID: TASK-004
- Priority: High
- Effort: 2h
- Dependencies: TASK-002, TASK-003
- Description: Install and configure Playwright.
  - [x] Add `@playwright/test` to `web/` devDependencies
  - [x] Install Playwright browsers
  - [x] Create `web/playwright.config.ts` (baseURL http://localhost:3001; retries 1–2; trace on-first-retry)
  - [x] Add npm scripts: `test:e2e`, `test:e2e:ui`, `playwright:install`

[x] TASK-005: E2E — Application Form embedding
- ID: TASK-005
- Priority: High
- Effort: 3h
- Dependencies: TASK-001, TASK-002, TASK-004
- Description: Validate end-to-end embedding and loading in Sandbox.
  - [x] `web/tests/application-form.spec.ts`: use `page.request.post('http://localhost:41873/integration/unit/application-forms')` to get `{ id, token }`
  - [x] Navigate to `/onboarding/application-form` (let page fetch its own token) or inject fixture
  - [x] Assert Unit extended script loaded (check for known global or network request)
  - [x] Assert `<unit-elements-application-form>` is attached
  - [x] Assert an iframe with `src` from `*.s.unit.sh` is visible
  - [x] Assert no severe console/CSP errors; collect trace on retry

[ ] TASK-006: CI integration for E2E (optional for now)
- ID: TASK-006
- Priority: Medium
- Effort: 2h
- Dependencies: TASK-004, TASK-005
- Description: Add CI job to run Playwright tests headless with artifacts (traces, screenshots).
  - [ ] Ensure API has `UNIT_API_KEY` in CI secret store
  - [ ] Spin up API and Web in workflow before running tests

[x] TASK-007: Documentation updates
- ID: TASK-007
- Priority: Low
- Effort: 1h
- Dependencies: TASK-001—TASK-005
- Description: Update `README.md`.
  - [x] Add usage instructions for `/onboarding/application-form`
  - [x] List required env vars and CSP summary
  - [x] Add E2E run instructions

[x] TASK-008: Security & Observability checks
- ID: TASK-008
- Priority: Medium
- Effort: 1h
- Dependencies: TASK-001—TASK-003
- Description: Review key handling and logs.
  - [x] Confirm backend never returns or logs `UNIT_API_KEY`
  - [x] Redact PII in logs; include idempotency key and request id where useful
  - [x] Handle token expiration response gracefully on the page (auto-refresh before expiry + friendly error)

[x] TASK-009: Postman/HTTP test for endpoint
- ID: TASK-009
- Priority: Low
- Effort: 0.5h
- Dependencies: TASK-001
- Description: Add a simple script/example call for `POST /integration/unit/application-forms`.

[x] TASK-010: Server-side tests for createApplicationForm
- ID: TASK-010
- Priority: Medium
- Effort: 2h
- Dependencies: TASK-001
- Description: Add Jest unit tests for `createApplicationForm()` with mocked `fetch` covering success and error cases.
  - [x] Added `src/integration/unit.service.spec.ts` covering success, non-ok response, and no-key scenarios
