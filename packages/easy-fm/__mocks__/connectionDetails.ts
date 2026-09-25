/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {
    ContainerField,
    DataApiProvider,
    Database,
    DateField,
    type LayoutInterface,
    type Portal,
    TextField,
    TimeField,
    TimeStampField
} from '../dist/index.js'
import {config} from 'dotenv'

config()

export const DATABASE_HOST = process?.env.FM_DB_HOST ?? 'http://localhost'
export const DATABASE_NAME = process.env.FM_DB_NAME ?? 'EasyFMBenchmark.fmp12'
export const DATABASE_ACCOUNT = process.env.FM_DB_ACCOUNT ?? 'Admin'
export const DATABASE_PASSWORD = process.env.FM_DB_PASSWORD ?? 'Admin'

export interface EasyFMBenchmarkLayout extends LayoutInterface {
    fields: {
        Container: ContainerField
        OneVeryLongField: TextField
        PrimaryKey: TextField
        AVeryStrictField: TextField
        CreationTimestamp: TimeStampField
        Date: DateField
        Time: TimeField
        Timestamp: TimeStampField
    }
    portals: {
        test: Portal<{
            field1: TextField
        }>
    }
}

export type DatabaseSchema = {
    layouts: {
        EasyFMBenchmark: EasyFMBenchmarkLayout
    }
}

console.log(DATABASE_HOST, DATABASE_NAME, DATABASE_ACCOUNT, DATABASE_PASSWORD)

console.log({
    database: DATABASE_NAME,
    credentials: {
        method: 'filemaker',
        username: DATABASE_ACCOUNT,
        password: DATABASE_PASSWORD
    },
    externalSources: [],
    debug: true
})
export const DATABASE = Database.create<DatabaseSchema>({provider: new DataApiProvider({
    hostname: DATABASE_HOST,
    database: 'EasyFMBenchmark',
    credentials: {
        method: 'filemaker',
        username: DATABASE_ACCOUNT,
        password: DATABASE_PASSWORD
    },
    externalSources: [],
    debug: true
}), debug: true})
