/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {RecordGetOperation} from "./recordGetOperation.js";
import {LayoutRecord} from "../layoutRecord.js";
import {LayoutInterface} from "../../layouts/layoutInterface";
import {LayoutBase} from "../../layouts/layoutBase.js";
import {FMError} from "../../FMError.js";
import {ApiRecordResponseObj} from "../../models/apiResults";

export class Find<T extends LayoutInterface> extends RecordGetOperation<T> {
    protected queries: object[]

    constructor(layout: LayoutBase, start = 0, limit = 100) {
        super(layout)
        this.setOffset(start)
        this.setLimit(limit)
        this.queries = []
    }

    private toObject() {
        let out = {query: this.queries, sort: undefined}
        if (this.sort.length !== 0) out.sort = this.sort

        for (let item of Object.keys(this.scripts)) {
            if (this.scripts[item]) {
                out[item] = this.scripts[item].name
                if (this.scripts[item].parameter) out[item + ".param"] = this.scripts[item].parameter
            }
        }

        if (this.limit !== 100) out["limit"] = this.limit
        if (this.offset !== 0) out["offset"] = this.offset
        if (this.limitPortals.length > 0) {
            out["portal"] = this.limitPortals.map(p => p.portalName)
            for (let item of this.limitPortals) {
                out["offset." + item.portalName.replace(/[^0-9A-z]/g, "")] = item.offset
                out["limit." + item.portalName.replace(/[^0-9A-z]/g, "")] = item.limit
            }
        }

        return out
    }

    addRequests(...requests) {
        for (let item of requests) this.queries.push(item)
        return this
    }

    /**
     * @deprecated in favour of .fetch()
     */
    run() {
        return this.fetch()
    }

    async fetch(): Promise<LayoutRecord<T["fields"], T["portals"]>[]> {
        let trace = new Error()
        await this.layout.getLayoutMeta()
        let res = await this.layout.database.apiRequest<ApiRecordResponseObj>(`${this.layout.endpoint}/_find`, {
            port: 443,
            method: "POST",
            body: JSON.stringify(this.toObject())
        })
        if (res.messages[0].code === "0") {
            // console.log("RESOLVING")
            if (!this.layout.metadata) await this.layout.getLayoutMeta()
            return res.response.data.map(item => {
                return new LayoutRecord(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
            })
        }
        else {
            throw new FMError(res.messages[0].code, res.httpStatus, res, trace)
        }
    }
}