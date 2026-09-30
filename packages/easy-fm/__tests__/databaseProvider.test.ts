import { Database } from '../dist/connection/database.js';
import type {
    DatabaseOperation,
    DatabaseOperationResult,
    DatabaseOperationType,
    DatabaseProvider,
    ProviderSession,
} from '../src/connection/databaseProvider.js';
import {
    ContainerSessionAffinityError,
    ProviderSessionExpiredError,
} from '../dist/connection/databaseProvider.js';

const formatting = {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
    timeStampFormat: 'DD/MM/YYYY HH:mm:ss',
};

function provider(options: {
    maxSessions: number;
    execute?: ProviderSession['execute'];
    container?: ProviderSession['fetchContainer'];
}) {
    let opens = 0;
    let closes = 0;
    let connects = 0;
    const sessions: ProviderSession[] = [];
    const value: DatabaseProvider = {
        formatting,
        async connect() {
            connects++;
            return {
                formatting,
                maxSessions: options.maxSessions,
                async openSession() {
                    opens++;
                    const session: ProviderSession = {
                        execute:
                            options.execute ??
                            (async (operation) => resultFor(operation)),
                        fetchContainer:
                            options.container ??
                            (async (reference) => new Response(reference)),
                        async close() {
                            closes++;
                        },
                    };
                    sessions.push(session);
                    return session;
                },
            };
        },
    };
    return { value, stats: () => ({ opens, closes, connects }), sessions };
}

function resultFor<K extends DatabaseOperationType>(
    operation: DatabaseOperation<K>,
): DatabaseOperationResult<K> {
    if (operation.type === 'layout.list') {
        return [] as DatabaseOperationResult<K>;
    }
    throw new Error(`Unexpected operation ${operation.type}`);
}

describe('provider-backed Database', () => {
    it('constructs synchronously and connects lazily once', async () => {
        const fake = provider({ maxSessions: 1 });
        const database = Database.create({ provider: fake.value });
        expect(fake.stats()).toEqual({ opens: 0, closes: 0, connects: 0 });
        await Promise.all([database.listLayouts(), database.listLayouts()]);
        expect(fake.stats()).toEqual({ opens: 1, closes: 0, connects: 1 });
        await database.close();
        expect(fake.stats().closes).toBe(1);
    });

    it('bounds parallel work by provider session capacity', async () => {
        let active = 0;
        let peak = 0;
        const fake = provider({
            maxSessions: 2,
            execute: async (operation) => {
                active++;
                peak = Math.max(peak, active);
                await new Promise((resolve) => setTimeout(resolve, 10));
                active--;
                return resultFor(operation);
            },
        });
        const database = Database.create({ provider: fake.value });
        await Promise.all([
            database.listLayouts(),
            database.listLayouts(),
            database.listLayouts(),
            database.listLayouts(),
        ]);
        expect(fake.stats().opens).toBe(2);
        expect(peak).toBe(2);
        await database.close();
    });

    it('retries an expired read but does not retry a mutation', async () => {
        let calls = 0;
        const fake = provider({
            maxSessions: 1,
            execute: async (operation) => {
                calls++;
                if (calls === 1) {
                    throw new ProviderSessionExpiredError();
                }
                return resultFor(operation);
            },
        });
        const database = Database.create({ provider: fake.value });
        await database.listLayouts();
        expect(calls).toBe(2);
        await expect(
            database.execute({
                type: 'record.delete',
                layout: 'x',
                recordId: 1,
                options: { scripts: {}, portals: {} },
            }),
        ).rejects.toThrow();
        expect(calls).toBe(3);
        await database.close();
    });

    it('uses exact originating session for container fetches', async () => {
        let sessionNumber = 0;
        const value: DatabaseProvider = {
            formatting,
            async connect() {
                return {
                    formatting,
                    maxSessions: 2,
                    async openSession() {
                        const own = ++sessionNumber;
                        return {
                            async execute(operation) {
                                await new Promise((resolve) => setTimeout(resolve, 5));
                                return resultFor(operation);
                            },
                            async fetchContainer() {
                                return new Response(String(own));
                            },
                            async close() {},
                        };
                    },
                };
            },
        };
        const database = Database.create({ provider: value });
        const [first, second] = await Promise.all([
            database.execute({ type: 'layout.list', page: 0 }),
            database.execute({ type: 'layout.list', page: 0 }),
        ]);
        expect(
            await (await database.fetchContainer('opaque', first.binding)).text(),
        ).toBe('1');
        expect(
            await (await database.fetchContainer('opaque', second.binding)).text(),
        ).toBe('2');
        await database.close();
        await expect(database.fetchContainer('opaque', first.binding)).rejects.toThrow();
    });

    it('fails explicitly when an affinity session expires', async () => {
        const fake = provider({
            maxSessions: 1,
            container: async () => {
                throw new ProviderSessionExpiredError();
            },
        });
        const database = Database.create({ provider: fake.value });
        const result = await database.execute({ type: 'layout.list', page: 0 });
        await expect(
            database.fetchContainer('opaque', result.binding),
        ).rejects.toBeInstanceOf(ContainerSessionAffinityError);
        await database.close();
    });
});
