# Authentication And Sessions

Create a `DataApiProvider`, then pass it to synchronous `Database.create()`:

```ts
import { Database, DataApiProvider } from '@jd-data-limited/easy-fm';

const database = Database.create({
    provider: new DataApiProvider({
        hostname: 'https://example.com',
        database: 'Contacts',
        credentials: {
            method: 'filemaker',
            username: 'api-user',
            password: 'secret',
            sessionPoolSize: 4,
        },
        externalSources: [],
    }),
});
```

Construction does not connect. First operation initializes provider once. Use
`await database.connect()` when eager validation is useful.

## Authentication Modes

- `filemaker` opens sessions on demand and pools up to `sessionPoolSize` (default 8).
- `token` uses supplied token and exactly one session.
- `oauth` creates and serializes work through one session.
- `claris` creates and serializes work through one session.
- external sources work only with `filemaker` credentials.

Core scheduler runs one operation at a time per session. Expired read-only operations
retry once on a new session. Writes, uploads, deletes, duplicates, and scripts never
replay automatically.

## Containers

Container reference belongs to session that returned record. Downloads route back through
that exact provider session, including its authorization and cookies. Provider must return
Web `Response`; underlying transport need not be HTTP.

If session expires, download throws `ContainerSessionAffinityError`. Opt into one record
refresh and retry per call:

```ts
await record.fields.Photo.arrayBuffer({ refreshOnSessionLoss: true });
```

## Closing

```ts
await database.close();
```

Closing rejects queued work, aborts active work, closes sessions, and prevents future
operations. `logout()` remains alias.

## Custom Providers

Implement `DatabaseProvider`, `ProviderConnection`, and `ProviderSession`. Provider
receives semantic operations rather than HTTP paths. Set `maxSessions` to `1` for
single-session systems or higher for pooled systems.
