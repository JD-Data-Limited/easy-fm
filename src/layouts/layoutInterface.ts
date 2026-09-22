/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type Portal} from '../records/portal.js'
import {type Field} from '../records/fields/field.js'
import {type Temporal} from 'temporal-polyfill'
import {
    type DateField,
    type NumberField,
    type TextField,
    type TimeField,
    type TimeStampField
} from '../records/fields/valueField.js'

export type FieldValue = string
    | number
    | Temporal.PlainDateTime
    | Temporal.PlainTime
    | Temporal.PlainDate

export interface LayoutInterface {
    fields: RecordFieldsMap
    portals: PortalInterface
}

export type RecordFieldsMap = Record<string, Field>

export type PortalInterface = Record<string | number | symbol, Portal<RecordFieldsMap>>

export interface LayoutInterfaceSimplified {
    fields: Record<string, FieldValue | Field>
    portals?: Record<string | number | symbol, Record<string, FieldValue | Field>>
}

type Simplify<T> = {
    [K in keyof T]: T[K]
} & unknown

export type AsLayoutInterface<T extends LayoutInterface | LayoutInterfaceSimplified> = Simplify<T extends LayoutInterface
    ? T
    : {
        fields: Simplify<{
            [FIELD in keyof T['fields']]: FieldValueToField<T['fields'][FIELD]>
        }>
        portals: T['portals'] extends undefined ? Record<PropertyKey, never> : Simplify<{
            [PORTAL in keyof T['portals']]: Simplify<{
                [FIELD in keyof T['portals'][PORTAL]]: FieldValueToField<T['portals'][PORTAL][FIELD]>
            }>
        }>
    }>

export type FieldValueToField<V> = V extends Field ? Field
    : V extends string ? TextField<V>
        : V extends number ? NumberField<V>
            : V extends Temporal.PlainDateTime ? TimeStampField
                : V extends Temporal.PlainDate ? DateField
                    : V extends Temporal.PlainTime ? TimeField
                        : never
