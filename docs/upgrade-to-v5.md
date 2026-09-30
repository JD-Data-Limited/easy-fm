# Upgrading from v4 to v5

Easy FM v5 contains several re-designs that are intended to bring power to your workflow.

Particularly this includes:

- First class support for multiple transports and providers.
- Improved date, time, and timestamp handling via the JavaScript Temporal API
- Support for automatic multi-session handling
-

## Migration checklist

1. Upgrade to Node.js 22.22.3 or later.
2. Replace `FMHost` with `Database.create()` and `DataApiProvider`.
3. Use `database.connect()` only when eager connection validation is required.
4. Replace generic `Field<T>` declarations with concrete field classes.
5. Replace Moment or `Date` field values with Temporal values.
6. Update container download options and handle session affinity where necessary.
7. Check external-source authentication and session-pool limits.
8. Custom transports must implement the new semantic provider interfaces.

## Database construction

`FMHost`, `HostBase`, raw database endpoints, `fetch()`, and `fetchJSON()` have been
removed. Create a database synchronously with a provider:

```ts
// v4
import FMHost from '@jd-data-limited/easy-fm';

const host = new FMHost('https://example.com');
const database = host.database({
    database: 'Contacts',
    credentials: {
        method: 'filemaker',
        username: 'api-user',
        password: 'secret',
    },
    externalSources: [],
});
```

```ts
// v5
import { Database, DataApiProvider } from '@jd-data-limited/easy-fm';

const database = Database.create({
    provider: new DataApiProvider({
        hostname: 'https://example.com',
        database: 'Contacts',
        credentials: {
            method: 'filemaker',
            username: 'api-user',
            password: 'secret',
        },
        externalSources: [],
    }),
});
```

`Database.create()` is synchronous and does not perform network work. Provider connection
and session creation happen lazily on the first operation.

To validate configuration eagerly:

```ts
await database.connect();
```

`login()` remains an alias for `connect()`. Normal application code does not need either
call before its first operation.

## Providers and transports

Database operations are now transport-neutral semantic commands. Layouts and records no
longer construct HTTP paths or `RequestInit` values.

The built-in `DataApiProvider` translates these commands to FileMaker Data API HTTP.
Custom integrations implement:

- `DatabaseProvider`
- `ProviderConnection`
- `ProviderSession`

Set `ProviderConnection.maxSessions` to `1` for a single-session provider or a larger
value for bounded pooling. Core owns session allocation, queuing, reuse, retry policy, and
shutdown.

See [provider-api.md](./provider-api.md) for the complete custom-provider contract.

## Sessions and authentication

### FileMaker username/password

`method: "filemaker"` opens sessions on demand. Core runs one operation at a time on each
session and opens up to `sessionPoolSize` sessions. Default is 8.

```ts
const provider = new DataApiProvider({
    hostname: 'https://example.com',
    database: 'Contacts',
    credentials: {
        method: 'filemaker',
        username: 'api-user',
        password: 'secret',
        sessionPoolSize: 4,
    },
    externalSources: [],
});
```

OAuth, Claris, and supplied-token credentials use one serialized session.

### Retry behavior

When a provider throws `ProviderSessionExpiredError`, EasyFM retries these read-only
operations once on a replacement session:

- layout listing
- layout metadata
- record listing and finds
- fetching one record

EasyFM never automatically replays scripts, creates, updates, duplicates, deletes, or
uploads. This avoids repeating side effects.

### Closing

```ts
try {
    // Use database.
} finally {
    await database.close();
}
```

`close()` rejects queued work, aborts active work, closes every session, closes provider
connection, and prevents future operations. `logout()` remains an alias for `close()`.

## Container downloads and session affinity

FileMaker container references are tied to the session that returned them. V5 stores that
session binding with each record and always routes a container download through the same
provider session. It never substitutes another pooled session.

