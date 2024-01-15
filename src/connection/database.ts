/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {EventEmitter} from "events";
import fetch, {HeadersInit, Request} from "node-fetch";
import {generateAuthorizationHeaders} from "./generateAuthorizationHeaders.js";
import {FMError} from "../FMError.js";
import {LayoutInterface} from "../layouts/layoutInterface.js";
import {Layout} from "../layouts/layout.js";
import HTTP_REDIRECT  from "follow-redirects"
import {
    databaseOptionsBase,
    databaseOptionsWithExternalSources, DatabaseStructure,
    loginOptionsFileMaker,
    loginOptionsToken,
    Script
} from "../types.js";
import {HostBase} from "./HostBase.js"
import {DatabaseBase} from "./databaseBase";
import {ApiLayout, ApiResults} from "../models/apiResults";

type GetLayoutReturnType<T extends DatabaseStructure, R extends LayoutInterface | string> = R extends string ? T["layouts"][R] : R

export class Database<T extends DatabaseStructure> extends EventEmitter implements DatabaseBase {
    private _token: any;
    readonly host: HostBase;
    private connection_details: databaseOptionsWithExternalSources
    private cookies: { [key: string]: string } = {}
    readonly name: string;

    constructor(host: HostBase, conn: databaseOptionsWithExternalSources) {
        super()
        this.host = host
        this.name = conn.database
        this.connection_details = conn
    }

    private generateExternalSourceLogin(data: databaseOptionsBase) {
        if (data.credentials.method === "filemaker") {
            let _data = <loginOptionsFileMaker>data.credentials
            return {
                database: data.database,
                username: _data.username,
                password: _data.password
            }
        }
        else {
            throw "Not yet supported login method"
        }
    }

    async logout(): Promise<void> {
        if (!this.token) throw new Error("Not logged in")

        let _fetch = await fetch(`${this.endpoint}/sessions/${this.token}`, {
            method: "DELETE",
            headers: {
                "content-type": "application/json"
            }
        })
        let data = await _fetch.json()
        // console.log(data)
        this._token = null
    }

    async login() {
        // Reset cookies
        this.cookies = {}

        await this.host.getMetadata()
        if (this.token) throw new Error("Already logged in. Run logout() first")

        if (this.connection_details.credentials.method === "token") {
            this._token = (<loginOptionsToken>this.connection_details.credentials).token
            return this.token
        }
        else {
            console.time()
            let res = await fetch(`${this.endpoint}/sessions`, {
                hostname: this.host.hostname,
                port: 443,
                method: "POST",
                headers: generateAuthorizationHeaders(this.connection_details.credentials) as unknown as HeadersInit,
                body: JSON.stringify({
                    fmDataSource: this.connection_details.externalSources.map(i => {
                        let _i = <databaseOptionsBase>i
                        return this.generateExternalSourceLogin(_i)
                    })
                })
            })
            console.time()
            let _res = <any>(await res.json())
            if (res.status === 200) {
                this._token = res.headers.get('x-fm-data-access-token')
                return this._token
            }
            else {
                throw new FMError(_res.messages[0].code, _res.status, res)
            }
        }
    }

    get token() {
        return this._token
    }

    get endpoint(): string {
        return `${this.host.hostname}/fmi/data/v2/databases/${this.name}`
    }

    async apiRequest<T = any>(url: string | Request, options: any = {}, autoRelogin = true): Promise<ApiResults<T>> {
        if (!options.headers) options.headers = {}
        options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json"
        options.headers["authorization"] = "Bearer " + this._token
        options.rejectUnauthorized = this.host.verify

        let _fetch = await fetch(url, options)
        if (_fetch.headers.get('set-cookie')) {
            for (let cookie of _fetch.headers.get('set-cookie')) {
                let cookie_split = cookie.split("=")
                this.cookies[cookie_split[0]] = cookie_split[1]
            }
        }
        let data = await _fetch.json() as ApiResults<T>

        // Remove response if it is empty. This makes checking for an empty response easier
        if (Object.keys(data.response).length === 0) delete data.response

        // console.log(data.messages[0])
        if (data.messages[0].code === "952" && autoRelogin) {
            this._token = null
            await this.login()
            return await this.apiRequest(url, options, false)
        }
        else if (data.messages[0].code !== "0") {
            throw new FMError(data.messages[0].code, _fetch.status, data)
        }

        data.httpStatus = _fetch.status
        return data
    }

    async listLayouts() {
        let req = await this.apiRequest<{layouts: ApiLayout[]}>(`${this.endpoint}/layouts`)
        if (!req.response) throw new FMError(req.messages[0].code, req.httpStatus, req.messages[0].message)

        return req.response.layouts.filter(i => !i.isFolder).map(layout => new Layout(this, layout.name))
    }

    getLayout<R extends keyof T["layouts"]>(name: R): Layout<T["layouts"][R]>
    getLayout<R extends LayoutInterface>(name: string): Layout<R>
    getLayout(name: string): Layout<any> {
        return new Layout<LayoutInterface>(this, name)
    }

    /*
    @deprecated
     */
    async setGlobals(globalFields) {
        // console.log({globalFields})
        await this.apiRequest(`${this.endpoint}/globals`, {
            method: "PATCH",
            body: JSON.stringify({globalFields})
        })
    }

    script(name, parameter = ""): Script {
        return ({name, parameter} as Script)
    }

    _tokenExpired() {
        this.emit("token_expired")
    }

    streamURL(url: string): Promise<HTTP_REDIRECT.http.IncomingMessage> {
        return new Promise((resolve, reject) => {
            if (!url || typeof url !== "string") {
                throw new Error("URL is empty, or has invalid value")
            }

            let headers = {}
            if (Object.keys(this.cookies).length !== 0) {
                headers["Cookie"] = Object.keys(this.cookies)
                    .map(key => {
                        return key + "=" + this.cookies[key]
                    })
                    .join("; ")
            }

            const check_for_cookies = (res) => {
                // Check for the 'set-cookie' header. If it exists, remember it and strip it for better security.
                if (res.headers['set-cookie']) {
                    for (let cookie of res.headers['set-cookie']) {
                        let cookie_split = cookie.split("=")
                        this.cookies[cookie_split[0]] = cookie_split[1]
                    }
                    res.headers['set-cookie'] = null
                }
            }

            // Automatically switch between the http and https modules, based on which is needed
            (url.startsWith("https") ? HTTP_REDIRECT.https : HTTP_REDIRECT.http).get(url, {
                headers,
                beforeRedirect: (options, res, req) => check_for_cookies(res)
            }, (res) => {
                check_for_cookies(res)

                resolve(res)
            })
        })
    }
}