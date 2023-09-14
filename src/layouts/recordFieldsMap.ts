/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {Field, FieldValue} from "../records/field";

export interface RecordFieldsMap {
    [fieldName: string]: Field<FieldValue>
}