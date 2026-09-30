import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../dist/typegen/index.js';

describe('typegen', () => {
    it('generates provider-neutral Zod client and narrows immutable fields', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-typegen-'));
        const output = join(root, 'generated');
        try {
            await generate({
                output,
                source: {
                    async introspect() {
                        return {
                            version: 1 as const,
                            layouts: [
                                {
                                    name: 'API People',
                                    clientName: 'people',
                                    fields: [
                                        {
                                            name: 'Name',
                                            result: 'text',
                                            type: 'normal',
                                            writable: true,
                                            required: true,
                                        },
                                        {
                                            name: 'Display Name',
                                            result: 'text',
                                            type: 'calculation',
                                            writable: false,
                                            required: false,
                                        },
                                    ],
                                    portals: {},
                                },
                            ],
                        };
                    },
                },
            });
            const runtime = await readFile(join(output, 'client.js'), 'utf8');
            const client = await readFile(join(output, 'client.d.ts'), 'utf8');
            const manifest = await readFile(join(output, 'schema.json'), 'utf8');
            expect(client).toContain('"Display Name": ReadonlyField<TextField>');
            expect(client).toContain('export interface EasyFMProviders');
            expect(client).toContain('database: DatabaseProvider');
            expect(client).toContain('export interface EasyFMClient');
            expect(client).toContain('database: DatabaseClient');
            expect(client).toContain('people: Layout<DatabasePeopleLayout>');
            expect(client).toContain('export interface DatabasePeopleFields');
            expect(client).toContain('fields: DatabasePeopleFields');
            expect(client).toContain(
                'createEasyFMClient (providers: EasyFMProviders): EasyFMClient',
            );
            expect(runtime).toContain(
                'withSchemaValidation(provider, easyFMSchemas.database)',
            );
            expect(runtime).toContain('validator: zodValidator');
            expect(runtime).toContain(
                'record: z.object({recordId: z.string(), modId: z.string(), fieldData:',
            );
            expect(runtime).toContain('metadata: {fields:');
            expect(runtime).not.toContain('DataApiProvider');
            expect(runtime).not.toContain('export interface');
            expect(JSON.parse(manifest).databases.database.transports).toEqual([
                'data-api',
                'odata',
            ]);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('accepts a custom validation generator', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-typegen-plugin-'));
        try {
            await generate({
                output: join(root, 'generated'),
                validator: {
                    imports: ["import {custom} from './custom.js'"],
                    runtimeValidator: 'custom',
                    renderRecord: () => 'custom.schema()',
                },
                source: {
                    async introspect() {
                        return { version: 1, layouts: [] };
                    },
                },
            });
            const runtime = await readFile(join(root, 'generated', 'client.js'), 'utf8');
            expect(runtime).toContain("import {custom} from './custom.js'");
            expect(runtime).toContain('validator: custom');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('namespaces layouts and providers for multiple databases', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-multi-db-'));
        const source = (name: string) => ({
            async introspect() {
                return {
                    version: 1 as const,
                    layouts: [{ name, fields: [], portals: {} }],
                };
            },
        });
        try {
            await generate({
                output: join(root, 'generated'),
                databases: {
                    crm: {
                        source: source('People'),
                        provider: 'data-api/odata',
                        transports: ['data-api', 'odata'],
                    },
                    stock: {
                        source: source('People'),
                        provider: 'custom',
                        transports: ['odata'],
                    },
                },
            });
            const runtime = await readFile(join(root, 'generated', 'client.js'), 'utf8');
            const client = await readFile(join(root, 'generated', 'client.d.ts'), 'utf8');
            const manifest = JSON.parse(
                await readFile(join(root, 'generated', 'schema.json'), 'utf8'),
            );
            expect(client).toContain('crm: DatabaseProvider');
            expect(client).toContain('stock: DatabaseProvider');
            expect(runtime).toContain('crm: createCrmClient(providers.crm)');
            expect(runtime).toContain('stock: createStockClient(providers.stock)');
            expect(manifest.databases.stock).toMatchObject({
                provider: 'custom',
                transports: ['odata'],
            });
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('reports source warnings with database context', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-warning-'));
        const warnings: Array<{ database: string; message: string }> = [];
        try {
            const result = await generate({
                output: join(root, 'generated'),
                onDiagnostic: (warning) => warnings.push(warning),
                databases: {
                    crm: {
                        source: {
                            async introspect() {
                                return {
                                    version: 1,
                                    layouts: [],
                                    diagnostics: [
                                        {
                                            level: 'warning',
                                            layout: 'People',
                                            message: 'Field "<No Access>" was excluded.',
                                        },
                                    ],
                                };
                            },
                        },
                    },
                },
            });
            expect(warnings).toEqual([
                {
                    level: 'warning',
                    database: 'crm',
                    layout: 'People',
                    message: 'Field "<No Access>" was excluded.',
                },
            ]);
            expect(result.diagnostics).toEqual(warnings);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('creates a working user entrypoint once and never overwrites it', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-entrypoint-'));
        const entrypoint = join(root, 'src', 'easyfm.ts');
        const config = {
            output: join(root, 'src', 'generated'),
            entrypoint,
            databases: {
                crm: {
                    source: {
                        async introspect() {
                            return { version: 1 as const, layouts: [] };
                        },
                    },
                    runtime: {
                        provider: 'data-api' as const,
                        hostnameEnv: 'FM_CRM_HOST',
                        databaseEnv: 'FM_CRM_DATABASE',
                        usernameEnv: 'FM_CRM_USERNAME',
                        passwordEnv: 'FM_CRM_PASSWORD',
                    },
                },
            },
        };
        try {
            const first = await generate(config);
            expect(first.entrypoint?.created).toBe(true);
            const contents = await readFile(entrypoint, 'utf8');
            expect(contents).toContain('export const easyfm = createEasyFMClient');
            expect(contents).toContain('required("FM_CRM_PASSWORD")');
            const second = await generate(config);
            expect(second.entrypoint?.created).toBe(false);
            expect(await readFile(entrypoint, 'utf8')).toBe(contents);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
