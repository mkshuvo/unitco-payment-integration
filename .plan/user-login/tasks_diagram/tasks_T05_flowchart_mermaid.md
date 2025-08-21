```mermaid
flowchart TD
  A[Start T05: RBAC] --> B[JwtAuthGuard]
  B --> C[RolesGuard]
  C --> D[@Roles decorator]
  D --> E[Apply to routes]
  E --> F[Integration tests]
```
