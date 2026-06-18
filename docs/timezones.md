# Timezones

Timezones are one of easiest ways to get confused with FileMaker integrations.

## Important Background

Timezone issues show up when the same date or timestamp is viewed in more than one place and those places do not apply the same timezone assumptions.

With FileMaker systems, that usually means:

- FileMaker Pro and related FileMaker UI do not implement timezone-aware behavior in a way developers can rely on
- the same data is often viewed both through this library and through FileMaker UI
- if those two views disagree, users experience that as broken data

`easy-fm` does not force UTC by default.

Instead, it formats outgoing dates and timestamps using timezone offset function attached to `FMHost`.

Default behavior:

```ts
const host = new FMHost("https://example.com")
```

Default offset function uses current runtime timezone offset.

## How It Works In easy-fm

Many `easy-fm` projects also use FileMaker Pro as part of normal operation.

Default behavior is aimed at keeping `easy-fm` results aligned with what users are likely to see in FileMaker UI.

In practice:

- when you pass a `Date` into `record.commit()`, `easy-fm` formats it using host timezone rules
- when you use `asDate`, `asTime`, or `asTimestamp` in a find request, `easy-fm` formats those values using same host timezone rules
- if you do not provide custom offset function, `easy-fm` uses current runtime timezone offset

## When Default Is Fine

Default usually fine when:

- app and FileMaker users share one timezone
- same records are also viewed or edited in FileMaker Pro
- timestamps represent local business time
- server jobs run in same timezone assumptions as users

## When You Should Customize

Customize when:

- app serves users across multiple timezones
- you want timezone behavior that is independent of machine running `easy-fm`
- infrastructure runs in timezone different from business timezone
- you need deterministic formatting regardless of deployment location

## Custom Timezone Offset

Pass second constructor argument to `FMHost`:

```ts
import moment from "moment"
import FMHost from "@jd-data-limited/easy-fm"

const nzOffset = (_value: moment.Moment) => 12 * 60
const host = new FMHost("https://example.com", nzOffset)
```

Function returns offset in minutes.

Library uses it when:

- formatting query values from `asDate`, `asTime`, `asTimestamp`
- formatting edited `Date` values during `record.commit()`

## Practical Advice

- pick one timezone strategy early
- document it for team
- test date and timestamp writes around daylight saving boundaries
- do not assume server timezone and business timezone are same
