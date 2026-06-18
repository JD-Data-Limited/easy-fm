import {deepEqual, equal} from 'node:assert'
import {CookieJar} from '../src/connection/CookieJar.js'

describe('CookieJar', () => {
    it('Sends cookies to subdomains when Set-Cookie uses leading-dot domain', () => {
        const jar = new CookieJar()
        jar.addCookie(
            new URL('https://example.com/fmi/data/v2/databases/Test/sessions'),
            'X-FMS-SESSION=abc123; Domain=.example.com; Path=/; Secure; HttpOnly'
        )

        const cookies = jar.getCookies(new URL('https://host.example.com/Streaming_SSL/MainDB/file'))
        deepEqual([...cookies.entries()], [['X-FMS-SESSION', 'abc123']])
    })

    it('Builds cookie header only from matching cookies', () => {
        const jar = new CookieJar()
        jar.addCookie(
            new URL('https://example.com/fmi/data/v2/databases/Test/sessions'),
            'X-FMS-SESSION=abc123; Domain=.example.com; Path=/'
        )
        jar.addCookie(
            new URL('https://example.com/fmi/data/v2/databases/Test/sessions'),
            'OTHER=ignored; Domain=.other.com; Path=/'
        )

        equal(
            jar.getCookieHeader(new URL('https://host.example.com/Streaming_SSL/MainDB/file')),
            'X-FMS-SESSION=abc123'
        )
    })
})
