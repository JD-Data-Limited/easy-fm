/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutRecord} from "./layoutRecord.js";
import {PortalRecord} from "./portalRecord.js";
import {LayoutInterface, PortalInterface, RecordFieldsMap} from "../layouts/layoutInterface";

export class Portal<T extends RecordFieldsMap> {
    readonly record: LayoutRecord<any, any>;
    readonly name: string;
    public records: PortalRecord<T>[];

    constructor(record: LayoutRecord<any, any>, name: string) {
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