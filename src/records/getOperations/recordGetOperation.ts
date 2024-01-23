/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {LayoutInterface} from "../../layouts/layoutInterface.js";
import {PickPortals, ScriptRequestData} from "../../types.js";
import {LayoutBase} from "../../layouts/layoutBase.js"
import {LayoutRecord} from "../layoutRecord.js";
import {ApiRecordResponseObj} from "../../models/apiResults.js";
import {FMError} from "../../FMError.js";

export type SortOrder = "ascend" | "descend"
export type FindRequest = {
    [key: string]: string,
    omit?: "true" | "false"
}
export type PortalRequest = {
    name: string,
}

type PortalData<T extends LayoutInterface> = {
    [key in keyof T["portals"]]: {
        limit: number,
        offset: number
    }
}
export type GetOperationOptions<T extends LayoutInterface> = {
    portals: Partial<PortalData<T>>,
    limit?: number,
    offset?: number
}

export class RecordGetOperation<T extends LayoutInterface, OPTIONS extends GetOperationOptions<T>> {
    protected layout: LayoutBase
    protected limit: number = 100
    protected scriptData: ScriptRequestData = {}
    protected sortData: { fieldName: string, sortOrder: SortOrder }[] = []
    protected portals: Partial<PortalData<T>>
    protected offset: number = 1
    protected queries: FindRequest[] = []

    constructor(layout: LayoutBase, options: OPTIONS) {
        this.layout = layout
        this.sortData = []
        this.portals = options.portals
        this.offset = options.offset || 1 // Offset refers to the starting record. offset 1 is the same as no offset.
        this.limit = options.limit || 100
    }

    get isFindRequest() {
        return this.queries.length !== 0
    }

    protected generateParamsBody(offset: number, limit: number) {
        const params: {[key: string]: any} = {
            limit: limit.toString(),
            offset: offset.toString(),
        }
        if (this.sortData.length !== 0) params.sort = JSON.stringify(this.sortData)


        if (this.scriptData.after) params["script"] = this.scriptData.after.name
        if (this.scriptData.after?.parameter) params["script.param"] = this.scriptData.after.parameter

        if (this.scriptData.presort) params["script.presort"] = this.scriptData.after.name
        if (this.scriptData.presort?.parameter) params["script.presort.param"] = this.scriptData.after.parameter

        if (this.scriptData.prerequest) params["script.prerequest"] = this.scriptData.after.name
        if (this.scriptData.prerequest?.parameter) params["script.prerequest.param"] = this.scriptData.after.parameter

        if (this.queries.length !== 0) params["query"] = this.queries

        let portals = Object.keys(this.portals)
        params["portal"] = portals
        for (let portal of portals) {
            params[`offset.${portal}`] = this.portals[portal].offset
            params[`limit.${portal}`] = this.portals[portal].limit
        }

        return params
    }
    protected generateParamsURL(offset: number, limit: number) {
        const params = new URLSearchParams({
            _limit: limit.toString(),
            _offset: offset.toString(),
        })
        if (this.sortData.length !== 0) params.set("_sort", JSON.stringify(this.sortData))

        if (this.scriptData.after) params.set("script", this.scriptData.after.name)
        if (this.scriptData.after?.parameter) params.set("script.param", this.scriptData.after.parameter)

        if (this.scriptData.presort) params.set("script.presort", this.scriptData.after.name)
        if (this.scriptData.presort?.parameter) params.set("script.presort.param", this.scriptData.after.parameter)

        if (this.scriptData.prerequest) params.set("script.prerequest", this.scriptData.after.name)
        if (this.scriptData.prerequest?.parameter) params.set("script.prerequest.param", this.scriptData.after.parameter)

        let portals = Object.keys(this.portals)
        for (let portal of portals) {
            params.set(`_offset.${portal}`, this.portals[portal].limit.toString())
            params.set(`_offset.${portal}`, this.portals[portal].offset.toString())
        }
        params.set('portal', JSON.stringify(portals))

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

    addRequest(query: FindRequest) {
        this.queries.push(query)
        return this
    }

    fetch() {
        return this.performFind(this.offset, this.limit)
    }

    private async performFind(offset: number, limit: number): Promise<LayoutRecord<
        PickPortals<T, keyof OPTIONS["portals"]>
    >[]> {
        let trace = new Error()
        await this.layout.getLayoutMeta()

        const is_find = this.isFindRequest
        let endpoint = this.layout.endpoint + (is_find ? "/_find" : "/records")
        if (!is_find) endpoint += "?" + new URLSearchParams(this.generateParamsURL(offset, limit)).toString()
        const reqData = {
            // port: 443,
            method: is_find ? "POST" : "GET",
            body: is_find ? JSON.stringify(this.generateParamsBody(offset, limit)) : undefined,
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
        let startOffset: number = JSON.parse(JSON.stringify(this.offset))
        let limit = this.limit

        let exit_after_last_record = false
        let records: LayoutRecord<PickPortals<T, keyof OPTIONS["portals"]>>[] = []

        const fetch = async () => {
            const theoretical_limit = (limit - nextOffset) + startOffset
            if (theoretical_limit === 0) {
                exit_after_last_record = true
                records = []
                return
            }
            records = await this.performFind(nextOffset, theoretical_limit < 100 ? theoretical_limit : 100);
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