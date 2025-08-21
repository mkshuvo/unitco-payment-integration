```mermaid
flowchart TD
  A[Start T08] --> B[Design columns]
  B --> C[Write migration]
  C --> D[Run up]
  D --> E{Indexes correct?}
  E -- Yes --> F[Done]
  E -- No --> G[Amend migration]
  G --> D
```
