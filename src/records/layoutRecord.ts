/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {extraBodyOptions, recordObject} from "../types.js";
import {RecordBase} from "./recordBase.js";
import {PortalRecord} from "./portalRecord.js";
import {Portal} from "./portal.js";
import {PortalInterface, RecordFieldsMap} from "../layouts/layoutInterface.js";
import {FMError} from "../FMError.js";

export class LayoutRecord<T extends RecordFieldsMap, P extends PortalInterface> extends RecordBase<T> {
    portals: P

    constructor(layout, recordId, modId = recordId, fieldData = {}, portalData = null) {
        super(layout, recordId, modId);
        this.processFieldData(fieldData)
        if (portalData) {
            this.processPortalData(portalData)
        }
    }

    get portalsArray(): Portal<any>[] {
        return Object.values(this.portals)
    }

    commit(extraBody: extraBodyOptions = {}): Promise<this> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            let data = this.toObject()
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

                this.layout.database.apiRequest(`${this.layout.endpoint}/records`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify(data)
                })
                    .then(res => {
                        if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                            reject(new FMError(res.response.scriptError, res.status, res, trace))
                        }
                        else if (res.messages[0].code === "0") {
                            this.recordId = parseInt(res.response.recordId)
                            this.modId = parseInt(res.response.modId)
                            resolve(this)
                        }
                        else {
                            reject(new FMError(res.messages[0].code, res.status, res, trace))
                        }
                    })
                    .catch(e => {
                        reject(e)
                    })

                return
            }

            // for (let item of Object.keys(data)) extraBody[item] = data[item]
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "PATCH",
                body: JSON.stringify(data)
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res, trace))
                    }
                    else if (res.messages[0].code === "0") {
                        this.modId = res.response.modId
                        this._onSave()
                        resolve(this)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    protected processPortalData(portalData): void {
        for (let portalName of Object.keys(portalData)) {
            let _portal = new Portal(this, portalName)
            _portal.records = portalData[portalName].map(item => {
                let fieldData = item;
                delete fieldData.recordId;
                delete fieldData.modId;
                return new PortalRecord(this, _portal, item.recordId, item.modId, fieldData);
            })

            // @ts-ignore
            this.portals[portalName] = _portal;
        }
    }

    get(): Promise<this> {
        let trace = new Error()
        if (this.recordId === -1) {
            throw "Cannot get this RecordBase until a commit() is done."
        }
        return new Promise(async (resolve, reject) => {
            if (!this.layout.metadata) await this.layout.getLayoutMeta()

            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        // console.log(res, res.response.data)
                        this.modId = res.response.data[0].modId
                        this.processFieldData(res.response.data[0].fieldData)
                        this.portalData = []
                        if (res.response.data[0].portalData) this.processPortalData(res.response.data[0].portalData)
                        resolve(this)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    getPortal(portal) {
        return this.portalsArray.find(p => p.name === portal)
    }

    duplicate(): Promise<LayoutRecord<T,P>> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "POST"
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res, trace))
                    }
                    else if (res.messages[0].code === "0") {
                        let data = this.toObject((a) => true, (a) => true, (a) => false, (a) => false)
                        let _res = new LayoutRecord<T,P>(this.layout, res.response.recordId, res.response.modId, data.fieldData, data.portalData)

                        this.emit("duplicated")
                        resolve(_res)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    delete(): Promise<void> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "DELETE"
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res, trace))
                    }
                    else if (res.messages[0].code === "0") {
                        this.emit("deleted")
                        resolve()
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    toObject(filter: (a) => any = (a) => a.edited, portalFilter: (a) => any = (a) => a.records.find(record => record.edited), portalRowFilter: (a) => any = (a) => a.edited, portalFieldFilter: (a) => any = (a) => a.edited): recordObject {
        let obj = super.toObject(filter, portalFilter, portalRowFilter, portalFieldFilter);

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