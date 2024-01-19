/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {FMHostMetadata} from "../types.js";

export interface HostBase {
    readonly hostname: string
    readonly timezoneOffset: number
    readonly verify: boolean
    metadata: FMHostMetadata
    getMetadata(): PromiseLike<any>
}