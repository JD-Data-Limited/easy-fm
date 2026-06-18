/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type HostBase} from './HostBase.js'
import {type z, type ZodType} from 'zod'

export interface DatabaseBase {
    host: HostBase
    readonly name: string
    endpoint: string

    /**
     * @deprecated login is deprecated and is now handled by newer session management. This function is simply a placeholder.
     */
    login: () => Promise<void>

    /**
     * Immediately closes all open sessions and prevents new ones from being created.
     * @alias logout
     */
    close: () => Promise<void>
    logout: () => Promise<void>
    // layouts: DatabaseStructure["layouts"]

    fetch: (url: string | URL, options?: RequestInit) => Promise<Response>
    fetchJSON: <T extends ZodType | null = null>(
        url: string | URL,
        options: RequestInit & { type: T }
    ) => Promise<
    T extends ZodType
        ? z.infer<T> & { httpStatus: number }
        : { httpStatus: number }
    >
}
