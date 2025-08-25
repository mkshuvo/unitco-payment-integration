---
# Design — Unit Application Form Onboarding (Sandbox, Application Form Token)
Last updated: 2025-08-24
---

## 1) Overview
Goal: Embed Unit’s White‑Label Application Form in our Next.js app using the Application Form Token path in Sandbox.
- Backend (NestJS): Create an endpoint that calls Unit API to create an Application Form and returns `{ id, token, expiration }` to the web.
- Frontend (Next.js): Load Unit’s extended UI bundle and render `<unit-elements-application-form>` using the `application-form-id` and `application-form-token`.
- Testing: Playwright E2E validates embedding, script load, iframe presence, and absence of CSP errors.

## 2) Architecture
- Web (Next.js)
  - Page: `web/app/onboarding/application-form/page.tsx`
  - Loads `https://ui.s.unit.sh/release/latest/components-extended.js` via `next/script` (helper: `getUnitScriptSrc()` from `web/lib/unit.ts`).
  - Fetches `{ id, token }` from API, then renders `<unit-elements-application-form application-form-id={id} application-form-token={token} theme={getThemeUrl()} language={getLanguageUrl()} />`.
  - CSP: `web/app/onboarding/application-form/head.tsx` allows necessary Sandbox origins (`*.s.unit.sh`).
- API (NestJS)
  - Controller: extend `src/integration/integration.controller.ts` with `POST /integration/unit/application-forms`.
  - Service: add `createApplicationForm()` in `src/integration/unit.service.ts` using `fetch` against `https://api.s.unit.sh/application-forms`.
  - Config: `UNIT_API_KEY` (required), `UNIT_BASE_URL` optional (default Sandbox).

## 3) Sequence (high level)
1. User navigates to `/onboarding/application-form`.
2. Web requests `POST /integration/unit/application-forms`.
3. API calls Unit: `POST https://api.s.unit.sh/application-forms` with `applications-write` scope.
4. Unit returns JSON:API containing `data.id` and `attributes.applicationFormToken.token` (+ `expiration`).
5. API returns `{ id, token, expiration }`.
6. Web loads extended script and renders `<unit-elements-application-form ...>` with the id+token.
7. Component loads the Unit iframe from Sandbox and renders the onboarding flow.

## 4) API Contract (internal)
- Request: `POST /integration/unit/application-forms`
  - Body (optional): `{ tags?: Record<string,string>, whiteLabelThemeId?: string }`
- Response: `200 OK`
```json
{ "id": "12345", "token": "<applicationFormToken>", "expiration": "2025-08-25T00:00:00Z" }
```
- Errors: `4xx/5xx` with `{ message }`.

## 5) Unit API Call (Server)
- Method: `POST https://api.s.unit.sh/application-forms`
- Headers:
  - `Authorization: Bearer ${UNIT_API_KEY}`
  - `Content-Type: application/vnd.api+json`
  - `X-Accept-Version: V2024_06`
- Body (JSON:API minimal):
```json
{
  "data": {
    "type": "applicationForm",
    "attributes": {
      "idempotencyKey": "<uuid>",
      "tags": { "env": "sandbox" }
    },
    "relationships": {
      "whiteLabelTheme": { "data": { "type": "whiteLabelTheme", "id": "<optionalThemeId>" } }
    }
  }
}
```
- Response (relevant fields):
  - `data.id` => application form id
  - `data.attributes.applicationFormToken.token`
  - `data.attributes.applicationFormToken.expiration`

## 6) Frontend Embedding
- Script: `https://ui.s.unit.sh/release/latest/components-extended.js`
- Component (Sandbox):
```html
<unit-elements-application-form
  application-form-id="{id}"
  application-form-token="{token}"
  theme="{themeUrl}"
  language="{languageUrl}"
></unit-elements-application-form>
```
- Types: extend `web/types/unit-elements.d.ts` with `unit-elements-application-form` attributes.
- CSP (head.tsx): include `*.s.unit.sh` in `script-src`, `connect-src`, and `frame-src`.

## 7) Security
- Do NOT expose `UNIT_API_KEY` to the browser.
- JSON:API request/response may include tags; keep non-PII in Sandbox.
- Idempotency: always generate `idempotencyKey` per request.

## 8) Error Handling
- Server: map Unit errors to `{ message }` with appropriate HTTP status.
- Client: show generic error and a retry option if token fetch fails.

## 9) Testing Strategy (Playwright)
- Precondition: API running with `UNIT_API_KEY` configured; web server started.
- Test: `web/tests/application-form.spec.ts`
  - GET token: `page.request.post('http://localhost:41873/integration/unit/application-forms')` => `{ id, token }`.
  - Navigate to `/onboarding/application-form` and inject the id+token (through page’s fetch or the page’s own fetch flow).
  - Assert: Unit extended script present, custom element visible, iframe from `*.s.unit.sh` present, no CSP/script errors.
  - Artifacts: trace on retry, screenshots on failure.

## 10) Deployment
- Docker: ensure API container has `UNIT_API_KEY` and optional `UNIT_BASE_URL`.
- Web: no extra packages needed to embed component.
