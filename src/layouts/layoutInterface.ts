/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {Portal} from "../records/portal.js";
import {RecordFieldsMap} from "./recordFieldsMap.js";

export interface LayoutInterface {
    fields: RecordFieldsMap,
    portals: PortalInterface
}

export interface PortalInterface {
    [key: string | number | symbol]: Portal<RecordFieldsMap>
}

