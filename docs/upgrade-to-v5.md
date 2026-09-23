# Upgrading from v4 to v5

EasyFM v5 changes session management, field types, and date/time values. This guide explains what changed and shows how
to update an application written for v4.

## Migration checklist

1. Upgrade to Node.js 22.22.3 or later.
2. Remove calls to `database.login()` that you use to establish or test a connection.
3. Replace generic `Field<T>` declarations with the corresponding concrete field types.
4. Replace Moment or `Date` field values with Temporal values.
5. Remove the timezone conversion callback from the `FMHost` constructor.
6. Update code that downloads containers if you want to use the standard Fetch API `Response`.
7. Check that every external data source uses FileMaker username/password authentication.

## Runtime requirement

EasyFM v5 requires Node.js 22.22.3 or later. EasyFM uses `temporal-polyfill` on supported Node.js versions, so you do
not need Node.js 26's native Temporal implementation.

## Sessions and authentication

### Explicit login calls are no longer needed

In v4, `database.login()` opened a FileMaker Data API session. In v5, sessions are created automatically when they are
needed and `database.login()` is a deprecated no-op.

```typescript
// v4
await database.login()
const records = await database.layout("Contacts").records.list({
    portals: {},
    limit: 10
}).fetch()

// v5
const records = await database.layout("Contacts").records.list({
    portals: {},
    limit: 10
}).fetch()
```

Existing calls to `database.login()` will still resolve, but they no longer authenticate or validate the supplied
credentials. Authentication errors are reported by the first operation that needs a session.

### Username/password connections use a session pool

Connections that use `method: "filemaker"` create sessions on demand. Each concurrent operation uses an available
session. If every session is busy and the pool has reached its limit, the operation waits for a session to become
available.

The default pool size is 8. If your application needs a different limit, set `sessionPoolSize` to a positive integer:

```typescript
import FMHost from "@jd-data-limited/easy-fm"

const host = new FMHost("https://<your-server-address>")
const database = host.database({
    database: "your_database.fmp12",
    credentials: {
        method: "filemaker",
        username: "<username>",
        password: "<password>",
        sessionPoolSize: 8
    },
    externalSources: []
})
```

OAuth, Claris, and existing-token connections continue to use one long-lived session rather than a pool.

### Close the database when finished

`database.close()` aborts active requests, logs out every open session, and prevents that `Database` instance from
opening another session. `database.logout()` is now an alias for `database.close()`.

```typescript
try {
    // Use the database.
} finally {
    await database.close()
}
```

After a `Database` instance has been closed, you can create a new instance when you need to make more requests.

## Field types

V4 used one generic `Field<T>` class for every FileMaker field. V5 uses a separate class for each result type, so the
available values and operations are represented more accurately.

| v4 layout declaration | v5 layout declaration | v5 `.value` type |
|---|---|---|
| `Field<string>` | `TextField` | `string` |
| `Field<number>` | `NumberField` | `number \| null` |
| `Field<Moment>` for a timestamp | `TimeStampField` | `Temporal.PlainDateTime \| null` |
| `Field<Moment>` for a time | `TimeField` | `Temporal.PlainTime \| null` |
| `Field<Moment>` for a date | `DateField` | `Temporal.PlainDate \| null` |
| `Field<Container>` | `ContainerField` | container URL |

`BaseField` is the shared abstract base class. `ValueField` and `Field` are unions of their concrete field types; they
are not replacements for the old generic `Field<T>` declaration.

### Updating layout interfaces

```typescript
// v4
import {
    type Container,
    type Field,
    type LayoutInterface
} from "@jd-data-limited/easy-fm"
import {type Moment} from "moment"

interface ContactsLayout extends LayoutInterface {
    fields: {
        name: Field<string>
        balance: Field<number>
        birthDate: Field<Moment>
        preferredTime: Field<Moment>
        updatedAt: Field<Moment>
        photo: Field<Container>
    }
    portals: {
        Notes: {
            "Notes::text": Field<string>
            "Notes::createdAt": Field<Moment>
        }
    }
}
```

```typescript
// v5
import {
    type ContainerField,
    type DateField,
    type LayoutInterface,
    type NumberField,
    type TextField,
    type TimeField,
    type TimeStampField
} from "@jd-data-limited/easy-fm"

interface ContactsLayout extends LayoutInterface {
    fields: {
        name: TextField
        balance: NumberField
        birthDate: DateField
        preferredTime: TimeField
        updatedAt: TimeStampField
        photo: ContainerField
    }
    portals: {
        Notes: {
            "Notes::text": TextField
            "Notes::createdAt": TimeStampField
        }
    }
}
```

