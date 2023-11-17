/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {test, describe, it, before, after} from "node:test"
import {strictEqual, equal} from "node:assert"
import {DATABASE, HOST} from "./connectionDetails.js";
import * as assert from "assert";
import {Layout, LayoutRecord} from "../src";

describe("Fetch host data", () => {
    it("Able to get host metadata", async (t) => {
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

    it("List layouts", async (t) => {
        let layouts = await DATABASE.listLayouts()
    })

    it("Fetch layout metadata", async (t) => {
        testLayout = DATABASE.getLayout(testLayoutName)
        await testLayout.getLayoutMeta()
    })

    it("Fetch first 999 records", async (t) => {
        let range = testLayout.records.range(0, 999)
        let records = await range.fetch()
        record = records[0]
        console.log("Records found:", records.length)
    })

    it("Create a record", async (t) => {
        let record = await testLayout.records.create()
        await record.commit()
    })

    it("Modify first record", async (t) => {
        record.fields[testField].set(Math.random())
        await record.commit()
    })

    it("Duplicate first record", async (t) => {
        await record.duplicate()
    })

    it("Delete first record", async (t) => {
        await record.delete()
    })

    after(async () => {
        await DATABASE.logout()
    })
})
