# Upgrading from v4 to v5

Several key functionalities of `easy-fm` have changed in v5. This document will walk you through the changes, and how
you need to update your code.

## Breaking changes:

### Runtime

- Minimum Node.js version has changed from `Node 20` to `Node 22`

### Session Management

- Session lifecycle management has been re-worked. See [Session Pooling](#session-pooling).
    - `database.login()` is now a no-op and deprecated. Calling this function will simply return a promise that resolves
      immediately. This is superseded by newer session management mechanics.
    - `database.logout()` and `database.close()` now close all open database sessions.
    - Username/password authenticated sessions now use session pooling. See [Session Pooling](#session-pooling).

### Data types

[//]: # (TODO: Create described section)

- Field types have been re-designed. For example, `Field<string>` has been replaced with `TextField`. See ... for more
  info
- `moment` is no longer used to handle dates, times, or timestamps. See [Temporal Data](#temporal-data)
    - `asDate`, `asTime`, and `asTimestamp` are now deprecated
    - Timestamp fields now use `Temporal.PlainDateTime` instead of `moment`/`Date`
    - Date fields now use `Temporal.PlainDate` instead of `moment`/`Date`
    - Time fields now use `Temporal.PlainTime` instead of `moment`/`Date`
    - `FMHost` no longer accepts a timezone conversion function
    - See [Temporal Data](#temporal-data) for more information

### Data handling and validation

- `ContainerField.webStream()` now returns a standard Fetch API [
  `Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object.
- `ContainerField.stream()` is now marked deprecated in favour of `webStream()`.
- EasyFM now uses Zod to verify responses from FileMaker are in the expected format.
- EasyFM now prohibits modification of calculation and summary fields before reaching FileMaker.
- External data sources are specifically limited to username/password

---

## Session Pooling

EasyFM v5 introduces session pooling. Session pooling allows you to make use of multiple asynchronous FileMaker Data API
sessions to retreive data. In situations where you're dispatching a lot of queries in rapid succession, this can improve
speeds.

Session pooling is enabled by default for username/password connections. No changes required.

This new feature is only available for connections that use username/password authentication, and requires no syntax
change from v4. EasyFM defaults to a session pool size of 8, though this can be adjusted by defining `sessionPoolSize`
in your connection credentials.

```typescript
import {FMHost} from "@jd-data-limited/easy-fm"

const host = new FMHost("https://<your-servers-address>")
const database = host.database({
    database: "your_database.fmp12",
    credentials: {
        method: "filemaker",
        username: "<username>",
        password: "<password>",
        sessionPoolSize: 8 // optional
    },
    externalSources: []
})
```

As a part of this, `database.login()` has been deprecated. You do not need to remove existing calls to
`database.login()` immediately. The method remains available for compatibility, but no longer establishes a FileMaker
session. New code should omit the call.

## Data Types

To improve your abiity to catch errors early, understand the funcitonal differences between each field type, and to
unlock flexibility, we've changed how fields are handled and how you define layout schema.

**Previously in v4,** all fields were classified under the generic `Field<DATA_TYPE>` class. This meant that every field
had the same methods and same class prototype under the hood. Even if those methods were not usable in all cases.

**In v5,** `Field<DATA_TYPE>` was renamed to `BaseField<DATA_TYPE>`. With each different type of field being its own
class that extends from `BaseField`. This includes:

- `TextField` extends `ValueField` extends `BaseField`
- `NumberField` extends `ValueField` extends `BaseField`
- `TimeStampField` extends `ValueField` extends `BaseField`
- `TimeField` extends `ValueField` extends `BaseField`
- `DateField` extends `ValueField` extends `BaseField`
- `ContainerField` extends `BaseField`

> `ValueField` refers to fields with values that are directly read/writable and do not require and specialised
> operations.

Field itself has been re-purposed and is now a union-type of all of these top-level classes.

### What does this mean?

Previously in v4, you may have defined a layout's schema like so:

```typescript
import {type Field, type LayoutInterface} from "@jd-data-limited/easy-fm"

interface MyLayout extends LayoutInterface {
    fields: {
        fieldA: Field<string>,
        fieldB: Field<number>,
        date: Field<Date>
        time: Field<Date>
        timestamp: Field<Date>
        // ...
    },
    portals: {
        myPortal: {
            "RelatedTable::fieldA": Field<string>,
            "RelatedTable::fieldB": Field<number>,
            "RelatedTable::date": Field<Date>
            "RelatedTable::time": Field<Date>
            "RelatedTable::timestamp": Field<Date>
            // ...
        }
    }
}
```

In v5, that same schema now looks like:

```typescript
import {
    type TextField,
    type NumberField,
    type DateField,
    type TimeField,
    type TimeStampField,
    type LayoutInterface
} from "@jd-data-limited/easy-fm"

interface MyLayout extends LayoutInterface {
    fields: {
        fieldA: TextField,
        fieldB: NumberField,
        date: DateField
        time: TimeField
        timestamp: TimeStampField
        // ...
    },
    portals: {
        myPortal: {
            "RelatedTable::fieldA": TextField,
            "RelatedTable::fieldB": NumberField,
            "RelatedTable::date": DateField
            "RelatedTable::time": TimeField
            "RelatedTable::timestamp": TimeStampField
            // ...
        }
    }
}
```

Conversion cheatsheet:

| v4                                      | v5               |
|-----------------------------------------|------------------|
| `Field<string>`                         | `TextField`      |
| `Field<number>`                         | `NumberField`    |
| `Field<Date>` for a FileMaker timestamp | `TimeStampField` |
| `Field<Date>` for a FileMaker time      | `TimeField`      |
| `Field<Date>` for a FileMaker date      | `DateField`      |
| `Field<Container>`                      | `ContainerField` |

## Temporal Data

FileMaker does not store timezone information with dates, times, or timestamps. A timestamp such as
`2026-09-23 14:30:00` therefore represents a local date and time, rather than an unambiguous instant in time.

FileMaker does not normalize timestamp values to a common timezone when storing them, so EasyFM cannot reliably
determine which timezone a value was intended to represent, or convert it to another timezone without making assumptions
about the original timezone.

Previous versions of EasyFM attempted to account for this using `moment`, including support for timezone conversion
between FileMaker and EasyFM.

Moment is now considered a legacy project in maintenance mode, and JavaScript's newer Temporal API provides types that
more closely match FileMaker's underlying data model. EasyFM v5 therefore replaces `moment` with Temporal. Temporal is
natively supported as of Node.js 26 and polyfilled by EasyFM for supported earlier Node.js versions.

**EasyFM no longer performs implicit timezone conversions.** FileMaker values are instead represented as:

* Date fields → `Temporal.PlainDate`
* Time fields → `Temporal.PlainTime`
* Timestamp fields → `Temporal.PlainDateTime`

These types deliberately do not contain timezone information. This preserves the value provided by FileMaker without
EasyFM making assumptions about the timezone in which it should be interpreted.

### What does this mean for your code?

- `FMHost` no longer allows you to define timezone-conversion function in its constructor
- Time, date, and timestamp fields that were previously represented with `Field<Date>` are now represented with:
    - `TimeStampField`
    - `TimeField`
    - `DateField`
- And finally, the `.value` properties of these fields are now Temporal objects and not Dates. This means that (for
  example) instead of simply doing `field.value.toISOString()`, you may need to do something like:

```typescript
const instant = field.value
    .toZonedDateTime("Pacific/Auckland")
    .toInstant()

console.log(instant.toString()) // "2026-09-23T02:30:00Z"
```

If a FileMaker timestamp represents a specific instant in your application, your application is responsible for applying
the appropriate timezone and converting it to a `Temporal.ZonedDateTime` or `Temporal.Instant` as required.
