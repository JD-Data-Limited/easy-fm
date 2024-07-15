/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {EventEmitter} from 'events'
import * as moment from 'moment'
import {type Moment} from 'moment'
import {RecordTypes} from '../types.js'
import {type RecordFieldsMap} from '../layouts/recordFieldsMap.js'
import {type LayoutBase} from '../layouts/layoutBase.js'
import {type ApiFieldData} from '../models/apiResults.js'
import {Field, type FieldValue} from './field.js'

export abstract class RecordBase<T extends RecordFieldsMap> extends EventEmitter {
    readonly layout: LayoutBase
    readonly type: RecordTypes = RecordTypes.UNKNOWN
    public recordId: number
    modId: number
    /**
     * An object containing each field in this record.
     *
     * @template T - The type of the field.
     */
    fields: T
    protected portalData: any[] = []

    protected constructor (layout: LayoutBase, recordId: number, modId = recordId, fieldData: ApiFieldData) {
        super()
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
        this.fields = this.processFieldData(fieldData)
    }

    get endpoint (): string {
        return `${this.layout.endpoint}/records/${this.recordId}`
    }

    /**
     * A boolean indicating whether this record has been modified and should be committed
     *
     * @returns {boolean} A boolean value indicating whether any of the fields have been edited.
     */
    get edited (): boolean {
        return !!this.fieldsArray.find(i => i.edited)
    }

    get fieldsArray (): Array<Field<FieldValue>> {
        return Object.values(this.fields)
    }

    protected processFieldData (fieldData: ApiFieldData) {
        const fields: RecordFieldsMap = {}

        for (const key of Object.keys(fieldData)) {
            const _field = new Field<number | string | Moment>(this, key, fieldData[key])
            if (fieldData[key]) {
                if (_field.metadata.result === 'timeStamp') {
                    let date = moment.default(fieldData[key])
                    date = date
                        .utcOffset(this.layout.database.host.timezoneOffsetFunc(date), true)
                        .local()
                    _field.set(date)
                    _field.edited = false
                } else if (_field.metadata.result === 'time') {
                    let date = moment.default(fieldData[key])
                    date = date
                        .utcOffset(this.layout.database.host.timezoneOffsetFunc(date), true)
                        .local()
                    _field.set(date)
                    _field.edited = false
                } else if (_field.metadata.result === 'date') {
                    let date = moment.default(fieldData[key])
                    date = date
                        .utcOffset(this.layout.database.host.timezoneOffsetFunc(date), true)
                        .local()
                    _field.set(date)
                    _field.edited = false
                }
            }
            fields[key] = _field
        }
        this.fields = fields as T
        return fields as T
    }

    _onSave () {
        this.emit('saved')
        for (const field of this.fieldsArray) field.edited = false
    }
}
