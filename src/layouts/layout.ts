/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {LayoutRecordManager} from './layoutRecordManager.js'
import {type Script, type ScriptResult} from '../types.js'
import {type LayoutInterface} from './layoutInterface.js'
import {FMError} from '../FMError.js'
import {type LayoutBase} from './layoutBase.js'
import {type DatabaseBase} from '../connection/databaseBase.js'
import {ApiLayoutMetadata, ApiScriptResult} from '../models/apiResults.js'
import {type z} from 'zod'

export class Layout<T extends LayoutInterface> implements LayoutBase {
    readonly database: DatabaseBase
    readonly name: string
    readonly records = new LayoutRecordManager<T>(this)
    metadata: z.infer<typeof ApiLayoutMetadata> | null = null

    constructor (database: DatabaseBase, name: string) {
        this.database = database
        this.name = name
    }

    get endpoint () {
        return `${this.database.endpoint}/layouts/${this.name}`
    }

    /**
     * Executes a FileMaker script on this layout asynchronously and returns the result.
     * @param {Script} script - The script to be executed.
     * @returns {Promise<ScriptResult>} - A promise that resolves to the script result or rejects with an error.
     */
    async runScript (script: Script): Promise<ScriptResult> {
        let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`
        if (script.parameter) url += '?script.param=' + encodeURIComponent(script.parameter)
        const res = await this.database.fetchJSON(url, {
            type: ApiScriptResult,
            method: 'GET'
        })
        const error = parseInt(res.scriptError)
        return {
            scriptError: error ? new FMError(error, 200, res) : undefined,
            scriptResult: res.scriptResult
        }
    }

    /**
     * Retrieves the layout metadata
     *
     * @returns {Promise<ApiLayoutMetadata>} The layout metadata.
     * @throws {FMError} If an error occurs during the API request.
     */
    public async getLayoutMeta (): Promise<z.infer<typeof ApiLayoutMetadata>> {
        if (this.metadata) {
            return this.metadata
        }

        const res = await this.database.fetchJSON(this.endpoint, {type: ApiLayoutMetadata})
        this.metadata = res
        return this.metadata
    }
}
