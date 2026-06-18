# Query Recipes

This guide covers record listing, finding, paging, sorting, and portal fetches.

## List First N Records

```ts
const records = await layout.records.list({
  portals: {},
  limit: 25
}).fetch()
```

Without `requests`, library uses FileMaker `GET /records`.

## Find Records

With `requests`, library switches to FileMaker `_find`.

```ts
import {query as q} from "@jd-data-limited/easy-fm"

const records = await layout.records.list({
  portals: {},
  requests: [
    {
      req: {
        Status: q`Active`,
        CustomerNumber: q`=${1234}`
      }
    }
  ],
  limit: 25
}).fetch()
```

## Why Use `query`

`query` is tagged template helper that escapes special FileMaker find characters while still letting you embed values.

```ts
const email = "ada@example.com"
const request = {
  Email: q`${email}`
}
```

Use it instead of manually building raw find strings.

## Multiple Requests

Each request object acts like FileMaker find request block.

```ts
const operation = layout.records.list({
  portals: {},
  limit: 50
})

operation.addRequest({
  Status: q`Active`
})

operation.addRequest({
  Status: q`Pending`
})

const records = await operation.fetch()
```

## Omit Requests

Use `omit: true` to exclude matched records.

```ts
const records = await layout.records.list({
  portals: {},
  requests: [
    {
      req: {
        Status: q`Archived`
      },
      omit: true
    }
  ]
}).fetch()
```

## Sort Results

```ts
const records = await layout.records.list({
  portals: {},
  limit: 25
}).sort("LastName", "ascend").sort("FirstName", "ascend").fetch()
```

Allowed sort order values:

- `"ascend"`
- `"descend"`

## Page Through Results

```ts
const page2 = await layout.records.list({
  portals: {},
  limit: 100,
  offset: 101
}).fetch()
```

Important:

- offset is 1-based
- `offset: 1` means first record

## Stream Large Result Sets

Use async iterator for large jobs:

```ts
const operation = layout.records.list({
  portals: {},
  limit: 5000
})

for await (const record of operation.iterate(100)) {
  console.log(record.recordId)
}
```

This fetches in pages instead of loading all rows at once.

## Request Portal Rows

```ts
const records = await layout.records.list({
  portals: {
    LineItems: {
      offset: 1,
      limit: 50
    }
  },
  limit: 10
}).fetch()
```

Portal config means:

- which portals to include
- where portal paging starts
- how many rows per portal to fetch

## Run Scripts During Find

```ts
const operation = layout.records.list({
  portals: {},
  limit: 25
}).scripts({
  prerequest: database.script("PrepareContext"),
  after: database.script("AfterFetch")
})

const records = await operation.fetch()
```

Supports:

- `prerequest`
- `presort`
- `after`

## Date, Time, Timestamp Queries

Use helpers so library formats values with host timezone rules:

```ts
import {asDate, asTime, asTimestamp, query as q} from "@jd-data-limited/easy-fm"

const records = await layout.records.list({
  portals: {},
  requests: [
    {
      req: {
        StartDate: q`${asDate(new Date())}`,
        UpdatedAt: q`${asTimestamp(new Date())}`
      }
    }
  ]
}).fetch()
```

Read [`timezones.md`](./timezones.md) if results look shifted.

## Related Guides

- [`getting-started.md`](./getting-started.md)
- [`working-with-records.md`](./working-with-records.md)
