/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {HostBase} from "./HostBase.js"
import {Request} from "node-fetch";
import {DatabaseStructure} from "../types";

export interface DatabaseBase {
    host: HostBase,
    readonly name: string
    endpoint: string

    // layouts: DatabaseStructure["layouts"]

    apiRequest(url: string | Request, options?: any, autoRelogin?: boolean): Promise<any>
}