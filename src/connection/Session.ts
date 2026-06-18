// import fetchWithCookies, {CookieJar} from 'node-fetch-cookies'

import {CookieJar} from './CookieJar.js'
import {ApiResults} from '../models/apiResults.js'
import {z} from 'zod'
import {addHeaders} from '../utils/addHeaders.js'

export type DatabaseProtocol = 'http:' | 'https:'
export type DatabaseEndpoint = `${DatabaseProtocol}//${string}/fmi/data/v2/databases/${string}`

interface SessionProps {
    token: string
    /**
     * A cookie jar that will be automatically cloned and used for this session
     */
    baseCookieJar?: CookieJar
    /**
     * The full database endpoint
     */
    endpoint: DatabaseEndpoint
    /**
     * Defines if a session should be kept alive, and how often to ping the database (in milliseconds)
     */
    keepAlive?: number

    abortSignal: AbortSignal
}

export type Session = ReturnType<typeof session>

export function session (props: SessionProps) {
    const cookieJar = props.baseCookieJar ? CookieJar.clone(props.baseCookieJar) : new CookieJar()
    let keepAliveInterval: NodeJS.Timeout | undefined

    const shouldRedirectWithGet = (status: number, method: string) => (
        status === 303 ||
        ((status === 301 || status === 302) && method === 'POST')
    )

    const sessionFetch = async (url: string | URL, init: RequestInit = {}) => {
        let urlParsed = url instanceof URL ? url : new URL(url)
        let requestInit: RequestInit = {...init}
        requestInit.signal = requestInit.signal ? AbortSignal.any([requestInit.signal, props.abortSignal]) : props.abortSignal

        for (let redirectCount = 0; redirectCount < 10; redirectCount++) {
            /**
             * Bind the authorization token to the request
             */
            const headers = new Headers(requestInit.headers)
            headers.set('Authorization', 'Bearer ' + props.token)
            const cookieHeader = cookieJar.getCookieHeader(urlParsed)
            if (cookieHeader) headers.set('Cookie', cookieHeader)
            else headers.delete('Cookie')

            const res = await fetch(urlParsed, {
                ...requestInit,
                headers,
                redirect: 'manual'
            })
            for (const header of res.headers.getSetCookie()) {
                cookieJar.addCookie(urlParsed, header)
            }

            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get('location')
                if (!location) {
                    throw new Error(`Redirect response missing Location header for ${urlParsed.toString()}`)
                }
                urlParsed = new URL(location, urlParsed)

                const method = (requestInit.method ?? 'GET').toUpperCase()
                if (shouldRedirectWithGet(res.status, method)) {
                    requestInit = {
                        ...requestInit,
                        method: 'GET',
                        body: undefined
                    }
                }
                continue
            }

            if (!res.ok) {
                throw await HttpError.new(res)
            }
            return res
        }
        throw new Error(`Too many redirects while fetching ${urlParsed.toString()}`)
    }
    /**
     * sessionValidate throws an error if the session is invalid
     */
    const sessionValidate = async () => {
        const res = await sessionFetch(`${props.endpoint}/validateSession`)
        ApiResults.extend({
            isSessionInUse: z.boolean()
        }).parse(await res.json())
    }
    if (props.keepAlive) {
        keepAliveInterval = setInterval(() => {
            void sessionValidate().catch(() => {
                // Keep-alive failures should not create unhandled rejections.
            })
        }, props.keepAlive)
        keepAliveInterval.unref?.()
    }
    return {
        fetch: sessionFetch,
        async logout () {
            if (keepAliveInterval) clearInterval(keepAliveInterval)
            await fetch(`${props.endpoint}/sessions/${props.token}`, {
                method: 'DELETE'
            })
        },
        validate: sessionValidate
    }
}

export class HttpError extends Error {
    static async new (res: Response) {
        let message = `HTTP Error: [${res.status} ${res.statusText}]:`
        try {
            message += await res.text()
        } catch {
            message += ' (failed to read response body)'
        }
        return new this(res, message)
    }

    protected constructor (readonly res: Response, readonly message: string) {
        super()
    }

    get status () {
        return this.res.status
    }

    get statusText () {
        return this.res.statusText
    }
}
