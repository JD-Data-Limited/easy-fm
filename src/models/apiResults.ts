/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

export enum ApiFieldTypes {
    NORMAL = 'normal',
    CALCULATION = 'calculation',
    SUMMARY = 'summary'
}

export enum ApiFieldDisplayTypes {
    EDIT_TEXT = 'editText',
    POPUP_LIST = 'popupList',
    CHECKBOX = 'checkBox',
    RADIO_BUTTONS = 'radioButtons',
    SELECTION_LIST = 'selectionList',
    CALENDAR = 'calendar',
    SECURE_TEXT = 'secureText'
}

export enum ApiFieldResultTypes {
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
    TIME = 'time',
    TIMESTAMP = 'timeStamp',
    CONTAINER = 'container'
}

export interface ApiMessage {
    code: string
    message: string
}

export interface ApiResults<T = unknown> {
    response?: null | T & { scriptError?: string }
    messages: ApiMessage[]
    httpStatus: number
}

export interface ApiLayout {
    name: string
    isFolder?: boolean
    folderLayoutNames?: ApiLayout[]
}

export interface ApiLayoutMetadata {
    fieldMetaData: ApiFieldMetadata[]
    portalMetaData: Record<string, ApiFieldMetadata[]>
    valueLists: ApiValueList[]
}

export interface ApiFieldMetadata {
    name: string
    type: ApiFieldTypes
    displayType: ApiFieldDisplayTypes
    result: ApiFieldResultTypes
    global: boolean
    autoEnter: boolean
    fourDigitYear: boolean
    maxRepeat: number
    maxCharacters: number
    notEmpty: boolean
    numeric: boolean
    repetitions: number
    timeOfDay: boolean
    valueList: string
}

export interface ApiValueList {
    name: string
    type: string
    values: Array<{ value: string, displayName: string }>
}

export interface ApiScriptResult {
    scriptError: string
    scriptResult?: string
}

export interface ApiRecordResponseObj {
    data: ApiRowDataDef[]
    dataInfo: ApiResultSetObj
}

export type ApiFieldData = Record<string, string | number>

export type ApiPortalData = Record<string, ApiFieldData[]>

export interface ApiResultSetObj {
    database: string
    layout: string
    table: string
    totalRecordCount: number
    foundCount: number
    returnedCount: number
}

export interface ApiRowDataDef {
    fieldData: ApiFieldData
    portalData: ApiPortalData
    modId: string
    recordId: string
    portalDataInfo?: Array<{
        database: string
        table: string
        foundCount: number
        returnedCount: number
    }>
}
