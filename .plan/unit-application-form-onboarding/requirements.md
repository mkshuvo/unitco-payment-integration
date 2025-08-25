# Unit Application Form Onboarding — Requirements (Sandbox)

Last updated: 2025-08-24

## Feature Overview
Embed Unit’s White‑Label Application Form into our Next.js web app to onboard end‑customers in the Sandbox environment. The Application Form is a Unit‑hosted, highly customizable onboarding flow for Individuals and Businesses, embedded via the `unit-elements-application-form` web component.

## What we need from Unit.co (Sandbox)
- API base URL: `https://api.s.unit.sh`
- UI components script (extended bundle): `https://ui.s.unit.sh/release/latest/components-extended.js`
- Sandbox API Key with scope/permission allowing Application Forms creation:
  - Required: `applications-write`
- API version header for requests: `X-Accept-Version: V2024_06`
- Optional (branding/localization):
  - White‑Label Theme ID for relationships (if using Unit white‑label theme)
  - Theme JSON URL and Language JSON URL (we pass via component `theme` / `language`)
- Optional (JWT method only):
  - Valid end‑user JWT (RS256) from your IdP or backend with JWKs registered in Unit. Only required if we choose the `jwt-token` embedding path. Not required if we use `application-form-token`.

## Integration Paths (choose one)
1) Application Form Token (recommended for Sandbox)
- Backend creates an Application Form via `POST /application-forms` and receives an `id` and an `applicationFormToken`.
- Frontend embeds:
  - `<unit-elements-application-form application-form-id="{id}" application-form-token="{token}" theme="{themeUrl}" language="{languageUrl}">`
- Pros: No IdP/JWT setup needed; fastest path to Sandbox onboarding.

2) End‑user JWT
- Backend creates Application Form where the end‑user JWT subject is passed to the create request (per Unit docs).
- Frontend embeds with `jwt-token` instead of `application-form-token`.
- Pros: Aligns with production identity model; Cons: Requires IdP and Unit JWT configuration.

## Functional Requirements
- Create Application Form (Sandbox) via backend API:
  - Endpoint: `POST /integration/unit/application-forms`
  - Headers: `Authorization: Bearer <UNIT_API_KEY>`, `Content-Type: application/vnd.api+json`, `X-Accept-Version: V2024_06`
  - Body: JSON:API: `{ data: { type: "applicationForm", attributes: { idempotencyKey, tags? }, relationships?: { whiteLabelTheme? } } }`
  - Response: `{ id, applicationFormToken: { token, expiration }, links.related? }`
- Frontend page to embed the Application Form in Sandbox using the extended script and correct attributes.
- CSP allowing Sandbox resources (script/connect/frame) for Unit (including Application Form viewer domain).
- Optional Theme/Language URLs sourced from env and passed to component.

## Non‑Functional Requirements
- Security: Never expose `UNIT_API_KEY` to the browser. All Unit API calls occur on the backend.
- CSP: Allow only required Sandbox origins (Unit UI CDN, API, application form domain), keep tight defaults.
- Observability: Log request outcome server‑side with redacted details; do not log PII.
- Reliability: Idempotent creation via `idempotencyKey`. Implement retry/backoff on transient failures.
- Config: Support `UNIT_BASE_URL` (default Sandbox), `UNIT_API_KEY`. In web, support `NEXT_PUBLIC_UNIT_THEME_URL`, `NEXT_PUBLIC_UNIT_LANGUAGE_URL`.

## User Stories & Acceptance Criteria
- As an operator, I can click to open the onboarding page and see the Unit Application Form render without errors in Sandbox.
  - AC: The page loads the extended script, renders `<unit-elements-application-form>`, and the iframe from Unit is visible.
- As a developer, I can create an Application Form via our backend and receive `id` and `applicationFormToken`.
  - AC: Backend returns 201/200 with non‑empty `id` and `token`.
- As a user, if the token expires, I get a friendly error/refresh flow (component‑handled; we show a generic warning if the container reports 401/expired).
  - AC: On token expiration, UI informs user; reload regenerates a fresh token.

## Tech Stack Decisions
- Frontend: Next.js 15, TypeScript, MUI
- Backend: NestJS 11, Node 20 (global fetch), `@unit-finance/unit-node-sdk` present (we’ll prefer direct HTTP for Application Form unless SDK supports it explicitly)
- E2E: Playwright Test (latest stable at implementation time), HTML trace on retry

## Compliance & Data Handling
- Sandbox only. Do not submit real PII.
- Disclosures/terms links can be configured via Unit White‑Label Theme; optional in Sandbox.
- No customer data persisted locally beyond what’s needed for the demo.

## Integration Points
- Unit API: `POST https://api.s.unit.sh/application-forms` (Create), `GET https://api.s.unit.sh/application-forms/{id}` (Fetch token/links)
- Unit UI: `https://ui.s.unit.sh/release/latest/components-extended.js`

## Constraints & Assumptions
- Sandbox only; production enablement deferred.
- We will use the Application Form Token path initially to avoid IdP setup.
- Docker‑based local environment with `UNIT_API_KEY` available to the API container.
