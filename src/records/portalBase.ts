/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordFieldsMap} from "../layouts/recordFieldsMap";
import {LayoutRecordBase} from "./layoutRecordBase";
import {RecordBase} from "./recordBase";
import {LayoutRecord} from "./layoutRecord";
import {LayoutInterface} from "../layouts/layoutInterface";

export interface PortalBase<T extends RecordFieldsMap> {
    readonly record: LayoutRecord<LayoutInterface>
    readonly name: string
    records: RecordBase<T>[]
}