/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {HostBase} from "./HostBase.js"
import {Request} from "node-fetch";
import {DatabaseStructure} from "../types";
import {ApiResults} from "../models/apiResults";
import HTTP_REDIRECT  from "follow-redirects"

export interface DatabaseBase {
    host: HostBase,
    readonly name: string
    endpoint: string

    // layouts: DatabaseStructure["layouts"]

    apiRequest<T = unknown>(url: string | Request, options?: any, autoRelogin?: boolean): Promise<ApiResults<T>>
    streamURL(url: string): Promise<HTTP_REDIRECT.http.IncomingMessage>
}