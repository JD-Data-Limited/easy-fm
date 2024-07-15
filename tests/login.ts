/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {after, before, describe, it} from 'node:test'
import * as assert from 'node:assert'
import {equal, notEqual} from 'node:assert'
import {DATABASE, type DatabaseSchema, HOST} from './connectionDetails.js'
import {asDate, asTime, asTimestamp, type Layout, type LayoutRecord, type PickPortals, query} from '../src/index.js'
import * as moment from 'moment'

describe('Fetch host data', () => {
    it('Able to get host metadata', async () => {
        await HOST.getMetadata()
    })
})

describe('Database interactions', () => {
    const testLayoutName = 'EasyFMBenchmark'
    let testLayout: Layout<DatabaseSchema['layouts']['EasyFMBenchmark']>
    const testField = 'OneVeryLongField'
    let record: LayoutRecord<
    PickPortals<DatabaseSchema['layouts']['EasyFMBenchmark'], never>
    >

    before(async () => {
        const token = await DATABASE.login()
        console.log('TOKEN:', token)
        equal(typeof token, 'string')
    })

    it('List layouts', async () => {
        await DATABASE.listLayouts()
    })

    it('Fetch layout metadata', async () => {
        testLayout = DATABASE.layout(testLayoutName)
        await testLayout.getLayoutMeta()
    })

    describe('Queries', () => {
        it('Fetch first 999 records', async () => {
            const range = testLayout.records.list({portals: {}})
            await range.fetch()
        })

        it('Fetch first 999 records, with a portal', async () => {
            const range = testLayout.records.list({portals: {test: {limit: 10, offset: 1}}, limit: 999})
            await range.fetch()
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

        it('Test searching based on times', async () => {
            const records = testLayout.records.list({portals: {}, limit: 10})
                .addRequest({
                    CreationTimestamp: query`=${asTime(moment.default())}`
                })
            let foundCount = 0
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const record of records) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                foundCount += 1
            }
        })

        it('Test searching based on dates', async () => {
            const records = testLayout.records.list({portals: {}, limit: 10})
                .addRequest({
                    CreationTimestamp: query`=${asDate(moment.default())}`
                })
            let foundCount = 0
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const record of records) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                foundCount += 1
            }
        })

        it('Test searching based on timestamps', async () => {
            const records = testLayout.records.list({portals: {}, limit: 10})
                .addRequest({
                    CreationTimestamp: query`=${asTimestamp(moment.default())}`
                })
            let foundCount = 0
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const record of records) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                foundCount += 1
            }
        })
    })

    it('Create a record', async () => {
        record = await testLayout.records.create({portals: []})
        await record.commit()
    })

    it('Fetch a single record', async () => {
        await record.get()
    })

    it('Modify first record', async () => {
        record.fields[testField].set(Math.random().toString())
        await record.commit()
    })

    it('Attempt to commit invalid data', async () => {
        await assert.rejects(async () => {
            record.fields.AVeryStrictField.set('12')
            await record.commit()
        })
    })

    it('Attempt to commit invalid data (with override)', async () => {
        record.fields.AVeryStrictField.set('12')
        await record.commit({
            options: {entrymode: 'script'}
        })

        after(async () => {
            // Remove the invalid data
            record.fields.AVeryStrictField.set('')
            await record.commit()
        })
    })

    it('Perform a search for a single record', async () => {
        const search = testLayout.records.list({portals: {}, limit: 1})
        search.addRequest({
            PrimaryKey: query`=${record.fields.PrimaryKey.value ?? ''}`
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
        console.log(record.recordId)
        const duplicateRecord = await record.duplicate()
        console.log(duplicateRecord.recordId)
        // Delete duplicate
        await duplicateRecord.delete()
    })

    describe('Containers', () => {
        it('Test uploading', async () => {
            const file = new File(
                [new TextEncoder()
                    .encode(JSON.stringify(new Array(1_000_000).fill(null)))
                ],
                'file.json',
                {type: 'application/json'}
            )
            await record.fields.Container.upload(file)
        })

        it('Re-fetch record', async () => {
            await record.get()
        })

        it('Test downloading as a buffer', async () => {
            await record.fields.Container.arrayBuffer()
        })

        it('Test downloading as a stream (NodeJS readable stream)', async () => {
            await record.fields.Container.stream()
            // return new Promise<void>((resolve, reject) => {
            //     stream.on("error", (e) => reject(e))
            //     stream.on("end", () => resolve())
            // })
        })
    })

    it('Delete first record', async () => {
        await record.delete()
    })

    after(async () => {
        await DATABASE.logout()
    })
})
