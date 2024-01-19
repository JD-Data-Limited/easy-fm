/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {RecordBase} from "./recordBase";
import {FieldBase, FieldValue} from "./fieldBase";

export class Field<T extends FieldValue> extends FieldBase<T> {
    record: RecordBase<any>;
}