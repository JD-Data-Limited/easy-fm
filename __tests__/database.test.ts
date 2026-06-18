/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {equal, notEqual} from 'node:assert'
import {DATABASE, type DatabaseSchema, HOST} from '../__mocks__/connectionDetails.js'
import {type Layout, type LayoutRecord, type PickPortals, query} from '../dist/index.js'
import {Readable} from 'node:stream'
import {finished} from 'node:stream/promises'

describe('Fetch host data', () => {
    it('Able to get host metadata', async () => {
        await HOST.getMetadata()
    })
})

describe('Database interactions', () => {
    const testLayoutName = 'EasyFMBenchmark'
    let testLayout: Layout<DatabaseSchema['layouts']['EasyFMBenchmark']>
    const testField = 'OneVeryLongField'
    type TestRecord = LayoutRecord<
    PickPortals<DatabaseSchema['layouts']['EasyFMBenchmark'], never>
    >
    const createdRecordIds = new Set<number>()

    async function createTestRecord (): Promise<TestRecord> {
        const record = await testLayout.records.create({portals: []})
        await record.commit()
        createdRecordIds.add(record.recordId)
        return record
    }

    async function deleteTestRecord (record: TestRecord | undefined) {
        if (!record || record.recordId < 0 || !createdRecordIds.has(record.recordId)) return
        createdRecordIds.delete(record.recordId)
        await record.delete()
    }

    // beforeAll(async () => {
    //     const token = await DATABASE.login()
    //     console.log('TOKEN:', token)
    //     equal(typeof token, 'string')
    // })

    it('List layouts', async () => {
        await DATABASE.listLayouts()
    })

    beforeAll(async () => {
        testLayout = DATABASE.layout(testLayoutName)
        await testLayout.getLayoutMeta()
    })

    it('Fetch layout metadata', async () => {
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

        const fixedOffset = 25
        it(`Iterate through 500 records, starting at record ${fixedOffset}`, async () => {
            const records = testLayout.records.list({portals: {}, limit: 500, offset: fixedOffset})
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

    })

    it('Create a record', async () => {
        const record = await createTestRecord()
        equal(record.recordId > 0, true)
        await deleteTestRecord(record)
    })

    it('Fetch a single record', async () => {
        const record = await createTestRecord()
        await record.get()
        await deleteTestRecord(record)
    })

    it('Modify first record', async () => {
        const record = await createTestRecord()
        const newValue = Math.random().toString()
        record.fields[testField].set(newValue)
        await record.commit()
        await record.get()
        equal(record.fields[testField].value, newValue)
        await deleteTestRecord(record)
    })

    it('Attempt to commit invalid data', async () => {
        const record = await createTestRecord()
        await expect((async () => {
            record.fields.AVeryStrictField.set('12')
            await record.commit()
        })()).rejects.toThrow()
        await deleteTestRecord(record)
    })

    it('Attempt to commit invalid data (with override)', async () => {
        const record = await createTestRecord()
        try {
            record.fields.AVeryStrictField.set('12')
            await record.commit({
                options: {entrymode: 'script'}
            })
        } finally {
            // Remove the invalid data
            record.fields.AVeryStrictField.set('')
            await record.commit()
        }
        await deleteTestRecord(record)
    })

    it('Perform a search for a single record', async () => {
        const record = await createTestRecord()
        // Refresh the record
        await record.get()
        const search = testLayout.records.list({portals: {}, limit: 1})
        search.addRequest({
            PrimaryKey: query`=${record.fields.PrimaryKey.value ?? ''}`
        })
        const records = await search.fetch()
        equal(records.length, 1)
        await deleteTestRecord(record)
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
        const record = await createTestRecord()
        console.log(record.recordId)
        const duplicateRecord = await record.duplicate()
        console.log(duplicateRecord.recordId)
        notEqual(duplicateRecord.recordId, record.recordId)
        // Delete duplicate
        createdRecordIds.add(duplicateRecord.recordId)
        await duplicateRecord.delete()
        createdRecordIds.delete(duplicateRecord.recordId)
        await deleteTestRecord(record)
    })

    describe('Containers', () => {
        let record: TestRecord | undefined

        function getRecord () {
            if (!record) throw new Error('Container test record was not created')
            return record
        }

        beforeEach(async () => {
            record = await createTestRecord()
            const file = new File(
                [new TextEncoder()
                    .encode(JSON.stringify(new Array(1_000_000).fill(null)))
                ],
                'file.json',
                {type: 'application/json'}
            )
            await record.fields.Container.upload(file)
            // Refresh the record
            await record.get()
        })

        afterEach(async () => {
            await deleteTestRecord(record)
            record = undefined
        })

        it('Test uploading', async () => {
            const record = getRecord()
            await record.get()
            equal(record.fields.Container.value !== null, true)
        })

        it('Re-fetch record', async () => {
            const record = getRecord()
            await record.get()
            equal(record.fields.Container.value !== null, true)
        })

        it('Test downloading as a buffer', async () => {
            const record = getRecord()
            const contents = await record.fields.Container.arrayBuffer()
            equal(contents.data instanceof ArrayBuffer, true)
            equal(typeof contents.mime, 'string')
        })

        it('Test downloading as a stream (NodeJS readable stream)', async () => {
            const record = getRecord()
            const contents = await record.fields.Container.stream()
            equal(contents.data instanceof Readable, true)
            equal(typeof contents.mime, 'string')
            contents.data.resume()
            await finished(contents.data)
        })
    })

    afterAll(async () => {
        await Promise.allSettled([...createdRecordIds].map(async recordId => {
            const record = await testLayout.records.get(recordId)
            await record.delete()
        }))
        await DATABASE.logout()
    })
})
