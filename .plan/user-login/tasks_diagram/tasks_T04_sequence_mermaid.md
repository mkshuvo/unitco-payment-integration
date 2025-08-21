```mermaid
sequenceDiagram
  autonumber
  participant User
  participant Web as Next.js
  participant API as NestJS API
  participant DB as MySQL (user_tokens)
  User->>Web: Submit login (email, password)
  Web->>API: POST /auth/login
  API->>DB: Verify user; issue access+refresh (store refresh hash)
  API-->>Web: Set cookies
  Web->>API: POST /auth/refresh (on expiry)
  API->>DB: Rotate refresh (revoke old, store new hash)
  API-->>Web: Set new cookies
  Web->>API: POST /auth/logout
  API->>DB: Revoke active refresh token
```
