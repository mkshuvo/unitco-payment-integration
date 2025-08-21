```mermaid
flowchart TD
  A[Start T16] --> B[Unit tests]
  B --> C[Integration tests]
  C --> D[E2E tests]
  D --> E{Green?}
  E -- Yes --> F[Pass CI]
  E -- No --> G[Fix and rerun]
```
