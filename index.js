/*
 * Copyright (c) 2022-2023. See LICENSE file for more information
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
import * as moment from "moment";
// @ts-ignore
const errs = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fmErrors.json')).toString());
export default class FMHost {
    constructor(_hostname, timezoneOffset = 0 - (new Date()).getTimezoneOffset(), verify = true) {
        if (!(/^https?:\/\//).test(_hostname))
            throw "hostname MUST begin with either http:// or https://";
        this.hostname = _hostname;
        this.timezoneOffset = timezoneOffset;
        this.verify = verify;
    }
    listDatabases(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            let headers = {};
            if (credentials) {
                headers = generateAuthorizationHeaders(credentials);
            }
            let _fetch = yield fetch(`${this.hostname}/fmi/data/v2/databases`, {
                method: "GET",
                headers
            });
            let data = yield _fetch.json();
            // console.log(data.messages[0])
            if (data.messages[0].code === "0") {
                return data.response.databases;
            }
            else {
                // @ts-ignore
                throw new FMError(data.messages[0].code, data.status, data);
            }
        });
    }
    database(data) {
        return new Database(this, data);
    }
    getMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.metadata)
                return this.metadata;
            let _fetch = yield fetch(`${this.hostname}/fmi/data/v2/productInfo`, {
                method: "GET",
            });
            let data = yield _fetch.json();
            // console.log(data.messages[0])
            if (data.messages[0].code === "0") {
                this.metadata = data.response;
                return data.response;
            }
            else {
                // @ts-ignore
                throw new FMError(data.messages[0].code, data.status, data);
            }
        });
    }
}
export class Database extends EventEmitter {
    constructor(host, conn) {
        super();
        this.host = host;
        this.name = conn.database;
        this.connection_details = conn;
    }
    generateExternalSourceLogin(data) {
        if (data.credentials.method === "filemaker") {
            let _data = data.credentials;
            return {
                database: data.database,
                username: _data.username,
                password: _data.password
            };
        }
        else {
            throw "Not yet supported login method";
        }
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
            this._token = null;
            resolve();
        }));
    }
    login() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.host.getMetadata();
            }
            catch (e) {
                reject(e);
                return;
            }
            if (this.token)
                throw new Error("Already logged in. Run logout() first");
            if (this.connection_details.credentials.method === "token") {
                this._token = this.connection_details.credentials.token;
                resolve(this.token);
            }
            else {
                fetch(`${this.endpoint}/sessions`, {
                    hostname: this.host.hostname,
                    port: 443,
                    method: "POST",
                    headers: generateAuthorizationHeaders(this.connection_details.credentials),
                    body: JSON.stringify({
                        fmDataSource: this.connection_details.externalSources.map(i => {
                            let _i = i;
                            return this.generateExternalSourceLogin(_i);
                        })
                    })
                }).then((res) => __awaiter(this, void 0, void 0, function* () {
                    let _res = (yield res.json());
                    if (res.status === 200) {
                        this._token = res.headers.get('x-fm-data-access-token');
                        resolve(this._token);
                    }
                    else {
                        reject(new FMError(_res.messages[0].code, _res.status, res));
                    }
                }))
                    .catch(e => {
                    reject(e);
                });
            }
        }));
    }
    get token() {
        return this._token;
    }
    get endpoint() {
        return `${this.host.hostname}/fmi/data/v2/databases/${this.name}`;
    }
    apiRequest(url, options = {}, autoRelogin = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.headers)
                options.headers = {};
            options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json";
            options.headers["authorization"] = "Bearer " + this._token;
            options.rejectUnauthorized = this.host.verify;
            let _fetch = yield fetch(url, options);
            let data = yield _fetch.json();
            // console.log(data.messages[0])
            if (data.messages[0].code == 952 && autoRelogin) {
                this._token = null;
                yield this.login();
                return yield this.apiRequest(url, options, false);
            }
            return data;
        });
    }
    getLayout(name) {
        return new layout(this, name);
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
    _tokenExpired() {
        this.emit("token_expired");
    }
}
class layout {
    constructor(database, name) {
        this.records = new layoutRecordManager(this);
        this.database = database;
        this.name = name;
    }
    get endpoint() {
        return `${this.database.endpoint}/layouts/${this.name}`;
    }
    /**
     * @deprecated use layout.records.create() instead
     */
    createRecord() {
        return this.records.create();
    }
    /**
     * @deprecated use layout.records.get() instead
     */
    getRecord(recordId) {
        return this.records.get(recordId);
    }
    /**
     * @deprecated use layout.records.find() instead
     */
    newFind() {
        return this.records.find();
    }
    runScript(script) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`;
            if (script.parameter)
                url += "?script.param=" + encodeURIComponent(script.parameter);
            this.database.apiRequest(url, {
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
            if (this.metadata) {
                resolve(this.metadata);
                return;
            }
            this.database.apiRequest(this.endpoint).then(res => {
                this.metadata = res.response;
                resolve(this);
            })
                .catch(e => reject(e));
        });
    }
}
class layoutRecordManager {
    constructor(layout) {
        this.layout = layout;
    }
    create() {
        return new Promise((resolve, reject) => {
            // Get the layout's metadata
            this.layout.getLayoutMeta().then(layout => {
                let fields = {};
                for (let _field of this.layout.metadata.fieldMetaData) {
                    fields[_field.name] = "";
                }
                resolve(new record(this.layout, -1, 0, fields));
            }).catch(e => {
                reject(e);
            });
        });
    }
    get(recordId) {
        return new Promise((resolve, reject) => {
            let record;
            this.layout.getLayoutMeta()
                .then(layout => {
                record = new record(this.layout, recordId);
                return record.get();
            })
                .then(() => {
                resolve(record);
            })
                .catch(e => {
                reject(e);
            });
        });
    }
    range() {
        return new recordGetRange(this.layout);
    }
    find() {
        return new find(this.layout);
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
            let _field = new field(this, item, fieldData[item]);
            if (!!fieldData[item]) {
                if (_field.metadata.result === "timeStamp") {
                    // @ts-ignore
                    let date = moment.default(fieldData[item], this.layout.database.host.metadata.productInfo.timeStampFormat)
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local();
                    _field.set(date.toDate());
                    _field.edited = false;
                }
                else if (_field.metadata.result === "time") {
                    // @ts-ignore
                    let date = moment.default(fieldData[item], this.layout.database.host.metadata.productInfo.timeFormat)
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local();
                    _field.set(date.toDate());
                    _field.edited = false;
                }
                else if (_field.metadata.result === "date") {
                    // @ts-ignore
                    let date = moment.default(fieldData[item], this.layout.database.host.metadata.productInfo.dateFormat)
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local();
                    _field.set(date.toDate());
                    _field.edited = false;
                }
            }
            return _field;
        });
    }
    get() {
        if (this.recordId === -1) {
            throw "Cannot get this record until a commit() is done.";
        }
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!this.layout.metadata)
                yield this.layout.getLayoutMeta();
            this.layout.database.apiRequest(this.endpoint, {
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
    commit(extraBody = {
        fieldData: undefined
    }) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let data = this.toObject();
            delete data.recordId;
            delete data.modId;
            if (this.recordId === -1) {
                // This is a new record
                extraBody.fieldData = data.fieldData;
                this.layout.database.apiRequest(`${this.layout.endpoint}/records`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify(extraBody)
                })
                    .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res));
                    }
                    else if (res.messages[0].code === "0") {
                        this.recordId = parseInt(res.response.recordId);
                        this.modId = parseInt(res.response.modId);
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
            for (let item of Object.keys(data))
                extraBody[item] = data[item];
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "PATCH",
                body: JSON.stringify(extraBody)
            })
                .then(res => {
                if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                    reject(new FMError(res.response.scriptError, res.status, res));
                }
                else if (res.messages[0].code === "0") {
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
    delete() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "DELETE"
            })
                .then(res => {
                if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                    reject(new FMError(res.response.scriptError, res.status, res));
                }
                else if (res.messages[0].code === "0") {
                    this.emit("deleted");
                    resolve();
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
    duplicate() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "POST"
            })
                .then(res => {
                if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                    reject(new FMError(res.response.scriptError, res.status, res));
                }
                else if (res.messages[0].code === "0") {
                    let data = this.toObject((a) => true, (a) => true, (a) => false, (a) => false);
                    let _res = new record(this.layout, res.response.recordId, res.response.modId, data.fieldData, data.portalData);
                    this.emit("duplicated");
                    resolve(_res);
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
    toObject(filter = (a) => a.edited, portalFilter = (a) => a.records.find(record => record.edited), portalRowFilter = (a) => a.edited, portalFieldFilter = (a) => a.edited) {
        let fields_processed = {};
        for (let field of this.fields.filter(field => filter(field))) {
            let value = field.value;
            if (value instanceof Date) {
                // @ts-ignore
                let _value = moment.default(value)
                    .utcOffset(this.layout.database.host.timezoneOffset);
                // @ts-ignore
                switch (field.metadata.result) {
                    case "time":
                        value = _value.format(this.layout.database.host.metadata.productInfo.timeFormat.replace("dd", "DD"));
                        break;
                    case "date":
                        value = _value.format(this.layout.database.host.metadata.productInfo.dateFormat.replace("dd", "DD"));
                        break;
                    default:
                        value = _value.format(this.layout.database.host.metadata.productInfo.timeStampFormat.replace("dd", "DD"));
                }
            }
            fields_processed[field.id] = value;
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
        this._value = contents;
        this.edited = false;
    }
    set(content) {
        if (this.metadata.result === "container")
            throw "Cannot set container value using set(). Use upload() instead.";
        if ((this.metadata.result === "timeStamp" ||
            this.metadata.result === "date" ||
            this.metadata.result === "time")
            && !(content instanceof Date) && !!content) {
            throw "Value was not an instance of Date: " + content;
        }
        this._value = content;
        this.edited = true;
    }
    get metadata() {
        if (!this.record.layout.metadata) {
            // Default to a regular text field
            return {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            };
        }
        if (this.record instanceof portalItem) {
            return this.record.layout.metadata.portalMetaData.find(i => i.name === this.id) || {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            };
        }
        else {
            return this.record.layout.metadata.fieldMetaData.find(i => i.name === this.id) || {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            };
        }
    }
    get value() {
        return this._value;
    }
    upload(buffer, filename, mime) {
        if (this.metadata.result !== "container")
            throw "Cannot upload a file to the field; " + this.id + " (not a container field)";
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let form = new FormData();
            form.append("upload", new File([buffer], filename, { type: mime }));
            let _fetch = yield fetch(`${this.record.endpoint}/containers/${this.id}/1`, {
                method: "POST",
                headers: { "Authorization": "Bearer " + this.record.layout.database.token },
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
                .catch(e => {
                reject(e);
            });
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
    commit(extraBody = { fieldData: undefined }) {
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
class recordGetOperation {
    constructor(layout) {
        this.limit = 100;
        this.limitPortals = [];
        this.offset = 0;
        this.layout = layout;
        this.scripts = {
            "script": null,
            "script.prerequeset": null,
            "script.presort": null // Runs before the sort
        };
        this.sort = [];
    }
    /*
    addToPortalLimit() will adjust the results of the get request so that if a layout has multiple portals in it,
    only data from the specified ones will be read. This may help reduce load on your FileMaker API
    */
    addToPortalLimit(portal, offset = 0, limit = 100) {
        if (offset < 0)
            throw "Portal offset cannot be less than 0";
        this.limitPortals.push({ portal, offset, limit });
    }
    setLimit(limit) {
        if (limit < 1)
            throw "Record limit too low";
        this.limit = limit;
    }
    addSort(fieldName, sortOrder) {
        this.sort.push({ fieldName, sortOrder });
        return this;
    }
    setOffset(offset) {
        if (offset < 0)
            throw "Record offset too low";
        this.limit = offset;
    }
}
class recordGetRange extends recordGetOperation {
    constructor(layout) {
        super(layout);
    }
    generateQueryParams() {
        let params = [];
        if (this.limit !== 100)
            params.push("_limit=" + this.limit);
        if (this.offset !== 0)
            params.push("_offset=" + this.offset);
        if (this.sort.length > 0)
            params.push("_sort=" + encodeURI(JSON.stringify(this.sort)));
        if (this.limitPortals.length > 0) {
            params.push("portal=" + encodeURI(JSON.stringify(this.limitPortals.map(p => p.portal.name))));
            for (let item of this.limitPortals) {
                if (item.offset !== 0)
                    params.push("_offset." + item.portal.name.replace(/[^0-9A-z]/g, "") + "=" + item.offset);
                if (item.limit !== 100)
                    params.push("_limit." + item.portal.name.replace(/[^0-9A-z]/g, "") + "=" + item.limit);
            }
        }
        if (params.length === 0)
            return "";
        return "?" + params.join("&");
    }
    run() {
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.getLayoutMeta().then(() => {
                return this.layout.database.apiRequest(`${this.layout.endpoint}/records${this.generateQueryParams()}`, {
                    method: "GET"
                });
            })
                .then((res) => __awaiter(this, void 0, void 0, function* () {
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
class find extends recordGetOperation {
    constructor(layout) {
        super(layout);
        this.queries = [];
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
        if (this.limit !== 100)
            out["limit"] = this.limit;
        if (this.offset !== 0)
            out["offset"] = this.offset;
        if (this.limitPortals.length > 0) {
            out["portal"] = this.limitPortals.map(p => p.portal.name);
            for (let item of this.limitPortals) {
                out["offset." + item.portal.name.replace(/[^0-9A-z]/g, "")] = item.offset;
                out["limit." + item.portal.name.replace(/[^0-9A-z]/g, "")] = item.limit;
            }
        }
        return out;
    }
    addRequests(...requests) {
        for (let item of requests)
            this.queries.push(item);
        return this;
    }
    find() {
        return this.run();
    }
    run() {
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.getLayoutMeta()
                .then(() => {
                return this.layout.database.apiRequest(`${this.layout.endpoint}/_find`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify(this.toObject())
                });
            })
                .then((res) => __awaiter(this, void 0, void 0, function* () {
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
        if (typeof code === "string")
            code = parseInt(code);
        super(errs.find(err => err.e === code).d || "Unknown error");
        this.httpStatus = httpStatus;
        this.res = res;
        this.messages = res.messages;
        this.code = typeof code === "string" ? parseInt(code) : code;
        Error.captureStackTrace(this, FMError);
    }
}
function generateAuthorizationHeaders(credentials) {
    switch (credentials.method) {
        case "filemaker":
            return {
                "Content-Type": "application/json",
                "Authorization": "Basic " + Buffer.from(credentials.username + ":" + credentials.password).toString("base64")
            };
        case "claris":
            return {
                "Content-Type": "application/json",
                "Authorization": credentials.claris.fmid,
            };
        case "oauth":
            return {
                "Content-Type": "application/json",
                "X-FM-Data-OAuth-RequestId": credentials.oauth.requestId,
                "X-FM-Data-OAuth-Identifier": credentials.oauth.requestIdentifier
            };
    }
}
