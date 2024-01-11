/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {LayoutInterface} from "../../layouts/layoutInterface.js";
import {Portal} from "../portal.js";
import {portalFetchData, ScriptRequestData} from "../../types.js";
import {LayoutBase} from "../../layouts/layoutBase.js"
import {LayoutRecord} from "../layoutRecord";
import {ApiRecordResponseObj} from "../../models/apiResults";
import {FMError} from "../../FMError";

export type SortOrder = "ascend" | "descend"
export type FindRequest = {
    [key: string]: string,
    omit?: "true" | "false"
}

export class RecordGetOperation<T extends LayoutInterface> {
    protected layout: LayoutBase
    protected _limit: number = 100
    protected scriptData: ScriptRequestData = {}
    protected sortData: {fieldName: string, sortOrder: SortOrder}[] = []
    protected portals: portalFetchData[] = []
    protected _offset: number = 0
    protected queries: FindRequest[] = []

    constructor(layout: LayoutBase) {
        this.layout = layout
        this.sortData = []
    }

    get isFindRequest() {
        return this.queries.length !== 0
    }

    protected generateParams() {
        const params = {
            _limit: this._limit.toString(),
            _offset: this._offset.toString(),
            _sort: JSON.stringify(this.sortData)
        }
        if (this.scriptData.after) params["script"] = this.scriptData.after.name
        if (this.scriptData.after.parameter) params["script.param"] = this.scriptData.after.parameter

        if (this.scriptData.presort) params["script.presort"] = this.scriptData.after.name
        if (this.scriptData.presort.parameter) params["script.presort.param"] = this.scriptData.after.parameter

        if (this.scriptData.prerequest) params["script.prerequest"] = this.scriptData.after.name
        if (this.scriptData.prerequest.parameter) params["script.prerequest.param"] = this.scriptData.after.parameter

        if (this.queries.length !== 0) params["query"] = this.queries

        return params
    }

    scripts(scripts: ScriptRequestData) {
        this.scriptData = scripts;
        return this
    }

    /*
    portal() will adjust the results of the get request so that if a layout has multiple portals in it,
    only data from the specified ones will be read. This may help reduce load on your FileMaker API.

    By default, easy-fm will NOT fetch any portal data
    */
    portal(portalName: string, offset = 0, limit = 100) {
        if (offset < 0) throw "Portal offset cannot be less than 0"
        this.portals.push({portalName: portalName, offset, limit})
        return this
    }

    sort(fieldName: string, sortOrder: SortOrder) {
        this.sortData.push({fieldName, sortOrder})
        return this
    }

    offset(offset: number) {
        this._offset = offset
        return this
    }

    limit(limit: number) {
        this._limit = limit
        return this
    }

    find(query: FindRequest) {
        this.queries.push(query)
        return this
    }

    async fetch(): Promise<LayoutRecord<T["fields"], T["portals"]>[]> {
        let trace = new Error()
        await this.layout.getLayoutMeta()

        const is_find = this.isFindRequest
        const endpoint = this.layout.endpoint + (is_find ? "/_find" : "/records")
        const reqData = {
            // port: 443,
            method: is_find ? "POST" : "GET",
            body: is_find ? JSON.stringify(this.generateParams()) : undefined,
        }

        let res = await this.layout.database.apiRequest<ApiRecordResponseObj>(
            endpoint,
            reqData
        )
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