/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {Temporal} from 'temporal-polyfill'
import {stringToTemporal, temporalToString} from '../src/utils/temporal.js'

describe('Temporal conversion utilities', () => {
    describe('temporalToString', () => {
        it.each([
            [Temporal.PlainDate.from('2026-09-02'), 'MM/dd/yyyy', '09/02/2026'],
            [Temporal.PlainTime.from('04:05:06'), 'HH:mm:ss', '04:05:06'],
            [Temporal.PlainDateTime.from('2026-09-02T04:05:06'), 'MM/dd/yyyy HH:mm:ss', '09/02/2026 04:05:06']
        ])('formats %s using %s', (value, format, expected) => {
            expect(temporalToString(value, format)).toBe(expected)
        })

        it.each([
            ['dd-MM-yyyy', '02-09-2026'],
            ['yyyy.MM.dd', '2026.09.02'],
            ['HH|ss|mm yyyy[dd]MM', '04|06|05 2026[02]09']
        ])('supports reordered tokens and custom separators: %s', (format, expected) => {
            const value = Temporal.PlainDateTime.from('2026-09-02T04:05:06')
            expect(temporalToString(value, format)).toBe(expected)
        })

        it('rejects tokens unavailable on the supplied Temporal type', () => {
            expect(() => temporalToString(Temporal.PlainDate.from('2026-09-02'), 'yyyy-MM-dd HH:mm:ss'))
                .toThrow('Token HH is not available')
            expect(() => temporalToString(Temporal.PlainTime.from('04:05:06'), 'yyyy-MM-dd'))
                .toThrow('Token yyyy is not available')
        })

        it('rejects formats without supported tokens', () => {
            expect(() => temporalToString(Temporal.PlainDate.from('2026-09-02'), 'literal'))
                .toThrow('contains no supported tokens')
        })

        it('rejects duplicate tokens', () => {
            expect(() => temporalToString(Temporal.PlainDate.from('2026-09-02'), 'MM/dd/yyyy/MM'))
                .toThrow('contains duplicate tokens')
        })
    })

    describe('stringToTemporal', () => {
        it('parses each Temporal type and returns its concrete class', () => {
            const date = stringToTemporal('02-09-2026', 'date', 'dd-MM-yyyy')
            const time = stringToTemporal('06.04.05', 'time', 'ss.HH.mm')
            const timestamp = stringToTemporal('2026[09][02] 04|05|06', 'timestamp', 'yyyy[MM][dd] HH|mm|ss')

            expect(date).toBeInstanceOf(Temporal.PlainDate)
            expect(date.toString()).toBe('2026-09-02')
            expect(time).toBeInstanceOf(Temporal.PlainTime)
            expect(time.toString()).toBe('04:05:06')
            expect(timestamp).toBeInstanceOf(Temporal.PlainDateTime)
            expect(timestamp.toString()).toBe('2026-09-02T04:05:06')
        })

        it.each([
            ['date' as const, '02/29/2025', 'MM/dd/yyyy'],
            ['date' as const, '13/01/2026', 'MM/dd/yyyy'],
            ['time' as const, '24:00:00', 'HH:mm:ss'],
            ['time' as const, '23:60:00', 'HH:mm:ss'],
            ['timestamp' as const, '02/30/2026 04:05:06', 'MM/dd/yyyy HH:mm:ss']
        ])('rejects invalid %s value %s', (type, value, format) => {
            expect(() => stringToTemporal(value, type, format)).toThrow(RangeError)
        })

        it('requires exact padding and separators', () => {
            expect(() => stringToTemporal('9/02/2026', 'date', 'MM/dd/yyyy')).toThrow(RangeError)
            expect(() => stringToTemporal('09-02-2026', 'date', 'MM/dd/yyyy')).toThrow(RangeError)
            expect(() => stringToTemporal('09/02/2026 trailing', 'date', 'MM/dd/yyyy')).toThrow(RangeError)
        })

        it('rejects formats with missing or extraneous tokens for the requested type', () => {
            expect(() => stringToTemporal('09/02', 'date', 'MM/dd')).toThrow('does not match Temporal type date')
            expect(() => stringToTemporal('09/02/2026 04', 'date', 'MM/dd/yyyy HH')).toThrow('does not match Temporal type date')
            expect(() => stringToTemporal('04:05', 'time', 'HH:mm')).toThrow('does not match Temporal type time')
        })

        it('escapes regular-expression characters in format literals', () => {
            const value = stringToTemporal('2026.+09?(02)', 'date', 'yyyy.+MM?(dd)')
            expect(value.toString()).toBe('2026-09-02')
        })
    })

    it.each([
        [Temporal.PlainDate.from('2000-02-29'), 'dd|MM|yyyy', 'date' as const],
        [Temporal.PlainTime.from('23:59:58'), 'ss-mm-HH', 'time' as const],
        [Temporal.PlainDateTime.from('1999-12-31T23:59:58'), 'ss:mm:HH dd/MM/yyyy', 'timestamp' as const]
    ])('round-trips %s with dynamic format %s', (value, format, type) => {
        const formatted = temporalToString(value, format)
        expect(stringToTemporal(formatted, type, format).toString()).toBe(value.toString())
    })
})
