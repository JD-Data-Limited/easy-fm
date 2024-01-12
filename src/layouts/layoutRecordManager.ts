/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {LayoutRecord} from "../records/layoutRecord.js";
import {LayoutInterface} from "./layoutInterface.js";
import {LayoutBase} from "./layoutBase.js"
import {GetOperationOptions, RecordGetOperation} from "../records/getOperations/recordGetOperation";

export class LayoutRecordManager<T extends LayoutInterface> {
    readonly layout: LayoutBase;
    constructor(layout: LayoutBase) {
        this.layout = layout
    }

    async create(): Promise<LayoutRecord<T>> {
        await this.layout.getLayoutMeta()
        let fields = {}
        for (let _field of this.layout.metadata.fieldMetaData) {
            fields[_field.name] = ""
        }
        let portals = {}
        for (let _portal of Object.keys(this.layout.metadata.portalMetaData)) portals[_portal] = []
        return new LayoutRecord(this.layout, -1, 0, fields, portals)
    }

    async get(recordId: number): Promise<LayoutRecord<T>> {
        await this.layout.getLayoutMeta()
        let record = new LayoutRecord<T>(this.layout, recordId)
        await record.get()
        return record
    }

    query(options?: GetOperationOptions<T>) {
        return new RecordGetOperation<T>(this.layout, options || {portals: []})
    }
}