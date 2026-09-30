import { z } from 'zod';
import { SchemaDriftError, withSchemaValidation, zodValidator } from '../dist/schema.js';
import type { DatabaseProvider } from '../src/connection/databaseProvider.js';

const formatting = {
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'HH:mm:ss',
    timeStampFormat: 'MM/DD/YYYY HH:mm:ss',
};

function provider(fieldData: Record<string, string | number | null>): DatabaseProvider {
    return {
        formatting,
        async connect() {
            return {
                formatting,
                maxSessions: 1,
                async openSession() {
                    return {
                        async execute() {
                            return { recordId: '1', modId: '0', fieldData } as never;
                        },
                        async fetchContainer() {
                            return new Response();
                        },
                        async close() {},
                    };
                },
            };
        },
    };
}

describe('generated schema validation', () => {
    const recordSchema = z
        .object({
            recordId: z.string(),
            modId: z.string(),
            fieldData: z.object({ name: z.string() }).strict(),
            portalData: z.object({}).strict().optional(),
        })
        .strict();

    it('accepts matching canonical provider records', async () => {
        const wrapped = withSchemaValidation(provider({ name: 'Ada' }), {
            validator: zodValidator,
            layouts: { People: { record: recordSchema } },
        });
        const connection = await wrapped.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        await expect(
            session.execute({
                type: 'record.get',
                layout: 'People',
                recordId: 1,
                options: { scripts: {}, portals: {} },
            }),
        ).resolves.toMatchObject({ recordId: '1' });
    });

    it('throws a useful error when provider data drifts', async () => {
        const wrapped = withSchemaValidation(provider({ renamed: 'Ada' }), {
            validator: zodValidator,
            layouts: { People: { record: recordSchema } },
        });
        const connection = await wrapped.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        await expect(
            session.execute({
                type: 'record.get',
                layout: 'People',
                recordId: 1,
                options: { scripts: {}, portals: {} },
            }),
        ).rejects.toBeInstanceOf(SchemaDriftError);
    });

    it('detects metadata drift before records are fetched', async () => {
        const raw = provider({});
        const originalConnect = raw.connect.bind(raw);
        raw.connect = async (context) => {
            const connection = await originalConnect(context);
            const originalOpen = connection.openSession.bind(connection);
            connection.openSession = async (signal) => {
                const session = await originalOpen(signal);
                session.execute = async () =>
                    ({
                        fieldMetaData: [
                            { name: 'renamed', result: 'text', type: 'normal' },
                        ],
                        portalMetaData: {},
                    }) as never;
                return session;
            };
            return connection;
        };
        const wrapped = withSchemaValidation(raw, {
            validator: zodValidator,
            layouts: {
                People: {
                    record: recordSchema,
                    metadata: {
                        fields: { name: { result: 'text', type: 'normal' } },
                        portals: {},
                    },
                },
            },
        });
        const connection = await wrapped.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        await expect(
            session.execute({ type: 'layout.metadata', layout: 'People' }),
        ).rejects.toMatchObject({ name: 'SchemaDriftError', phase: 'metadata' });
    });

    it('strips inaccessible metadata and record placeholders before validation', async () => {
        const raw = provider({ name: 'Ada', '<No Access>': '' });
        const wrapped = withSchemaValidation(raw, {
            validator: zodValidator,
            layouts: { People: { record: recordSchema } },
        });
        const connection = await wrapped.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        const record = await session.execute({
            type: 'record.get',
            layout: 'People',
            recordId: 1,
            options: { scripts: {}, portals: {} },
        });
        expect(record.fieldData).toEqual({ name: 'Ada' });
    });
});
