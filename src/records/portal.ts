/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {PortalRecord} from "./portalRecord.js";
import {RecordFieldsMap} from "../layouts/recordFieldsMap";
import {PortalBase} from "./portalBase";
import {LayoutRecordBase} from "./layoutRecordBase";
import {LayoutRecord} from "./layoutRecord";
import {LayoutInterface} from "../layouts/layoutInterface";

export class Portal<T extends RecordFieldsMap> implements PortalBase<T> {
    readonly record: LayoutRecord<LayoutInterface>;
    readonly name: string;
    public records: PortalRecord<T>[];

    constructor(record: LayoutRecord<LayoutInterface>, name: string) {
        this.record = record
        this.name = name
    }

    create() {
        let fields = {}
        for (let _field of this.record.layout.metadata.portalMetaData[this.name]) {
            fields[_field.name] = ""
        }
        let record = new PortalRecord<T>(this.record, this, -1, -1, fields)
        this.records.push(record)
        return record
    }
}