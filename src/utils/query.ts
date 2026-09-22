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
