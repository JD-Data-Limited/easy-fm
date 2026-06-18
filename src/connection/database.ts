/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {FMError} from '../FMError.js'
import {type LayoutInterface} from '../layouts/layoutInterface.js'
import {Layout} from '../layouts/layout.js'
import {type databaseOptionsWithExternalSources, type Script} from '../types.js'
import {type HostBase} from './HostBase.js'
import {type DatabaseBase} from './databaseBase.js'
import {ApiLayout, ApiResults} from '../models/apiResults.js'
import {type DatabaseStructure} from '../databaseStructure.js'
import {type DatabaseEndpoint, type Session} from './Session.js'
import {z, type ZodType} from 'zod'
import {addHeaders} from '../utils/addHeaders.js'
import process from 'node:process'

/**
 * Represents a database connection.
 * @template T - The structure of the database.
 */
export abstract class Database<T extends DatabaseStructure> implements DatabaseBase {
    readonly host: HostBase
    readonly name: string
    readonly debug: boolean
    readonly #layoutCache = new Map<string, Layout<any>>()
    protected canOpenNewConnections = true
    /**
     * Used during events where the application must logout
     * @private
     */
    protected abortController = new AbortController()

    protected constructor (host: HostBase, conn: databaseOptionsWithExternalSources<unknown>) {
        this.host = host
        this.name = conn.database
        this.debug = conn.debug ?? false
        process.on('SIGINT', () => { void this.close() })
        process.on('SIGTERM', () => { void this.close() })
        process.on('beforeExit', () => { void this.close() })
    }

    async login () {
        await Promise.resolve()
    }

    async logout () {
        await this.close()
    }

    async close () {
        this.canOpenNewConnections = false
        if (!this.abortController.signal.aborted) this.abortController.abort('Closing connection')
    }

    async [Symbol.asyncDispose] () {
        await this.close()
    }

    /**
     * The inheriting database class must implement this method to provide a session object.
     * @param callback
     * @protected
     */
    protected abstract withSession<T> (callback: (session: Session) => Promise<T>): Promise<T>

    /**
     * Returns the endpoint URL for the database connection.
     *
     * @returns {string} The endpoint URL.
     */
    get endpoint (): DatabaseEndpoint {
        return `${this.host.protocol}//${this.host.hostname}/fmi/data/v2/databases/${this.name}` as const
    }

    /**
     * Uses an available session to run a fetch
     * @param url
     * @param options
     */
    async fetch (url: string | URL, options?: RequestInit): Promise<Response> {
        return await this.withSession(async session => await session.fetch(url, options))
    }

    /**
     * Uses an available session to run a fetch on a FileMaker Data API JSON endpoint. Also applies JSON/Zod type enforcement on result.
     */
    async fetchJSON<T extends ZodType | null = null>(
        url: string | URL,
        options: RequestInit & { type: T }
    ): Promise<T extends ZodType ? z.infer<T> & { httpStatus: number } : { httpStatus: number }> {
        const _options = options ?? {}
        addHeaders(_options, {
            'Content-Type': 'application/json'
        })
        const res = await this.fetch(url, _options)
        const rawData = await res.json()
        if (this.debug) console.log(rawData.response)
        if (options.type !== null) {
            const data = ApiResults.extend({response: options.type.optional()})
                .parse(rawData)
            if (data.messages[0].code !== 0) {
                throw new FMError(data.messages[0].code, res.status, data)
            }
            return data.response
                // @ts-expect-error is correct
                ? {
                    ...data.response,
                    httpStatus: res.status
                }
                // @ts-expect-error is correct
                : { httpStatus: res.status }
        }

        const data = ApiResults.parse(rawData)
        if (data.messages[0].code !== 0) {
            throw new FMError(data.messages[0].code, res.status, data)
        }

        // @ts-expect-error is correct
        return {
            httpStatus: res.status
        }
    }

    /**
     * Retrieves a list of layouts in the current FileMaker database.
     *
     * @returns {Promise<Layout[]>} A promise that resolves to an array of Layout objects.
     * @throws {FMError} If there was an error retrieving the layouts.
     */
    async listLayouts (page: number = 0) {
        const res = await this.fetchJSON(`${this.endpoint}/layouts?page=${encodeURIComponent(page)}`, {
            type: z.object({layouts: z.array(ApiLayout)})
        })

        const cycleLayoutNames = (layouts: Array<z.infer<typeof ApiLayout>>) => {
            let names: string[] = []
            for (const layout of layouts) {
                if (layout.folderLayoutNames) names = names.concat(cycleLayoutNames(layout.folderLayoutNames))
                else names.push(layout.name)
            }
            return names
        }
        return cycleLayoutNames(res.layouts).map(layout => new Layout(this, layout))
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
