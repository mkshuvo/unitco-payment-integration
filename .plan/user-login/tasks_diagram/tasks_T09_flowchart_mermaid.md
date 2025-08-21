```mermaid
flowchart TD
  A[Start T09] --> B[Wrap SDK]
  B --> C[Counterparty API]
  B --> D[ACH Credit API]
  C --> E[Timeout + Idempotency]
  D --> E
  E --> F[Mock tests]
```
