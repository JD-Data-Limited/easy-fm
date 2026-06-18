/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import moment, {type Moment} from 'moment'

export const FindRequestSymbol = Symbol('easyfm-findrequest')
const SPECIAL_CHARACTERS = ['\\', '=', '<', '≤', '≥', '>', '…', '...', '//', '@', '#', '*', '"', '~']
/** Represents a date, time, or timestamp value passed into `query(...)`. */
export interface TimestampType {
    type: 'date' | 'time' | 'timestamp'
    moment: Moment
}
type QueryParameter = string | number | TimestampType
/** Represents a FileMaker find value produced by `query(...)`. */
export interface Query { [FindRequestSymbol]: Array<string | TimestampType> }

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

/** Marks a value as a FileMaker date for use inside `query(...)`. */
export function asDate (date: Date | Moment): TimestampType {
    return {
        type: 'date',
        moment: moment(date)
    }
}

/** Marks a value as a FileMaker time for use inside `query(...)`. */
export function asTime (date: Date | Moment): TimestampType {
    return {
        type: 'time',
        moment: moment(date)
    }
}

/** Marks a value as a FileMaker timestamp for use inside `query(...)`. */
export function asTimestamp (date: Date | Moment): TimestampType {
    return {
        type: 'timestamp',
        moment: moment(date)
    }
}

query
