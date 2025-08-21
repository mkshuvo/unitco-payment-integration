```mermaid
sequenceDiagram
  autonumber
  participant User as Normal User
  participant Admin as Admin/Accountant
  participant Web as Next.js Web
  participant API as NestJS API
  participant DB as MySQL
  participant Unit as Unit SDK

  rect rgb(235, 245, 255)
    Note over API,DB: T01–T06 bootstrap (schema, auth core, RBAC, audit)
  end

  User->>Web: Login (T12)
  Web->>API: POST /auth/login (T04)
  API->>DB: Verify & store refresh hash (T04)
  API-->>Web: Set httpOnly cookies (T04)

  Admin->>Web: Create user (future; T13 UI uses T05)
  User->>Web: Add bank (T13)
  Web->>API: POST /users/me/banks/ach (T10)
  API->>API: Validate + encrypt (T07)
  API->>Unit: createCounterparty (T09)
  Unit-->>API: Counterparty id/status
  API->>DB: Persist bank_account + status (T08)
  API-->>Web: Masked bank view (T10)

  User->>Web: Create payment (T14)
  Web->>API: POST /users/me/payments (T11)
  API->>DB: Create accounting row (T11)
  API->>Unit: createAchCreditPayment (idempotent) (T11)
  Unit-->>API: Tracking id/state
  API->>DB: Store tracking id/state (T11)
  API-->>Web: Payment created (T11)

  Web->>API: /auth/refresh on expiry (T04)
  API->>DB: Rotate refresh; invalidate old (T04)
  API-->>Web: New cookies (T04)

  Note over API,Web: T15 security hardening (CSRF, headers, CORS)
  Note over API,Web: T16 tests; T17 CI/Docker/ENV
```
