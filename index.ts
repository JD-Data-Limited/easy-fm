/*
 * Copyright (c) 2022-2023. See LICENSE file for more information
 */

// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
import fetch, {
    Blob,
    blobFrom,
    blobFromSync,
    File,
    fileFrom,
    fileFromSync,
    FormData,
    Headers,
    Request,
    Response
} from 'node-fetch';
import {EventEmitter} from "events";
// @ts-ignore
import fs from "fs"
// @ts-ignore
import path from "path"
// @ts-ignore
import {fileURLToPath} from "url"
import * as https from "https";

// import * as btoa from "btoa";

interface connectionOptions {
    hostname: string | undefined,
    database: databaseOptions
}

interface hostConnectionOptions {
    hostname: string
    database: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken,
    externalSources: (loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken)[]
}

interface databaseOptions {
    method: any
    database: string
}

interface loginOptionsToken extends databaseOptions {
    method: "token"
    token: string
}

interface loginOptionsOAuth extends databaseOptions {
    method: "oauth"
    oauth: {
        requestId: string,
        requestIdentifier: string
    }
}

interface loginOptionsFileMaker extends databaseOptions {
    method: "filemaker"
    username: string,
    password: string,
}

interface loginOptionsClaris extends databaseOptions {
    method: "claris"
    claris: {
        fmid: string
    }
}

interface limitPortalsInterface {
    portal: portal,
    offset: number,
    limit: number
}

// @ts-ignore
const errs = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fmErrors.json')).toString())

interface Script {
    name: string
    parameter: string
}

interface recordObject {
    recordId: number
    modId: number,
    fieldData: any
}

export default class FileMakerConnection {
    private _token: any;
    private hostname: string;
    public readonly rejectUnauthroized: boolean;
    private databaseConDetails: hostConnectionOptions
    public name: string;

    constructor(conn: hostConnectionOptions, rejectUnauthorized = true) {
        this.hostname = conn.hostname
        this.name = conn.database.database
        this.databaseConDetails = conn
        this.rejectUnauthroized = rejectUnauthorized
    }

    private generateExternalSourceLogin(data: databaseOptions | loginOptionsFileMaker) {
        if (data.method === "filemaker") {
            let _data = <loginOptionsFileMaker>data
            return {
                database: _data.database,
                username: _data.username,
                password: _data.password
            }
        } else {
            throw "Not yet supported login method"
        }
    }

    logout(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!this.token) reject(new Error("Not logged in"))

            let _fetch = await fetch(`${this.endpoint}/sessions/${this.token}`, {
                method: "DELETE",
                headers: {
                    "content-type": "application/json"
                }
            })
            let data = await _fetch.json()
            // console.log(data)
            this._token = null
            this.hostname = null
            resolve()
        })
    }

    login() {
        return new Promise<string>((resolve, reject) => {
            if (this.token) throw new Error("Already logged in. Run logout() first")

            if (this.databaseConDetails.database.method === "filemaker") {
                fetch(`${this.endpoint}/sessions`, {
                    hostname: this.hostname,
                    port: 443,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Basic " + Buffer.from((<loginOptionsFileMaker>this.databaseConDetails[0]).username + ":" + (<loginOptionsFileMaker>this.databaseConDetails[0]).password).toString("base64")
                    },
                    body: JSON.stringify({
                        fmDataSource: this.databaseConDetails.externalSources.map(i => {
                            let _i = <databaseOptions>i
                            return this.generateExternalSourceLogin(_i)
                        })
                    })
                }).then(async res => {
                    if (res.status === 200) {
                        this._token = res.headers.get('x-fm-data-access-token')
                        resolve(this._token)
                    } else {
                        let _res = <any>(await res.json())
                        reject(new FMError(_res.messages[0].code, _res.status, res))
                    }
                })
                    .catch(e => {
                        reject(e)
                    })
            } else if (this.databaseConDetails.database.method === "token") {
                this._token = (<loginOptionsToken>this.databaseConDetails[0]).token
                resolve(this.token)
            } else if (this.databaseConDetails.database.method === "oauth") {
                fetch(`${this.endpoint}/sessions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-FM-Data-OAuth-RequestId": (<loginOptionsOAuth>this.databaseConDetails[0]).oauth.requestId,
                        "X-FM-Data-OAuth-Identifier": (<loginOptionsOAuth>this.databaseConDetails[0]).oauth.requestIdentifier
                    },
                    body: JSON.stringify({
                        fmDataSource: this.databaseConDetails.externalSources.map(i => {
                            let _i = <databaseOptions>i
                            return this.generateExternalSourceLogin(_i)
                        })
                    })
                })
                    .then(res => res.json())
                    .then(res => {
                        let _res = <any>res
                        this._token = _res.headers["x-fm-data-access-token"]
                        resolve(this.token)
                    })
            } else if (this.databaseConDetails.database.method === "claris") {
                fetch(`${this.endpoint}/sessions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": (<loginOptionsClaris>this.databaseConDetails[0]).claris.fmid,
                    },
                    body: "{}"
                })
                    .then(res => res.json())
                    .then(res => {
                        let _res = <any>res
                        this._token = _res.headers["x-fm-data-access-token"]
                        resolve(this.token)
                    })
            }
        })
    }

    get token() {
        return this._token
    }

    get endpoint(): string {
        return `https://${this.hostname}/fmi/data/v2/databases/${this.name}`
    }

    async apiRequest(url: string | Request, options: any = {}): Promise<any> {
        if (!options.headers) options.headers = {}
        options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json"
        options.headers["authorization"] = "Bearer " + this._token
        options.rejectUnauthorized = this.rejectUnauthroized

        let _fetch = await fetch(url, options)
        let data = await _fetch.json()
        return (data as any)
    }

    getLayout(name): layout {
        return new layout(this, name)
    }

    setGlobals(globalFields): Promise<void> {
        // console.log({globalFields})
        return new Promise((resolve, reject) => {
            this.apiRequest(`${this.endpoint}/globals`, {
                method: "PATCH",
                body: JSON.stringify({globalFields})
            }).then(res => {
                // console.log(res)
                if (res.messages[0].code === "0") {
                    resolve()
                } else {
                    reject(new FMError(res.messages[0].code, res.status, res))
                }
            })
                .catch(e => {
                    reject(e)
                })
        })
    }

    script(name, parameter): Script {
        return ({name, parameter} as Script)
    }
}

