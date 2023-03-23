# easy-fm

Making NodeJS + FileMaker easier than ever

easy-fm is a Node.js module that allows you to interact with
a [FileMaker database](https://www.claris.com/filemaker/) stored on
a [FileMaker server](https://www.claris.com/filemaker/server/)
or [FileMaker Cloud](https://store.claris.com/filemaker-cloud). This module interacts with your server using the
[FileMaker Data API](https://help.claris.com/en/data-api-guide/content/index.html).

## FileMaker setup instructions

1. Enable the FileMaker Data API from the server's admin console. This setting is located
   in `Connectors > FileMaker Data API`.
2. Create a FileMaker database account for easy-fm to use. This account must have the 'Access via FileMaker Data API (
   fmrest)' extended privilege

---

## Before you begin

- You need to know what your server's UTC time offset (in minutes) is.
  - Running `0 - (new Date()).getTimezoneOffset()` in javascript will the UTC time offset for your current timezone.


## Connecting to a database

easy-fm currently does not support connecting to external data sources, or authenticating by any method other than plain
FileMaker authentication.

```javascript
import FMHost, {FMError} from "easy-fm"; // Import the module
const host = new FMHost(
    "https://<your-servers-address>",
    700 // Timezone offset
)
const database = host.database({
    database: "your_database.fmp12",
    credentials: {
        method: "filemaker",
        username: "<username>",
        password: "<password>"
    }
})

database.login().then(() => {
    // Record operations can only be performed after a successful login
})
```

> **NOTE:** A connection will only give you access to the layouts in the database you are connected to, and not the
> layouts
> in
> the external sources that you have specified.
>
> If you need to interact with layouts on multiple databases, you need to open one connection per database.

## Getting records

One of (if not the) most common interactions you'll need to use is fetching records.

### Fetch a range of records

```javascript
let layout = database.getLayout("Your layout name")
let range_request = layout.records.range()

range_request.setOffset(50) // Starting from the 50th record...
range_request.setLimit(100) // Fetch 100 records

let records = await range_request.run()
console.log(records)
```

### Searching for records

```javascript
let layout = database.getLayout("Your layout name")
let find_request = layout.records.find()

find_request.addRequests({"GroupID": "abc"}) // Find only the records with field GroupID set to 'abc'
find_request.setOffset(30) // Starting from the 30th matching record
find_request.setLimit(10) // Fetch only 10 records

let records = await range_request.run()
console.log(records)
```

### Fetch a record using its record ID

> Please note: When in FileMaker Pro, a record's ID is returned when using Get(RecordID). If you need to fetch a record
> using a different ID, use the search method above.

```javascript
let layout = database.getLayout("Your layout name")
let record = await layout.records.get(164)
console.log(record)
```

### Create a record

```javascript
let layout = database.getLayout("Your layout name")
let record = await layout.records.create()

record.getField("Field1").set("Value here")
record.getField("Field2").set("Value here")
record.getField("Field3").set("Value here")

await record.commit()
```

### Modify a record

```javascript
let layout = database.getLayout("Your layout name")
let record = await layout.records.get(164)

record.getField("Field1").set("Value here")
record.getField("Field2").set("Value here")
record.getField("Field3").set("Value here")

await record.commit()
```

# Documentation

## FMHost

`hostname`: string
> The hostname of the server you are connecting to

`timezoneOffset`: number
> The server's timezone offset