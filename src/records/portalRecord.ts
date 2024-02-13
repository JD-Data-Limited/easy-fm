/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordBase} from "./recordBase.js";
import {extraBodyOptions, RecordTypes} from "../types.js";

import {RecordFieldsMap} from "../layouts/recordFieldsMap.js";
import {PortalBase} from "./portalBase.js";
import {FieldBase, FieldValue} from "./fieldBase.js";

export class PortalRecord<T extends RecordFieldsMap> extends RecordBase<T> {
    readonly portal: PortalBase<T>;
    readonly type = RecordTypes.PORTAL

    constructor(record: RecordBase<any>, portal: PortalBase<any>, recordId: number, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId, fieldData);
        this.portal = portal
    }

    _onSave() {
        super._onSave();
        this.portal.record._onSave()
    }

    commit(extraBody: extraBodyOptions = {}) {
        return this.portal.record.commit(extraBody)
    }

    toObject(fieldFilter: (a: FieldBase<FieldValue>) => boolean): {
        modId?: string,
        recordId?: string,
    } & {[key: string]: string} {
        let res: any = {
            recordId: this.recordId === -1 ? undefined : this.recordId.toString(),
            modId: this.modId === -1 ? undefined : this.modId.toString()
        }
        for (let field of this.fieldsArray.filter(a => fieldFilter(a))) res[field.id] = field.value?.toString()
        // console.log(res)
        return res
    }
}