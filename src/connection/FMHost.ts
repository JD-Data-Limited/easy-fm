/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {generateAuthorizationHeaders} from "./generateAuthorizationHeaders.js";
import fetch from "node-fetch";
import {FMError} from "../FMError.js";
import {Database} from "./database.js";
import {HostBase} from "./HostBase.js"
import {
    databaseOptionsWithExternalSources, DatabaseStructure,
    FMHostMetadata,
    loginOptionsClaris,
    loginOptionsFileMaker,
    loginOptionsOAuth
} from "../types.js";
import {ApiResults} from "../models/apiResults";

export default class FMHost implements HostBase {
    readonly hostname: string
    readonly timezoneOffset: number
    readonly verify: boolean
    metadata: FMHostMetadata

    constructor(_hostname: string, timezoneOffset = 0 - (new Date()).getTimezoneOffset(), verify = true) {
        if (!(/^https?:\/\//).test(_hostname)) throw "hostname MUST begin with either http:// or https://"
        this.hostname = _hostname
        this.timezoneOffset = timezoneOffset
        this.verify = verify
    }

    async listDatabases(credentials?: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris) {
        let headers = {}
        if (credentials) {
            headers = generateAuthorizationHeaders(credentials)
        }

        let _fetch = await fetch(`${this.hostname}/fmi/data/v2/databases`, {
            method: "GET",
            headers
        })
        let data = await _fetch.json() as ApiResults<{databases: any}>
        // console.log(data.messages[0])

        if (data.messages[0].code === "0") {
            return data.response.databases
        }
        else {
            // @ts-ignore
            throw new FMError(data.messages[0].code, data.status, data)
        }
    }

    database<T extends DatabaseStructure>(data: databaseOptionsWithExternalSources) {
        return new Database<T>(this, data)
    }

    async getMetadata() {
        if (this.metadata) return this.metadata

        let _fetch = await fetch(`${this.hostname}/fmi/data/v2/productInfo`, {
            method: "GET",
        })
        let data = await _fetch.json() as ApiResults<FMHostMetadata>
        // console.log(data.messages[0])

        if (data.messages[0].code === "0") {
            this.metadata = data.response
            return data.response
        }
        else {
            // @ts-ignore
            throw new FMError(data.messages[0].code, data.status, data)
        }
    }
}