Provider method `fetchContainer()` must return a Web `Response`. Its underlying transport
may be HTTP or custom. Provider remains responsible for authorization, cookie jars,
redirects, and FileMaker Data API cookie behavior.

```ts
const response = await record.fields.photo.webStream();
const contentType = response.headers.get('Content-Type');
const body = response.body;
```

Download methods accept:

```ts
interface ContainerDownloadOptions {
    signal?: AbortSignal;
    refreshOnSessionLoss?: boolean;
}
```

If original session is unavailable, download throws `ContainerSessionAffinityError`. Opt
into one record refetch and one retry when suitable:

```ts
const result = await record.fields.photo.arrayBuffer({
    signal: controller.signal,
    refreshOnSessionLoss: true,
});
```

`stream()` remains deprecated and returns a Node.js `Readable` plus MIME type.
`webStream()` returns `Response`; `arrayBuffer()` returns buffered data plus MIME type.

## Field types

V4 used generic `Field<T>`. V5 uses concrete classes:

| v4 declaration            | v5 declaration   | v5 `.value` type                 |
| ------------------------- | ---------------- | -------------------------------- |
| `Field<string>`           | `TextField`      | `string`                         |
| `Field<number>`           | `NumberField`    | `number \| null`                 |
| `Field<Moment>` timestamp | `TimeStampField` | `Temporal.PlainDateTime \| null` |
| `Field<Moment>` time      | `TimeField`      | `Temporal.PlainTime \| null`     |
| `Field<Moment>` date      | `DateField`      | `Temporal.PlainDate \| null`     |
| `Field<Container>`        | `ContainerField` | container reference string       |

Example:

```ts
import type {
    ContainerField,
    DateField,
    LayoutInterface,
    NumberField,
    TextField,
    TimeField,
    TimeStampField,
} from '@jd-data-limited/easy-fm';

interface ContactsLayout extends LayoutInterface {
    fields: {
        name: TextField;
        balance: NumberField;
        birthDate: DateField;
        preferredTime: TimeField;
        updatedAt: TimeStampField;
        photo: ContainerField;
    };
    portals: {};
}

const contacts = database.layout<ContactsLayout>('Contacts_API');
```

`BaseField` is shared abstract base. `Field` and `ValueField` are unions, not replacements
for old generic declaration. Calculation and summary fields reject modification before a
request is sent.

## Temporal values

FileMaker values do not include time zones. V5 maps them to:

- date → `Temporal.PlainDate`
- time → `Temporal.PlainTime`
- timestamp → `Temporal.PlainDateTime`
- empty temporal field → `null`

```ts
import { Temporal } from 'temporal-polyfill';

record.fields.birthDate.value = Temporal.PlainDate.from('2026-09-23');
record.fields.preferredTime.value = Temporal.PlainTime.from('14:30:00');
record.fields.updatedAt.value = Temporal.PlainDateTime.from('2026-09-23T14:30:00');
```

No automatic timezone conversion occurs. Apply a zone explicitly when a timestamp
represents an instant:

```ts
const timestamp = record.fields.updatedAt.value;
if (timestamp !== null) {
    const instant = timestamp
        .toZonedDateTime('Pacific/Auckland', { disambiguation: 'reject' })
        .toInstant();
}
```

`asDate`, `asTime`, and `asTimestamp` remain deprecated compatibility helpers. New code
should construct Temporal values directly.

## External data sources

External sources remain available only with `filemaker` credentials:

```ts
const database = Database.create({
    provider: new DataApiProvider({
        hostname: 'https://example.com',
        database: 'Main.fmp12',
        credentials: {
            method: 'filemaker',
            username: 'main-user',
            password: 'secret',
        },
        externalSources: [
            {
                database: 'Related.fmp12',
                credentials: {
                    method: 'filemaker',
                    username: 'related-user',
                    password: 'secret',
                },
            },
        ],
    }),
});
```

For OAuth, Claris, and token credentials, use an empty `externalSources` array.
