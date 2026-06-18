/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type LayoutInterface} from '../../layouts/layoutInterface.js'
import {type PickPortals, type ScriptRequestData} from '../../types.js'
import {type LayoutBase} from '../../layouts/layoutBase.js'
import {LayoutRecord} from '../layoutRecord.js'
import {ApiRecordResponseObj} from '../../models/apiResults.js'
import {FMError} from '../../FMError.js'
import {FindRequestSymbol, type Query} from '../../utils/query.js'

export type SortOrder = 'ascend' | 'descend'
/** Raw FileMaker find request strings, already escaped/formatted. */
export type FindRequestRaw = Record<string, string>
/** Safe find request built from `query` tagged template helpers. */
export type FindRequest = Record<string, Query>

export interface PortalRequest {
    name: string
}

type PortalData<T extends LayoutInterface> = {
    [key in keyof T['portals']]: {
        limit: number
        offset: number
    }
}
export interface GetOperationOptions<T extends LayoutInterface> {
    portals: Partial<PortalData<T>>
    requests?: Array<{ req: FindRequest, omit?: boolean }>
    limit?: number
    offset?: number
}

/** Builder/executor for list and find operations against one layout. */
export class RecordGetOperation<T extends LayoutInterface, OPTIONS extends GetOperationOptions<T>> {
    protected layout: LayoutBase
    protected limit: number = 100
    protected scriptData: ScriptRequestData = {}
    protected sortData: Array<{ fieldName: string, sortOrder: SortOrder }> = []
    protected portals: Partial<PortalData<T>>
    protected offset: number = 1
    protected requests: Array<{ req: FindRequestRaw, omit?: boolean }> = []

    constructor (layout: LayoutBase, options: OPTIONS) {
        this.layout = layout
        this.sortData = []
        this.portals = options.portals
        this.offset = options.offset ?? 1 // Offset refers to the starting record. offset 1 is the same as no offset.
        this.limit = options.limit ?? 100
        if (options.requests) {
            for (const req of options.requests) this.addRequest(req.req, req.omit ?? false)
        }
    }

    get isFindRequest () {
        return this.requests.length !== 0
    }

    private formatQueries () {
        const test = this.requests.map(query => {
            const out: any = {}
            for (const key of Object.keys(query.req)) {
                if (query.req[key]) out[key] = query.req[key]
                else {
                    out[key] = query.req[key]
                }
            }
            if (query.omit) out.omit = 'true'
            return out
        })
        return test
    }

    protected generateParamsBody (offset: number, limit: number) {
        const params: Record<string, any> = {
            limit: limit.toString(),
            offset: offset.toString(),
            dateformats: 2 // Ensure dates are received in ISO8601 format
        }
        if (this.sortData.length !== 0) params.sort = this.sortData

        if (this.scriptData.after) params.script = this.scriptData.after.name
        if (this.scriptData.after?.parameter) params['script.param'] = this.scriptData.after.parameter

        if (this.scriptData.presort) params['script.presort'] = this.scriptData.presort.name
        if (this.scriptData.presort?.parameter) params['script.presort.param'] = this.scriptData.presort.parameter

        if (this.scriptData.prerequest) params['script.prerequest'] = this.scriptData.prerequest.name
        if (this.scriptData.prerequest?.parameter) params['script.prerequest.param'] = this.scriptData.prerequest.parameter

        if (this.requests.length !== 0) params.query = this.formatQueries()

        const portals: Array<keyof typeof this.portals> = Object.keys(this.portals)
        params.portal = portals
        for (const portal of portals) {
            params[`offset.${portal.toString()}`] = this.portals[portal]?.offset
            params[`limit.${portal.toString()}`] = this.portals[portal]?.limit
        }

        return params
    }

    protected generateParamsURL (offset: number, limit: number) {
        const params = new URLSearchParams({
            _limit: limit.toString(),
            _offset: offset.toString(),
            dateformats: '2' // Ensure dates are received in ISO8601 format
        })
        if (this.sortData.length !== 0) params.set('_sort', JSON.stringify(this.sortData))

        if (this.scriptData.after) params.set('script', this.scriptData.after.name)
        if (this.scriptData.after?.parameter) params.set('script.param', this.scriptData.after.parameter)

        if (this.scriptData.presort) params.set('script.presort', this.scriptData.presort.name)
        if (this.scriptData.presort?.parameter) params.set('script.presort.param', this.scriptData.presort.parameter)

        if (this.scriptData.prerequest) params.set('script.prerequest', this.scriptData.prerequest.name)
        if (this.scriptData.prerequest?.parameter) params.set('script.prerequest.param', this.scriptData.prerequest.parameter)

        const portals: Array<keyof typeof this.portals> = Object.keys(this.portals)
        for (const portal of portals) {
            params.set(`_offset.${portal.toString()}`, (this.portals[portal]?.limit ?? '').toString())
            params.set(`_offset.${portal.toString()}`, (this.portals[portal]?.offset ?? '').toString())
        }
        params.set('portal', JSON.stringify(portals))

        return params
    }

