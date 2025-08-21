```mermaid
sequenceDiagram
  autonumber
  participant User
  participant Admin
  participant Web as Next.js
  participant API as NestJS API
  User->>Web: Add bank (self)
  Web->>API: POST /users/me/banks/ach
  Admin->>Web: View users & banks mapping (ADMIN)
  Web->>API: GET /admin/banks
  API-->>Web: Masked lists with validation statuses
```
