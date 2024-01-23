/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {RecordBase} from "./recordBase.js";
import {FieldBase, FieldValue} from "./fieldBase.js";

export class Field<T extends FieldValue> extends FieldBase<T> {
    record: RecordBase<any>;
}