/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type RecordFieldsMap} from '../layouts/recordFieldsMap.js'
import {type RecordBase} from './recordBase.js'
import {type LayoutRecord} from './layoutRecord.js'
import {type LayoutInterface} from '../layouts/layoutInterface.js'

export interface PortalBase<T extends RecordFieldsMap> {
    readonly record: LayoutRecord<LayoutInterface>
    readonly name: string
    records: Array<RecordBase<T>>
}