class layout {
    readonly database: FileMakerConnection;
    protected name: string;
    metadata: any;

    constructor(database: FileMakerConnection, name: string) {
        this.database = database
        this.name = name
    }

    get endpoint() {
        return `${this.database.endpoint}/layouts/${this.name}`
    }

    getScript(script) {
        return new script(this, script)
    }

    createRecord(): Promise<record | Error | void> {
        return new Promise((resolve, reject) => {
            // Get the layout's metadata
            this.getLayoutMeta().then(layout => {
                let fields = {}
                for (let _field of this.metadata.fieldMetaData) {
                    fields[_field.name] = ""
                }
                resolve(new record(this, -1, 0, fields))
            })
        })
    }

    getRecord(recordId): record {
        return new record(this, recordId)
    }

    newFind(): find {
        return new find(this)
    }

    runScript(script): Promise<string | FMError | Error> {
        return new Promise(async (resolve, reject) => {
            let url = `${this.endpoint}/script/${encodeURI(script.name)}`
            if (script.parameter) url += "?" + encodeURI(script.parameter)
            this.database.apiRequest(url, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        resolve(res.response)
                    } else {
                        // console.log(res)
                        reject(new FMError(res.messages[0].code, res.status, res))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    public getLayoutMeta(): Promise<layout | FMError> {
        return new Promise((resolve, reject) => {
            this.database.apiRequest(this.endpoint).then(res => {
                this.metadata = res.response
                resolve(this)
            })
                .catch(e => reject(e))
        })
    }
}

class record extends EventEmitter {
    readonly layout: layout;
    public recordId: number;
    modId: number;
    fields: field[];
    readonly portals: portal[];
    private portalData: any[];

    constructor(layout, recordId, modId = recordId, fieldData = {}, portalData = null) {
        super();
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
        this.fields = this.processFieldData(fieldData)
        this.portals = []
        if (portalData) {
            this.processPortalData(portalData)
        }
        this.on("saved", () => {
            for (let field of this.fields) field.edited = false
        })
    }

    get endpoint(): string {
        return `${this.layout.endpoint}/records/${this.recordId}`
    }

    get edited(): boolean {
        return !!this.fields.find(i => i.edited)
    }

    private processPortalData(portalData): void {
        for (let item of Object.keys(portalData)) {
            this.portals.push(new portal(this, item, portalData[item].map(item => {
                let fieldData = item
                delete fieldData.recordId
                delete fieldData.modId
                return new portalItem(this, item.recordId, item.modId, fieldData)
            })))
        }
    }

    processFieldData(fieldData): field[] {
        return Object.keys(fieldData).map(item => {
            return new field(this, item, fieldData[item])
        })
    }

    get() {
        if (this.recordId === -1) {
            throw "Cannot get this record until a commit() is done."
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
                        this.fields = this.processFieldData(res.response.data[0].fieldData)
                        this.portalData = []
                        if (res.response.data[0].portalData) this.processPortalData(res.response.data[0].portalData)
                        resolve(this)
                    } else {
                        reject(new FMError(res.messages[0].code, res.status, res))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    commit(extraBody = {
        fieldData: undefined
    }): Promise<record | FMError> {
        return new Promise(async (resolve, reject) => {
            let data = this.toObject()
            delete data.recordId
            delete data.modId

            if (this.recordId === -1) {
                // This is a new record
                extraBody.fieldData = data.fieldData

                this.layout.database.apiRequest(`${this.layout.endpoint}/records`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify(extraBody)
                })
                    .then(res => {
                        if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                            reject(new FMError(res.response.scriptError, res.status, res))
                        } else if (res.messages[0].code === "0") {
                            console.log(res)
                            this.recordId = parseInt(res.response.recordId)
                            this.modId = parseInt(res.response.modId)
                            resolve(this)
                        } else {
                            reject(new FMError(res.messages[0].code, res.status, res))
                        }
                    })
                    .catch(e => {
                        reject(e)
                    })

                return
            }

            for (let item of Object.keys(extraBody)) data[item] = extraBody[item]
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "PATCH",
                body: JSON.stringify(data)
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res))
                    } else if (res.messages[0].code === "0") {
                        console.log(res)
                        this.modId = res.response.modId
                        this.emit("saved")
                        resolve(this)
                    } else {
                        reject(new FMError(res.messages[0].code, res.status, res))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    getField(field) {
        return this.fields.find(_field => _field.id === field)
    }

    getPortal(portal) {
        return this.portals.find(p => p.name === portal)
    }

    toObject(filter = (a) => a.edited,
             portalFilter = (a) => a.records.find(record => record.edited),
             portalRowFilter = (a) => a.edited,
             portalFieldFilter = (a) => a.edited
    ): recordObject {
        let fields_processed = {}
        for (let field of this.fields.filter(field => filter(field))) {
            fields_processed[field.id] = field.value
        }
        let obj = {
            "recordId": this.recordId,
            "modId": this.modId,
            "fieldData": fields_processed
        }

        // Check if there's been any edited portal information
        let portals = this.portals.filter(a => portalFilter(a))
        if (portals) {
            obj["portalData"] = {}
            for (let portal of portals) {
                obj["portalData"][portal.name] = portal.records.filter(a => portalRowFilter(a)).map(record => {
                    return record.toObject(portalFieldFilter)
                })
            }
        }
        return obj
    }
}

class field {
    record: record;
    id: number;
    value: string | number;
    edited: boolean;

    constructor(record, id, contents) {
        this.record = record
        this.id = id
        this.value = contents
        this.edited = false
    }

    set(content) {
        if (this.dataType === "container") throw "Cannot set container value using set(). Use upload() instead."
        this.value = content
        this.edited = true
    }

    get dataType() {
        if (!this.record.layout.metadata) return "unknown"
        if (this.record instanceof portalItem) {
            return this.record.layout.metadata.portalMetaData.find(i => i.name === this.id).result || "unknown"
        } else {
            return this.record.layout.metadata.fieldMetaData.find(i => i.name === this.id).result || "unknown"
        }
    }

    upload(buffer: Buffer, filename: string, mime: string): Promise<void | FMError> {
        if (this.dataType !== "container") throw "Cannot upload a file to the field; " + this.id + " (not a container field)"
        return new Promise(async (resolve, reject) => {
            let form = new FormData()
            form.append("upload", new File([buffer], filename, {type: mime}))

            let _fetch = await fetch(`${this.record.endpoint}/containers/${this.id}/1`, {
                method: "POST",
                headers: {"Authorization": "Bearer " + this.record.layout.database.token},
                body: form
            }).then(res => res.json())
                .then(data => {
                    let _res = data as any
                    if (_res.messages[0].code === "0") {
                        resolve()
                    } else {
                        reject(new FMError(_res.messages[0].code, _res.status, data))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    download() {
        return new Promise((resolve, reject) => {
            https.get(this.value.toString(), (res) => {
                resolve(res)
            })
        })
    }
}

class portal {
    readonly record: record;
    readonly name: string;
    public records: portalItem[];

    constructor(record: record, name: string, records: portalItem[] = []) {
        this.record = record
        this.name = name
        this.records = records
        for (let item of this.records) item.attachPortal(this)
    }
}

class portalItem extends record {
    protected portal: portal;

    constructor(record, recordId, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId, fieldData);
        record.on("saved", () => {
            this.emit("saved")
        })
    }

    attachPortal(portal) {
        this.portal = portal
    }

    commit(extraBody = {fieldData: undefined}) {
        return this.portal.record.commit(extraBody)
    }

    toObject(fieldFilter): any {
        super.toObject()
        let res = {
            recordId: this.recordId, modId: this.modId
        } as recordObject
        for (let field of this.fields.filter(a => fieldFilter(a))) res[field.id] = field.value
        // console.log(res)
        return res
    }
}

class recordGetOperation {
    protected layout: layout
    protected limit: number = 100
    protected scripts: object
    protected sort: object[]
    protected limitPortals: limitPortalsInterface[] = []
    protected offset: number = 0

    constructor(layout) {
        this.layout = layout
        this.scripts = {
            "script": null, // Runs after everything
            "script.prerequeset": null, // Runs before the request
            "script.presort": null // Runs before the sort
        }
        this.sort = []
    }

    /*
    addToPortalLimit() will adjust the results of the get request so that if a layout has multiple portals in it,
    only data from the specified ones will be read. This may help reduce load on your FileMaker API
    */
    addToPortalLimit(portal: portal, offset = 0, limit = 100) {
        if (offset < 0) throw "Portal offset cannot be less than 0"
        this.limitPortals.push({portal, offset, limit})
    }

    setLimit(limit: number) {
        if (limit < 1) throw "Record limit too low"
        this.limit = limit
    }

    addSort(fieldName, sortOrder) {
        this.sort.push({fieldName, sortOrder})
        return this
    }

    setOffset(offset: number) {
        if (offset < 0) throw "Record offset too low"
        this.limit = offset
    }
}

class recordGetRange extends recordGetOperation {
    constructor(layout) {
        super(layout)
    }

    private generateQueryParams() {
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

        if (params.length === 0) return ""
        return "?" + params.join("&")
    }

    run() {
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.database.apiRequest(`${this.layout.endpoint}/records${this.generateQueryParams()}`, {
                method: "GET"
            }).then(async res => {
                // // console.log(res)
                if (res.messages[0].code === "0") {
                    // console.log("RESOLVING")
                    if (!this.layout.metadata) await this.layout.getLayoutMeta()
                    let data = res.response.data.map(item => {
                        return new record(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
                    })
                    resolve(data)
                } else {
                    reject(new FMError(res.messages[0].code, res.status, res))
                }
            })
                .catch(e => {
                    reject(e)
                })
        })
    }
}

class find extends recordGetOperation {
    protected queries: object[]

    constructor(layout) {
        super(layout)
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
            out["portal"] = this.limitPortals.map(p => p.portal.name)
            for (let item of this.limitPortals) {
                out["offset." + item.portal.name.replace(/[^0-9A-z]/g, "")] = item.offset
                out["limit." + item.portal.name.replace(/[^0-9A-z]/g, "")] = item.limit
            }
        }

        return out
    }

    addRequests(...requests) {
        for (let item of requests) this.queries.push(item)
        return this
    }

    find() {
        return this.run()
    }

    run() {
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.database.apiRequest(`${this.layout.endpoint}/_find`, {
                port: 443,
                method: "POST",
                body: JSON.stringify(this.toObject())
            }).then(async res => {
                // // console.log(res)
                if (res.messages[0].code === "0") {
                    // console.log("RESOLVING")
                    if (!this.layout.metadata) await this.layout.getLayoutMeta()
                    let data = res.response.data.map(item => {
                        return new record(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
                    })
                    resolve(data)
                } else {
                    reject(new FMError(res.messages[0].code, res.status, res))
                }
            })
                .catch(e => {
                    reject(e)
                })
        })
    }
}

export class FMError extends Error {
    readonly httpStatus: number
    readonly res: any
    readonly code: number
    readonly message: string
    readonly messages: string

    constructor(code, httpStatus, res) {
        if (typeof code === "string") code = parseInt(code)
        super(errs.find(err => err.e === code).d || "Unknown error");
        this.httpStatus = httpStatus
        this.res = res
        this.messages = res.messages
        this.code = typeof code === "string" ? parseInt(code) : code
        Error.captureStackTrace(this, FMError)
    }
}

//
// module.exports = {
//     default: {FileMakerConnection}
// }