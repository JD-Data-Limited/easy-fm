/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {EventEmitter} from "events";
import fetch, {HeadersInit, Request} from "node-fetch";
import {generateAuthorizationHeaders} from "./generateAuthorizationHeaders.js";
import {FMError} from "../FMError.js";
import {LayoutInterface} from "../layouts/layoutInterface.js";
import {Layout} from "../layouts/layout.js";
import * as http from "http";
import * as https from "https";
import {
    databaseOptionsBase,
    databaseOptionsWithExternalSources,
    fileMakerResponse,
    loginOptionsFileMaker,
    loginOptionsToken,
    Script
} from "../types.js";
import FMHost from "./FMHost.js";

export class Database extends EventEmitter {
    private _token: any;
    readonly host: FMHost;
    private connection_details: databaseOptionsWithExternalSources
    private cookies: { [key: string]: string } = {}
    readonly name: string;

    constructor(host: FMHost, conn: databaseOptionsWithExternalSources) {
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

    logout(): Promise<void> {
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
            this._token = null
            resolve()
        })
    }

    login() {
        return new Promise<string>(async (resolve, reject) => {
            // Reset cookies
            this.cookies = {}

            try {
                await this.host.getMetadata()
            } catch (e) {
                reject(e)
                return
            }
            if (this.token) throw new Error("Already logged in. Run logout() first")

            if (this.connection_details.credentials.method === "token") {
                this._token = (<loginOptionsToken>this.connection_details.credentials).token
                resolve(this.token)
            }
            else {
                fetch(`${this.endpoint}/sessions`, {
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
                }).then(async res => {
                    let _res = <any>(await res.json())
                    if (res.status === 200) {
                        this._token = res.headers.get('x-fm-data-access-token')
                        resolve(this._token)
                    }
                    else {
                        reject(new FMError(_res.messages[0].code, _res.status, res))
                    }
                })
                    .catch(e => {
                        reject(e)
                    })
            }
        })
    }

    get token() {
        return this._token
    }

    get endpoint(): string {
        return `${this.host.hostname}/fmi/data/v2/databases/${this.name}`
    }

    async apiRequest(url: string | Request, options: any = {}, autoRelogin = true): Promise<any> {
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
        let data = await _fetch.json() as fileMakerResponse
        // console.log(data.messages[0])
        if (data.messages[0].code == 952 && autoRelogin) {
            this._token = null
            await this.login()
            return await this.apiRequest(url, options, false)
        }
        return (data as any)
    }

    getLayout<T extends LayoutInterface>(name): Layout<T> {
        return new Layout(this, name)
    }

    setGlobals(globalFields): Promise<void> {
        // console.log({globalFields})
        return new Promise((resolve, reject) => {
            this.apiRequest(`${this.endpoint}/globals`, {
                method: "PATCH",
                body: JSON.stringify({globalFields})
            }).then(res => {
                // console.log(res)
                if (res.messages[0].code === "0") {
                    resolve()
                }
                else {
                    reject(
                        (res.messages[0].code, res.status, res))
                }
            })
                .catch(e => {
                    reject(e)
                })
        })
    }

    script(name, parameter = ""): Script {
        return ({name, parameter} as Script)
    }

    _tokenExpired() {
        this.emit("token_expired")
    }

    streamContainer(field, url): Promise<http.IncomingMessage> {
        return new Promise((resolve, reject) => {
            if (field.metadata.result !== "container") {
                reject("Cannot stream the field " + field.id + " as it is not a container")
                return
            }
            if (!url || typeof url !== "string") {
                reject("Container is empty, or has invalid value")
                return
            }

            let headers = {}
            if (Object.keys(this.cookies).length !== 0) {
                headers["Cookie"] = Object.keys(this.cookies)
                    .map(key => {
                        return key + "=" + this.cookies[key]
                    })
                    .join("; ")
            }

            // Automatically switch between the http and https modules, based on which is needed
            (url.startsWith("https") ? https : http).get(url, {
                headers
            }, (res) => {
                // Check for the 'set-cookie' header. If it exists, remember it and strip it for better security.
                if (res.headers['set-cookie']) {
                    for (let cookie of res.headers['set-cookie']) {
                        let cookie_split = cookie.split("=")
                        this.cookies[cookie_split[0]] = cookie_split[1]
                    }
                    res.headers['set-cookie'] = null
                }

                resolve(res)
            })
        })
    }
}