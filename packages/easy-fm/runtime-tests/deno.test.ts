import {deepStrictEqual} from 'node:assert/strict'
import {runRuntimeSmokeTest} from './smoke.ts'

Deno.test('published package runs under Deno', async () => {
    deepStrictEqual(await runRuntimeSmokeTest(), {
        date: '2026-09-23',
        escapedQuery: '\\*',
        formattedDate: '2026-09-23',
        hostname: 'runtime-test.example.com'
    })
})
