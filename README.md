# easy-fm

`easy-fm` is a Node.js client for Claris FileMaker Data API.

It helps you connect Node.js code to FileMaker Server or FileMaker Cloud so you can fetch records, run finds, edit data, work with portals, and run scripts using a typed JavaScript or TypeScript API.

## Requirements

- Node.js `22+`
- FileMaker Data API enabled
- account with `fmrest` privilege
- at least one accessible layout

Claris Data API reference:
[`help.claris.com/en/data-api-guide/content/index.html`](https://help.claris.com/en/data-api-guide/content/index.html)

## Install

```sh
npm install @jd-data-limited/easy-fm
```

## Quick Start

```ts
import FMHost from "@jd-data-limited/easy-fm"

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

const layout = database.layout("Contacts_API")
const records = await layout.records.list({
  portals: {},
  limit: 25
}).fetch()

for (const record of records) {
  console.log(record.fields.FirstName.value, record.fields.LastName.value)
}
```

## Important Notes

- FileMaker Data API is layout-based, so fields and portals must be available on the layout you use.
- Portal data is not fetched unless you request it.
- `recordId` and `modId` are internal FileMaker IDs. Avoid treating `recordId` as a business ID; `modId` can still be useful for change or concurrency checks.
- Date and timestamp formatting follows the host timezone rules you configure, with defaults chosen to better match FileMaker UI expectations.

## Documentation

Start here:

- [`docs/getting-started.md`](./docs/getting-started.md): first connection, first find, closing sessions
- [`docs/core-concepts.md`](./docs/core-concepts.md): host, database, layout, record, portal, IDs

Task guides:

- [`docs/working-with-records.md`](./docs/working-with-records.md): list, create, update, duplicate, delete, portal rows
- [`docs/query-recipes.md`](./docs/query-recipes.md): find requests, sorting, paging, script hooks
- [`docs/authentication-and-sessions.md`](./docs/authentication-and-sessions.md): auth modes, pooling, lifecycle
- [`docs/timezones.md`](./docs/timezones.md): date, time, and timestamp behavior
- [`docs/typescript-layouts.md`](./docs/typescript-layouts.md): typed layouts and stronger autocomplete
- [`docs/testGuide.md`](./docs/testGuide.md): local test commands

API reference:

- [`docs_out/index.html`](./docs_out/index.html): generated TypeDoc site

## Build Docs

```sh
npm run docs:build
```

## Test

```sh
npm test
npm run test:unit
npm run test:integration
```

Integration tests require a working FileMaker environment and credentials.
