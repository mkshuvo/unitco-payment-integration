```mermaid
flowchart TD
  A[Start T14] --> B[Build self-serve page]
  B --> C[Build admin payment UI]
  C --> D[Validate limits client-side]
  D --> E[Show tracking id/state]
  E --> F[Error handling]
```
