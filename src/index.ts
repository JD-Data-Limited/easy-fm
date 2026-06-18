/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import FMHost from './connection/FMHost.js'
import type * as TYPES from './types.js'

/** Error type returned for FileMaker Data API failures. */
export {FMError} from './FMError.js'
/** Utility type for narrowing portal data on typed layouts. */
export {type PickPortals} from './types.js'
/** Base database connection abstraction used by all auth modes. */
export {Database} from './connection/database.js'
/** Layout-scoped API wrapper for metadata, scripts, and record operations. */
export {Layout} from './layouts/layout.js'
/** Base record implementation shared by layout and portal records. */
export {RecordBase} from './records/recordBase.js'
/** Record returned from a layout. Supports fetch, commit, duplicate, and delete. */
export {LayoutRecord} from './records/layoutRecord.js'
/** Type helpers for describing typed layouts and portals. */
export {type LayoutInterface, type PortalInterface} from './layouts/layoutInterface.js'
/** Record returned from a portal row. */
export {PortalRecord} from './records/portalRecord.js'
/** Wrapper around portal rows included in a layout record. */
export {Portal} from './records/portal.js'
/** Types and builder used for list/find record operations. */
export {type FindRequest, type FindRequestRaw, RecordGetOperation} from './records/getOperations/recordGetOperation.js'
/** Entry point for `layout.records.*` operations. */
export {LayoutRecordManager} from './layouts/layoutRecordManager.js'
/** Type alias for map of fields on a typed record. */
export {type RecordFieldsMap} from './layouts/recordFieldsMap.js'
/** Helpers for safe FileMaker find query construction and date/time formatting. */
export {asDate, asTime, asTimestamp, query, queryEscape} from './utils/query.js'
/** Field wrapper used for reading, editing, and container access. */
export {type Container, Field} from './records/field.js'

/** Default export. Represents FileMaker host/server. */
export default FMHost
export {
    /** Namespace re-export of library public types. */
    type TYPES
}
