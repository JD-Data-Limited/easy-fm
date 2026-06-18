# Getting Started

This guide gets `easy-fm` from install to first successful read.

## 1. Create A Host

```ts
import FMHost from "@jd-data-limited/easy-fm"

const host = new FMHost("https://example.com")
```

`FMHost` represents your FileMaker Server or FileMaker Cloud base address.

## 2. Open A Database

```ts
const database = host.database({
  database: "Contacts",
  credentials: {
    method: "filemaker",
    username: process.env.FM_USERNAME!,
    password: process.env.FM_PASSWORD!
  },
  externalSources: []
})
```

Most projects start with `method: "filemaker"`.

If you need other auth modes, read [`authentication-and-sessions.md`](./authentication-and-sessions.md).

## 3. Pick A Layout

```ts
const contacts = database.layout("Contacts_API")
```

This matters because FileMaker Data API works through layouts, not directly through tables.

If a field is not available on the layout, you usually cannot read or write it through that layout.

## 4. Read Records

```ts
const records = await contacts.records.list({
  portals: {},
  limit: 25
}).fetch()
```

Then use field values:

```ts
for (const record of records) {
  console.log(record.fields.FirstName.value)
}
```

## 5. Run A Find

```ts
import {query as q} from "@jd-data-limited/easy-fm"

const records = await contacts.records.list({
  portals: {},
  requests: [
    {
      req: {
        Status: q`Active`,
        Email: q`*@example.com`
      }
    }
  ],
  limit: 10
}).fetch()
```

`query` handles FileMaker escaping rules for you.

## 6. Update A Record

```ts
const record = records[0]
record.fields.LastSeenAt.value = new Date()
await record.commit()
```

Changes are local until `commit()` runs.

## 7. Close Sessions

```ts
await database.close()
```

Do this when your script or job is finished.

## Next Guides

- [`core-concepts.md`](./core-concepts.md)
- [`working-with-records.md`](./working-with-records.md)
- [`query-recipes.md`](./query-recipes.md)