    /**
     * Configures any FileMaker scripts to be run as a part of the request
     *
     * @param {ScriptRequestData} scripts - The script request data to set.
     * @return {this} - The current instance of the class.
     */
    scripts (scripts: ScriptRequestData) {
        this.scriptData = scripts
        return this
    }

    /**
     * Add sort clause in request order.
     *
     * @param {string} fieldName - The name of the field by which the data should be sorted.
     * @param {SortOrder} sortOrder - The sort order to be applied (either "asc" for ascending or "desc" for descending).
     *
     * @return {this} - Returns the current instance of the object.
     */
    sort (fieldName: string, sortOrder: SortOrder) {
        this.sortData.push({fieldName, sortOrder})
        return this
    }

    private parseFindRequest<I extends FindRequest>(query: I): { [key in keyof I]: string } {
        const out: any = {}
        for (const key of Object.keys(query)) {
            out[key] = query[key][FindRequestSymbol].map(item => {
                if (typeof item === 'string') return item

                // Re-write date into correct format
                return item
                    .moment
                    .clone()
                    .utcOffset(this.layout.database.host.timezoneOffsetFunc(item.moment))
                    .format(
                        item.type === 'date'
                            ? this.layout.database.host.dateFormat
                            : item.type === 'time'
                                ? this.layout.database.host.timeFormat
                                : this.layout.database.host.timeStampFormat
                    )
            }).join('')
        }
        return out
    }

    /**
     * Add one FileMaker find request block.
     *
     * @param {FindRequest} query - The find request to be added.
     * @param {boolean} [omit=false] - Flag to indicate if the find request should be omitted.
     * @return {Object} - The current object instance.
     */
    addRequest (query: FindRequest, omit = false) {
        this.requests.push({req: this.parseFindRequest(query), omit})
        return this
    }

    /**
     * Execute request and return current page of records.
     *
     * @returns {Promise} A promise that resolves with the result of the fetch operation.
     */
    async fetch () {
        return await this.performFind(this.offset, this.limit)
    }

    private async performFind (offset: number, limit: number): Promise<Array<LayoutRecord<
    PickPortals<T, keyof OPTIONS['portals']>
    >>> {
        await this.layout.getLayoutMeta()

        const isFind = this.isFindRequest
        let endpoint = this.layout.endpoint + (isFind ? '/_find' : '/records')
        if (!isFind) endpoint += '?' + new URLSearchParams(this.generateParamsURL(offset, limit)).toString()
        const reqData = {
            // port: 443,
            method: isFind ? 'POST' : 'GET',
            type: ApiRecordResponseObj,
            body: isFind ? JSON.stringify(this.generateParamsBody(offset, limit)) : undefined
        }

        try {
            const res = await this.layout.database.fetchJSON(
                endpoint,
                reqData
            )
            // console.log("RESOLVING")
            if (!this.layout.metadata) await this.layout.getLayoutMeta()
            return res.data.map(item => {
                return new LayoutRecord(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
            })
        } catch (e) {
            if (e instanceof FMError) {
                if (e.code === 401) {
                    // No records found, so return empty set
                    return []
                }
            }
            throw e
        }
    }

    /**
     * Create async iterator that pages through results lazily.
     * @param pageSize min: 1, max: 999
     */
    iterate (pageSize = 100) {
        let nextOffset = this.offset
        const startOffset: number = JSON.parse(JSON.stringify(this.offset))
        const limit = this.limit

        let exitAfterLastRecord = false
        let records: Array<LayoutRecord<PickPortals<T, keyof OPTIONS['portals']>>> = []

        const fetch = async () => {
            const theoreticalLimit = (limit - nextOffset) + startOffset
            if (theoreticalLimit === 0) {
                exitAfterLastRecord = true
                records = []
                return
            }
            const requestLimit = Math.min(theoreticalLimit, pageSize)
            records = await this.performFind(nextOffset, requestLimit)
            nextOffset += pageSize
            if (records.length < requestLimit) exitAfterLastRecord = true
        }

        const iterator = {
            next: async () => {
                if (records.length === 0 && !exitAfterLastRecord) {
                    await fetch()
                }

                if (records.length === 0 && exitAfterLastRecord) {
                    return {done: true, value: undefined}
                } else {
                    const record = records.shift()
                    return {done: false, value: record}
                }
            },
            [Symbol.asyncIterator] () {
                return this
            }
        }

        return iterator
    }

    [Symbol.asyncIterator] () {
        return this.iterate()
    }
}
