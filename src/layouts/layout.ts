/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {LayoutRecordManager} from "./layoutRecordManager.js";
import {Script, ScriptResult} from "../types.js";
import {LayoutInterface} from "./layoutInterface.js";
import {FMError} from "../FMError.js";
import {LayoutBase} from "./layoutBase.js"
import {DatabaseBase} from "../connection/databaseBase.js";
import {ApiLayoutMetadata, ApiScriptResult} from "../models/apiResults.js";

export class Layout<T extends LayoutInterface> implements LayoutBase {
    readonly database: DatabaseBase;
    readonly name: string;
    readonly records = new LayoutRecordManager<T>(this)
    metadata: ApiLayoutMetadata | null = null;

    constructor(database: DatabaseBase, name: string) {
        this.database = database
        this.name = name
    }


    get endpoint() {
        return `${this.database.endpoint}/layouts/${this.name}`
    }

    async runScript(script: Script): Promise<ScriptResult> {
        let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`
        if (script.parameter) url += "?script.param=" + encodeURIComponent(script.parameter)
        let res = await this.database.apiRequestJSON<ApiScriptResult>(url, {
            method: "GET"
        })
        if (res.response && res.messages[0].code === "0") {
            let error = parseInt(res.response.scriptError)
            return {
                scriptError: error ? new FMError(error, 200, res) : undefined,
                scriptResult: res.response.scriptResult
            }
        } else {
            throw new FMError(res.messages[0].code, res.httpStatus, res);
        }
    }

    public async getLayoutMeta(): Promise<ApiLayoutMetadata> {
        if (this.metadata) {
            return this.metadata
        }

        let res = await this.database.apiRequestJSON<ApiLayoutMetadata>(this.endpoint)
        if (!res.response) throw new FMError(res.messages[0].code, res.httpStatus, res)
        this.metadata = res.response
        return this.metadata
    }
}