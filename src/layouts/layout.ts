/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutRecordManager} from "./layoutRecordManager.js";
import {LayoutRecord} from "../records/layoutRecord.js";
import {ScriptResult} from "../types.js";
import {LayoutInterface} from "./layoutInterface.js";
import {Find} from "../records/getOperations/find.js";
import {FMError} from "../FMError.js";
import {Database} from "../connection/database.js";

export class Layout<T extends LayoutInterface> {
    readonly database: Database;
    readonly records = new LayoutRecordManager<T>(this)
    protected name: string;
    metadata: any;

    constructor(database: Database, name: string) {
        this.database = database
        this.name = name
    }

    get endpoint() {
        return `${this.database.endpoint}/layouts/${this.name}`
    }

    /**
     * @deprecated use layout.records.create() instead
     */
    createRecord(): Promise<LayoutRecord<T["fields"], T["portals"]>> {
        return this.records.create()
    }

    /**
     * @deprecated use layout.records.get() instead
     */
    getRecord(recordId): Promise<LayoutRecord<T["fields"], T["portals"]>> {
        return this.records.get(recordId)
    }

    /**
     * @deprecated use layout.records.find() instead
     */
    newFind(): Find<T> {
        return this.records.find()
    }

    runScript(script): Promise<ScriptResult> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`
            if (script.parameter) url += "?script.param=" + encodeURIComponent(script.parameter)
            this.database.apiRequest(url, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        let error = parseInt(res.response.scriptError)
                        let msg: ScriptResult = {
                            scriptError: error ? new FMError(error, 200, res, trace) : undefined,
                            scriptResult: res.response.scriptResult
                        }
                        resolve(msg)
                    }
                    else {
                        // console.log(res)
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    public getLayoutMeta(): Promise<this | FMError> {
        return new Promise((resolve, reject) => {
            if (this.metadata) {
                resolve(this.metadata)
                return
            }

            this.database.apiRequest(this.endpoint).then(res => {
                this.metadata = res.response
                resolve(this)
            })
                .catch(e => reject(e))
        })
    }
}