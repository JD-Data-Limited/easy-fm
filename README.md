# Introduction

A FileMaker Data API client for NodeJS

easy-fm is a Node.js module that allows you to interact with
a FileMaker database stored on a FileMaker server
or FileMaker Cloud. This module interacts with your server using the
FileMaker Data API.

# Contents

<!-- TOC -->

* [Introduction](#introduction)
* [Contents](#contents)
* [Installation](#installation)
* [Usage](#usage)
    * [Connecting to a database](#connecting-to-a-database)
    * [An important note about timezones](#an-important-note-about-timezones)
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

## What you need

- NodeJS 22+
- FileMaker Server with Data API enabled
- A FileMaker account with the `fmrest` permission enabled
- At least one layout exposed to that account

See the offical documentation from Claris on how to enable the Data API:
https://help.claris.com/en/data-api-guide/content/index.html

# Installation

```npm
npm install @jd-data-limited/easy-fm --save
```

# Quick Start

Here's a quick example of how you can use easy-fm to connect to a FileMaker database and fetch a range of records:

```typescript
import {FMHost} from "@jd-data-limited/easy-fm"

// 1. Define your server's address and connection details
const host = new FMHost("https://<your-servers-address>")
const database = host.database({
    database: "your_database.fmp12",
    credentials: {
        method: "filemaker",
        username: "<username>",
        password: "<password>"
    },
    externalSources: []
})

// 2. Get a list of records from the database
let layout = database.layout("Your layout name")
let query = layout.records.list({
    portals: {},
    limit: 100
})
let records = await query.fetch()

// 3. Iterate through the records and print their values
for (let record of records) {
    console.log(record.fields["Field1"].value)
}

// 4. Make changes to the records
for (let record of records) {
    record.fields["Field1"].value = "New value"
    await record.commit() // <-- This will save the changes to the database
}
```

See: [How to customize timezone](#how-to-customise-timezone)

# Important Behaviour

## Timezones

FileMaker doesn't handle timezones itself. Because of this, by default EasyFM will assume that all timestamps within the
database are stored in the same timezone which EasyFM is running in.
> Unlike most other database tools, EasyFM does not assume UTC. This is intended for user experience and development
> ease should you also be using FileMaker Pro as an interface.

## Portals

To save on bandwidth and request execution time, EasyFM will not fetch any portal data unless you specifically request
it.

## Record and Mod IDs

FileMaker automatically assigns an internal record ID and mod ID to all records. While these may

# Core Concepts

| Name         | Description                                                                                                                     |
|--------------|---------------------------------------------------------------------------------------------------------------------------------|
| Host         | The physical FileMaker Server machine                                                                                           |
| Database     | A database provided by a host                                                                                                   |
| Layout       | A FileMaker layout within a database                                                                                            |
| Record       | A database record                                                                                                               |
| LayoutRecord | A record that exists within the layout/found set                                                                                |
| PortalRecord | A record that exists within a portal in a LayoutRecord                                                                          |
| Record ID    | A unique number assigned by FileMaker to each record.<br />Same as `Get ( RecordID )` in FileMaker.<br />                       |
| Mod ID       | A number that determines how many times a record has been modified.<br />Same as `Get ( RecordModificationCount )` in FileMaker |

# Common Tasks

## Get a layout

```typescript
const layout = database.layout("MyLayout")
const layoutMeta = await layout.getMetadata()
  ```

## Listing Records

To list records, use the `layout.records.list` method.

```typescript
const layout = database.layout("MyLayout")
const query = layout.records.list({
    portals: {},
    limit: 100
})
const records = await query.fetch()
```

## Finding records

To find records, you'll want to use the same API as above with a few extra bits.

> It is recommended that you have an understanding of how Find Requests work in FileMaker.

```typescript
import {query as q} from "@jd-data-limited/easy-fm"

const layout = database.layout("MyLayout")
const query = layout.records.list({
    portals: {},
    requests: {
        req: q`=123`
    },
    limit: 100
})
query.addRequest({
    PrimaryKey: q`=456`
})
const records = await query.fetch()
```

```typescript
import {query as q} from "@jd-data-limited/easy-fm"

const layout = database.layout("MyLayout")
const query = layout.records.list({
    portals: {},
    requests: [{
        req: {
            PrimaryKey: q`=123`
        }
    }],
    limit: 100
})
const records = await query.fetch()
```

## Find records

This section is the same as above, with some extra steps.

```typescript
const query = layout.records.list({
    portals: {},
    limit: 100
})
const records = await query.fetch()
```

# How to customise timezone

WIP

[//]: # TODO: Finish this section()