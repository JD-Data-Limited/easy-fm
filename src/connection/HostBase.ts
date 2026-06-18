/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type FMHostMetadata} from '../types.js'
import {type Moment} from 'moment'
import {type z} from 'zod'
import {type DatabaseProtocol} from './Session.js'

export interface HostBase {
    readonly hostname: string
    readonly protocol: DatabaseProtocol
    readonly timezoneOffsetFunc: (moment: Moment) => number
    readonly verify: boolean
    metadata: z.infer<typeof FMHostMetadata>
    getMetadata: () => PromiseLike<any>
    timeFormat: string
    dateFormat: string
    timeStampFormat: string
}
