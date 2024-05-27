/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type HostBase} from './HostBase.js'
import {type ApiResults} from '../models/apiResults.js'
import {type RequestInfo, type RequestInit, type Response} from 'node-fetch'

export interface DatabaseBase {
    host: HostBase
    readonly name: string
    endpoint: string
    token: string

    // layouts: DatabaseStructure["layouts"]

    _apiRequestJSON: <T = unknown>(url: URL | RequestInfo, options?: RequestInit & { headers?: Record<string, string> } | undefined, autoRelogin?: boolean) => Promise<ApiResults<T>>
    _apiRequestRaw: (url: URL | RequestInfo, options?: RequestInit & { headers?: Record<string, string>, useCookieJar?: boolean } | undefined) => Promise<Response>
}
