```mermaid
sequenceDiagram
  autonumber
  participant Dev
  participant API as NestJS API
  participant Log as Audit Store
  Dev->>API: Create @Audit decorator
  Dev->>API: Implement AuditService (persist events)
  API->>Log: Write redacted event with correlation id
  Log-->>API: Ack
```
