```mermaid
sequenceDiagram
  autonumber
  participant Dev
  participant API as NestJS API
  participant Web as Next.js
  Dev->>API: Add CSRF strategy
  Dev->>API: Add Helmet headers
  Dev->>API: Configure CORS
  Web->>API: Attempt CSRF-protected call without token
  API-->>Web: Blocked (negative test)
```
