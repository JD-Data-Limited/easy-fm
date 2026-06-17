/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {equal} from 'node:assert'
import moment from 'moment'
import {asDate, asTime, asTimestamp, query, queryEscape} from '../src/utils/query.js'
import {FindRequestSymbol} from '../src/utils/query.js'

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
        const value = asDate(moment('2024-01-02T03:04:05Z'))
        const result = query`=${value}`
        equal(result[FindRequestSymbol][1], value)
        equal(value.type, 'date')
    })

    it('Builds time query tokens', () => {
        const value = asTime(moment('2024-01-02T03:04:05Z'))
        const result = query`=${value}`
        equal(result[FindRequestSymbol][1], value)
        equal(value.type, 'time')
    })

    it('Builds timestamp query tokens', () => {
        const value = asTimestamp(moment('2024-01-02T03:04:05Z'))
        const result = query`=${value}`
        equal(result[FindRequestSymbol][1], value)
        equal(value.type, 'timestamp')
    })

    it('Escapes explicit query strings', () => {
        equal(queryEscape('*'), '\\*')
    })
})
