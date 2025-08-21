```mermaid
flowchart TD
  A[Start T06: Audit] --> B[Decorator]
  B --> C[Service]
  C --> D[Redaction rules]
  D --> E[Persist events]
  E --> F[Assert logs in tests]
```
