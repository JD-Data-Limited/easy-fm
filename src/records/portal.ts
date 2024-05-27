/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {PortalRecord} from './portalRecord.js'
import {type RecordFieldsMap} from '../layouts/recordFieldsMap.js'
import {type PortalBase} from './portalBase.js'
import {type LayoutRecord} from './layoutRecord.js'

/**
 * Represents a portal.
 *
 * @template T - The type of RecordFieldsMap.
 * @class
 * @implements {PortalBase<T>}
 */
export class Portal<T extends RecordFieldsMap> implements PortalBase<T> {
    readonly record: LayoutRecord<any>
    readonly name: string
    public records: Array<PortalRecord<T>> = []

    constructor (record: LayoutRecord<any>, name: string) {
        this.record = record
        this.name = name
    }

    /**
     * Add a new record to the portal
     * @function create
     * @async
     * @summary Creates a new record.
     * @returns {Promise<PortalRecord<T>>} A Promise that resolves to the newly created record.
     */
    async create () {
        const fields: Record<string, string> = {}
        for (const _field of (await this.record.layout.getLayoutMeta()).portalMetaData[this.name]) {
            fields[_field.name] = ''
        }
        const record = new PortalRecord<T>(this.record, this, -1, -1, fields)
        this.records.push(record)
        return record
    }
}
