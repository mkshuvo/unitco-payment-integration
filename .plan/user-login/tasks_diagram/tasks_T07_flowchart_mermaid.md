```mermaid
flowchart TD
  A[Start T07] --> B[Implement AES-GCM]
  B --> C[Mask utilities]
  C --> D[Unit tests]
  D --> E{Pass?}
  E -- Yes --> F[Done]
  E -- No --> G[Fix]
  G --> D
```
