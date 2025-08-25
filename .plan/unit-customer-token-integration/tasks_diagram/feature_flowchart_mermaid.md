# Unit Customer Token Integration — Flowchart

```mermaid
flowchart TD
    A[Start] --> B[User opens /banking/customer-token]
    B --> C[Enter email (+ optional userId)]
    C --> D[POST /integration/unit/customers/resolve]
    D -->|customerId|null| E[Not found]
    E --> F[Show message; allow retry]
    D -->|customerId found| G[Choose channel sms/call]
    G --> H[POST /integration/unit/customers/:id/token/verification]
    H --> I{Verification token issued?}
    I -->|No| J[Show error; retry]
    I -->|Yes| K[Enter verification code]
    K --> L[POST /integration/unit/customers/:id/token]
    L --> M{Token issued?}
    M -->|No| N[Show error; retry]
    M -->|Yes| O[Render Unit White-Label with customer-token]
    O --> O1[Schedule pre-expiry refresh (T-60s)]
    O1 --> O2[Buffered UI: set 'refreshing', disable Refresh btn]
    O2 --> P{Pre-expiry timer fired?}
    P -->|Yes| P1[Auto POST token refresh]
    P1 --> P2{Refresh success?}
    P2 -->|Yes| O[Update token; clear expired]
    P2 -->|No| Q1[Retry once (1s backoff) then show error]
    P -->|No| P3{401/expired?}
    P3 -->|Yes| Q[Show expiry banner; re-issue token]
    Q --> G
    P3 -->|No| R[User completes banking actions]

    %% Side health path
    B -.-> S[GET /integration/unit/status]
    S -.-> T{UP?}
    T -.->|No| U[Warn: Unit unavailable]
    T -.->|Yes| V[Continue]
```
