/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutRecordManager} from "./layoutRecordManager.js";
import {LayoutRecord} from "../records/layoutRecord.js";
import {Script, ScriptResult} from "../types.js";
import {LayoutInterface} from "./layoutInterface.js";
import {Find} from "../records/getOperations/find.js";
import {FMError} from "../FMError.js";
import {LayoutBase} from "./layoutBase.js"
import {DatabaseBase} from "../connection/databaseBase";
import {ApiLayoutMetadata, ApiScriptResult} from "../models/apiResults";

export class Layout<T extends LayoutInterface> implements LayoutBase {
    readonly database: DatabaseBase;
    readonly records = new LayoutRecordManager<T>(this)
    readonly name: string;
    metadata: ApiLayoutMetadata;

    constructor(database: DatabaseBase, name: string) {
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

    async runScript(script: Script): Promise<ScriptResult> {
        let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`
        if (script.parameter) url += "?script.param=" + encodeURIComponent(script.parameter)
        let res = await this.database.apiRequest<ApiScriptResult>(url, {
            port: 443,
            method: "GET"
        })
        if (res.messages[0].code === "0") {
            let error = parseInt(res.response.scriptError)
            return {
                scriptError: error ? new FMError(error, 200, res) : undefined,
                scriptResult: res.response.scriptResult
            }
        }
    }

    public async getLayoutMeta(): Promise<ApiLayoutMetadata> {
        if (this.metadata) {
            return this.metadata
        }

        let res = await this.database.apiRequest<ApiLayoutMetadata>(this.endpoint)
        this.metadata = res.response
        return this.metadata
    }
}