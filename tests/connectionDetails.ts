/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import FMHost, {type Container, type Field, type Portal} from '../src/index.js'
import {config} from 'dotenv'

config()

export const DATABASE_HOST = process?.env.FM_DB_HOST ?? 'http://localhost'
export const DATABASE_NAME = process.env.FM_DB_NAME ?? 'database.fmp12'
export const DATABASE_ACCOUNT = process.env.FM_DB_ACCOUNT ?? 'username'
export const DATABASE_PASSWORD = process.env.FM_DB_PASSWORD ?? 'password'

export const HOST = new FMHost(DATABASE_HOST, (moment) => 0 - moment.toDate().getTimezoneOffset(), false)

export interface DatabaseSchema {
    layouts: {
        EasyFMBenchmark: {
            fields: {
                Container: Field<Container>
                OneVeryLongField: Field<string>
                PrimaryKey: Field<string>
                AVeryStrictField: Field<string>
            }
            portals: {
                test: Portal<{
                    field1: Field<string>
                }>
            }
        }
    }
}

console.log(DATABASE_HOST, DATABASE_NAME, DATABASE_ACCOUNT, DATABASE_PASSWORD)

export const DATABASE = HOST.database<DatabaseSchema>({
    database: DATABASE_NAME,
    credentials: {
        method: 'filemaker',
        username: DATABASE_ACCOUNT,
        password: DATABASE_PASSWORD
    },
    externalSources: [],
    debug: true
})
