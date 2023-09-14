/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {Portal} from "../records/portal.js";
import {RecordFieldsMap} from "./recordFieldsMap";

export interface LayoutInterface {
    fields: RecordFieldsMap,
    portals: PortalInterface
}

export interface PortalInterface {
    [key: string]: Portal<RecordFieldsMap>
}

