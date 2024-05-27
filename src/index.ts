/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import FMHost from './connection/FMHost.js'
import {FMError} from './FMError.js'
import * as TYPES from './types.js'
import {type PickPortals} from './types.js'
import {Database} from './connection/database.js'
import {Layout} from './layouts/layout.js'
import {RecordBase} from './records/recordBase.js'
import {LayoutRecord} from './records/layoutRecord.js'
import {type LayoutInterface, type PortalInterface} from './layouts/layoutInterface.js'
import {PortalRecord} from './records/portalRecord.js'
import {Portal} from './records/portal.js'
import {type FindRequest, type FindRequestRaw, RecordGetOperation} from './records/getOperations/recordGetOperation.js'
import {LayoutRecordManager} from './layouts/layoutRecordManager.js'
import {type RecordFieldsMap} from './layouts/recordFieldsMap.js'
import {asDate, asTime, asTimestamp, query, queryEscape} from './utils/query.js'
import {type Container, Field} from './records/field.js'

export default FMHost
export {
    FMError,
    TYPES,
    Database,
    Layout,
    RecordBase,
    LayoutRecord,
    type LayoutInterface,
    type RecordFieldsMap,
    type PortalInterface,
    PortalRecord,
    Portal,
    Field,
    RecordGetOperation,
    LayoutRecordManager,
    type Container,
    type PickPortals,
    type FindRequestRaw,
    type FindRequest,
    query,
    queryEscape,
    asDate,
    asTime,
    asTimestamp
}
