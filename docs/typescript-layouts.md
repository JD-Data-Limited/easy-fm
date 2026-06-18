# TypeScript Layouts

`easy-fm` becomes much easier to use when you describe your layout shape.

## Minimal Example

```ts
import FMHost, {
  type Field,
  type LayoutInterface,
  type Portal
} from "@jd-data-limited/easy-fm"

interface ContactsLayout extends LayoutInterface {
  fields: {
    FirstName: Field<string>
    LastName: Field<string>
    Status: Field<string>
  }
  portals: {
    Notes: Portal<{
      Note: Field<string>
    }>
  }
}

const host = new FMHost("https://example.com")

const database = host.database({
  database: "Contacts",
  credentials: {
    method: "filemaker",
    username: "api-user",
    password: "secret"
  },
  externalSources: []
})

const layout = database.layout<ContactsLayout>("Contacts_API")
```

## What You Get

- autocomplete for `record.fields`
- autocomplete for `record.portals`
- better compile-time feedback when field names are wrong
- clearer intent in app code

## Example Use

```ts
const records = await layout.records.list({
  portals: {
    Notes: {
      offset: 1,
      limit: 10
    }
  },
  limit: 5
}).fetch()

records[0].fields.FirstName.value = "Ada"
console.log(records[0].portals.Notes.records[0].fields.Note.value)
```

## Related Types

- `LayoutInterface`
- `Portal`
- `Field`
- `PickPortals`
- `RecordFieldsMap`

See the generated API docs for type details:
[`../docs_out/index.html`](../docs_out/index.html)
