/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {EventEmitter} from 'events'
import {generateAuthorizationHeaders} from './generateAuthorizationHeaders.js'
import {FMError} from '../FMError.js'
import {type LayoutInterface} from '../layouts/layoutInterface.js'
import {Layout} from '../layouts/layout.js'
import {type databaseOptionsBase, type databaseOptionsWithExternalSources, type Script} from '../types.js'
import {type HostBase} from './HostBase.js'
import {type DatabaseBase} from './databaseBase.js'
import {type ApiLayout, type ApiResults} from '../models/apiResults.js'
import {type DatabaseStructure} from '../databaseStructure.js'
import fetch, {type HeadersInit, type RequestInfo, type RequestInit, type Response} from 'node-fetch'
// @ts-expect-error - fetchWithCookies does not have available typescript types
import fetchWithCookies, {CookieJar} from 'node-fetch-cookies'

/**
 * Represents a database connection.
 * @template T - The structure of the database.
 */
export class Database<T extends DatabaseStructure> extends EventEmitter implements DatabaseBase {
    private _token: string = ''
    readonly host: HostBase
    private readonly connection_details: databaseOptionsWithExternalSources
    private cookies = new CookieJar()
    readonly name: string
    readonly debug: boolean
    readonly #layoutCache = new Map<string, Layout<any>>()

