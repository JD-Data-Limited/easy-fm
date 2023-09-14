/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {Script, ScriptResult} from "../types";
import {FMError} from "../FMError";
import {DatabaseBase} from "../connection/databaseBase";

export interface LayoutBase {
    readonly name: string
    metadata: any
    endpoint: string
    runScript(script: Script): Promise<ScriptResult>
    getLayoutMeta(): Promise<this | FMError>
    database: DatabaseBase
}