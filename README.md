# easy-fm

Making NodeJS + FileMaker easier than ever

easy-fm is a Node.js module that allows you to interact with
a [FileMaker database](https://www.claris.com/filemaker/) stored on
a [FileMaker server](https://www.claris.com/filemaker/server/)
or [FileMaker Cloud](https://store.claris.com/filemaker-cloud). This module interacts with your server using the
[FileMaker Data API](https://help.claris.com/en/data-api-guide/content/index.html).
<!-- TOC -->
* [easy-fm](#easy-fm)
  * [FileMaker setup instructions](#filemaker-setup-instructions)
  * [Before you begin](#before-you-begin)
  * [Connecting to a database](#connecting-to-a-database)
  * [Getting records](#getting-records)
    * [Fetch a range of records](#fetch-a-range-of-records)
    * [Searching for records](#searching-for-records)
    * [Fetch a record using its record ID (NOT RECOMMENDED)](#fetch-a-record-using-its-record-id-not-recommended)
    * [Create a record](#create-a-record)
    * [Modify a record](#modify-a-record)
* [Field names](#field-names)
* [Portal names](#portal-names)
* [Typescript Implementation](#typescript-implementation)
<!-- TOC -->
## FileMaker setup instructions

1. Enable the FileMaker Data API from the server's admin console. This setting is located
   in `Connectors > FileMaker Data API`.
2. Create a FileMaker database account for easy-fm to use. This account must have the 'Access via FileMaker Data API (
   fmrest)' extended privilege

---

## Before you begin

- You need to know what your server's UTC time offset (in minutes) is.
    - Running `0 - (new Date()).getTimezoneOffset()` in javascript will give you the UTC time offset for your current timezone.

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
    },
    externalSources: []
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

let records = await range_request.fetch()
console.log(records)
```

### Searching for records

```javascript
let layout = database.getLayout("Your layout name")
let find_request = layout.records.find()

find_request.addRequests({"GroupID": "abc"}) // Find only the records with field GroupID set to 'abc'
find_request.setOffset(30) // Starting from the 30th matching record
find_request.setLimit(10) // Fetch only 10 records

let records = await range_request.fetch()
console.log(records)
```

### Fetch a record using its record ID (NOT RECOMMENDED)

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

record.fields["Field1"].value = "Value here"
record.fields["Field2"].value = "Value here"
record.fields["Field3"].value = "Value here"

await record.commit()
```

### Modify a record

```javascript
let layout = database.getLayout("Your layout name")
let record = await layout.records.get(164)

record.fields["Field1"].value = "Value here"
record.fields["Field2"].value = "Value here"
record.fields["Field3"].value = "Value here"

await record.commit()
```

# Field names

When interacting with FileMaker, it is important to remember how FileMaker field names work.

| Field name format             | Use when....                                                                                        |
|-------------------------------|-----------------------------------------------------------------------------------------------------|
| `FieldName`                   | Use this when the field you are accessing is in the same table that the layout has been assigned to |
| `RelatedTableName::FieldName` | Use this when the field **is not** in the same table that the layout has been assigned to           |

> **NOTE:** You will not be able to access any fields that are not on the layout.

# Portal names

> Please read this section carefully if you are working with portals

It is important to note that a portal's name **is not** the same as the name of the table that it links to. The name of a
portal matches the object name it was assigned in FileMaker's layout editor.

> **NOTE**: When no name has been manually assigned to it, it will default to the name of the related table.

# Typescript Implementation

`easy-fm` supports the use of TypeScript. Here's an example of how this works with `easy-fm`:

```typescript
import FMHost, {Portal, Field, Container} from "@jd-data-limited/easy-fm";

interface UsersLayout {
    fields: {
        // Map each field on the layout to a field type.
        first_name: Field<string>
        age: Field<number>
        birthdate: Field<Date>
        profile_picture: Field<Container>
        "MyRelatedTable::MyRelatedField": Field<string>
    },
    portals: {
        Files: {
            "Files::Field1": Field<string>
        }
    }
}

interface DatabaseStructure {
    layouts: {
        users: UsersLayout
    }
}

const host = new FMHost("https://example_filemaker_server.com")
const database = host.database<DatabaseStructure>({
    database: "ExampleDatabase.fmp12",
    credentials: {method: "filemaker", username: "test", passsword: "test"},
    externalSources: []
})
await database.login()

const layout = database.getLayout("users") // The UsersLayout interface will be automatically applied to all records within this layout
const record = await layout.records.create()
record.fields["first_name"].value = "Joe"
record.fields["age"].value = 38
```