    constructor (host: HostBase, conn: databaseOptionsWithExternalSources) {
        super()
        this.host = host
        this.name = conn.database
        this.connection_details = conn
        this.debug = conn.debug ?? false
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private generateExternalSourceLogin (data: databaseOptionsBase) {
        if (data.credentials.method === 'filemaker') {
            const _data = data.credentials
            return {
                database: data.database,
                username: _data.username,
                password: _data.password
            }
        }
        else {
            throw new Error('Not yet supported login method')
        }
    }

    /**
     * Logs out the user by deleting the current session token.
     * Throws an error if the user is not logged in.
     *
     * @returns {Promise<void>} A promise that resolves with no value once the logout is successful.
     * @throws {Error} Throws an error if the user is not logged in.
     */
    async logout (): Promise<void> {
        if (this.token === '') throw new Error('Not logged in')

        const _fetch = await fetch(`${this.endpoint}/sessions/${this.token}`, {
            method: 'DELETE',
            headers: {
                'content-type': 'application/json'
            }
        })
        await _fetch.json()
        this._token = ''
    }

    /**
     * Logs in to the database. Not required, as this is often done automatically
     *
     * @param {boolean} [forceLogin=false] - Whether to force login even if already logged in.
     * @throws {Error} - Throws an error if already logged in and forceLogin is false.
     * @throws {FMError} - Throws an FMError if login fails.
     * @return {Promise<string>} - Returns a promise that resolves to the access token upon successful login.
     */
    async login (forceLogin = false) {
        if (this.token !== '' && !forceLogin) return

        // Reset cookies
        this.cookies = new CookieJar()

        await this.host.getMetadata()

        if (this.connection_details.credentials.method === 'token') {
            this._token = (this.connection_details.credentials).token
            return this.token
        }
        else {
            const url = new URL(`${this.endpoint}/sessions`)
            url.hostname = this.host.hostname
            const res = await fetch(url, {
                method: 'POST',
                headers: generateAuthorizationHeaders(this.connection_details.credentials) as unknown as HeadersInit,
                body: JSON.stringify({
                    fmDataSource: this.connection_details.externalSources.map(i => {
                        const _i = i
                        return this.generateExternalSourceLogin(_i)
                    })
                })
            })
            const _res = (await res.json()) as any
            if (res.status === 200) {
                this._token = res.headers.get('x-fm-data-access-token') ?? ''
                return this._token
            }
            else {
                throw new FMError(
                    _res.messages[0].code as string | number,
                    _res.status as number,
                    res
                )
            }
        }
    }

    get token () {
        return this._token
    }

    /**
     * Returns the endpoint URL for the database connection.
     *
     * @returns {string} The endpoint URL.
     */
    get endpoint (): string {
        return `${this.host.protocol}//${this.host.hostname}/fmi/data/v2/databases/${this.name}`
    }

    async _apiRequestRaw (url: URL | RequestInfo, options: RequestInit & {
        headers?: Record<string, string>
        useCookieJar?: boolean
        retries?: number
    } = {}, autoRelogin = true): Promise<Response> {
        if (this.debug) {
            console.log(
                `EASYFM DEBUG: ${JSON.stringify(options)} ${
                    url instanceof URL
                        ? url.toString()
                        : typeof url === 'string' ? url : url.url
                }`
            )
        }
        const reqIsToDBHost = (
            url instanceof URL
                ? url
                : typeof url === 'string'
                    ? new URL(url)
                    : new URL(url.url)
        ).hostname === this.host.hostname
        if (reqIsToDBHost && this.token === '') await this.login(true)

        if (!options.headers) options.headers = {}
        if (reqIsToDBHost) options.headers.authorization = 'Bearer ' + this._token
        // options.redirect = "manual"
        // options.headers.cookies = this._generateCookieHeader()
        // console.log(options.headers.cookies)
        // options.rejectUnauthorized = this.host.verify

        const _fetch: Response =
            options.useCookieJar
                ? await fetchWithCookies(this.cookies, url, options)
                : await fetch(url, options)
        // if (_fetch.headers.get('set-cookie')) {
        //     console.log(_fetch.headers.get('set-cookie'))
        //     for (const cookie of (_fetch.headers.get("Set-Cookie") ?? "").split("; ")) {
        //         const cookieSplit = cookie.split('=')
        //         console.log("COOKIE SPLIT:", cookieSplit)
        //         if (cookieSplit[1]) this.cookies[cookieSplit[0]] = cookieSplit[1]
        //     }
        // }
        // console.log(this.cookies, _fetch.status)
        // // console.log(this, this.cookies, url)
        // console.trace()
        if (!_fetch.ok && (!options.retries || options.retries > 0)) {
            if (this.debug) {
                console.log(`EASYFM DEBUG: RE-ATTEMPTING REQUEST (${_fetch.status}) ${
                    url instanceof URL
                        ? url.toString()
                        : typeof url === 'string' ? url : url.url
                }`)
            }
            return await this._apiRequestRaw(url, {...options, retries: (options?.retries ?? 1) - 1})
        }
        else if (_fetch.status === 401 && reqIsToDBHost && autoRelogin) {
            await this.login(true)
            return await this._apiRequestRaw(url, options, false)
        }
        else return _fetch
    }

    async _apiRequestJSON<T = any>(url: URL | RequestInfo, options: RequestInit & {
        headers?: Record<string, string>
    } = {}): Promise<ApiResults<T>> {
        if (!options.headers) options.headers = {}
        options.headers['content-type'] = options.headers['content-type'] ? options.headers['content-type'] : 'application/json'
        const _fetch = await this._apiRequestRaw(url, options)
        const data = await _fetch.json() as ApiResults<T>

        // Remove response if it is empty. This makes checking for an empty response easier
        if (data.response && Object.keys(data.response).length === 0) delete data.response

        // console.log(data.messages[0])
        if (data.messages[0].code !== '0') {
            throw new FMError(data.messages[0].code, _fetch.status, data)
        }

        data.httpStatus = _fetch.status
        return data
    }

    /**
     * Retrieves a list of layouts in the current FileMaker database.
     *
     * @returns {Promise<Layout[]>} A promise that resolves to an array of Layout objects.
     * @throws {FMError} If there was an error retrieving the layouts.
     */
    async listLayouts (page: number = 0) {
        const req = await this._apiRequestJSON<{ layouts: ApiLayout[] }>(`${this.endpoint}/layouts?page=${encodeURIComponent(page)}`)
        console.log(req)
        if (!req.response) throw new FMError(req.messages[0].code, req.httpStatus, req.messages[0].message)

        const cycleLayoutNames = (layouts: ApiLayout[]) => {
            let names: string[] = []
            for (const layout of layouts) {
                if (layout.folderLayoutNames) names = names.concat(cycleLayoutNames(layout.folderLayoutNames))
                else names.push(layout.name)
            }
            return names
        }
        return cycleLayoutNames(req.response.layouts).map(layout => new Layout(this, layout))
    }

    layout<R extends keyof T['layouts']>(name: R): Layout<T['layouts'][R]>
    layout<R extends LayoutInterface>(name: string): Layout<R>
    layout (name: string): Layout<any> {
        let layout = this.#layoutCache.get(name)
        if (layout) return layout
        layout = new Layout<LayoutInterface>(this, name)
        this.#layoutCache.set(name, layout)
        return layout
    }

    clearLayoutCache () {
        this.#layoutCache.clear()
    }

    script (name: string, parameter = ''): Script {
        return ({name, parameter} satisfies Script)
    }
}
