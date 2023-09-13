/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {Portal} from "../records/portal";
import {Field} from "../records/field";

export interface LayoutInterface {
    fields: RecordFieldsMap,
    portals: PortalInterface
}

export interface PortalInterface {
    [key: string]: Portal<RecordFieldsMap>
}

export interface RecordFieldsMap {
    [fieldName: string]: Field<FieldValue>
}

export type FieldValue = string | number | Date