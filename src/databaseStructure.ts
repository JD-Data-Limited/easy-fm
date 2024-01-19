/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

// import * as btoa from "btoa";
import {LayoutInterface} from "./layouts/layoutInterface.js";

export interface DatabaseStructure {
    layouts: {
        [key: string]: LayoutInterface
    }
}