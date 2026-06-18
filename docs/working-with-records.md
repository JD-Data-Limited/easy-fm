# Working With Records

This guide covers common record operations once you already have a `layout`.

## List Records

```ts
const records = await layout.records.list({
  portals: {},
  limit: 100,
  offset: 1
}).fetch()
```

## Iterate Large Result Sets

```ts
const operation = layout.records.list({
  portals: {},
  limit: 1000
})

for await (const record of operation.iterate(100)) {
  console.log(record.recordId)
}
```

Use this when you do not want every record loaded at once.

## Get One Record

```ts
const record = await layout.records.get(123)
```

`123` here is FileMaker `recordId`.

Usually better to find by business field where possible.

## Create A Record

```ts
const record = await layout.records.create({
  portals: []
})

record.fields.FirstName.value = "Ada"
record.fields.LastName.value = "Lovelace"

await record.commit()
```

`create()` builds an unsaved record shell. `commit()` persists it.

## Update A Record

```ts
const record = await layout.records.get(123)
record.fields.Status.value = "Archived"
await record.commit()
```

## Re-fetch A Record

```ts
await record.get()
```

Use this when you want latest server state after changes elsewhere.

## Duplicate A Record

```ts
const record = await layout.records.get(123)
const copy = await record.duplicate()
```

## Delete A Record

```ts
const record = await layout.records.get(123)
await record.delete()
```

## Read Portal Rows

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

for (const row of records[0].portals.LineItems.records) {
  console.log(row.fields.ProductName.value)
}
```

Portal rows are only included when requested.

## Run Scripts During Writes

```ts
await record.commit({
  scripts: {
    prerequest: database.script("BeforeSave"),
    after: database.script("AfterSave")
  }
})
```

## Next Guides

- [`query-recipes.md`](./query-recipes.md)
- [`timezones.md`](./timezones.md)
- [`typescript-layouts.md`](./typescript-layouts.md)
