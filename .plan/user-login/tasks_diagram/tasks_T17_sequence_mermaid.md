```mermaid
sequenceDiagram
  autonumber
  participant Dev
  participant Repo as Repo/CI
  participant Docker as Docker Compose
  Dev->>Repo: Add ENV templates & docs
  Dev->>Repo: Update CI stages (lint, test, build, E2E)
  Dev->>Docker: Compose build & up verification
  Docker-->>Dev: Services healthy
```
