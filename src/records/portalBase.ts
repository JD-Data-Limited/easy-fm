/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {RecordFieldsMap} from "../layouts/recordFieldsMap";
import {LayoutRecordBase} from "./layoutRecordBase";
import {RecordBase} from "./recordBase";
import {LayoutRecord} from "./layoutRecord";

export interface PortalBase<T extends RecordFieldsMap> {
    readonly record: LayoutRecord<any, any>
    readonly name: string
    records: RecordBase<T>[]
}