# Flowchart — Unit Application Form Onboarding (Sandbox)

```mermaid
flowchart TD
  A[User opens /onboarding/application-form] --> B[Load Unit extended script]
  B --> C{Fetch token from API?}
  C -->|POST /integration/unit/application-forms| D[API calls Unit: POST /application-forms]
  D --> E{Unit response OK?}
  E -->|Yes| F[Return {id, token}]
  E -->|No| G[Return error {message}]
  F --> H[Render <unit-elements-application-form> with id+token]
  H --> I[Unit iframe loads onboarding flow]
  I --> J{Token valid?}
  J -->|Yes| K[User completes onboarding steps]
  J -->|Expired| L[Show expired notice and prompt to refresh]
  L --> C
  G --> M[Show error and Retry button]
  M --> C

  classDef ok fill:#c6f6d5,stroke:#2f855a,color:#22543d;
  classDef warn fill:#fefcbf,stroke:#b7791f,color:#744210;
  classDef err fill:#fed7d7,stroke:#c53030,color:#742a2a;

  F:::ok
  L:::warn
  G:::err
```
