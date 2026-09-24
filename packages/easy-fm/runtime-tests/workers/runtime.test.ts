import {exports} from 'cloudflare:workers'
import {describe, expect, it} from 'vitest'

describe('Cloudflare Workers runtime', () => {
    it('runs the published package in workerd', async () => {
        const response = await exports.default.fetch('https://runtime-test.example.com')

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toEqual({
            date: '2026-09-23',
            escapedQuery: '\\*',
            formattedDate: '2026-09-23',
            hostname: 'runtime-test.example.com'
        })
    })
})
