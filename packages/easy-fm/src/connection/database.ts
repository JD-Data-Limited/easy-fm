import {Layout} from '../layouts/layout.js';
import type {LayoutInterface} from '../layouts/layoutInterface.js';
import type {DatabaseStructure} from '../databaseStructure.js';
import type {Script} from '../types.js';
import type {DatabaseBase} from './databaseBase.js';
import {
    ContainerSessionAffinityError,
    type DatabaseOperation,
    type DatabaseOperationResult,
    type DatabaseOperationType,
    type DatabaseProvider,
    type ProviderConnection,
    type ProviderSession,
    ProviderSessionExpiredError,
    type SessionBinding,
} from './databaseProvider.js';

export interface DatabaseOptions {
    provider: DatabaseProvider;
    name?: string;
    debug?: boolean;
}

interface ActiveSession {
    readonly binding: SessionBinding;
    readonly session: ProviderSession;
    busy: boolean;
    valid: boolean;
}

interface QueueJob<T = unknown> {
    preferred?: SessionBinding;
    run: (active: ActiveSession) => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
}

export class Database<T extends DatabaseStructure> implements DatabaseBase {
    readonly name: string;
    readonly debug: boolean;
    readonly #provider: DatabaseProvider;
    readonly #layoutCache = new Map();
    readonly #abortController = new AbortController();
    readonly #sessions: ActiveSession[] = [];
    readonly #closingSessions: Set<Promise<void>> = new Set();
    readonly #queue: Array<QueueJob<any>> = [];
    #connectionPromise?: Promise<ProviderConnection>;
    #closed = false;
    #draining = false;

    private constructor(options: DatabaseOptions) {
        this.#provider = options.provider;
        this.name = options.name ?? options.provider.name ?? '';
        this.debug = options.debug ?? false;
    }

    static create<T extends DatabaseStructure = DatabaseStructure>(
        options: DatabaseOptions,
    ): Database<T> {
        return new Database<T>(options);
    }

