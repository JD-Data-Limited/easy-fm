import {expect, test} from 'bun:test'
import {runRuntimeSmokeTest} from './smoke.js'

test('published package runs under Bun', async () => {
    expect(await runRuntimeSmokeTest()).toEqual({
        date: '2026-09-23',
        escapedQuery: '\\*',
        formattedDate: '2026-09-23',
        hostname: 'runtime-test.example.com'
    })
})
