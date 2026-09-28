import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {generate} from '../dist/typegen/index.js'

describe('typegen', () => {
    it('generates provider-neutral Zod client and narrows immutable fields', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-typegen-'))
        const output = join(root, 'generated')
        try {
            await generate({
                output,
                source: {async introspect () { return {
                    version: 1 as const,
                    layouts: [{
                        name: 'API People',
                        clientName: 'people',
                        fields: [
                            {name: 'Name', result: 'text', type: 'normal', writable: true, required: true},
                            {name: 'Display Name', result: 'text', type: 'calculation', writable: false, required: false}
                        ],
                        portals: {}
                    }]
                } }}
            })
            const client = await readFile(join(output, 'client.ts'), 'utf8')
            const manifest = await readFile(join(output, 'schema.json'), 'utf8')
            expect(client).toContain('"Display Name": ReadonlyField<TextField>')
            expect(client).toContain('createEasyFMClient (provider: DatabaseProvider)')
            expect(client).toContain('withSchemaValidation(provider, easyFMSchema)')
            expect(client).toContain('validator: zodValidator')
            expect(client).toContain('record: z.object({recordId: z.string(), modId: z.string(), fieldData:')
            expect(client).toContain('metadata: {fields:')
            expect(client).not.toContain('DataApiProvider')
            expect(JSON.parse(manifest).transports).toEqual(['data-api', 'odata'])
        } finally {
            await rm(root, {recursive: true, force: true})
        }
    })

    it('accepts a custom validation generator', async () => {
        const root = await mkdtemp(join(tmpdir(), 'easyfm-typegen-plugin-'))
        try {
            await generate({output: join(root, 'generated'), validator: {
                imports: ["import {custom} from './custom.js'"],
                runtimeValidator: 'custom',
                renderRecord: () => 'custom.schema()'
            }, source: {async introspect () { return {version: 1, layouts: []} }}})
            const client = await readFile(join(root, 'generated', 'client.ts'), 'utf8')
            expect(client).toContain("import {custom} from './custom.js'")
            expect(client).toContain('validator: custom')
        } finally { await rm(root, {recursive: true, force: true}) }
    })
})
