/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type Portal} from '../records/portal.js'

export interface LayoutInterface {
    fields: RecordFieldsMap
    portals: PortalInterface
}

/** Public field views, including generated read-only views, satisfy this shape. */
export type RecordFieldsMap = Record<string, {readonly value: unknown}>

export type PortalInterface = Record<string | number | symbol, Portal<RecordFieldsMap>>
