/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type Script, type ScriptResult} from '../types.js'
import {type DatabaseBase} from '../connection/databaseBase.js'
import {type ApiLayoutMetadata} from '../models/apiResults.js'

export interface LayoutBase {
    readonly name: string
    metadata: ApiLayoutMetadata | null
    endpoint: string
    runScript: (script: Script) => Promise<ScriptResult>
    getLayoutMeta: () => Promise<ApiLayoutMetadata>
    database: DatabaseBase
}
