```mermaid
graph TD
  subgraph T01[DB migrations for Auth]
    ent[Entities] --> mig[Migrations]
  end
  T01 -->|enables| T02
  T01 --> T03
```