    async #connection(): Promise<ProviderConnection> {
        if (this.#closed) {
            throw new Error('Database is closed');
        }
        this.#connectionPromise ??= this.#provider.connect({
            signal: this.#abortController.signal,
            debug: this.debug,
        });
        return await this.#connectionPromise;
    }

    async connect(): Promise<void> {
        await this.#connection();
    }

    get dateFormat() {
        return this.#formatting('dateFormat', 'MM/DD/YYYY');
    }

    get timeFormat() {
        return this.#formatting('timeFormat', 'HH:mm:ss');
    }

    get timeStampFormat() {
        return this.#formatting('timeStampFormat', 'MM/DD/YYYY HH:mm:ss');
    }

    #formatting(key: 'dateFormat' | 'timeFormat' | 'timeStampFormat', fallback: string) {
        return this.#provider.formatting[key] ?? fallback;
    }

    async #openSession(): Promise<ActiveSession> {
        const connection = await this.#connection();
        const session = await connection.openSession(this.#abortController.signal);
        if (this.#closed) {
            await session.close();
            throw new Error('Database is closed');
        }
        const active: ActiveSession = {
            binding: { id: Symbol('provider-session') },
            session,
            busy: false,
            valid: true,
        };
        this.#sessions.push(active);
        return active;
    }

    async #schedule<T>(
        run: (active: ActiveSession) => Promise<T>,
        preferred?: SessionBinding,
    ): Promise<T> {
        if (this.#closed) {
            throw new Error('Database is closed');
        }
        return await new Promise<T>((resolve, reject) => {
            this.#queue.push({ preferred, run, resolve, reject });
            void this.#drain();
        });
    }

    async #drain() {
        if (this.#draining || this.#closed || this.#queue.length === 0) {
            return;
        }
        this.#draining = true;
        try {
            const connection = await this.#connection().catch((error) => {
                for (const job of this.#queue.splice(0)) {
                    job.reject(error);
                }
                return undefined;
            });
            if (!connection) {
                return;
            }
            for (let index = 0; index < this.#queue.length;) {
                const job = this.#queue[index];
                let active = job.preferred
                    ? this.#sessions.find(
                        (item) =>
                            item.binding.id === job.preferred?.id &&
                              item.valid &&
                              !item.busy,
                    )
                    : this.#sessions.find((item) => item.valid && !item.busy);
                if (!active && job.preferred) {
                    if (
                        !this.#sessions.some(
                            (item) => item.binding.id === job.preferred?.id && item.valid,
                        )
                    ) {
                        this.#queue.splice(index, 1);
                        job.reject(new ContainerSessionAffinityError());
                        continue;
                    }
                    index++;
                    continue;
                }
                if (
                    !active &&
                    !job.preferred &&
                    this.#sessions.filter((item) => item.valid).length <
                        Math.max(1, connection.maxSessions)
                ) {
                    try {
                        active = await this.#openSession();
                    } catch (error) {
                        this.#queue.splice(index, 1);
                        job.reject(error);
                        continue;
                    }
                }
                if (!active) {
                    index++;
                    continue;
                }
                this.#queue.splice(index, 1);
                active.busy = true;
                void job
                    .run(active)
                    .then(job.resolve, job.reject)
                    .finally(() => {
                        active!.busy = false;
                        void this.#drain();
                    });
            }
        } finally {
            this.#draining = false;
        }
    }

    async execute<K extends DatabaseOperationType>(
        operation: DatabaseOperation<K>,
    ): Promise<{
        value: DatabaseOperationResult<K>;
        binding: SessionBinding;
    }> {
        const attempt = async () =>
            await this.#schedule(async (active) => {
                try {
                    return {
                        value: await active.session.execute(operation),
                        binding: active.binding,
                    };
                } catch (error) {
                    if (error instanceof ProviderSessionExpiredError) {
                        this.#invalidate(active);
                    }
                    throw error;
                }
            });
        try {
            return await attempt();
        } catch (error) {
            if (
                error instanceof ProviderSessionExpiredError &&
                isReadOnly(operation.type)
            ) {
                return await attempt();
            }
            throw error;
        }
    }

    async fetchContainer(
        reference: string,
        binding: SessionBinding,
        signal?: AbortSignal,
    ): Promise<Response> {
        return await this.#schedule(async (active) => {
            try {
                return await active.session.fetchContainer(reference, signal);
            } catch (error) {
                if (error instanceof ProviderSessionExpiredError) {
                    this.#invalidate(active);
                    throw new ContainerSessionAffinityError(undefined, { cause: error });
                }
                throw error;
            }
        }, binding);
    }

    #invalidate(active: ActiveSession) {
        if (!active.valid) {
            return;
        }
        active.valid = false;
        const index = this.#sessions.indexOf(active);
        if (index >= 0) {
            this.#sessions.splice(index, 1);
        }
        const closing = active.session.close().catch(() => {});
        this.#closingSessions.add(closing);
        void closing.finally(() => this.#closingSessions.delete(closing));
    }

    async login() {
        await this.connect();
    }

    async logout() {
        await this.close();
    }

    async close() {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        this.#abortController.abort('Closing database');
        for (const job of this.#queue.splice(0)) {
            job.reject(new Error('Database is closed'));
        }
        const connection = await this.#connectionPromise?.catch(() => undefined);
        await Promise.allSettled([
            ...this.#closingSessions,
            ...this.#sessions.map((active) => active.session.close()),
        ]);
        this.#sessions.splice(0);
        if (connection?.close) {
            await connection.close();
        }
    }

    async [Symbol.asyncDispose]() {
        await this.close();
    }

    async listLayouts(page = 0) {
        const { value } = await this.execute({ type: 'layout.list', page });
        return value.map((name) => new Layout(this, name));
    }

    layout<R extends keyof T['layouts']>(name: R): Layout<T['layouts'][R]>;
    layout<R extends LayoutInterface>(name: string): Layout<R>;
    layout(name: string): Layout<any> {
        let layout = this.#layoutCache.get(name);
        if (!layout) {
            layout = new Layout<LayoutInterface>(this, name);
            this.#layoutCache.set(name, layout);
        }

        return layout;
    }

    clearLayoutCache() {
        this.#layoutCache.clear();
    }

    script(name: string, parameter = ''): Script {
        return { name, parameter };
    }
}

function isReadOnly(type: DatabaseOperationType) {
    return (
        type === 'layout.list' ||
        type === 'layout.metadata' ||
        type === 'record.list' ||
        type === 'record.get'
    );
}
