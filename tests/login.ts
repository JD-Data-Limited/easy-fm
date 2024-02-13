/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {after, before, describe, it} from "node:test"
import {equal, notEqual} from "node:assert"
import {DATABASE, HOST} from "./connectionDetails.js";
import {Layout, LayoutRecord, Portal, query} from "../src/index.js";
import {FieldBase} from "../src/records/fieldBase.js";

describe("Fetch host data", () => {
    it("Able to get host metadata", async () => {
        await HOST.getMetadata()
    })
})

describe("Database interactions", () => {
    let testLayoutName = "EasyFMBenchmark"
    let testLayout: Layout<{
        fields: {

        },
        portals: {
            test: Portal<{
                field1: FieldBase<string>
            }>
        }
    }>
    let testField = "OneVeryLongField"
    let record: LayoutRecord<any>

    before(async () => {
        let token = await DATABASE.login()
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
        let range = testLayout.records.list({portals: {}})
        let records = await range.fetch()
        record = records[0]
    })

    it("Fetch first 999 records, with a portal", async () => {
        let range = testLayout.records.list({portals: {test: {limit: 10, offset: 1}}, limit: 999})
        let records = await range.fetch()
        record = records[0]
    })

    let randomRecord = Math.floor(Math.random() * 500) + 1
    it (`Iterate through 500 records, starting at record ${randomRecord} (changes randomly)`, async () => {
        let records = testLayout.records.list({portals: {}, limit: 500, offset: randomRecord})
        let recordCount = 0
        for await (let record of records) {
            recordCount += 1
        }

        equal(recordCount, 500)
    })

    it("Create a record", async () => {
        let record = await testLayout.records.create({portals: []})
        await record.commit()
    })

    it("Fetch a single record", async () => {
        await record.get()
    })

    it("Modify first record", async () => {
        record.fields[testField].set(Math.random())
        await record.commit()
    })

    it("Perform a search for a single record", async () => {
        let search = testLayout.records.list({portals: {}, limit: 1})
        search.addRequest({
            PrimaryKey: "=" + record.fields.PrimaryKey.value
        })
        let records = await search.fetch()
        equal(records.length, 1)
    })

    it("Perform a search for many records", async () => {
        let search = testLayout.records.list({portals: {}, limit: 10})
        search.addRequest({
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

    it("Check query escaping", async () => {
        let records = await testLayout.records.list({portals: {}, limit: 10})
            .addRequest({
                "OneVeryLongField": query`=${"*"}`
            })
            .fetch()
        equal(records.length, 0, "Query escaping/sanitization failed. Generated query that failed: " + query`=${"*"}`)
    })

    it("Check query escaping using iterable search", async () => {
        let records = testLayout.records.list({portals: {}, limit: 10})
            .addRequest({
                "OneVeryLongField": query`=${"*"}`
            })
        let foundCount = 0
        for await (let record of records) {
            foundCount += 1
        }
        equal(foundCount, 0, "Query escaping/sanitization failed. Generated query that failed: " + query`=${"*"}`)
    })

    after(async () => {
        await DATABASE.logout()
    })
})
