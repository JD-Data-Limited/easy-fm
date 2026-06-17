import {Database} from './database.js'
import type {DatabaseStructure} from '../databaseStructure.js'
import {HttpError, session, type Session} from './Session.js'
import {
    type databaseOptionsWithExternalSources,
    type loginOptionsFileMaker
} from '../types.js'
import type FMHost from './FMHost.js'
import {generateAuthorizationHeaders} from './generateAuthorizationHeaders.js'
import {FMError} from '../FMError.js'
import {ApiResults} from '../models/apiResults.js'
import {CookieJar} from './CookieJar.js'

interface ActiveSession {
    working: boolean
    disconnectTimeout: NodeJS.Timeout | null
    session: Session
}

/**
 * DatabaseSessionPool handles database connections that can be pooled.
 */
export class DatabaseSessionPool<T extends DatabaseStructure> extends Database<T> {
    readonly #connectionDetails: databaseOptionsWithExternalSources<loginOptionsFileMaker>
    readonly #activeSessions = new Set<ActiveSession>()
    readonly #withSessionQueue: Array<{
        callback: (session: Session) => Promise<unknown>
        resolve: (value: any) => any
        reject: (reason?: unknown) => void
        retry: boolean
    }> = []

    constructor (host: FMHost, connectionDetails: databaseOptionsWithExternalSources<loginOptionsFileMaker>) {
        super(host, connectionDetails)
        this.#connectionDetails = connectionDetails
    }

    async close () {
        if (this.abortController.signal.aborted) return
        await super.close()
        // System might be shutting down, so we want to make sure we're quick
        const sessions = [...this.#activeSessions]
        this.#activeSessions.clear()
        await Promise.allSettled(sessions.map(session => session.session.logout()))
    }

    get #maxSessions () {
        return this.#connectionDetails.credentials.sessionPoolSize ?? 4
    }

    // Opens a new database session
    async #openSession (): Promise<Session> {
        if (!this.canOpenNewConnections) throw new Error('Cannot open new connections')
        await this.host.getMetadata()
        const url = new URL(`${this.endpoint}/sessions`)
        url.hostname = this.host.hostname
        const cookiejar = new CookieJar()
        const res = await fetch(url, {
            method: 'POST',
            headers: generateAuthorizationHeaders(this.#connectionDetails.credentials),
            body: JSON.stringify({
                fmDataSource: this.#connectionDetails.externalSources.map(data => ({
                    database: data.database,
                    username: data.credentials.username,
                    password: data.credentials.password
                }))
            })
        })
        for (const cookie of res.headers.getSetCookie()) cookiejar.addCookie(url, cookie)
        const _res = ApiResults.parse(await res.json())
        if (res.status === 200) {
            return session({
                token: res.headers.get('x-fm-data-access-token') ?? '',
                endpoint: this.endpoint,
                baseCookieJar: cookiejar,
                abortSignal: this.abortController.signal
            })
        } else {
            throw new FMError(_res.messages[0].code, res.status, res)
        }
    }

    /**
     *
     * @param session
     * @param callback
     * @param retry when true, if an HTTP 401 error occurs, we'll re-attempt it with another session.
     * @private
     */
    async #withSessionInternal (
        session: ActiveSession,
        callback: (session: Session) => Promise<any>,
        retry: boolean
    ) {
        try {
            session.working = true
            const result = await callback(session.session)
            session.working = false
            return result
        } catch (e) {
            if (e instanceof HttpError && e.status === 401) {
                // Invalidate this session
                this.#activeSessions.delete(session)
                if (retry) return await this.withSession(callback, false)
            }
            throw e
        }
    }

    async #processWithSessionQueue (session: ActiveSession) {
        const job = this.#withSessionQueue.shift()
        if (!job) return
        await this.#withSessionInternal(session, job.callback, job.retry).then(job.resolve).catch(job.reject)
    }

    async withSession<T>(callback: (session: Session) => Promise<T>, retry: boolean = true): Promise<T> {
        return await new Promise<T>((resolve, reject) => {
            // First, see if there's an available session
            for (const session of this.#activeSessions) {
                if (!session.working) {
                    session.working = true
                    this.#withSessionInternal(session, callback, retry).then(resolve).catch(reject)
                    return
                }
            }

            // If there's no available sessions, next check if we can open a new one
            if (this.#activeSessions.size < this.#maxSessions) {
                this.#openSession().then(async session => {
                    const newSession = {
                        working: true,
                        session,
                        disconnectTimeout: null
                    }
                    this.#activeSessions.add(newSession)
                    return await this.#withSessionInternal(newSession, callback, retry)
                }).then(resolve).catch(reject)
                return
            }

            // Finally if all else fails, queue the job
            this.#withSessionQueue.push({callback, resolve, reject, retry})
        })
    }
}
