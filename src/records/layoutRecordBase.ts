/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {type LayoutBase} from '../layouts/layoutBase.js'

export interface LayoutRecordBase {
    layout: LayoutBase
    commit: (extraBody: object) => Promise<this>
}
