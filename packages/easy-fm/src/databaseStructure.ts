/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

// import * as btoa from "btoa";
import {type LayoutInterface} from './layouts/layoutInterface.js'

export interface DatabaseStructure {
    layouts: Record<string, LayoutInterface>
}
