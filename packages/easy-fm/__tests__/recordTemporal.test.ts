/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {Temporal} from 'temporal-polyfill'
import {RecordGetOperation} from '../dist/records/getOperations/recordGetOperation.js'
import {DateField, TimeField, TimeStampField} from '../dist/records/fields/valueField.js'
import {query} from '../dist/utils/query.js'
import {type LayoutInterface} from '../dist/layouts/layoutInterface.js'
import {Layout} from '../dist/layouts/layout.js'

interface SimulatedLayout extends LayoutInterface {
    fields: {
        Date: DateField
        Time: TimeField
        Timestamp: TimeStampField
    }
    portals: Record<PropertyKey, never>
}

const fieldMetadata = (name: string, result: 'date' | 'time' | 'timeStamp') => ({
    name,
    type: 'normal' as const,
    displayType: 'editText' as const,
    result,
    global: false,
    autoEnter: false,
    fourDigitYear: true,
    maxRepeat: 1,
    maxCharacters: 0,
    notEmpty: false,
    numeric: false,
    repetitionStart: 1,
    repetitionEnd: 1,
    timeOfDay: result === 'time',
    valueList: ''
})

function createLayout () {
    const execute = jest.fn() as jest.Mock<Promise<any>, [any]>
    execute.mockResolvedValue({value: [], binding: {id: Symbol('test')}})
    const database: any = {
        dateFormat: 'dd-MM-yyyy',
        timeFormat: 'ss.mm.HH',
        timeStampFormat: 'yyyy[MM][dd] HH|mm|ss',
        execute
    }
    const layout = new Layout(database, 'Test') as Layout<SimulatedLayout>
    layout.metadata = {
            fieldMetaData: [
                fieldMetadata('Date', 'date'),
                fieldMetadata('Time', 'time'),
                fieldMetadata('Timestamp', 'timeStamp')
            ],
            portalMetaData: {}
    }
    return {layout, execute}
}

describe('Temporal record behavior', () => {
    it('deserializes fetched date, time, and timestamp fields', async () => {
        const {layout, execute} = createLayout()
        execute.mockResolvedValueOnce({
            value: [{
                recordId: '10',
                modId: '3',
                fieldData: {
                    Date: '02-09-2026',
                    Time: '06.05.04',
                    Timestamp: '2026[09][02] 04|05|06'
                },
                portalData: {}
            }],
            binding: {id: Symbol('test')}
        })
        const records = await layout.records.list({portals: {}, limit: 1}).fetch()
        const [record] = records

        expect(execute).toHaveBeenCalledWith(expect.objectContaining({type: 'record.list', layout: 'Test'}))
        expect(record).toBeDefined()

        expect(record.fields.Date).toBeInstanceOf(DateField)
        expect(record.fields.Date.value).toBeInstanceOf(Temporal.PlainDate)
        expect(record.fields.Date.value?.toString()).toBe('2026-09-02')
        expect(record.fields.Time).toBeInstanceOf(TimeField)
        expect(record.fields.Time.value).toBeInstanceOf(Temporal.PlainTime)
        expect(record.fields.Time.value?.toString()).toBe('04:05:06')
        expect(record.fields.Timestamp).toBeInstanceOf(TimeStampField)
        expect(record.fields.Timestamp.value).toBeInstanceOf(Temporal.PlainDateTime)
        expect(record.fields.Timestamp.value?.toString()).toBe('2026-09-02T04:05:06')
        expect(record.modId).toBe(3)
        expect(record.edited).toBe(false)
    })

    it('serializes date, time, and timestamp fields when committing a record', async () => {
        const {layout, execute} = createLayout()
        execute.mockResolvedValueOnce({value: {recordId: '10', modId: '3'}, binding: {id: Symbol('test')}})
        const record = await layout.records.create({portals: []})

        record.fields.Date.set(Temporal.PlainDate.from('2030-12-31'))
        record.fields.Time.set(Temporal.PlainTime.from('23:58:57'))
        record.fields.Timestamp.set(Temporal.PlainDateTime.from('2031-01-02T03:04:05'))

        expect(record.edited).toBe(true)
        await record.commit()

        expect(execute).toHaveBeenCalledTimes(1)
        const [operation] = execute.mock.calls[0]
        expect(operation.type).toBe('record.create')
        expect(operation.body).toEqual({
            fieldData: {
                Date: '31-12-2030',
                Time: '57.58.23',
                Timestamp: '2031[01][02] 03|04|05'
            },
            portalData: {}
        })
        expect(record.modId).toBe(3)
        expect(record.edited).toBe(false)
    })

    it('marks Temporal values clean after a save without changing their values', async () => {
        const {layout} = createLayout()
        const record = await layout.records.create({portals: []})
        const updated = Temporal.PlainDate.from('2030-12-31')

        record.fields.Date.set(updated)
        record._onSave()

        expect(record.edited).toBe(false)
        expect(record.fields.Date.value?.equals(updated)).toBe(true)
        expect(record.fieldsToObject().fieldData).toEqual({})
    })

    it('formats Temporal find parameters in the request body using host formats', async () => {
        const {layout, execute} = createLayout()
        const operation = new RecordGetOperation(layout, {portals: {}})
            .addRequest({
                Date: query`=${Temporal.PlainDate.from('2030-12-31')}`,
                Time: query`>${Temporal.PlainTime.from('23:58:57')}`,
                Timestamp: query`<=${Temporal.PlainDateTime.from('2031-01-02T03:04:05')}`
            })

        await operation.fetch()

        expect(execute).toHaveBeenCalledTimes(1)
        const [request] = execute.mock.calls[0]
        expect(request).toMatchObject({
            type: 'record.list',
            query: [{fields: {
                Date: '=31-12-2030',
                Time: '>57.58.23',
                Timestamp: '<=2031[01][02] 03|04|05'
            }}]
        })
    })
})
