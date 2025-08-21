```mermaid
flowchart TD
  A[Start T12] --> B[Login page]
  B --> C[Call /auth/login]
  C --> D[Handle 401/errors]
  D --> E[Set cookies]
  E --> F[Protect routes]
```
