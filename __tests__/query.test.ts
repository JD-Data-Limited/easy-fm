/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {equal} from 'node:assert'
import {Temporal} from 'temporal-polyfill'
import {FindRequestSymbol, query, queryEscape} from '../src/utils/query.js'

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

    it('Escapes explicit query strings', () => {
        equal(queryEscape('*'), '\\*')
    })
})
