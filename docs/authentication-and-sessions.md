# Authentication And Sessions

`easy-fm` supports multiple login styles. Chosen style changes how sessions behave.

## FileMaker Username And Password

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

Behavior:

- uses `DatabaseSessionPool`
- opens sessions on demand
- reuses sessions for concurrent requests
- default pool size comes from `sessionPoolSize` or library default

Use this when:

- standard server account available
- app may perform concurrent requests
- external source credentials needed

## Token Login

```ts
const database = host.database({
  database: "Contacts",
  credentials: {
    method: "token",
    token: process.env.FILEMAKER_TOKEN!
  },
  externalSources: []
})
```

Behavior:

- uses one long-lived session wrapper
- good when you already manage token issuance elsewhere

## OAuth Login

```ts
const database = host.database({
  database: "Contacts",
  credentials: {
    method: "oauth",
    oauth: {
      requestId: "...",
      requestIdentifier: "..."
    }
  },
  externalSources: []
})
```

Behavior:

- uses constant single session
- intended for Data API OAuth flow

## Claris Login

```ts
const database = host.database({
  database: "Contacts",
  credentials: {
    method: "claris",
    claris: {
      fmid: "..."
    }
  },
  externalSources: []
})
```

Behavior:

- also uses constant single session

## External Sources

`externalSources` only works with `filemaker` login mode.

If you pass external sources with other auth methods, library throws.

## Closing Connections

Call `close()` when app shuts down or work finishes:

```ts
await database.close()
```

Also available:

```ts
await database.logout()
```

Why this matters:

- logs out FileMaker sessions cleanly
- stops new sessions opening
- helps scripts, jobs, and tests exit cleanly

## Session Pool Size

For `filemaker` credentials:

```ts
credentials: {
  method: "filemaker",
  username: "api-user",
  password: "secret",
  sessionPoolSize: 4
}
```

Increase when:

- many concurrent requests
- API worker handles many jobs in parallel

Keep lower when:

- server session budget tight
- workload mostly serial

## Failure Behavior

If pooled request gets HTTP `401`, pool retries with fresh session.

Practical meaning:

- expired or invalid session can recover automatically
- auth config problems still fail normally
