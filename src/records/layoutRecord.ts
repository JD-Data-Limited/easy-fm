/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {extraBodyOptions} from "../types.js";
import {RecordBase} from "./recordBase.js";
import {PortalRecord} from "./portalRecord.js";
import {Portal} from "./portal.js";
import {LayoutInterface} from "../layouts/layoutInterface.js";
import {FMError} from "../FMError.js";
import {LayoutRecordBase} from "./layoutRecordBase.js";
import {ApiPortalData, ApiRecordResponseObj} from "../models/apiResults.js";
import {LayoutBase} from "../layouts/layoutBase.js"
import {FieldBase, FieldValue} from "./fieldBase.js";

export class LayoutRecord<LAYOUT extends LayoutInterface, PORTALS extends Partial<LAYOUT["portals"]>> extends RecordBase<LAYOUT["fields"]> implements LayoutRecordBase {
    // @ts-ignore
    portals: PORTALS = {}
    private readonly portalsToInclude: (keyof PORTALS)[]

    constructor(
        layout: LayoutBase,
        recordId: number | string,
        modId = recordId,
        fieldData: Record<string, string | number> = {},
        portalData: ApiPortalData | null = null, portalsToInclude: (keyof PORTALS)[] = [])
    {
        super(layout, parseInt(recordId as string), parseInt(modId as string));
        this.processFieldData(fieldData)
        this.portalsToInclude = portalsToInclude
        if (portalData) {
            this.processPortalData(portalData)
        }
    }

    get portalsArray(): Portal<any>[] {
        return Object.values(this.portals)
    }

    async commit(extraBody: extraBodyOptions = {}): Promise<this> {
        let data: any = this.toObject()
        delete data.recordId
        delete data.modId

        if (extraBody.scripts?.after) {
            data["script"] = extraBody.scripts.after.name
            if (extraBody.scripts.after.parameter) data["script.param"] = extraBody.scripts.after.parameter
        }
        if (extraBody.scripts?.prerequest) {
            data["script.prerequest"] = extraBody.scripts.after.name
            if (extraBody.scripts.prerequest.parameter) data["script.prerequest.param"] = extraBody.scripts.prerequest.parameter
        }
        if (extraBody.scripts?.presort) {
            data["script.presort"] = extraBody.scripts.presort.name
            if (extraBody.scripts.presort.parameter) data["script.presort.param"] = extraBody.scripts.presort.parameter
        }

        if (this.recordId === -1) {
            // This is a new LayoutRecord
             let res = await this.layout.database.apiRequest<{ recordId: string, modId: string }>(`${this.layout.endpoint}/records`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify(data)
                })

                if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                    throw new FMError(res.response.scriptError, res.httpStatus, res)
                }
                else if (res.messages[0].code === "0") {
                    this.recordId = parseInt(res.response.recordId)
                    this.modId = parseInt(res.response.modId)
                    return this
                }
                else {
                    throw new FMError(res.messages[0].code, res.httpStatus, res)
                }
        }

        // for (let item of Object.keys(data)) extraBody[item] = data[item]
        let res = await this.layout.database.apiRequest<{
            modId: string, newPortalRecordInfo: {
                tableName: string,
                recordId: string,
                modId: string
            }[]
        }>(this.endpoint, {
            port: 443,
            method: "PATCH",
            body: JSON.stringify(data)
        })
        if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
            throw new FMError(res.response.scriptError, res.httpStatus, res)
        }
        else if (res.messages[0].code === "0") {
            this.modId = +res.response.modId
            this._onSave()
            return this
        }
        else {
            throw new FMError(res.messages[0].code, res.httpStatus, res)
        }
    }

    protected processPortalData(portalData: ApiPortalData): void {
        for (let portalName of Object.keys(portalData)) {
            let _portal = new Portal(this, portalName)
            _portal.records = portalData[portalName].map(item => {
                let fieldData = item;
                delete fieldData.recordId;
                delete fieldData.modId;
                return new PortalRecord(this, _portal, parseInt(item.recordId as string), parseInt(item.modId as string), fieldData);
            })

            // @ts-ignore
            this.portals[portalName] = _portal;
        }
    }

    async get(): Promise<this> {
        let trace = new Error()
        if (this.recordId === -1) {
            throw "Cannot get this RecordBase until a commit() is done."
        }
        if (!this.layout.metadata) await this.layout.getLayoutMeta()
        let res = await this.layout.database.apiRequest<ApiRecordResponseObj>(this.endpoint, {
            port: 443,
            method: "GET"
        })

        if (res.messages[0].code === "0") {
            // console.log(res, res.response.data)
            this.modId = +res.response.data[0].modId
            this.processFieldData(res.response.data[0].fieldData)
            this.portalData = []
            if (res.response.data[0].portalData) this.processPortalData(res.response.data[0].portalData)
            return this
        }
    }

    async duplicate(): Promise<LayoutRecord<LAYOUT>> {
        let trace = new Error()
        let res = await this.layout.database.apiRequest<{recordId: string, modId: string}>(this.endpoint, {
            port: 443,
            method: "POST"
        })
        if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
            throw new FMError(res.response.scriptError, res.httpStatus, res, trace)
        }
        else if (res.messages[0].code === "0") {
            let data = this.toObject((a) => true, (a) => true, (a) => false, (a) => false)
            let _res = new LayoutRecord<LAYOUT>(this.layout, res.response.recordId, res.response.modId, data.fieldData, data.portalData)

            this.emit("duplicated")
            return _res
        }
        else {
            throw new FMError(res.messages[0].code, res.httpStatus, res, trace)
        }
    }

    async delete(): Promise<void> {
        let res = await this.layout.database.apiRequest(this.endpoint, {
            port: 443,
            method: "DELETE"
        })
        console.log(res)
        if (typeof res.response?.scriptError !== "undefined" && res.response?.scriptError !== '0') {
            throw new FMError(res.response.scriptError, res.httpStatus, res)
        }
        else if (res.messages[0].code === "0") {
            this.emit("deleted")
            return
        }
        else {
            throw new FMError(res.messages[0].code, res.httpStatus, res)
        }
    }

    toObject(
        filter: (a: FieldBase<FieldValue>) => any = (a) => a.edited,
        portalFilter: (a: Portal<any>) => any = (a) => a.records.find(record => record.edited),
        portalRowFilter: (a: PortalRecord<never>) => any = (a) => a.edited,
        portalFieldFilter: (a: FieldBase<FieldValue>) => any = (a) => a.edited
    ) {
        let obj = super.toObject(filter);

        // Check if there's been any edited portal information
        let portals = this.portalsArray.filter(a => portalFilter(a))
        if (portals) {
            obj["portalData"] = {}
            for (let portal of portals) {
                // @ts-ignore
                obj["portalData"][portal.name] = portal.records.filter(a => portalRowFilter(a)).map(record => {
                    return record.toObject(portalFieldFilter)
                })
            }
        }

        return obj
    }
}