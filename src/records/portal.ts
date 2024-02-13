/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {PortalRecord} from "./portalRecord.js";
import {RecordFieldsMap} from "../layouts/recordFieldsMap.js";
import {PortalBase} from "./portalBase.js";
import {LayoutRecord} from "./layoutRecord.js";

export class Portal<T extends RecordFieldsMap> implements PortalBase<T> {
    readonly record: LayoutRecord<any>;
    readonly name: string;
    public records: PortalRecord<T>[] = [];

    constructor(record: LayoutRecord<any>, name: string) {
        this.record = record
        this.name = name
    }

    async create() {
        let fields: {
            [key: string]: string
        } = {}
        for (let _field of (await this.record.layout.getLayoutMeta()).portalMetaData[this.name]) {
            fields[_field.name] = ""
        }
        let record = new PortalRecord<T>(this.record, this, -1, -1, fields)
        this.records.push(record)
        return record
    }
}