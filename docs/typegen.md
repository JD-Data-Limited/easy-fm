# Type generation

Typegen ships in the main package but behind the `@jd-data-limited/easy-fm/typegen`
subpath. Normal runtime imports do not load its Node.js filesystem code, and the package
is marked side-effect-free so bundlers can remove unused code.

Run interactive setup:

```sh
easyfm init
```

This asks for provider (`Data API/OData`), transports (`Data API`, `OData`, or `Both`),
host, database, username, password, and output directory. `Both` is the default. Transport
selection is currently a placeholder recorded in config and schema manifest; Data API
remains the metadata source. It creates `easyfm.config.js` and stores credentials in
`.env`; config contains no secrets. Existing config is never overwritten, and unrelated
`.env` entries are preserved. Setup also creates `.gitignore` when missing and adds `.env`
when no equivalent ignore rule exists.

`easyfm typegen` automatically launches the same setup when its config does not exist,
then continues generation.

On first generation, initialized projects also receive `src/easyfm.ts`: a ready-to-import
client with all configured Data API providers wired to their database-scoped environment
variables. This user-owned file is created exclusively and never overwritten. Every
typegen run prints an import/use sample; custom providers without a runtime descriptor
receive the factory sample instead.

Before generation, typegen checks the owning project's `package.json` for Zod. If missing,
it detects pnpm, npm, Yarn, or Bun and installs `zod@^4.6.5`. Existing dependency
declarations are left untouched.

Generated configuration resembles:

```js
import {
    dataApiSchemaSource,
    defineTypegenConfig,
} from '@jd-data-limited/easy-fm/typegen';

export default defineTypegenConfig({
    output: './src/easyfm-generated',
    transports: ['data-api', 'odata'],
    source: dataApiSchemaSource({
        hostname: process.env.FM_HOST,
        database: process.env.FM_DATABASE,
        credentials: {
            method: 'filemaker',
            username: process.env.FM_USERNAME,
            password: process.env.FM_PASSWORD,
        },
        externalSources: [],
    }),
});
```

Then run:

```sh
easyfm typegen
```

Typegen writes a provider-neutral `client.js`, a declaration-only `client.d.ts`, and
`schema.json`. Generated clients accept any `DatabaseProvider`. The declaration file
exposes explicit database, layout, and field interfaces for editor completion without
making the editor analyse the runtime Zod schemas. Results from `record.get` and
`record.list` are checked with strict Zod schemas before EasyFM constructs records;
mismatch throws `SchemaDriftError`.

Zod is the default, but validation generation is pluggable:

```ts
import {
    defineTypegenConfig,
    zodTypegenValidator,
} from '@jd-data-limited/easy-fm/typegen';

export default defineTypegenConfig({
    source,
    output: './src/easyfm-generated',
    validator: zodTypegenValidator(),
});
```

Implement `TypegenValidator` to target another validator. Runtime adapters implement
`RuntimeValidator`; generated clients pass that adapter and generated schemas to
`withSchemaValidation`.

Validation happens at two boundaries. Layout metadata comparison is an early structural
warning. Separately, each complete canonical provider record is checked by a strict
generated Zod schema before EasyFM constructs `LayoutRecord` or field objects. This
validates `recordId`, `modId`, exact `fieldData` keys and values, `portalData`, and portal
rows. Portal selection remains optional because queries may request only a subset. Both
paths throw `SchemaDriftError` with `phase`, layout, record, and normalized issue paths.

FileMaker may return `<No Access>` metadata with `type: "invalid"` and
`result: "invalid"`. EasyFM accepts these placeholders, removes them from runtime metadata
and record data, and excludes them from generated interfaces and Zod schemas. They
therefore do not create false schema-drift errors.

Typegen prints a warning for every excluded inaccessible field, including database,
layout, and portal context. Programmatic callers may provide `onDiagnostic`; all
diagnostics are also returned from `generate()`.

Calculation and summary fields use `ReadonlyField<T>` in generated interfaces. Runtime
checks remain in place because JavaScript and type casts can bypass generated TypeScript
types.

Custom metadata providers implement `SchemaSource` and can generate the same client
without using FileMaker Data API.

Multiple databases may use different metadata sources, providers, and transports:

```ts
export default defineTypegenConfig({
    output: './src/easyfm-generated',
    databases: {
        crm: {
            provider: 'data-api/odata',
            transports: ['data-api', 'odata'],
            source: dataApiSchemaSource(crmOptions),
        },
        inventory: {
            provider: 'custom-provider',
            transports: ['odata'],
            source: customSchemaSource(inventoryOptions),
        },
    },
});
```

Pass one runtime provider per database:
`createEasyFMClient({crm: crmProvider, inventory: inventoryProvider})`. Returned layouts
are namespaced under `client.crm` and `client.inventory`; databases therefore have
independent sessions and may contain layouts with the same name.
