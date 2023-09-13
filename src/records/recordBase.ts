/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {EventEmitter} from "events";
import * as moment from "moment/moment";
import {Field} from "./field";
import {Portal} from "./portal";
import {Layout} from "../layouts/layout";
import {FieldValue, RecordFieldsMap} from "../layouts/layoutInterface";
import {recordObject} from "../types.js";

export class RecordBase<T extends RecordFieldsMap> extends EventEmitter {
    readonly layout: Layout<any>;
    public recordId: number;
    modId: number;
    fields: T
    protected portalData: any[];

    constructor(layout, recordId, modId = recordId) {
        super();
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
    }

    get endpoint(): string {
        return `${this.layout.endpoint}/records/${this.recordId}`
    }

    get edited(): boolean {
        return !!this.fieldsArray.find(i => i.edited)
    }

    get fieldsArray() {
        return Object.values(this.fields)
    }

    protected processFieldData(fieldData) {
        let fields: RecordFieldsMap = {}

        for (let key of Object.keys(fieldData)) {
            let _field = new Field(this, key, fieldData[key])
            if (!!fieldData[key]) {
                if (_field.metadata.result === "timeStamp") {
                    // @ts-ignore
                    let date = moment.default(fieldData[key], this.layout.database.host.metadata.productInfo.timeStampFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date.toDate())
                    _field.edited = false

                }
                else if (_field.metadata.result === "time") {
                    // @ts-ignore
                    let date = moment.default(fieldData[key], this.layout.database.host.metadata.productInfo.timeFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date.toDate())
                    _field.edited = false
                }
                else if (_field.metadata.result === "date") {
                    // @ts-ignore
                    let date = moment.default(fieldData[key], this.layout.database.host.metadata.productInfo.dateFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date.toDate())
                    _field.edited = false
                }
            }
            fields[key] = _field
        }
        this.fields = fields as T
        return fields as T
    }

    _onSave() {
        this.emit("saved")
        for (let field of this.fieldsArray) field.edited = false
    }

    getField(field) {
        return this.fieldsArray.find(_field => _field.id === field)
    }

    toObject(filter = (a) => a.edited,
             portalFilter = (a) => a.records.find(record => record.edited),
             portalRowFilter = (a) => a.edited,
             portalFieldFilter = (a) => a.edited
    ): recordObject {
        let fields_processed = {}
        for (let field of this.fieldsArray.filter(field => filter(field))) {
            let value = field.value
            if (value instanceof Date) {
                // @ts-ignore
                let _value = moment.default(value)
                    .utcOffset(this.layout.database.host.timezoneOffset)

                // @ts-ignore

                switch (field.metadata.result) {
                    case "time":
                        value = _value.format(this.layout.database.host.metadata.productInfo.timeFormat.replace("dd", "DD"))
                        break
                    case "date":
                        value = _value.format(this.layout.database.host.metadata.productInfo.dateFormat.replace("dd", "DD"))
                        break
                    default:
                        value = _value.format(this.layout.database.host.metadata.productInfo.timeStampFormat.replace("dd", "DD"))
                }
            }
            fields_processed[field.id] = value
        }
        let obj = {
            "recordId": this.recordId,
            "modId": this.modId,
            "fieldData": fields_processed
        }
        return obj
    }
}