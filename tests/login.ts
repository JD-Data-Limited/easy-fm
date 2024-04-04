/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {after, before, describe, it} from 'node:test'
import {equal, notEqual} from 'node:assert'
import {DATABASE, HOST} from './connectionDetails.js'
import {asTime, type Field, type Layout, type LayoutRecord, type Portal, query} from '../src/index.js'
import * as moment from 'moment'

describe('Fetch host data', () => {
    it('Able to get host metadata', async () => {
        await HOST.getMetadata()
    })
})

describe('Database interactions', () => {
    const testLayoutName = 'EasyFMBenchmark'
    let testLayout: Layout<{
        fields: never
        portals: {
            test: Portal<{
                field1: Field<string>
            }>
        }
    }>
    const testField = 'OneVeryLongField'
    let record: LayoutRecord<any>

    before(async () => {
        const token = await DATABASE.login()
        console.log('TOKEN:', token)
        equal(typeof token, 'string')
    })

    it('List layouts', async () => {
        await DATABASE.listLayouts()
    })

    it('Fetch layout metadata', async () => {
        testLayout = DATABASE.getLayout(testLayoutName)
        await testLayout.getLayoutMeta()
    })

    it('Fetch first 999 records', async () => {
        const range = testLayout.records.list({portals: {}})
        const records = await range.fetch()
        record = records[0]
    })

    it('Fetch first 999 records, with a portal', async () => {
        const range = testLayout.records.list({portals: {test: {limit: 10, offset: 1}}, limit: 999})
        const records = await range.fetch()
        record = records[0]
    })

    const randomRecord = Math.floor(Math.random() * 500) + 1
    it(`Iterate through 500 records, starting at record ${randomRecord} (changes randomly)`, async () => {
        const records = testLayout.records.list({portals: {}, limit: 500, offset: randomRecord})
        let recordCount = 0
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const record of records) {
            recordCount += 1
        }

        equal(recordCount, 500)
    })

    it('Create a record', async () => {
        const record = await testLayout.records.create({portals: []})
        await record.commit()
    })

    it('Fetch a single record', async () => {
        await record.get()
    })

    it('Modify first record', async () => {
        record.fields[testField].set(Math.random())
        await record.commit()
    })

    it('Perform a search for a single record', async () => {
        const search = testLayout.records.list({portals: {}, limit: 1})
        search.addRequest({
            PrimaryKey: query`=${record.fields.PrimaryKey.value}`
        })
        const records = await search.fetch()
        equal(records.length, 1)
    })

    it('Perform a search for many records', async () => {
        const search = testLayout.records.list({portals: {}, limit: 10})
        search.addRequest({
            CreationTimestamp: query`>1/01/1978 *:*:*`
        })
        const records = await search.fetch()
        notEqual(records.length, 0)
    })

    it('Duplicate first record', async () => {
        console.log('HERE!')
        await record.duplicate()
    })

    it('Delete first record', async () => {
        await record.delete()
    })

    it('Check query escaping', async () => {
        const records = await testLayout.records.list({portals: {}, limit: 10})
            .addRequest({
                OneVeryLongField: query`=${'*'}`
            })
            .fetch()
        equal(
            records.length,
            0,
            'Query escaping/sanitization failed. Generated query that failed: ' + JSON.stringify(query`=${'*'}`)
        )
    })

    it('Check query escaping using iterable search', async () => {
        const records = testLayout.records.list({portals: {}, limit: 10})
            .addRequest({
                OneVeryLongField: query`=${'*'}`
            })
        let foundCount = 0
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const record of records) {
            foundCount += 1
        }
        equal(
            foundCount,
            0,
            'Query escaping/sanitization failed. Generated query that failed: ' + JSON.stringify(query`=${'*'}`)
        )
    })

    it('Test searching based on timestamps', async () => {
        const records = testLayout.records.list({portals: {}, limit: 10})
            .addRequest({
                CreationTimestamp: query`=${asTime(moment.default())}`
            })
        let foundCount = 0
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const record of records) {
            foundCount += 1
        }
        equal(
            foundCount,
            0,
            'Query escaping/sanitization failed. Generated query that failed: ' + JSON.stringify(query`=${'*'}`)
        )
    })

    after(async () => {
        await DATABASE.logout()
    })
})
