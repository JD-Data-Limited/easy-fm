/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {generateAuthorizationHeaders} from './generateAuthorizationHeaders.js'
import {FMError} from '../FMError.js'
import {Database} from './database.js'
import {type HostBase} from './HostBase.js'
import {
    type databaseOptionsWithExternalSources,
    type FMHostMetadata,
    type loginOptionsClaris,
    type loginOptionsFileMaker,
    type loginOptionsOAuth
} from '../types.js'
import {type ApiResults} from '../models/apiResults.js'
import {type DatabaseStructure} from '../databaseStructure.js'
import {type Moment} from 'moment'

/**
 * Represents a FileMaker host.
 * @implements {HostBase}
 */
export default class FMHost implements HostBase {
    readonly hostname: string
    readonly timezoneOffsetFunc: (moment: Moment) => number
    readonly verify: boolean
    readonly protocol: 'http:' | 'https:'
    _metadata: FMHostMetadata | null = null

    constructor (
        _hostname: string,
        timezoneOffset = (moment: Moment) => 0 - (new Date()).getTimezoneOffset(),
        verify = true
    ) {
        if (!(/^https?:\/\//).test(_hostname)) throw new Error('hostname MUST begin with either http:// or https://')
        this.protocol = _hostname.startsWith('https:') ? 'https:' : 'http:'
        this.hostname = _hostname.split('//')[1]
        this.timezoneOffsetFunc = timezoneOffset
        this.verify = verify
    }

    get metadata (): FMHostMetadata {
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

    get dateFormat () {
        return this.metadata.productInfo.dateFormat
            .replace('dd', 'DD')
            .replace('yyyy', 'YYYY')
    }

    get timeFormat () { return this.metadata.productInfo.timeFormat }
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
        const data = await _fetch.json() as ApiResults<{ databases: any }>
        // console.log(data.messages[0])

        if (data.messages[0].code === '0' && data.response) {
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
    database<T extends DatabaseStructure>(data: databaseOptionsWithExternalSources) {
        return new Database<T>(this, data)
    }

    async getMetadata () {
        if (this._metadata) return this._metadata

        const _fetch = await fetch(`${this.protocol}//${this.hostname}/fmi/data/v2/productInfo`, {
            method: 'GET'
        })
        const data = await _fetch.json() as ApiResults<FMHostMetadata>
        // console.log(data.messages[0])

        if (data.messages[0].code === '0' && data.response) {
            this._metadata = data.response
            return data.response
        } else {
            throw new FMError(data.messages[0].code, _fetch.status, data)
        }
    }
}
