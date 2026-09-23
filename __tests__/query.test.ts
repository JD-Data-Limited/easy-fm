/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {equal} from 'node:assert'
import {Temporal} from 'temporal-polyfill'
import {asDate, asTime, asTimestamp, FindRequestSymbol, query, queryEscape} from '../src/utils/query.js'

describe('Query utilities', () => {
    it('Escapes interpolated wildcard characters', () => {
        const result = query`=${'*'}`
        equal(result[FindRequestSymbol].join(''), '=\\*')
    })

    it('Escapes numeric parameters before interpolation', () => {
        const result = query`=${123}`
        equal(result[FindRequestSymbol].join(''), '=123')
    })

    it('Builds date query tokens', () => {
        const value = Temporal.PlainDate.from('2024-01-02')
        const result = query`=${value}`
        equal(result[FindRequestSymbol][1], value)
    })

    it('Builds time query tokens', () => {
        const value = Temporal.PlainTime.from('03:04:05')
        const result = query`=${value}`
        equal(result[FindRequestSymbol][1], value)
    })

    it('Builds timestamp query tokens', () => {
        const value = Temporal.PlainDateTime.from('2024-01-02T03:04:05')
        const result = query`=${value}`
        equal(result[FindRequestSymbol][1], value)
    })

    it('converts legacy Date values to Temporal query values', () => {
        const value = new Date(2024, 0, 2, 3, 4, 5, 678)

        expect(asDate(value).toString()).toBe('2024-01-02')
        expect(asTime(value).toString()).toBe('03:04:05.678')
        expect(asTimestamp(value).toString()).toBe('2024-01-02T03:04:05.678')
        expect(query`=${asTimestamp(value)}`[FindRequestSymbol][1]).toBeInstanceOf(Temporal.PlainDateTime)
    })

    it('accepts legacy Moment-like values while returning Temporal objects', () => {
        const value = {toDate: () => new Date(2024, 0, 2, 3, 4, 5)}

        expect(asDate(value)).toBeInstanceOf(Temporal.PlainDate)
        expect(asTime(value)).toBeInstanceOf(Temporal.PlainTime)
        expect(asTimestamp(value)).toBeInstanceOf(Temporal.PlainDateTime)
    })

    it('Escapes explicit query strings', () => {
        equal(queryEscape('*'), '\\*')
    })
})
