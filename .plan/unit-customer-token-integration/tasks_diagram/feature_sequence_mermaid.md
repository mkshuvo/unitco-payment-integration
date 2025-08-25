# Unit Customer Token Integration — Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant W as Web App (Next.js)
    participant B as API (NestJS)
    participant Unit as Unit API

    U->>W: Open /banking/customer-token
    W->>B: POST /integration/unit/customers/resolve { email, userId? }
    B->>Unit: GET /customers?filter[email]=...
    Unit-->>B: 200 { customerId? }
    B-->>W: 200 { customerId, persisted }

    alt customer found
        U->>W: Choose channel (sms/call)
        W->>B: POST /integration/unit/customers/:id/token/verification
        B->>Unit: POST /customers/:id/token/verification
        Unit-->>B: 201 { verificationToken }
        B-->>W: 201 { verificationToken }

        U->>W: Enter verification code
        W->>B: POST /integration/unit/customers/:id/token { verificationToken, verificationCode, scope, expiresIn? }
        B->>Unit: POST /customers/:id/token
        Unit-->>B: 201 { token, expiresIn }
        B-->>W: 201 { token, expiresIn }

        W->>W: Schedule pre-expiry refresh (T-60s)
        Note over W: 'refreshing' UI state; disable Refresh button; one retry with 1s backoff
        W->>W: Render <unit-elements-white-label-app customer-token="...">
        Note over W,Unit: Unit web component initializes with customer token

        opt pre-expiry auto-refresh (no user action)
            W->>B: POST /integration/unit/customers/:id/token (auto)
            B->>Unit: POST /customers/:id/token
            Unit-->>B: 201 { token, expiresIn }
            B-->>W: 201 { token, expiresIn }
            W->>W: Update customer token; clear expired flag
        end

        opt token expiration
            Unit-->>W: 401 unauthorized (token expired)
            W->>U: Show expiry banner and prompt re-issue
        end
    else not found
        B-->>W: customerId = null
        W->>U: Inform not found; allow retry
    end

    opt status check
        W->>B: GET /integration/unit/status
        B->>Unit: customers.list({ limit: 1 }) (5s timeout)
        B-->>W: { status: 'UP'|'DOWN', reason? }
    end
```
