/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Temporal} from 'temporal-polyfill'

export const FindRequestSymbol = Symbol('easyfm-findrequest')
const SPECIAL_CHARACTERS = ['\\', '=', '<', '≤', '≥', '>', '…', '...', '//', '@', '#', '*', '"', '~']
export type TimestampType = Temporal.PlainDate | Temporal.PlainTime | Temporal.PlainDateTime
type QueryParameter = string | number | TimestampType
/** Represents a FileMaker find value produced by `query(...)`. */
export interface Query { [FindRequestSymbol]: Array<string | TimestampType> }

type LegacyDateLike = { toDate: () => Date }
type DateInput = Date | LegacyDateLike

function toDate (value: DateInput): Date {
    const date = value instanceof Date ? value : value.toDate()
    if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date value')
    return date
}

/**
 * Converts a JavaScript Date or legacy Moment-like value to a Temporal date.
 * @deprecated Construct a `Temporal.PlainDate` directly instead.
 */
export function asDate (value: DateInput | Temporal.PlainDate | Temporal.PlainDateTime): Temporal.PlainDate {
    if (value instanceof Temporal.PlainDate) return value
    if (value instanceof Temporal.PlainDateTime) return value.toPlainDate()
    const date = toDate(value)
    return Temporal.PlainDate.from({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
    })
}

/**
 * Converts a JavaScript Date or legacy Moment-like value to a Temporal time.
 * @deprecated Construct a `Temporal.PlainTime` directly instead.
 */
export function asTime (value: DateInput | Temporal.PlainTime | Temporal.PlainDateTime): Temporal.PlainTime {
    if (value instanceof Temporal.PlainTime) return value
    if (value instanceof Temporal.PlainDateTime) return value.toPlainTime()
    const date = toDate(value)
    return Temporal.PlainTime.from({
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        millisecond: date.getMilliseconds()
    })
}

/**
 * Converts a JavaScript Date or legacy Moment-like value to a Temporal timestamp.
 * @deprecated Construct a `Temporal.PlainDateTime` directly instead.
 */
export function asTimestamp (value: DateInput | Temporal.PlainDateTime): Temporal.PlainDateTime {
    if (value instanceof Temporal.PlainDateTime) return value
    const date = toDate(value)
    return Temporal.PlainDateTime.from({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        millisecond: date.getMilliseconds()
    })
}

/** Escapes special characters in a raw FileMaker find string. */
export function queryEscape (str: string) {
    for (const char of SPECIAL_CHARACTERS) {
        str = str.replace(char, `\\${char}`)
    }
    return str
}

/** Builds a FileMaker find value using template-string syntax. */
export function query (strings: TemplateStringsArray, ...args: QueryParameter[]): Query {
    const argStrings = args.map(item => {
        if (typeof item === 'number') {
            return queryEscape(item.toString())
        } else if (typeof item === 'string') return queryEscape(item)
        else return item
    })

    // Zip the parameters together
    const query = strings.map((str, index) => {
        return [str, (argStrings[index] || '')]
    }).flat(1)
    return {[FindRequestSymbol]: query}
}
