/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type HostBase} from './HostBase.js'
import {type ApiResults} from '../models/apiResults.js'
import {type IncomingMessage} from 'http'

export interface DatabaseBase {
    host: HostBase
    readonly name: string
    endpoint: string
    token: string

    // layouts: DatabaseStructure["layouts"]

    apiRequestJSON: <T = unknown>(url: string | Request, options?: RequestInit & { headers?: Record<string, string> } | undefined, autoRelogin?: boolean) => Promise<ApiResults<T>>
    apiRequestRaw: (url: string | Request, options?: RequestInit & { headers?: Record<string, string> } | undefined) => Promise<Response>
    streamURL: (url: string) => Promise<IncomingMessage>
}
