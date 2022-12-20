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
import EventEmitter from 'events';
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const errs = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fmErrors.json')).toString())

export default class FileMakerConnection {
    username
    #password
    hostname = ""
    database
    token;
    #rejectUnauthroized;

    constructor() {
    }

    get endpoint() {
        return `https://${this.hostname}/fmi/data/v2/databases/${encodeURI(this.database)}`
    }

    async login(hostname, database, username, password, rejectUnauthorized = true) {
        if (this.token) throw new Error("Already logged in. Run logout() first")

        this.username = username
        this.#password = password
        this.hostname = hostname
        this.database = database
        this.#rejectUnauthroized = rejectUnauthorized

        return await this.#createSession()
    }

    logout() {
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
            this.token = null
            this.database = null
            this.hostname = null
            resolve()
        })
    }

    importSession(hostname, database, token, rejectUnauthorized = true) {
        this.token = token
        this.database = database
        this.hostname = hostname
        this.#rejectUnauthroized = rejectUnauthorized
    }

    #createSession() {
        return new Promise(async (resolve, reject) => {
            fetch(`${this.endpoint}/sessions`, {
                hostname: this.hostname,
                port: 443,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + btoa(this.username + ":" + this.#password)
                }
            }).then(res => {
                console.log(res)
                return res.json()
            })
                .then(res => {
                    // console.log(res)
                    if (res.messages[0].code === "0") {
                        this.token = res.response.token
                        console.log(res)
                        resolve(this.token)
                    } else {
                        reject(new FMError(res.messages[0].code, res.status, res))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    createLayout(name) {
        return new layout(this, name)
    }

    async apiRequest(url, options) {
        if (!options.headers) options.headers = {}
        options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json"
        options.headers["authorization"] = "Bearer " + this.token
        options.rejectUnauthorized = this.#rejectUnauthroized

        let _fetch = await fetch(url, options)
        let data = await _fetch.json()
        return data
    }

    setGlobals(globalFields) {
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

    script(name, parameter) {
        return new script(name)
    }
}

class layout {
    constructor(conn, name) {
        this.conn = conn
        this.name = name
    }

    get endpoint() {
        return `${this.conn.endpoint}/layouts/${this.name}`
    }

    getScript(script) {
        return new script(this, script)
    }

    createRecord(body = {}) {
        // console.log(fieldData)
        return new Promise(async (resolve, reject) => {
            this.conn.apiRequest(`${this.endpoint}/records`, {
                port: 443,
                method: "POST",
                body: JSON.stringify(body)
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        resolve(
                            new record(this, res.response.recordId, res.response.modId)
                        )
                    } else {
                        reject(new FMError(res.messages[0].code, res.status, res))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    getRecord(recordId) {
        return new record(this, recordId)
    }

    newFind() {
        return new find(this)
    }

    runScript(script) {
        return new Promise(async (resolve, reject) => {
            let url = `${this.endpoint}/script/${encodeURI(script.name)}`
            if (script.parameter) url += "?" + encodeURI(script.parameter)
            this.conn.apiRequest(url, {
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
}

class script {
    constructor(name, parameter) {
        this.name = name
        this.parameter = parameter
    }
}

class record extends EventEmitter {
    constructor(layout, recordId, modId = recordId, fieldData = {}, portalData = null) {
        super();
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
        this.fields = this.#processFieldData(fieldData)
        this.portals = []
        if (portalData) {
            this.#processPortalData(portalData)
        }
        this.on("saved", () => {
            for (let field of this.fields) field.edited = false
        })
    }

    get endpoint() {
        return `${this.layout.endpoint}/records/${this.recordId}`
    }

    get edited() {
        return !!this.fields.find(i => i.edited)
    }

    #processPortalData(portalData) {
        for (let item of Object.keys(portalData)) {
            this.portals.push(new portal(this, item, portalData[item].map(item => {
                let fieldData = item
                delete fieldData.recordId
                delete fieldData.modId
                return new portalItem(this, item.recordId, item.modId, fieldData)
            })))
        }
    }

    #processFieldData(fieldData) {
        return Object.keys(fieldData).map(item => {
            return new field(this, item, fieldData[item])
        })
    }

    get() {
        return new Promise(async (resolve, reject) => {
            this.layout.conn.apiRequest(this.endpoint, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        // console.log(res, res.response.data)
                        this.modId = res.response.data[0].modId
                        this.fields = this.#processFieldData(res.response.data[0].fieldData)
                        this.portalData = []
                        if (res.response.data[0].portalData) this.#processPortalData(res.response.data[0].portalData)
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

    save(extraBody = {}) {
        return new Promise(async (resolve, reject) => {
            let data = this.toObject()
            delete data.recordId
            delete data.modId

            for (let item of Object.keys(extraBody)) data[item] = extraBody[item]
            this.layout.conn.apiRequest(this.endpoint, {
                port: 443,
                method: "PATCH",
                body: JSON.stringify(data)
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
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
    ) {
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
    constructor(record, id, contents) {
        this.record = record
        this.id = id
        this.value = contents
        this.edited = false
    }

    set(content) {
        this.value = content
        this.edited = true
    }

    containerUpload(buffer, filename, mime) {
        return new Promise(async (resolve, reject) => {
            let form = new FormData()
            form.append("upload", new File([buffer], filename, {type: mime}))

            let _fetch = await fetch(`${this.record.endpoint}/containers/${this.id}/1`, {
                method: "POST",
                headers: {"Authorization": "Bearer " + this.record.layout.conn.token},
                body: form
            }).then(res => res.json())
                .then(data => {
                    if (data.messages[0].code === "0") {
                        resolve()
                    } else {
                        reject(new FMError(data.messages[0].code, data.status, data))
                    }
                })
                .catch(e => {reject(e)})
        })
    }
}

class portal {
    constructor(record, name, records = []) {
        this.record = record
        this.name = name
        this.records = records
        for (let item of this.records) item.attachPortal(this)
    }
}

class portalItem extends record {
    constructor(record, recordId, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId, fieldData);
        record.on("saved", () => {
            this.emit("saved")
        })
    }

    attachPortal(portal) {
        this.portal = portal
    }

    save(extraBody = {}) {
        return this.portal.record.save(extraBody)
    }

    toObject(fieldFilter) {
        let res = {}
        for (let field of this.fields.filter(a => fieldFilter(a))) res[field.id] = field.value
        res.recordId = this.recordId
        res.modId = this.modId
        // console.log(res)
        return res
    }
}

class find {
    constructor(layout) {
        this.layout = layout
        this.queries = []
        this.scripts = {
            "script": null, // Runs after everything
            "script.prerequeset": null, // Runs before the request
            "script.presort": null // Runs before the sort
        }
        this.sort = []
    }

    #toObject() {
        let out = {query: this.queries}
        if (this.sort.length !== 0) out.sort = this.sort

        for (let item of Object.keys(this.scripts)) {
            if (this.scripts[item]) {
                out[item] = this.scripts[item].name
                if (this.scripts[item].parameter) out[item + ".param"] = this.scripts[item].parameter
            }
        }

        return out
    }

    addRequests(...requests) {
        for (let item of requests) this.queries.push(item)
        return this
    }

    addSort(fieldName, sortOrder) {
        this.sort.push({fieldName, sortOrder})
        return this
    }

    find() {
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.conn.apiRequest(`${this.layout.endpoint}/_find`, {
                port: 443,
                method: "POST",
                body: JSON.stringify(this.#toObject())
            }).then(res => {
                // // console.log(res)
                if (res.messages[0].code === "0") {
                    // console.log("RESOLVING")
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
    constructor(code, httpStatus, res) {
        super(code);
        this.httpStatus = httpStatus
        this.res = res
        this.code = typeof code === "string" ? parseInt(code) : code
        this.message = errs.find(err => e === this.code) || "Unknown error"
    }
}

//
// module.exports = {
//     default: {FileMakerConnection}
// }