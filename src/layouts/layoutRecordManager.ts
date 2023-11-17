/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutRecord} from "../records/layoutRecord.js";
import {LayoutInterface} from "./layoutInterface.js";
import {RecordGetRange} from "../records/getOperations/recordGetRange.js";
import {Find} from "../records/getOperations/find.js";
import {LayoutBase} from "./layoutBase.js"

export class LayoutRecordManager<T extends LayoutInterface> {
    readonly layout: LayoutBase

    constructor(layout: LayoutBase) {
        this.layout = layout
    }

    async create(): Promise<LayoutRecord<T["fields"], T["portals"]>> {
        await this.layout.getLayoutMeta()
        let fields = {}
        for (let _field of this.layout.metadata.fieldMetaData) {
            fields[_field.name] = ""
        }
        let portals = {}
        for (let _portal of Object.keys(this.layout.metadata.portalMetaData)) portals[_portal] = []
        return new LayoutRecord(this.layout, -1, 0, fields, portals)
    }

    async get(recordId: number): Promise<LayoutRecord<T["fields"], T["portals"]>> {
        await this.layout.getLayoutMeta()
        let record = new LayoutRecord(this.layout, recordId)
        await record.get()
        return record
    }

    range(start = 0, limit = 100) {
        return new RecordGetRange<T>(this.layout, start, limit)
    }

    find(start = 0, limit = 100): Find<T> {
        return new Find<T>(this.layout, start, limit)
    }
}