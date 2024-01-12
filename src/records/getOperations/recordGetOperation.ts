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
import fetch from "node-fetch";

export type SortOrder = "ascend" | "descend"
export type FindRequest = {
    [key: string]: string,
    omit?: "true" | "false"
}
export type PortalRequest = {
    name: string,
}

export type GetOperationOptions<T extends LayoutInterface> = {
    portals: portalFetchData<keyof T["portals"]>[],
    limit?: number,
    offset?: number
}


export class RecordGetOperation<T extends LayoutInterface> {
    protected layout: LayoutBase
    protected limit: number = 100
    protected scriptData: ScriptRequestData = {}
    protected sortData: { fieldName: string, sortOrder: SortOrder }[] = []
    protected portals: portalFetchData<keyof T["portals"]>[] = []
    protected offset: number = 0
    protected queries: FindRequest[] = []

    constructor(layout: LayoutBase, options: GetOperationOptions<T>) {
        this.layout = layout
        this.sortData = []
        this.portals = options.portals
        this.offset = options.offset || 0
        this.limit = options.limit || Infinity
    }

    get isFindRequest() {
        return this.queries.length !== 0
    }

    protected generateParams(offset: number, limit: number) {
        const params = {
            _limit: limit.toString(),
            _offset: offset.toString(),
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

    sort(fieldName: string, sortOrder: SortOrder) {
        this.sortData.push({fieldName, sortOrder})
        return this
    }

    find(query: FindRequest) {
        this.queries.push(query)
        return this
    }

    fetch(): Promise<LayoutRecord<T>[]> {
        return this.performFind(this.limit, this.offset)
    }

    async performFind(offset: number, limit: number): Promise<LayoutRecord<T>[]> {
        let trace = new Error()
        await this.layout.getLayoutMeta()

        const is_find = this.isFindRequest
        const endpoint = this.layout.endpoint + (is_find ? "/_find" : "/records")
        const reqData = {
            // port: 443,
            method: is_find ? "POST" : "GET",
            body: is_find ? JSON.stringify(this.generateParams(offset, limit)) : undefined,
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
        else if (res.messages[0].code == "401") {
            // No records found, so return empty set
            return []
        }
        else {
            throw new FMError(res.messages[0].code, res.httpStatus, res, trace)
        }
    }

    [Symbol.asyncIterator]() {
        let nextOffset = this.offset
        let limit = this.limit

        let exit_after_last_record = false
        let records: LayoutRecord<T>[] = []

        const fetch = async () => {
            const theoretical_limit = limit - nextOffset
            const records = await this.performFind(nextOffset, theoretical_limit < 100 ? theoretical_limit : 100);
            nextOffset += 100;
            if (records.length < 100) exit_after_last_record = true
        }

        return {
            next: async () => {
                if (records.length === 0 && !exit_after_last_record) {
                    await fetch();
                }

                if (records.length === 0 && exit_after_last_record) {
                    return {done: true, value: undefined};
                }
                else {
                    const record = records.shift()
                    return {done: false, value: record};
                }
            }
        };
    }
}