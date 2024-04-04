/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {Field, FieldValue} from "../records/field.js";

export interface RecordFieldsMap {
    [fieldName: string]: Field<FieldValue>
}