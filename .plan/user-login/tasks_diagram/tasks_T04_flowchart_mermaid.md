```mermaid
flowchart TD
  A[Start T04: Endpoints] --> B[/auth/login/]
  B --> C[Verify credentials]
  C --> D[Issue cookies]
  D --> E[/auth/refresh]
  E --> F[Rotate refresh]
  F --> G[/auth/logout]
  G --> H[Revoke refresh]
  H --> I[Tests: happy/negative]
```