### Calculation and summary fields are read-only

Calculation and summary fields are now treated as read-only. If your application calls `.set(...)` or assigns to
`.value` on one of these fields, EasyFM raises an error before sending a write request to FileMaker.

When updating this code, write to the underlying writable fields instead. FileMaker will then update the calculated or
summarised value as usual.

## Temporal date and time values

FileMaker dates, times, and timestamps do not include a time zone. V5 therefore represents them with Temporal's plain
types:

- Date fields use `Temporal.PlainDate`.
- Time fields use `Temporal.PlainTime`.
- Timestamp fields use `Temporal.PlainDateTime`.

These types preserve the value returned by FileMaker without treating it as an instant or applying an implicit timezone
conversion. Empty temporal fields have a value of `null`.

### The `FMHost` timezone callback has been removed

The `FMHost` constructor now accepts only the server URL and the optional TLS verification flag.

```typescript
// v4
const host = new FMHost(serverUrl, timezoneOffsetForServer, false)

// v5
const host = new FMHost(serverUrl, false)
```

This is because V5 no longer performs automatic timezone conversion. This is intended such that the data you receive
from EasyFM is true to the database, and to allow you to implement your own conversion logic.

This should simplify and make timezone conversion and handling clearer.

### Create and assign values

EasyFM uses the classes provided by `temporal-polyfill`. If your application constructs Temporal values, add that package
as a direct dependency and import `Temporal` from it:

```typescript
import {Temporal} from "temporal-polyfill"

record.fields.birthDate.value = Temporal.PlainDate.from("2026-09-23")
record.fields.preferredTime.value = Temporal.PlainTime.from("14:30:00")
record.fields.updatedAt.value = Temporal.PlainDateTime.from("2026-09-23T14:30:00")
```

To clear a date, time, timestamp, or number field, assign `null`.

### Convert a timestamp to an instant

A `Temporal.PlainDateTime` has no time zone. If a FileMaker timestamp represents a real instant in your application, you
can apply the correct time zone explicitly. Because an empty timestamp field has a value of `null`, check the value first:

```typescript
const timestamp = record.fields.updatedAt.value

if (timestamp !== null) {
    const instant = timestamp
        .toZonedDateTime("Pacific/Auckland", {disambiguation: "reject"})
        .toInstant()

    console.log(instant.toString())
}
```

The `disambiguation` option controls what happens when daylight-saving changes make a local time ambiguous or invalid.
The example uses `"reject"` so that the application can handle this case instead of silently adjusting the value.

### Update date and time queries

`asDate`, `asTime`, and `asTimestamp` remain available for compatibility, but are deprecated. They convert a JavaScript
`Date` or a legacy Moment-like value into the corresponding Temporal type.

For new code, construct the required Temporal type directly:

```typescript
import {query} from "@jd-data-limited/easy-fm"
import {Temporal} from "temporal-polyfill"

const startDate = Temporal.PlainDate.from("2026-09-01")
const request = {
    birthDate: query`>=${startDate}`
}
```

The compatibility helpers use the JavaScript `Date` object's local calendar and clock fields. They do not convert from
UTC or apply a FileMaker server timezone.

## Container downloads

`ContainerField.webStream()` returns a standard Fetch API `Response`. It accepts an options object, where an
`abortSignal` can be provided when a download needs to be cancellable.

```typescript
const response = await record.fields.photo.webStream({})
const contentType = response.headers.get("Content-Type")
const body = response.body
```

`ContainerField.stream()` is deprecated but remains available. It returns the v4-style Node.js stream and MIME type:

```typescript
const {data, mime} = await record.fields.photo.stream()
```

`arrayBuffer()` continues to download the complete container into memory.

## Response validation

V5 validates FileMaker Data API response shapes with Zod. A malformed or unexpected response that v4 may have accepted
can now throw a `ZodError`. `FMError` continues to represent a valid FileMaker error response. A `ZodError` instead
indicates that the response did not have the expected shape, which may point to a server, proxy, or compatibility issue.

## External data sources

External data sources are supported only when the main database connection uses `method: "filemaker"`. Every external
source must also use FileMaker username/password credentials.

```typescript
const database = host.database({
    database: "Main.fmp12",
    credentials: {
        method: "filemaker",
        username: "main-user",
        password: "<password>"
    },
    externalSources: [
        {
            database: "Related.fmp12",
            credentials: {
                method: "filemaker",
                username: "related-user",
                password: "<password>"
            }
        }
    ]
})
```

For OAuth, Claris, and existing-token connections, leave `externalSources` empty.
