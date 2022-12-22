/*
 * Copyright (c) 2022. See LICENSE file for more information
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
import fetch, { File, FormData } from 'node-fetch';
import { EventEmitter } from "events";
// @ts-ignore
import fs from "fs";
// @ts-ignore
import path from "path";
// @ts-ignore
import { fileURLToPath } from "url";
import * as https from "https";
// import * as btoa from "btoa";
// @ts-ignore
const errs = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fmErrors.json')).toString());
export default class FileMakerConnection {
    constructor() {
    }
    get endpoint() {
        return `https://${this.hostname}/fmi/data/v2/databases/${encodeURI(this.database)}`;
    }
    login(hostname, database, username, password, rejectUnauthorized = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.token)
                throw new Error("Already logged in. Run logout() first");
            this.username = username;
            this.password = password;
            this.hostname = hostname;
            this.database = database;
            this.rejectUnauthroized = rejectUnauthorized;
            return yield this.createSession();
        });
    }
    logout() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!this.token)
                reject(new Error("Not logged in"));
            let _fetch = yield fetch(`${this.endpoint}/sessions/${this.token}`, {
                method: "DELETE",
                headers: {
                    "content-type": "application/json"
                }
            });
            let data = yield _fetch.json();
            // console.log(data)
            this.token = null;
            this.database = null;
            this.hostname = null;
            resolve();
        }));
    }
    importSession(hostname, database, token, rejectUnauthorized = true) {
        this.token = token;
        this.database = database;
        this.hostname = hostname;
        this.rejectUnauthroized = rejectUnauthorized;
    }
    createSession() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            fetch(`${this.endpoint}/sessions`, {
                hostname: this.hostname,
                port: 443,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + Buffer.from(this.username + ":" + this.password).toString("base64")
                }
            }).then(res => {
                console.log(res);
                return res.json();
            })
                .then(res => {
                let _res = res;
                if (_res.messages[0].code === "0") {
                    this.token = _res.response.token;
                    console.log(_res);
                    resolve(this.token);
                }
                else {
                    reject(new FMError(_res.messages[0].code, _res.status, res));
                }
            })
                .catch(e => {
                reject(e);
            });
        }));
    }
    getLayout(name) {
        return new layout(this, name);
    }
    apiRequest(url, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.headers)
                options.headers = {};
            options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json";
            options.headers["authorization"] = "Bearer " + this.token;
            options.rejectUnauthorized = this.rejectUnauthroized;
            let _fetch = yield fetch(url, options);
            let data = yield _fetch.json();
            return data;
        });
    }
    setGlobals(globalFields) {
        // console.log({globalFields})
        return new Promise((resolve, reject) => {
            this.apiRequest(`${this.endpoint}/globals`, {
                method: "PATCH",
                body: JSON.stringify({ globalFields })
            }).then(res => {
                // console.log(res)
                if (res.messages[0].code === "0") {
                    resolve();
                }
                else {
                    reject(new FMError(res.messages[0].code, res.status, res));
                }
            })
                .catch(e => {
                reject(e);
            });
        });
    }
    script(name, parameter) {
        return { name, parameter };
    }
}
class layout {
    constructor(conn, name) {
        this.conn = conn;
        this.name = name;
    }
    get endpoint() {
        return `${this.conn.endpoint}/layouts/${this.name}`;
    }
    getScript(script) {
        return new script(this, script);
    }
    createRecord() {
        return new Promise((resolve, reject) => {
            // Get the layout's metadata
            this.conn.apiRequest(`${this.endpoint}`).then(res => {
                let fields = {};
                for (let _field of res.response.fieldMetaData) {
                    fields[_field.name] = "";
                }
                resolve(new record(this, -1, 0, fields));
            });
        });
    }
    getRecord(recordId) {
        return new record(this, recordId);
    }
    newFind() {
        return new find(this);
    }
    runScript(script) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let url = `${this.endpoint}/script/${encodeURI(script.name)}`;
            if (script.parameter)
                url += "?" + encodeURI(script.parameter);
            this.conn.apiRequest(url, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                if (res.messages[0].code === "0") {
                    resolve(res.response);
                }
                else {
                    // console.log(res)
                    reject(new FMError(res.messages[0].code, res.status, res));
                }
            })
                .catch(e => {
                reject(e);
            });
        }));
    }
    getLayoutMeta() {
        return new Promise((resolve, reject) => {
            this.conn.apiRequest(this.endpoint).then(res => {
                this.metadata = res.response;
                resolve(this);
            })
                .catch(e => reject(e));
        });
    }
}
class record extends EventEmitter {
    constructor(layout, recordId, modId = recordId, fieldData = {}, portalData = null) {
        super();
        this.layout = layout;
        this.recordId = recordId;
        this.modId = modId;
        this.fields = this.processFieldData(fieldData);
        this.portals = [];
        if (portalData) {
            this.processPortalData(portalData);
        }
        this.on("saved", () => {
            for (let field of this.fields)
                field.edited = false;
        });
    }
    get endpoint() {
        return `${this.layout.endpoint}/records/${this.recordId}`;
    }
    get edited() {
        return !!this.fields.find(i => i.edited);
    }
    processPortalData(portalData) {
        for (let item of Object.keys(portalData)) {
            this.portals.push(new portal(this, item, portalData[item].map(item => {
                let fieldData = item;
                delete fieldData.recordId;
                delete fieldData.modId;
                return new portalItem(this, item.recordId, item.modId, fieldData);
            })));
        }
    }
    processFieldData(fieldData) {
        return Object.keys(fieldData).map(item => {
            return new field(this, item, fieldData[item]);
        });
    }
    get() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!this.layout.metadata)
                yield this.layout.getLayoutMeta();
            this.layout.conn.apiRequest(this.endpoint, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                if (res.messages[0].code === "0") {
                    // console.log(res, res.response.data)
                    this.modId = res.response.data[0].modId;
                    this.fields = this.processFieldData(res.response.data[0].fieldData);
                    this.portalData = [];
                    if (res.response.data[0].portalData)
                        this.processPortalData(res.response.data[0].portalData);
                    resolve(this);
                }
                else {
                    reject(new FMError(res.messages[0].code, res.status, res));
                }
            })
                .catch(e => {
                reject(e);
            });
        }));
    }
    commit(extraBody = {}) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let data = this.toObject();
            delete data.recordId;
            delete data.modId;
            if (this.recordId === -1) {
                // This is a new record
                this.layout.conn.apiRequest(`${this.layout.endpoint}/records`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify({
                        fieldData: data.fieldData
                    })
                })
                    .then(res => {
                    if (res.messages[0].code === "0") {
                        this.recordId = res.response.recordId;
                        this.modId = res.response.modId;
                        resolve(this);
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res));
                    }
                })
                    .catch(e => {
                    reject(e);
                });
                return;
            }
            for (let item of Object.keys(extraBody))
                data[item] = extraBody[item];
            this.layout.conn.apiRequest(this.endpoint, {
                port: 443,
                method: "PATCH",
                body: JSON.stringify(data)
            })
                .then(res => {
                if (res.messages[0].code === "0") {
                    this.modId = res.response.modId;
                    this.emit("saved");
                    resolve(this);
                }
                else {
                    reject(new FMError(res.messages[0].code, res.status, res));
                }
            })
                .catch(e => {
                reject(e);
            });
        }));
    }
    getField(field) {
        return this.fields.find(_field => _field.id === field);
    }
    getPortal(portal) {
        return this.portals.find(p => p.name === portal);
    }
    toObject(filter = (a) => a.edited, portalFilter = (a) => a.records.find(record => record.edited), portalRowFilter = (a) => a.edited, portalFieldFilter = (a) => a.edited) {
        let fields_processed = {};
        for (let field of this.fields.filter(field => filter(field))) {
            fields_processed[field.id] = field.value;
        }
        let obj = {
            "recordId": this.recordId,
            "modId": this.modId,
            "fieldData": fields_processed
        };
        // Check if there's been any edited portal information
        let portals = this.portals.filter(a => portalFilter(a));
        if (portals) {
            obj["portalData"] = {};
            for (let portal of portals) {
                obj["portalData"][portal.name] = portal.records.filter(a => portalRowFilter(a)).map(record => {
                    return record.toObject(portalFieldFilter);
                });
            }
        }
        return obj;
    }
}
class field {
    constructor(record, id, contents) {
        this.record = record;
        this.id = id;
        this.value = contents;
        this.edited = false;
    }
    set(content) {
        if (this.dataType === "container")
            throw "Cannot set container value using set(). Use upload() instead.";
        this.value = content;
        this.edited = true;
    }
    get dataType() {
        if (this.record instanceof portalItem) {
            return this.record.layout.metadata.portalMetaData.find(name => name === this.id).result;
        }
        else {
            return this.record.layout.metadata.fieldMetaData.find(name => name === this.id).result;
        }
    }
    upload(buffer, filename, mime) {
        if (this.dataType !== "container")
            throw "Cannot upload a file to the field; " + this.id + " (not a container field)";
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let form = new FormData();
            form.append("upload", new File([buffer], filename, { type: mime }));
            let _fetch = yield fetch(`${this.record.endpoint}/containers/${this.id}/1`, {
                method: "POST",
                headers: { "Authorization": "Bearer " + this.record.layout.conn.token },
                body: form
            }).then(res => res.json())
                .then(data => {
                let _res = data;
                if (_res.messages[0].code === "0") {
                    resolve();
                }
                else {
                    reject(new FMError(_res.messages[0].code, _res.status, data));
                }
            })
                .catch(e => { reject(e); });
        }));
    }
    download() {
        return new Promise((resolve, reject) => {
            https.get(this.value.toString(), (res) => {
                resolve(res);
            });
        });
    }
}
class portal {
    constructor(record, name, records = []) {
        this.record = record;
        this.name = name;
        this.records = records;
        for (let item of this.records)
            item.attachPortal(this);
    }
}
class portalItem extends record {
    constructor(record, recordId, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId, fieldData);
        record.on("saved", () => {
            this.emit("saved");
        });
    }
    attachPortal(portal) {
        this.portal = portal;
    }
    commit(extraBody = {}) {
        return this.portal.record.commit(extraBody);
    }
    toObject(fieldFilter) {
        super.toObject();
        let res = {
            recordId: this.recordId, modId: this.modId
        };
        for (let field of this.fields.filter(a => fieldFilter(a)))
            res[field.id] = field.value;
        // console.log(res)
        return res;
    }
}
class find {
    constructor(layout) {
        this.layout = layout;
        this.queries = [];
        this.scripts = {
            "script": null,
            "script.prerequeset": null,
            "script.presort": null // Runs before the sort
        };
        this.sort = [];
    }
    toObject() {
        let out = { query: this.queries, sort: undefined };
        if (this.sort.length !== 0)
            out.sort = this.sort;
        for (let item of Object.keys(this.scripts)) {
            if (this.scripts[item]) {
                out[item] = this.scripts[item].name;
                if (this.scripts[item].parameter)
                    out[item + ".param"] = this.scripts[item].parameter;
            }
        }
        return out;
    }
    addRequests(...requests) {
        for (let item of requests)
            this.queries.push(item);
        return this;
    }
    addSort(fieldName, sortOrder) {
        this.sort.push({ fieldName, sortOrder });
        return this;
    }
    find() {
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.conn.apiRequest(`${this.layout.endpoint}/_find`, {
                port: 443,
                method: "POST",
                body: JSON.stringify(this.toObject())
            }).then((res) => __awaiter(this, void 0, void 0, function* () {
                // // console.log(res)
                if (res.messages[0].code === "0") {
                    // console.log("RESOLVING")
                    if (!this.layout.metadata)
                        yield this.layout.getLayoutMeta();
                    let data = res.response.data.map(item => {
                        return new record(this.layout, item.recordId, item.modId, item.fieldData, item.portalData);
                    });
                    resolve(data);
                }
                else {
                    reject(new FMError(res.messages[0].code, res.status, res));
                }
            }))
                .catch(e => {
                reject(e);
            });
        });
    }
}
export class FMError extends Error {
    constructor(code, httpStatus, res) {
        super(code);
        this.httpStatus = httpStatus;
        this.res = res;
        this.code = typeof code === "string" ? parseInt(code) : code;
        this.message = errs.find(err => err.e === this.code) || "Unknown error";
    }
}
//
// module.exports = {
//     default: {FileMakerConnection}
// }
