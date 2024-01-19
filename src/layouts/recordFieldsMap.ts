/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {FieldBase, FieldValue} from "../records/fieldBase.js";

export interface RecordFieldsMap {
    [fieldName: string]: FieldBase<FieldValue>
}