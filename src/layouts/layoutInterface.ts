/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type Portal} from '../records/portal.js'
import {type RecordFieldsMap} from './recordFieldsMap.js'

export interface LayoutInterface {
    fields: RecordFieldsMap
    portals: PortalInterface
}

export type PortalInterface = Record<string | number | symbol, Portal<RecordFieldsMap>>
