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

## Next Steps

See `docs/next_steps_checklist.md` for detailed implementation roadmap.

## License

MIT
