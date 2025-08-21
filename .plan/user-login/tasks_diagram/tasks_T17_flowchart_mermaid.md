```mermaid
flowchart TD
  A[Start T17] --> B[ENV keys]
  B --> C[Docker wiring]
  C --> D[CI pipeline]
  D --> E[Compose up]
  E --> F[Healthchecks pass]
```
