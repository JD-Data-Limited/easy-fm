# Provider API

`Database` works with semantic providers. Providers choose transport and session creation; core schedules sessions and translates results into layouts and records.

```ts
import type {
  DatabaseProvider,
  ProviderConnection,
  ProviderSession
} from "@jd-data-limited/easy-fm"
```

A provider exposes synchronous formatting defaults and lazy connection:

```ts
const provider: DatabaseProvider = {
  formatting: {
    dateFormat: "MM/DD/YYYY",
    timeFormat: "HH:mm:ss",
    timeStampFormat: "MM/DD/YYYY HH:mm:ss"
  },
  async connect(context): Promise<ProviderConnection> {
    return {
      formatting: this.formatting,
      maxSessions: 1,
      async openSession(signal): Promise<ProviderSession> {
        return {
          async execute(operation) {
            // Translate semantic operation to provider transport.
          },
          async fetchContainer(reference, signal) {
            // Preserve this session's auth/cookie state.
            // Non-HTTP implementations may synthesize Response.
            return new Response(...)
          },
          async close() {}
        }
      }
    }
  }
}

const database = Database.create({provider})
```

## Rules

- `maxSessions: 1` selects serialized single-session behavior; larger values allow bounded pooling.
- `execute` receives typed layout, script, record, and upload operations—not HTTP paths.
- Throw `ProviderSessionExpiredError` when session cannot continue. Core retries safe reads once.
- Container reference is opaque and bound to session that produced it.
- `fetchContainer` must return Web `Response`; transport itself may be HTTP or custom.
- Do not replay operations inside provider. Core owns retry policy.
