/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {generateAuthorizationHeaders} from "./generateAuthorizationHeaders.js";
import {FMError} from "../FMError.js";
import {Database} from "./database.js";
import {HostBase} from "./HostBase.js"
import {
    databaseOptionsWithExternalSources,
    FMHostMetadata,
    loginOptionsClaris,
    loginOptionsFileMaker,
    loginOptionsOAuth
} from "../types.js";
import {ApiResults} from "../models/apiResults.js";
import {DatabaseStructure} from "../databaseStructure.js";
import {Moment} from "moment";

export default class FMHost implements HostBase {
    readonly hostname: string
    readonly timezoneOffsetFunc: (moment: Moment) => number
    readonly verify: boolean
    _metadata: FMHostMetadata | null = null

    constructor(
        _hostname: string,
        timezoneOffset = (moment: Moment) => 0 - (new Date()).getTimezoneOffset(),
        verify = true
    ) {
        if (!(/^https?:\/\//).test(_hostname)) throw "hostname MUST begin with either http:// or https://"
        this.hostname = _hostname
        this.timezoneOffsetFunc = timezoneOffset
        this.verify = verify
    }

    get metadata(): FMHostMetadata {
        return this._metadata || {
            productInfo: {
                buildDate: new Date(),
                name: "",
                version: "",
                dateFormat: "MM/dd/yyyy",
                timeFormat: "HH:mm:ss",
                timeStampFormat: "MM/dd/yyyy HH:mm:ss"
            }
        };
    }

    get dateFormat() {
        return this.metadata.productInfo.dateFormat
            .replace("dd", "DD")
            .replace("yyyy", "YYYY")
    }

    get timeFormat() {return this.metadata.productInfo.timeFormat}
    get timeStampFormat() {
        return this.metadata.productInfo.timeStampFormat
            .replace("dd", "DD")
            .replace("yyyy", "YYYY")
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

        if (data.messages[0].code === "0" && data.response) {
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
        if (this._metadata) return this._metadata

        let _fetch = await fetch(`${this.hostname}/fmi/data/v2/productInfo`, {
            method: "GET",
        })
        let data = await _fetch.json() as ApiResults<FMHostMetadata>
        // console.log(data.messages[0])

        if (data.messages[0].code === "0" && data.response) {
            this._metadata = data.response
            return data.response
        }
        else {
            // @ts-ignore
            throw new FMError(data.messages[0].code, data.status, data)
        }
    }
}