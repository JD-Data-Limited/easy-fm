import {Database} from './database.js'
import type {DatabaseStructure} from '../databaseStructure.js'
import {session, type Session} from './Session.js'
import {
    type databaseOptionsWithExternalSources,
    type loginOptionsClaris,
    type loginOptionsOAuth,
    type loginOptionsToken
} from '../types.js'
import type FMHost from './FMHost.js'
import {generateAuthorizationHeaders} from './generateAuthorizationHeaders.js'
import {FMError} from '../FMError.js'
import {ApiResults} from '../models/apiResults.js'
import {CookieJar} from './CookieJar.js'

/**
 * DatabaseConstantSession handles database connections that must live on a single session which is kept alive.
 * For example, connections that rely on OAuth.
 */
export class DatabaseConstantSession<T extends DatabaseStructure> extends Database<T> {
    readonly #session: Promise<Session>

    constructor (host: FMHost, connectionDetails: databaseOptionsWithExternalSources<loginOptionsOAuth | loginOptionsClaris | loginOptionsToken>, structure: T) {
        super(host, connectionDetails)
        if (connectionDetails.externalSources.length !== 0) throw new Error('External sources are currently only supported for connections with the \'FileMaker\' login method.')
        this.#session = (async () => {
            // Ensure we have host metadata
            await this.host.getMetadata()

            if (connectionDetails.credentials.method === 'token') {
                return session({
                    token: (connectionDetails.credentials).token,
                    keepAlive: 60_000,
                    endpoint: this.endpoint,
                    abortSignal: this.abortController.signal
                })
            }
            const url = new URL(`${this.endpoint}/sessions`)
            url.hostname = this.host.hostname
            const cookiejar = new CookieJar()
            const res = await fetch(url, {
                method: 'POST',
                headers: generateAuthorizationHeaders(connectionDetails.credentials),
                body: JSON.stringify({
                    fmDataSource: connectionDetails.externalSources.map(data => ({
                        database: data.database,
                        username: data.credentials.username,
                        password: data.credentials.password
                    }))
                })
            })
            for (const cookie of res.headers.getSetCookie()) cookiejar.addCookie(url, cookie)

            const json = ApiResults.parse(await res.json())
            if (res.status === 200) {
                return session({
                    token: res.headers.get('x-fm-data-access-token') ?? '',
                    keepAlive: 60_000,
                    endpoint: this.endpoint,
                    baseCookieJar: cookiejar,
                    abortSignal: this.abortController.signal
                })
            } else {
                throw new FMError(json.messages[0].code, res.status, res)
            }
        })()
    }

    async close () {
        if (this.abortController.signal.aborted) return
        await super.close()
        await (await this.#session).logout()
    }

    async withSession<T>(callback: (session: Session) => Promise<T>): Promise<T> {
        if (!this.canOpenNewConnections) throw new Error('Cannot open new connections')
        return await callback(await this.#session)
    }
}
