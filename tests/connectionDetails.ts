/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import FMHost from '../src/index.js'
import {config} from 'dotenv'

config()

export const DATABASE_HOST = process?.env.FM_DB_HOST ?? 'http://localhost'
export const DATABASE_NAME = process.env.FM_DB_NAME ?? 'database.fmp12'
export const DATABASE_ACCOUNT = process.env.FM_DB_ACCOUNT ?? 'username'
export const DATABASE_PASSWORD = process.env.FM_DB_PASSWORD ?? 'password'

export const HOST = new FMHost(DATABASE_HOST, (moment) => 0 - moment.toDate().getTimezoneOffset(), false)
export const DATABASE = HOST.database({
    database: DATABASE_NAME,
    credentials: {
        method: 'filemaker',
        username: DATABASE_ACCOUNT,
        password: DATABASE_PASSWORD
    },
    externalSources: []
})
