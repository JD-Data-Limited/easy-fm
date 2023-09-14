/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {RecordBase, RecordTypes} from "./recordBase.js";
import {extraBodyOptions, recordObject} from "../types.js";

import {RecordFieldsMap} from "../layouts/recordFieldsMap";
import {PortalBase} from "./portalBase";

export class PortalRecord<T extends RecordFieldsMap> extends RecordBase<T> {
    readonly portal: PortalBase<T>;
    readonly type = RecordTypes.PORTAL

    constructor(record, portal, recordId, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId);

        this.portal = portal
        this.processFieldData(fieldData)
    }

    _onSave() {
        super._onSave();
        this.portal.record._onSave()
    }

    commit(extraBody: extraBodyOptions = {}) {
        return this.portal.record.commit(extraBody)
    }

    toObject(fieldFilter): any {
        super.toObject()
        let res = {
            recordId: this.recordId === -1 ? undefined : this.recordId,
            modId: this.modId === -1 ? undefined : this.modId
        } as recordObject
        for (let field of this.fieldsArray.filter(a => fieldFilter(a))) res[field.id] = field.value
        // console.log(res)
        return res
    }

    getField(field) {
        return this.fieldsArray.find(_field => _field.id === field) || this.fieldsArray.find(_field => _field.id === this.portal.name + "::" + field)
    }
}