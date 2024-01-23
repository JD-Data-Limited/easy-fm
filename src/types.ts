/*
 * Copyright (c) 2022-2024. See LICENSE file for more information
 */

// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// @ts-ignore
import * as http from "http";
import {FMError} from "./FMError.js";
import {LayoutInterface} from "./layouts/layoutInterface.js";

export type LayoutPickPortals<LAYOUT extends LayoutInterface, PORTALS extends string | number | symbol> =
    Omit<LAYOUT, "portals"> & { portals: Pick<LAYOUT["portals"], PORTALS> }

export interface databaseOptionsBase {
    database: string
    credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken,
}

export interface databaseOptionsWithExternalSources extends databaseOptionsBase {
    database: string
    credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken,
    externalSources: databaseOptionsBase[]
}

export interface loginOptionsToken {
    method: "token"
    token: string
}

export interface loginOptionsOAuth {
    method: "oauth"
    oauth: {
        requestId: string,
        requestIdentifier: string
    }
}

export interface loginOptionsFileMaker {
    method: "filemaker"
    username: string,
    password: string,
}

export interface loginOptionsClaris {
    method: "claris"
    claris: {
        fmid: string
    }
}

export interface portalFetchData<T = string> {
    portalName: T,
    offset: number,
    limit: number
}

export type ScriptRequestData = {
    prerequest?: Script,
    presort?: Script,
    after?: Script,
}

export interface extraBodyOptions {
    scripts?: ScriptRequestData
}

export enum DOWNLOAD_MODES {
    Stream,
    Buffer
}

export interface Script {
    name: string
    parameter: string
}

export interface recordObject {
    recordId: number
    modId: number,
    fieldData: any,
    portalData?: portalDataObject
}

export interface portalDataObject {
    [key: string]: recordObject
}

export interface FieldMetaData {
    name: string,
    type: string,
    displayType: string,
    result: string,
    global: boolean,
    autoEnter: boolean,
    fourDigitYear: boolean,
    maxRepeat: number,
    maxCharacters: number,
    notEmpty: boolean,
    numeric: boolean,
    timeOfDay: false,
    repetitionStart: number,
    repetitionEnd: number
}

export interface LayoutMetaData {
    fieldMetaData: FieldMetaData[],
    portalMetaData?: {
        [key: string]: FieldMetaData[]
    }
}

export interface FMHostMetadata {
    productInfo: {
        buildDate: Date,
        name: string,
        version: string,
        dateFormat: string,
        timeFormat: string,
        timeStampFormat: string
    }
}

export interface ScriptResult {
    scriptError?: FMError,
    scriptResult?: string
}

export interface ContainerBufferResult {
    buffer: Buffer,
    mime: string,
    request: http.IncomingMessage
}

//
// module.exports = {
//     default: {FileMakerConnection}
// }

export interface AuthorizationHeaders {
    "Content-Type": "application/json"
    Authorization: string
}

export interface AuthorizationHeadersOAuth {
    "Content-Type": "application/json"
    "X-FM-Data-OAuth-RequestId": string,
    "X-FM-Data-OAuth-Identifier": string
}

export type RecordFetchOptions = {
    readonly portals: readonly string[]
}

export enum RecordTypes {
    UNKNOWN,
    LAYOUT,
    PORTAL
}