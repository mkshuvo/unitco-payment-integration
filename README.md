# UnitCo Payment Integration

A production-grade payouts platform for Field Nation to pay 5,000–10,000 providers every Friday at 10:00 AM CST using Unit's ACH Origination API.

## Architecture

- **Backend**: NestJS with TypeScript
- **Frontend**: Next.js 15 + Material UI 6
- **Database**: MySQL 8.4
- **Cache/Jobs**: Redis 7 + BullMQ
- **Payments**: Unit ACH Origination API
- **Infrastructure**: Docker Compose

## Features

- ✅ Provider bank account onboarding with validation
- ✅ Field-level encryption of sensitive data
- ✅ US ACH routing number validation
- ✅ International bank support (SWIFT/IBAN)
- ✅ Unit counterparty creation
- ✅ Modern React frontend with Material UI
- 🔄 Batch payout pipeline (in progress)
- 🔄 Webhook reconciliation (in progress)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### 1. Generate Encryption Key

```bash
node scripts/generate-encryption-key.js
```

Copy the output and add it to your environment or docker-compose.yml.

### 2. Start the Application

```bash
docker compose up -d --build
```

### 3. Verify Installation

```bash
# Test API health
curl http://localhost:41873/health

# Test bank API
node scripts/test-api.js

# Open web interface
open http://localhost:56483/onboarding
```

## API Endpoints

- `GET /health` - Health check
- `POST /providers/me/bank-accounts/ach` - Add US ACH bank account
- `GET /providers/me/bank-accounts` - List bank accounts (coming soon)

## Development

### Local Development

```bash
# Install dependencies
npm install
cd web && npm install

# Start backend
npm run start:dev

# Start frontend (in another terminal)
cd web && npm run dev
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# API tests
node scripts/test-api.js
```

### Onboarding — Application Form (Sandbox)

- Backend endpoint: `POST /integration/unit/application-forms` returns `{ id, token, expiration? }` used by the Unit Application Form component.
- Frontend page: `/onboarding/application-form` fetches a short‑lived token from the backend and embeds
  `<unit-elements-application-form application-form-id="{id}" application-form-token="{token}" />`.
- CSP for this route allows only the Unit Sandbox UI CDN and local backend during development. See `web/app/onboarding/application-form/head.tsx`.

Run locally:

```bash
# Terminal A: API on 41873
npm run start:dev

# Terminal B: Web on 3001
npm run dev --prefix web

# Open page
http://localhost:3001/onboarding/application-form
```

Manual token endpoint test:

```bash
node scripts/test-application-form.js
```

E2E smoke with Playwright (web):

```bash
# Install browsers
npm run playwright:install --prefix web

# Run tests (starts Next.js dev server on port 3001 automatically)
npm run test:e2e --prefix web
```

Notes:

- The E2E suite includes a mocked path and a real token fetch using `page.request.post()`.
- The real-token test skips gracefully if the backend isn’t running or `UNIT_API_KEY` isn’t configured.

## Project Structure

```
├── src/                    # NestJS backend
│   ├── bank/              # Bank account management
│   ├── crypto/            # Encryption utilities
│   └── config/            # Configuration
├── web/                   # Next.js frontend
│   ├── app/               # App router pages
│   └── lib/               # Utilities and API client
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

## Security

- Field-level AES-GCM encryption for sensitive bank data
- Sensitive data redaction in all logs
- Input validation and sanitization
- Secure key management (requires ENCRYPTION_KEY)

## Environment Variables

Required environment variables:

```bash
# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=unitco
DB_PASS=unitco
DB_NAME=unitco

# Redis
REDIS_URL=redis://redis:6379

# Encryption (generate with scripts/generate-encryption-key.js)
ENCRYPTION_KEY=base64_encoded_32_byte_key

# Optional
UNIT_API_KEY=your_unit_api_key
UNIT_WEBHOOK_SECRET=your_webhook_secret
JWT_ACCESS_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

### Frontend (web) — Unit White‑Label UI (Sandbox‑only)

```bash
# Sandbox-only mode is enforced. NEXT_PUBLIC_UNIT_UI_ENV is currently ignored.
# Optional initial JWT for white‑label app (overridden by localStorage if present)
NEXT_PUBLIC_UNIT_JWT=demo.jwt.token

# Optional customization URLs per Unit docs
# Provide absolute URLs to your hosted JSON resources if you use branding/localization
NEXT_PUBLIC_UNIT_THEME_URL=https://your-cdn/theme.json
NEXT_PUBLIC_UNIT_LANGUAGE_URL=https://your-cdn/language.json
```

Notes:

- The `/banking` page embeds Unit's white‑label app and always loads the Sandbox UI (https://ui.s.unit.sh).
- JWT resolution order: `localStorage.unitJwt` → `NEXT_PUBLIC_UNIT_JWT` → demo token (`demo.jwt.token`).
- You can paste a new JWT in the UI and click "Use Token" to persist it to `localStorage`.

### White‑Label UI Usage

- Navigate to `http://localhost:3001/banking` (or the configured port).
- The page embeds Unit's `components-extended.js` and uses the `unit-elements-white-label-app` element with `jwt-token`, and optional `theme` and `language` attributes, exactly as per Unit docs.
- Use your RS256 end‑user JWT (or a `customer-token`). You only need one of them; both are supported by the component.
- No additional NPM package is required for web embedding; the script is loaded from Unit's CDN.
- When the token expires (401), the page shows a hint to refresh.

### Logout Cleanup Helper

Call the cleanup helper during your app's logout flow to remove Unit runtime tokens produced by the white‑label app:

```ts
import { clearUnitStorage } from '@/lib/unit';

function onLogout() {
  // ... your auth session cleanup
  clearUnitStorage();
}
```

## Next Steps

See `docs/next_steps_checklist.md` for detailed implementation roadmap.

## License

MIT
