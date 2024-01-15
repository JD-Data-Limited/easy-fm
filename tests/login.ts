/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {after, before, describe, it} from "node:test"
import {equal, notEqual} from "node:assert"
import {DATABASE, HOST} from "./connectionDetails.js";
import {Layout, LayoutRecord} from "../src";

describe("Fetch host data", () => {
    it("Able to get host metadata", async () => {
        console.log(await HOST.getMetadata())
    })

    // it("Able to login to list databases", async (t) => {
    //     console.log(await HOST.listDatabases())
    // })
})

describe("Database interactions", () => {
    let testLayoutName = "EasyFMBenchmark"
    let testLayout: Layout<any>
    let testField = "OneVeryLongField"
    let record: LayoutRecord<any, any>

    before(async () => {
        let token = await DATABASE.login()
        console.log(token)
        equal(typeof token, "string")
    })

    it("List layouts", async () => {
        await DATABASE.listLayouts();
    })

    it("Fetch layout metadata", async () => {
        testLayout = DATABASE.getLayout(testLayoutName)
        await testLayout.getLayoutMeta()
    })

    it("Fetch first 999 records", async () => {
        let range = testLayout.records.query({portals: {}})
        let records = await range.fetch()
        record = records[0]
    })

    it("Fetch first 999 records, with a portal", async () => {
        let range = testLayout.records.query({portals: {test: {limit: 10, offset: 1}}, limit: 999})
        let records = await range.fetch()
        record = records[0]
    })

    let randomRecord = Math.floor(Math.random() * 500) + 1
    it (`Iterate through 500 records, starting at record ${randomRecord} (changes randomly)`, async () => {
        let records = testLayout.records.query({portals: {}, limit: 500, offset: randomRecord})
        let recordCount = 0
        for await (let record of records) {recordCount += 1}

        equal(recordCount, 500)
    })

    it("Create a record", async () => {
        let record = await testLayout.records.create({portals: []})
        await record.commit()
    })

    it("Modify first record", async () => {
        record.fields[testField].set(Math.random())
        await record.commit()
    })

    it("Perform a search for a single record", async () => {
        let search = testLayout.records.query({portals: {}, limit: 1})
        search.find({
            PrimaryKey: "=" + record.fields.PrimaryKey.value
        })
        let records = await search.fetch()
        equal(records.length, 1)
    })

    it("Perform a search for many records", async () => {
        let search = testLayout.records.query({portals: {}, limit: 10})
        search.find({
            CreationTimestamp: ">1/01/1978 *:*:*"
        })
        let records = await search.fetch()
        notEqual(records.length, 0)
    })

    it("Duplicate first record", async () => {
        await record.duplicate()
    })

    it("Delete first record", async () => {
        await record.delete()
    })

    after(async () => {
        await DATABASE.logout()
    })
})
