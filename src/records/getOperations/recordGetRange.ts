/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutInterface} from "../../layouts/layoutInterface";
import {RecordGetOperation} from "./recordGetOperation";
import {LayoutRecord} from "../layoutRecord";
import {extraBodyOptions} from "../../types.js";
import {FMError} from "../../FMError";

export class RecordGetRange<T extends LayoutInterface> extends RecordGetOperation<T> {
    constructor(layout, start = 0, limit = 100) {
        super(layout)
        this.setOffset(start)
        this.setLimit(limit)
    }

    private generateQueryParams(extraBody: extraBodyOptions = {}) {
        let params = []
        if (this.limit !== 100) params.push("_limit=" + this.limit)
        if (this.offset !== 0) params.push("_offset=" + this.offset)
        if (this.sort.length > 0) params.push("_sort=" + encodeURI(JSON.stringify(this.sort)))
        if (this.limitPortals.length > 0) {
            params.push("portal=" + encodeURI(JSON.stringify(this.limitPortals.map(p => p.portal.name))))
            for (let item of this.limitPortals) {
                if (item.offset !== 0) params.push("_offset." + item.portal.name.replace(/[^0-9A-z]/g, "") + "=" + item.offset)
                if (item.limit !== 100) params.push("_limit." + item.portal.name.replace(/[^0-9A-z]/g, "") + "=" + item.limit)
            }
        }
        if (extraBody.scripts) {
            if (extraBody.scripts.prerequest) {
                params.push("script.prerequest=" + extraBody.scripts.prerequest.name)
                if (extraBody.scripts.prerequest.parameter) params.push("script.prerequest.param=" + extraBody.scripts.prerequest.parameter)
            }
            if (extraBody.scripts.presort) {
                params.push("script.presort=" + extraBody.scripts.presort.name)
                if (extraBody.scripts.presort.parameter) params.push("script.presort.param=" + extraBody.scripts.presort.parameter)
            }
            if (extraBody.scripts.after) {
                params.push("script=" + extraBody.scripts.after.name)
                if (extraBody.scripts.after.parameter) params.push("script.param=" + extraBody.scripts.after.parameter)
            }
        }

        if (params.length === 0) return ""
        return "?" + params.join("&")
    }

    /**
     * @deprecated in favour of .fetch()
     */
    run(extraBody: extraBodyOptions = {}): Promise<LayoutRecord<T["fields"], T["portals"]>[]> {
        return this.fetch(extraBody)
    }

    fetch(extraBody: extraBodyOptions = {}): Promise<LayoutRecord<T["fields"], T["portals"]>[]> {
        let trace = new Error()
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.getLayoutMeta().then(() => {
                return this.layout.database.apiRequest(`${this.layout.endpoint}/records${this.generateQueryParams(extraBody)}`, {
                    method: "GET"
                })
            })
                .then(async res => {
                    // // console.log(res)
                    if (res.messages[0].code === "0") {
                        // console.log("RESOLVING")
                        if (!this.layout.metadata) await this.layout.getLayoutMeta()
                        let data = res.response.data.map(item => {
                            return new LayoutRecord(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
                        })
                        resolve(data)
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
}