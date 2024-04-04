/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {HostBase} from "./HostBase.js"
import {ApiResults} from "../models/apiResults.js";
import {IncomingMessage} from "http";

export interface DatabaseBase {
    host: HostBase,
    readonly name: string
    endpoint: string

    // layouts: DatabaseStructure["layouts"]

    apiRequestJSON<T = unknown>(url: string | Request, options?: RequestInit | undefined, autoRelogin?: boolean): Promise<ApiResults<T>>
    apiRequestRaw(url: string | Request, options?: RequestInit | undefined): Promise<Response>
    streamURL(url: string): Promise<IncomingMessage>
}