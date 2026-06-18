/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {z, type ZodType} from 'zod'

export const ApiFieldTypes = {
    NORMAL: 'normal',
    CALCULATION: 'calculation',
    SUMMARY: 'summary'
} as const

export const ApiFieldDisplayTypes = {
    EDIT_TEXT: 'editText',
    POPUP_LIST: 'popupList',
    CHECKBOX: 'checkBox',
    RADIO_BUTTONS: 'radioButtons',
    SELECTION_LIST: 'selectionList',
    CALENDAR: 'calendar',
    SECURE_TEXT: 'secureText'
} as const

export const ApiFieldResultTypes = {
    TEXT: 'text',
    NUMBER: 'number',
    DATE: 'date',
    TIME: 'time',
    TIMESTAMP: 'timeStamp',
    CONTAINER: 'container'
} as const

export const ApiMessage = z.object({
    code: z.coerce.number(),
    message: z.string()
})
export const ApiResults = z.object({
    messages: z.array(ApiMessage)
})

export const ApiLayout: z.ZodType<{
    name: string
    isFolder?: boolean
    folderLayoutNames?: Array<z.infer<typeof ApiLayout>>
}> = z.lazy(() =>
    z.object({
        name: z.string(),
        isFolder: z.boolean().optional(),
        folderLayoutNames: z.array(ApiLayout).optional(),
    })
)

export const ApiFieldMetadata = z.object({
    name: z.string(),
    type: z.enum(ApiFieldTypes),
    displayType: z.enum(ApiFieldDisplayTypes),
    result: z.enum(ApiFieldResultTypes),
    global: z.boolean(),
    autoEnter: z.boolean(),
    fourDigitYear: z.boolean(),
    maxRepeat: z.coerce.number(),
    maxCharacters: z.coerce.number(),
    notEmpty: z.boolean(),
    numeric: z.boolean(),
    repetitionStart: z.coerce.number(),
    repetitionEnd: z.coerce.number(),
    timeOfDay: z.boolean(),
    valueList: z.string().optional()
})

export const ApiValueList = z.object({
    name: z.string(),
    type: z.string(),
    values: z.array(z.object({
        value: z.string(),
        displayName: z.string()
    }))
})

export const ApiLayoutMetadata = z.object({
    fieldMetaData: z.array(ApiFieldMetadata),
    portalMetaData: z.record(z.string(), z.array(ApiFieldMetadata)),
    valueLists: z.array(ApiValueList).optional()
})

export const ApiScriptResult = z.object({
    scriptError: z.string(),
    scriptResult: z.string().optional()
})

export const ApiFieldData = z.record(
    z.string(),
    z.union([z.string(), z.number()])
)

export const ApiResultSetObj = z.object({
    database: z.string(),
    layout: z.string(),
    table: z.string(),
    totalRecordCount: z.number(),
    foundCount: z.number(),
    returnedCount: z.number()
})

export const ApiPortalData = z.record(
    z.string(),
    z.array(ApiFieldData)
)

export const ApiRowDataDef = z.object({
    fieldData: ApiFieldData,
    portalData: ApiPortalData,
    modId: z.string(),
    recordId: z.string(),
    portalDataInfo: z.array(z.object({
        database: z.string(),
        table: z.string(),
        foundCount: z.number(),
        returnedCount: z.number()
    })).optional()
})

export const ApiRecordResponseObj = z.object({
    data: z.array(ApiRowDataDef),
    dataInfo: ApiResultSetObj
})
