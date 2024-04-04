/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {LayoutRecord} from "../records/layoutRecord.js";
import {LayoutInterface} from "./layoutInterface.js";
import {LayoutBase} from "./layoutBase.js"
import {GetOperationOptions, RecordGetOperation} from "../records/getOperations/recordGetOperation.js";
import {PickPortals, RecordFetchOptions} from "../types.js";
import {ApiFieldData} from "../models/apiResults.js";

export class LayoutRecordManager<T extends LayoutInterface> {
    readonly layout: LayoutBase;
    constructor(layout: LayoutBase) {
        this.layout = layout
    }

    async create<OPTIONS extends RecordFetchOptions>(options: OPTIONS): Promise<LayoutRecord<
        PickPortals<T, OPTIONS["portals"][number]>
    >> {
        let metadata = await this.layout.getLayoutMeta()
        let fields: ApiFieldData = {}
        for (let _field of metadata.fieldMetaData) {
            fields[_field.name] = ""
        }
        let portals: {[key: string]: []} = {}
        for (let _portal of Object.keys(metadata.portalMetaData)) portals[_portal] = []
        return new LayoutRecord(this.layout, -1, 0, fields, portals)
    }

    async get(recordId: number): Promise<LayoutRecord<
        PickPortals<T, never>
    >> {
        await this.layout.getLayoutMeta()
        let record = new LayoutRecord<PickPortals<T, never>>(this.layout, recordId)
        await record.get()
        return record
    }

    list<OPTIONS extends GetOperationOptions<T>>(options: OPTIONS) {
        return new RecordGetOperation<T, OPTIONS>(this.layout, options)
    }
}