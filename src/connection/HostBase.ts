/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {FMHostMetadata} from "../types.js";
import {Moment} from "moment";

export interface HostBase {
    readonly hostname: string
    readonly timezoneOffsetFunc: (moment: Moment) => number,
    readonly verify: boolean
    metadata: FMHostMetadata
    getMetadata(): PromiseLike<any>
    timeFormat: string
    dateFormat: string
    timeStampFormat: string
}