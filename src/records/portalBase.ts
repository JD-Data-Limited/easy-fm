/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordFieldsMap} from "../layouts/recordFieldsMap.js";
import {RecordBase} from "./recordBase.js";
import {LayoutRecord} from "./layoutRecord.js";
import {LayoutInterface} from "../layouts/layoutInterface.js";

export interface PortalBase<T extends RecordFieldsMap> {
    readonly record: LayoutRecord<LayoutInterface>
    readonly name: string
    records: RecordBase<T>[]
}