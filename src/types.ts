/*
 * Copyright (c) 2022-2024. See LICENSE file for more information
 */

// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
import type * as http from 'http'
import {type FMError} from './FMError.js'
import {type LayoutInterface} from './layouts/layoutInterface.js'
import z from "zod"

export type PickPortals<LAYOUT extends LayoutInterface, PORTALS extends string | number | symbol = ''> =
    Omit<LAYOUT, 'portals'> & { portals: Pick<LAYOUT['portals'], PORTALS> }

export interface databaseOptionsBase<
    CREDENTAILS = loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken
> {
    database: string
    debug?: boolean
    credentials: CREDENTAILS
}

export interface databaseOptionsWithExternalSources<
    CREDENTIALS = loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken
> extends databaseOptionsBase<CREDENTIALS> {
    database: string
    debug?: boolean
    credentials: CREDENTIALS
    externalSources: Array<databaseOptionsBase<loginOptionsFileMaker>>
}

export interface loginOptionsToken {
    method: 'token'
    token: string
}

export interface loginOptionsOAuth {
    method: 'oauth'
    oauth: {
        requestId: string
        requestIdentifier: string
    }
}

export interface loginOptionsFileMaker {
    method: 'filemaker'
    username: string
    password: string
    /**
     * sessionPoolSize - The maximum number of sessions to keep open in the pool. Default is 4.
     */
    sessionPoolSize?: number
}

export interface loginOptionsClaris {
    method: 'claris'
    claris: {
        fmid: string
    }
}

export interface portalFetchData<T = string> {
    portalName: T
    offset: number
    limit: number
}

export interface ScriptRequestData {
    prerequest?: Script
    presort?: Script
    after?: Script
}

export interface extraBodyOptions {
    scripts?: ScriptRequestData
    options?: {
        /**
         * Defines what entry mode to use (FileMaker Server 2024 and newer)
         * user (default) - Field validation occurs as per normal. Request is blocked if validation failed.
         * script - Field validation is overridden/ignored when allowed in the database schema.
         */
        entrymode?: 'user' | 'script'
        /**
         * Overrides the 'prohibit modification of this field during data entry' property (FileMaker Server 2024 - 21.1.1 and newer)
         * user (default) - Follow this rule
         * script - Ignore this rule
         */
        prohibitmode?: 'user' | 'script'
    } & Record<string, any>
    deleteRelatedRecords?: Array<{
        table: string
        recordId: number
    }>
}

export interface Script {
    name: string
    parameter: string
}

export interface recordObject {
    recordId: number
    modId: number
    fieldData: any
    portalData?: portalDataObject
}

export type portalDataObject = Record<string, recordObject>

export interface FieldMetaData {
    name: string
    type: string
    displayType: string
    result: string
    global: boolean
    autoEnter: boolean
    fourDigitYear: boolean
    maxRepeat: number
    maxCharacters: number
    notEmpty: boolean
    numeric: boolean
    timeOfDay: false
    repetitionStart: number
    repetitionEnd: number
}

export interface LayoutMetaData {
    fieldMetaData: FieldMetaData[]
    portalMetaData?: Record<string, FieldMetaData[]>
}

export const FMHostMetadata = z.object({
    productInfo: z.object({
        buildDate: z.coerce.date().optional(),
        name: z.string(),
        version: z.string().optional(),
        dateFormat: z.string(),
        timeFormat: z.string(),
        timeStampFormat: z.string()
    })
})

export interface ScriptResult {
    scriptError?: FMError
    scriptResult?: string
}

export interface ContainerBufferResult {
    buffer: Buffer
    mime?: string
    request: http.IncomingMessage
}

//
// module.exports = {
//     default: {FileMakerConnection}
// }

export interface AuthorizationHeaders extends Record<string, string> {
    'Content-Type': 'application/json'
    Authorization: string
}

export interface AuthorizationHeadersOAuth extends Record<string, string> {
    'Content-Type': 'application/json'
    'X-FM-Data-OAuth-RequestId': string
    'X-FM-Data-OAuth-Identifier': string
}

export interface RecordFetchOptions {
    readonly portals: readonly string[]
}

export enum RecordTypes {
    UNKNOWN,
    LAYOUT,
    PORTAL
}
