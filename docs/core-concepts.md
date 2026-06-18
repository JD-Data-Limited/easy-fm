# Core Concepts

This guide explains FileMaker ideas `easy-fm` builds on.

## Mental Model

Request flow usually looks like this:

`FMHost` -> `Database` -> `Layout` -> `Record`

And sometimes:

`LayoutRecord` -> `Portal` -> `PortalRecord`

## Host

`FMHost` represents FileMaker Server or FileMaker Cloud base address.

Example:

```ts
const host = new FMHost("https://example.com")
```

Host also owns timezone formatting rules used when date/time values are sent to FileMaker.

## Database

`Database` represents one FileMaker file.

Example:

```ts
const database = host.database({
  database: "Contacts",
  credentials: {
    method: "filemaker",
    username: "api-user",
    password: "secret"
  },
  externalSources: []
})
```

Database object handles session management, requests, layout caching, and helper methods like `script()`.

## Layout

This part surprises many new users:

FileMaker Data API works through layouts, not directly through tables.

That means:

- fields must be available on chosen layout if you want to read or write them
- portal rows must be exposed on chosen layout if you want to fetch them
- script execution can be layout-scoped

Good practice:

- create API-focused layouts
- include fields needed by integration
- avoid extra UI-only objects when possible

## Record

`LayoutRecord` is one record returned from a layout.

You read and write through `record.fields`:

```ts
const record = await layout.records.get(123)
record.fields.Status.value = "Active"
await record.commit()
```

Important:

- changing field value does not save immediately
- `commit()` sends edits to FileMaker
- `get()` re-fetches latest version from server

## Portal

Portals represent related rows returned inside parent layout record.

Portal data is not fetched automatically. You must ask for it:

```ts
const records = await layout.records.list({
  portals: {
    LineItems: {
      offset: 1,
      limit: 25
    }
  }
}).fetch()
```

Then read portal rows from:

```ts
records[0].portals.LineItems.records
```

## Record ID vs Business ID

FileMaker gives each record:

- `recordId`: internal unique identifier
- `modId`: internal modification counter

These are useful for API operations.

`recordId` should usually not be used as a business identifier because:

- users do not recognize them
- they are layout/API oriented
- business rules usually belong to dedicated fields like `CustomerNumber`

`modId` is different. It is still internal, but it can be useful for change detection, optimistic locking, or checking whether a record has been modified since you last read it.

## Typed Layouts

TypeScript users can describe layout shape to get better autocomplete and compile-time checks.

Minimal example:

```ts
import {type LayoutInterface, type Field} from "@jd-data-limited/easy-fm"

interface ContactsLayout extends LayoutInterface {
  fields: {
    FirstName: Field<string>
    LastName: Field<string>
  }
  portals: {}
}
```

Then:

```ts
const layout = database.layout<ContactsLayout>("Contacts_API")
```

Now `record.fields.FirstName` is typed.

## Next Guides

- [`getting-started.md`](./getting-started.md) for first connection and first read
- [`working-with-records.md`](./working-with-records.md) for create/update/delete examples
- [`query-recipes.md`](./query-recipes.md) for finding records
- [`authentication-and-sessions.md`](./authentication-and-sessions.md) for login behavior
- [`timezones.md`](./timezones.md) for date/time handling
