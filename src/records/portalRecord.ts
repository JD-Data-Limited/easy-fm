/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordBase} from './recordBase.js'
import {type extraBodyOptions, RecordTypes} from '../types.js'

import {type RecordFieldsMap} from '../layouts/recordFieldsMap.js'
import {type PortalBase} from './portalBase.js'
import {type Field, type FieldValue} from './field.js'

/**
 * Represents a PortalRecord, which is a record in a portal within a parent record.
 * @template T - The type of the record's field map.
 */
export class PortalRecord<T extends RecordFieldsMap> extends RecordBase<T> {
    readonly portal: PortalBase<T>
    readonly type = RecordTypes.PORTAL

    constructor (record: RecordBase<any>, portal: PortalBase<any>, recordId: number, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId, fieldData)
        this.portal = portal
    }

    _onSave () {
        super._onSave()
        this.portal.record._onSave()
    }

    /**
     * Commits the parent record, and in turn this one.
     *
     * @param {extraBodyOptions} [extraBody={}] - The optional extra body options.
     * @returns {Promise} - A promise that resolves when the record is committed.
     */
    async commit (extraBody: extraBodyOptions = {}) {
        return await this.portal.record.commit(extraBody)
    }

    toObject (fieldFilter: (a: Field<FieldValue>) => boolean): {
        modId?: string
        recordId?: string
    } & Record<string, string> {
        const res: any = {
            recordId: this.recordId === -1 ? undefined : this.recordId.toString(),
            modId: this.modId === -1 ? undefined : this.modId.toString()
        }
        for (const field of this.fieldsArray.filter(a => fieldFilter(a))) res[field.id] = field.value?.toString()
        // console.log(res)
        return res
    }
}
