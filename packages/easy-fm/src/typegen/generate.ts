import {mkdir, open, rename, rm, writeFile} from 'node:fs/promises'
import {dirname, relative, resolve} from 'node:path'
import type {
    TypegenConfig,
    TypegenDatabaseConfig,
    TypegenField,
    TypegenLayout,
    TypegenSchema,
    TypegenValidator
} from './types.js'
import {zodTypegenValidator} from './zod.js'

interface GeneratedDatabase {key: string, config: TypegenDatabaseConfig, schema: TypegenSchema, validator: TypegenValidator}

export async function generate (config: TypegenConfig): Promise<{output: string, layouts: number, databases: number, diagnostics: Array<import('./types.js').TypegenDiagnostic & {database: string}>, entrypoint?: {path: string, created: boolean}, sample: string}> {
    const diagnostics: Array<import('./types.js').TypegenDiagnostic & {database: string}> = []
    const databases = await Promise.all(databaseEntries(config).map(async ([key, databaseConfig]) => {
        const discovered = await databaseConfig.source.introspect()
        for (const diagnostic of discovered.diagnostics ?? []) { const item = {...diagnostic, database: key}; diagnostics.push(item); (config.onDiagnostic ?? defaultDiagnosticReporter)(item) }
        const selected = databaseConfig.layouts ? discovered.layouts.filter(layout => databaseConfig.layouts!.includes(layout.name)) : discovered.layouts
        const missing = databaseConfig.layouts?.filter(name => !selected.some(layout => layout.name === name)) ?? []
        if (missing.length) throw new Error(`Layouts not found in database ${key}: ${missing.join(', ')}`)
        return {key, config: databaseConfig, schema: {version: 1, layouts: [...selected].sort((a, b) => a.name.localeCompare(b.name))} as TypegenSchema, validator: databaseConfig.validator ?? config.validator ?? zodTypegenValidator()}
    }))
    const output = resolve(config.output); const temporary = `${output}.tmp-${process.pid}`
    await rm(temporary, {recursive: true, force: true}); await mkdir(temporary, {recursive: true})
    await writeFile(resolve(temporary, 'client.js'), renderClientRuntime(databases), 'utf8')
    await writeFile(resolve(temporary, 'client.d.ts'), renderClientDeclarations(databases), 'utf8')
    const manifest = {version: 1, databases: Object.fromEntries(databases.map(db => [db.key, {...db.schema, provider: db.config.provider, transports: db.config.transports ?? ['data-api', 'odata']}]))}
    await writeFile(resolve(temporary, 'schema.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    await mkdir(dirname(output), {recursive: true}); await rm(output, {recursive: true, force: true}); await rename(temporary, output)
    const entrypoint = config.entrypoint ? await createEntrypoint(resolve(config.entrypoint), output, databases) : undefined
    return {output, databases: databases.length, layouts: databases.reduce((sum, db) => sum + db.schema.layouts.length, 0), diagnostics, entrypoint, sample: sampleUsage(config.entrypoint, output, databases)}
}

function defaultDiagnosticReporter (diagnostic: import('./types.js').TypegenDiagnostic & {database: string}) { console.warn(`[easyfm:typegen] warning [${diagnostic.database}${diagnostic.layout ? `/${diagnostic.layout}` : ''}${diagnostic.portal ? `/${diagnostic.portal}` : ''}]: ${diagnostic.message}`) }

async function createEntrypoint (path: string, output: string, databases: GeneratedDatabase[]) {
    if (!databases.every(db => db.config.runtime?.provider === 'data-api')) return {path, created: false}
    await mkdir(dirname(path), {recursive: true})
    const generatedImport = modulePath(dirname(path), resolve(output, 'client.js'))
    const providers = databases.map(db => {
        const runtime = db.config.runtime!
        return `${prop(db.key)}: new DataApiProvider({hostname: required(${quote(runtime.hostnameEnv)}), database: required(${quote(runtime.databaseEnv)}), credentials: {method: 'filemaker', username: required(${quote(runtime.usernameEnv)}), password: required(${quote(runtime.passwordEnv)})}, externalSources: []})`
    }).join(',\n    ')
    const contents = `/* Created by easyfm typegen. This file is yours and will not be overwritten. */\nimport {DataApiProvider} from '@jd-data-limited/easy-fm'\nimport {createEasyFMClient} from ${quote(generatedImport)}\n\nfunction required(name: string) { const value = process.env[name]; if (!value) throw new Error(\`Missing required environment variable \${name}\`); return value }\n\nexport const easyfm = createEasyFMClient({\n    ${providers}\n})\n`
    try { const file = await open(path, 'wx'); try { await file.writeFile(contents, 'utf8') } finally { await file.close() }; return {path, created: true} } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return {path, created: false}
        throw error
    }
}

function sampleUsage (entrypoint: string | undefined, output: string, databases: GeneratedDatabase[]) {
    if (entrypoint) return `import {easyfm} from ${quote(modulePath(process.cwd(), resolve(entrypoint).replace(/\.ts$/, '.js')))}\n\n// Example: easyfm.${prop(databases[0]?.key ?? 'database')}.database`
    return `import {createEasyFMClient} from ${quote(modulePath(process.cwd(), resolve(output, 'client.js')))}\n\nconst easyfm = createEasyFMClient({${databases.map(db => `${prop(db.key)}: provider`).join(', ')}})`
}

function modulePath (from: string, to: string) { const path = relative(from, to).replace(/\\/g, '/'); return path.startsWith('.') ? path : `./${path}` }

function databaseEntries (config: TypegenConfig): Array<[string, TypegenDatabaseConfig]> {
    if (config.databases && Object.keys(config.databases).length) return Object.entries(config.databases)
    if (!config.source) throw new Error('Typegen config requires source or databases')
    return [['database', {source: config.source, transports: config.transports, layouts: config.layouts, validator: config.validator, runtime: config.runtime}]]
}

function renderClientRuntime (databases: GeneratedDatabase[]) {
    const imports = [...new Set(databases.flatMap(db => db.validator.imports))].join('\n')
    const schemas = databases.map(db => `${prop(db.key)}: {validator: ${db.validator.runtimeValidator}, layouts: {${db.schema.layouts.map(layout => `${quote(layout.name)}: {record: ${db.validator.renderRecord(layout)}, metadata: ${renderMetadata(layout)}}`).join(',')}}}`).join(',')
    const factories = databases.map(db => `function create${typeId(db.key, 'Database')}Client (provider) {\n    const database = Database.create({provider: withSchemaValidation(provider, easyFMSchemas.${prop(db.key)})})\n    return {\n        database,\n${db.schema.layouts.map(layout => `        ${prop(layout.clientName ?? layout.name)}: database.layout(${quote(layout.name)})`).join(',\n')}\n    }\n}`).join('\n\n')
    return `/* Generated by easyfm typegen. Do not edit. */
import {Database, withSchemaValidation, zodValidator} from '@jd-data-limited/easy-fm'
${imports}
export const easyFMSchemas = {${schemas}}
${factories}
export function createEasyFMClient (providers) { return {${databases.map(db => `${prop(db.key)}: create${typeId(db.key, 'Database')}Client(providers.${prop(db.key)})`).join(',')}} }
`
}

function renderClientDeclarations (databases: GeneratedDatabase[]) {
    const interfaces = databases.flatMap(db => db.schema.layouts.map(layout => renderLayout(db.key, layout))).join('\n\n')
    const structures = databases.map(db => `export interface ${databaseType(db.key)} extends DatabaseStructure {\n    layouts: {${db.schema.layouts.map(layout => `${quote(layout.name)}: ${layoutTypeName(db.key, layout)}`).join(',')}}\n}`).join('\n\n')
    const clientInterfaces = databases.map(db => `export interface ${clientType(db.key)} {\n    database: Database<${databaseType(db.key)}>\n${db.schema.layouts.map(layout => `    ${prop(layout.clientName ?? layout.name)}: Layout<${layoutTypeName(db.key, layout)}>`).join('\n')}\n}`).join('\n\n')
    const providers = `export interface EasyFMProviders {\n${databases.map(db => `    ${prop(db.key)}: DatabaseProvider`).join('\n')}\n}`
    const client = `export interface EasyFMClient {\n${databases.map(db => `    ${prop(db.key)}: ${clientType(db.key)}`).join('\n')}\n}`
    return `/* Generated by easyfm typegen. Do not edit. */
import type {Database, DatabaseProvider, DatabaseStructure, Layout, LayoutInterface, Portal, ReadonlyField, TextField, NumberField, DateField, TimeField, TimeStampField, ContainerField} from '@jd-data-limited/easy-fm'

${interfaces}
${structures}
${clientInterfaces}
${providers}
${client}
export declare const easyFMSchemas: unknown
export declare function createEasyFMClient (providers: EasyFMProviders): EasyFMClient
`
}

function renderLayout (db: string, layout: TypegenLayout) {
    const fields = `export interface ${layoutFieldsTypeName(db, layout)} {\n${layout.fields.map(f => `    ${quote(f.name)}: ${fieldType(f)}`).join('\n')}\n}`
    const definition = `export interface ${layoutTypeName(db, layout)} extends LayoutInterface {\n    fields: ${layoutFieldsTypeName(db, layout)}\n    portals: {${Object.entries(layout.portals).map(([name, portalFields]) => `${quote(name)}: Portal<{${portalFields.map(f => `${quote(f.name)}: ${fieldType(f)}`).join(',')}}>`).join(',')}}\n}`
    return `${fields}\n\n${definition}`
}
function fieldType (f: TypegenField) { const t = ({text: 'TextField', number: 'NumberField', date: 'DateField', time: 'TimeField', timeStamp: 'TimeStampField', container: 'ContainerField'} as const)[f.result]; return f.writable ? t : `ReadonlyField<${t}>` }
function renderMetadata (layout: TypegenLayout) { return `{fields: ${metadataFields(layout.fields)}, portals: {${Object.entries(layout.portals).map(([name, fields]) => `${quote(name)}: ${metadataFields(fields)}`).join(',')}}}` }
function metadataFields (fields: readonly TypegenField[]) { return `{${fields.map(f => `${quote(f.name)}: {result: ${quote(f.result)}, type: ${quote(f.type)}}`).join(',')}}` }
function databaseType (db: string) { return `${typeId(db, 'Database')}Database` }
function clientType (db: string) { return `${typeId(db, 'Database')}Client` }
function layoutTypeName (db: string, layout: TypegenLayout) { return `${typeId(db, 'Database')}${typeId(layout.clientName ?? layout.name, 'Layout')}Layout` }
function layoutFieldsTypeName (db: string, layout: TypegenLayout) { return `${typeId(db, 'Database')}${typeId(layout.clientName ?? layout.name, 'Layout')}Fields` }
function prop (value: string) { return id(value, 'item') }
function typeId (value: string, fallback: string) { const valueId = id(value, fallback); return valueId[0].toUpperCase() + valueId.slice(1) }
function id (value: string, fallback: string) { const clean = value.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[^a-zA-Z_$]+/, ''); return clean || fallback }
function quote (value: string) { return JSON.stringify(value) }
