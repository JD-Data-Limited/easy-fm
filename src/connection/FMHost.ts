/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {generateAuthorizationHeaders} from './generateAuthorizationHeaders.js'
import {FMError} from '../FMError.js'
import {type Database} from './database.js'
import {type HostBase} from './HostBase.js'
import {
    type databaseOptionsWithExternalSources,
    FMHostMetadata,
    type loginOptionsClaris,
    type loginOptionsFileMaker,
    type loginOptionsOAuth
} from '../types.js'
import {ApiResults} from '../models/apiResults.js'
import {type DatabaseStructure} from '../databaseStructure.js'
import {type Moment} from 'moment'
import z from 'zod'
import {type DatabaseProtocol} from './Session.js'
import {DatabaseSessionPool} from './databaseSessionPool.js'
import {DatabaseConstantSession} from './databaseConstantSession.js'

/**
 * Represents a FileMaker host.
 */
export default class FMHost implements HostBase {
    readonly hostname: string
    readonly timezoneOffsetFunc: (moment: Moment) => number
    readonly verify: boolean
    readonly protocol: DatabaseProtocol
    _metadata: z.infer<typeof FMHostMetadata> | null = null

    constructor (
        _hostname: string,
        timezoneOffset = (moment: Moment) => 0 - (new Date()).getTimezoneOffset(),
        verify = true
    ) {
        if (!(/^https?:\/\//).test(_hostname)) throw new Error('hostname MUST begin with either http:// or https://')
        const url = new URL(_hostname)
        this.protocol = url.protocol as ('http:' | 'https:')
        this.hostname = url.hostname
        this.timezoneOffsetFunc = timezoneOffset
        this.verify = verify
    }

    get metadata (): z.infer<typeof FMHostMetadata> {
        return this._metadata ?? {
            productInfo: {
                buildDate: new Date(),
                name: '',
                version: '',
                dateFormat: 'MM/dd/yyyy',
                timeFormat: 'HH:mm:ss',
                timeStampFormat: 'MM/dd/yyyy HH:mm:ss'
            }
        }
    }

    /** FileMaker host date format converted to Moment-compatible tokens. */
    get dateFormat () {
        return this.metadata.productInfo.dateFormat
            .replace('dd', 'DD')
            .replace('yyyy', 'YYYY')
    }

    /** FileMaker host time format. */
    get timeFormat () {
        return this.metadata.productInfo.timeFormat
    }

    /** FileMaker host timestamp format converted to Moment-compatible tokens. */
    get timeStampFormat () {
        return this.metadata.productInfo.timeStampFormat
            .replace('dd', 'DD')
            .replace('yyyy', 'YYYY')
    }

    /**
     * Retrieves a list of databases from the FileMaker Server.
     *
     * @param {loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris} [credentials] - Optional credentials required for authentication.
     * @throws {FMError} If the request to the FileMaker Server fails or if the response contains an error.
     * @returns {Promise<any[]>} A promise that resolves to an array of database objects if successful.
     */
    async listDatabases (credentials?: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris) {
        let headers = {}
        if (credentials) {
            headers = generateAuthorizationHeaders(credentials)
        }

        const _fetch = await fetch(`${this.hostname}/fmi/data/v2/databases`, {
            method: 'GET',
            headers
        })
        const data = ApiResults.extend({
            response: z.object({
                databases: z.array(z.object({
                    name: z.string()
                }))
            }).optional()
        }).parse(await _fetch.json())
        // console.log(data.messages[0])

        if (data.messages[0].code === 0 && data.response) {
            return data.response.databases
        } else {
            throw new FMError(data.messages[0].code, _fetch.status, data)
        }
    }

    /**
     * Creates a new database connection with the specified options.
     *
     * @template T - The type of the database structure.
     * @param {databaseOptionsWithExternalSources} data - The options for the database, including external sources.
     * @return {Database<T>} A new Database instance.
     */
    database<T extends DatabaseStructure>(data: databaseOptionsWithExternalSources): Database<T> {
        if (data.credentials.method === 'filemaker') return new DatabaseSessionPool(this, data as databaseOptionsWithExternalSources<loginOptionsFileMaker>)
        // @ts-expect-error types are correct here
        return new DatabaseConstantSession(this, data)
    }

    /** Fetch and cache FileMaker host product metadata. */
    async getMetadata () {
        if (this._metadata) return this._metadata

        const _fetch = await fetch(`${this.protocol}//${this.hostname}/fmi/data/v2/productInfo`, {
            method: 'GET'
        })
        const raw = await _fetch.json()
        console.log(raw)
        const data = ApiResults.extend({response: FMHostMetadata.optional()}).parse(raw)
        // console.log(data.messages[0])

        if (data.messages[0].code === 0 && data.response) {
            this._metadata = data.response
            return data.response
        } else {
            throw new FMError(data.messages[0].code, _fetch.status, data)
        }
    }
}
