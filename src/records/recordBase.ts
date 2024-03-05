/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {EventEmitter} from "events";
import * as moment from "moment";
import {Moment} from "moment";
import {RecordTypes} from "../types.js";
import {RecordFieldsMap} from "../layouts/recordFieldsMap.js";
import {LayoutBase} from "../layouts/layoutBase.js";
import {ApiFieldData} from "../models/apiResults.js";
import {Field, FieldValue} from "./field.js";

export abstract class RecordBase<T extends RecordFieldsMap> extends EventEmitter {
    readonly layout: LayoutBase;
    readonly type: RecordTypes = RecordTypes.UNKNOWN;
    public recordId: number;
    modId: number;
    fields: T;
    protected portalData: any[] = [];

    protected constructor(layout: LayoutBase, recordId: number, modId = recordId, fieldData: ApiFieldData) {
        super();
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
        this.fields = this.processFieldData(fieldData)
    }

    get endpoint(): string {
        return `${this.layout.endpoint}/records/${this.recordId}`
    }

    get edited(): boolean {
        return !!this.fieldsArray.find(i => i.edited)
    }

    get fieldsArray(): Field<FieldValue>[] {
        return Object.values(this.fields)
    }

    protected processFieldData(fieldData: ApiFieldData) {
        let fields: RecordFieldsMap = {}

        for (let key of Object.keys(fieldData)) {
            let _field = new Field<number | string | Moment>(this, key, fieldData[key])
            if (!!fieldData[key]) {
                if (_field.metadata.result === "timeStamp") {
                    // @ts-ignore
                    let date = moment.default(fieldData[key], this.layout.database.host.metadata.productInfo.timeStampFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date)
                    _field.edited = false

                }
                else if (_field.metadata.result === "time") {
                    // @ts-ignore
                    let date = moment.default(fieldData[key], this.layout.database.host.metadata.productInfo.timeFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date)
                    _field.edited = false
                }
                else if (_field.metadata.result === "date") {
                    // @ts-ignore
                    let date = moment.default(fieldData[key], this.layout.database.host.metadata.productInfo.dateFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
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

    _onSave() {
        this.emit("saved")
        for (let field of this.fieldsArray) field.edited = false
    }
}