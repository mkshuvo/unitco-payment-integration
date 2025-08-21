```mermaid
flowchart TD
  A[Start T10] --> B[Validate input]
  B --> C[Encrypt account number]
  C --> D[Create Unit counterparty]
  D --> E[Persist id/status]
  E --> F[Return masked view]
```
