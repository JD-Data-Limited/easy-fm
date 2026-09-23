/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type Portal} from '../records/portal.js'
import {type Field} from '../records/fields/field.js'

export interface LayoutInterface {
    fields: RecordFieldsMap
    portals: PortalInterface
}

export type RecordFieldsMap = Record<string, Field>

export type PortalInterface = Record<string | number | symbol, Portal<RecordFieldsMap>>
