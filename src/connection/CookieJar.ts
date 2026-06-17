interface Cookie {
    name: string
    value: string
    domain: string
    path?: string
    /**
     * Defines when the cookie expires in milliseconds
     */
    expires: number | null
    secure?: boolean
    httpOnly: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
    partitioned: boolean
    priority: 'Low' | 'Medium' | 'High'
}

export class CookieJar {
    readonly #cookies = new Map<string, Cookie>()

    static #normalizeDomain (domain: string) {
        return domain.trim().replace(/^\./, '').replace(/^www\./, '').toLowerCase()
    }

    static clone (jar: CookieJar) {
        const newJar = new CookieJar()
        for (const [name, cookie] of jar.#cookies) {
            newJar.#cookies.set(name, cookie)
        }
        return newJar
    }

    /**
     * Parses a Set-Cookie header value and adds it to the jar
     * Expected format: <name>=<value>; Attribute; Attribute=value; ...
     * Example: session=abc123; Domain=example.com; Path=/; Secure; SameSite=Lax
     */
    addCookie (source: URL, cookie: string) {
        const parts = cookie.split(';').map(part => part.trim()).filter(Boolean)
        const [nameValue, ...attributes] = parts
        const separatorIndex = nameValue.indexOf('=')
        if (separatorIndex === -1) return
        const name = nameValue.slice(0, separatorIndex)
        const value = nameValue.slice(separatorIndex + 1)
        const cookieMap = new Map<string, string>()
        for (const attribute of attributes) {
            const index = attribute.indexOf('=')
            if (index === -1) {
                cookieMap.set(attribute, 'true')
                continue
            }
            cookieMap.set(attribute.slice(0, index), attribute.slice(index + 1))
        }

        // 2. Convert the map to a Cookie object
        const maxAgeRaw = cookieMap.get('Max-Age')
        const expiresRaw = cookieMap.get('Expires')
        let expires: Date | null = null
        if (maxAgeRaw) {
            expires = new Date(Date.now() + parseInt(maxAgeRaw) * 1000)
        } else if (expiresRaw) {
            const tempExpires = new Date(expiresRaw)
            if (isNaN(tempExpires.getTime())) {
                console.warn('Invalid Expires date:', expiresRaw)
            } else {
                expires = tempExpires
            }
        }
        const cookieObj = {
            name,
            value,
            domain: CookieJar.#normalizeDomain(cookieMap.get('Domain') ?? source.hostname),
            path: cookieMap.get('Path') ?? '/',
            expires: expires?.getTime() ?? null,
            secure: cookieMap.get('Secure') === 'true',
            httpOnly: cookieMap.get('HttpOnly') === 'true',
            sameSite: (cookieMap.get('SameSite') as 'Strict' | 'Lax' | 'None' | undefined) ?? 'Lax',
            partitioned: cookieMap.get('Partitioned') === 'true',
            priority: (cookieMap.get('Priority') as 'Low' | 'Medium' | 'High' | undefined) ?? 'Medium'
        } satisfies Cookie
        this.#cookies.set(cookieObj.name, cookieObj)
    }

    /**
     * getCookies returns all cookies for a given URL
     * @param url
     */
    getCookies (url: URL): Map<string, string> {
        const domain = CookieJar.#normalizeDomain(url.hostname)
        const result = new Map<string, string>()
        const now = Date.now()
        for (const [name, cookie] of this.#cookies) {
            if (cookie.expires !== null && cookie.expires < now) {
                // Remove the cookie if it has expired
                this.#cookies.delete(name)
                continue
            }
            if (
                cookie.domain !== domain &&
                !domain.endsWith(`.${cookie.domain}`)
            ) continue
            if (cookie.path && !url.pathname.startsWith(cookie.path)) continue
            if (cookie.secure && url.protocol !== 'https:') continue
            result.set(cookie.name, cookie.value)
        }
        return result
    }

    /**
     * Builds the 'Cookie' header to attach to a request
     */
    getCookieHeader (url: URL): string {
        const cookies = this.getCookies(url)
        if (cookies.size === 0) return ''
        return Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ')
    }
}
