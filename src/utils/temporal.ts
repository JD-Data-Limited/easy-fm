/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {Temporal} from 'temporal-polyfill'


export type TemporalValue = Temporal.PlainDate | Temporal.PlainTime | Temporal.PlainDateTime
export type TemporalValueType = 'date' | 'time' | 'timestamp'

type FormatToken = 'yyyy' | 'MM' | 'dd' | 'HH' | 'mm' | 'ss'

const FORMAT_TOKEN_PATTERN = /yyyy|MM|dd|HH|mm|ss/g
const TOKEN_PATTERNS: Record<FormatToken, string> = {
    yyyy: '\\d{4}',
    MM: '\\d{2}',
    dd: '\\d{2}',
    HH: '\\d{2}',
    mm: '\\d{2}',
    ss: '\\d{2}'
}

function normalizeFormat(format: string): string {
    return format.replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd')
}

function pad(value: number, length = 2): string {
    return value.toString().padStart(length, '0')
}

function invalidTemporalString(value: string, format: string): never {
    throw new RangeError(`Invalid Temporal value ${JSON.stringify(value)}; expected ${format}`)
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokensIn(format: string): FormatToken[] {
    const tokens = format.match(FORMAT_TOKEN_PATTERN) as FormatToken[] | null
    if (!tokens) throw new RangeError(`Format ${JSON.stringify(format)} contains no supported tokens`)
    if (new Set(tokens).size !== tokens.length) {
        throw new RangeError(`Format ${JSON.stringify(format)} contains duplicate tokens`)
    }
    return tokens
}

function parserFor(format: string): { pattern: RegExp, tokens: FormatToken[] } {
    const tokens = tokensIn(format)
    let source = '^'
    let lastIndex = 0

    for (const match of format.matchAll(FORMAT_TOKEN_PATTERN)) {
        source += escapeRegExp(format.slice(lastIndex, match.index))
        source += `(${TOKEN_PATTERNS[match[0] as FormatToken]})`
        lastIndex = match.index + match[0].length
    }

    source += `${escapeRegExp(format.slice(lastIndex))}$`
    return {pattern: new RegExp(source), tokens}
}

/** Formats a Temporal value using the supplied token-based format. */
export function temporalToString(value: TemporalValue, format: string): string {
    format = normalizeFormat(format)
    const values: Partial<Record<FormatToken, string>> = {}

    if (value instanceof Temporal.PlainDateTime) {
        Object.assign(values, {
            yyyy: pad(value.year, 4), MM: pad(value.month), dd: pad(value.day),
            HH: pad(value.hour), mm: pad(value.minute), ss: pad(value.second)
        })
    } else if (value instanceof Temporal.PlainDate) {
        Object.assign(values, {yyyy: pad(value.year, 4), MM: pad(value.month), dd: pad(value.day)})
    } else if (value instanceof Temporal.PlainTime) {
        Object.assign(values, {HH: pad(value.hour), mm: pad(value.minute), ss: pad(value.second)})
    } else {
        throw new TypeError('Expected a Temporal.PlainDate, Temporal.PlainTime, or Temporal.PlainDateTime')
    }

    tokensIn(format).forEach(token => {
        if (values[token] === undefined) throw new RangeError(`Token ${token} is not available for this Temporal type`)
    })
    return format.replace(FORMAT_TOKEN_PATTERN, token => values[token as FormatToken] as string)
}

export function stringToTemporal(value: string, type: 'date', format: string): Temporal.PlainDate
export function stringToTemporal(value: string, type: 'time', format: string): Temporal.PlainTime
export function stringToTemporal(value: string, type: 'timestamp', format: string): Temporal.PlainDateTime
export function stringToTemporal(value: string, type: TemporalValueType, format: string): TemporalValue
/** Parses a Temporal value using the supplied token-based format. */
export function stringToTemporal(value: string, type: TemporalValueType, format: string): TemporalValue {
    format = normalizeFormat(format)
    const {pattern, tokens} = parserFor(format)
    const match = pattern.exec(value)
    if (!match) return invalidTemporalString(value, format)

    const parts = Object.fromEntries(tokens.map((token, index) => [token, Number(match[index + 1])])) as Partial<Record<FormatToken, number>>
    const required: FormatToken[] = type === 'date'
        ? ['yyyy', 'MM', 'dd']
        : type === 'time'
            ? ['HH', 'mm', 'ss']
            : ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss']

    if (tokens.length !== required.length || required.some(token => parts[token] === undefined)) {
        throw new RangeError(`Format ${JSON.stringify(format)} does not match Temporal type ${type}`)
    }

    if (type === 'date') {
        return Temporal.PlainDate.from({
            year: parts.yyyy as number,
            month: parts.MM as number,
            day: parts.dd as number
        }, {overflow: 'reject'})
    } else if (type === 'time') {
        return Temporal.PlainTime.from({
            hour: parts.HH as number,
            minute: parts.mm as number,
            second: parts.ss as number
        }, {overflow: 'reject'})
    }

    return Temporal.PlainDateTime.from({
        year: parts.yyyy as number,
        month: parts.MM as number,
        day: parts.dd as number,
        hour: parts.HH as number,
        minute: parts.mm as number,
        second: parts.ss as number
    }, {overflow: 'reject'})
}
