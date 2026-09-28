import {z} from 'zod'
import type {
    DatabaseOperation,
    DatabaseOperationResult,
    DatabaseOperationType,
    DatabaseProvider,
    ProviderConnection,
    ProviderRecord,
    ProviderSession
} from './connection/databaseProvider.js'
import type {Field} from './records/fields/field.js'
import {stripInaccessibleFieldData, stripInaccessibleMetadata} from './models/apiResults.js'

export type ReadonlyField<T extends Field> = T extends Field ? Omit<T, 'set' | 'upload' | 'value'> & {readonly value: T['value']} : never
export interface ValidationIssue {path: PropertyKey[], message: string, code?: string}
export type ValidationResult = {success: true} | {success: false, issues: ValidationIssue[], cause?: unknown}
export interface RuntimeValidator { validate(schema: unknown, value: unknown): ValidationResult }

/** Built-in runtime adapter used by Zod-generated clients. */
export const zodValidator: RuntimeValidator = {
    validate (schema, value) {
        const result = (schema as z.ZodType).safeParse(value)
        return result.success ? {success: true} : {success: false, issues: result.error.issues, cause: result.error}
    }
}

export interface ExpectedFieldMetadata {result: string, type: string}
export interface LayoutRuntimeSchema {
    /** Validates the complete canonical ProviderRecord returned by a provider. */
    record: unknown
    metadata?: {fields: Record<string, ExpectedFieldMetadata>, portals: Record<string, Record<string, ExpectedFieldMetadata>>}
}
export interface DatabaseRuntimeSchema {validator: RuntimeValidator, layouts: Record<string, LayoutRuntimeSchema>}

export class SchemaDriftError extends Error {
    readonly layout: string
    readonly recordId?: string
    readonly portal?: string
    readonly phase: 'metadata' | 'record' | 'portal'
    readonly issues: ValidationIssue[]

    constructor (options: {layout: string, recordId?: string, portal?: string, phase?: SchemaDriftError['phase'], issues: ValidationIssue[]}, cause?: unknown) {
        const location = [options.layout, options.recordId && `record ${options.recordId}`, options.portal && `portal ${options.portal}`].filter(Boolean).join(', ')
        super(`Schema drift detected in ${location}: ${options.issues.map(issue => `${issue.path.map(String).join('.')}: ${issue.message}`).join('; ')}`, {cause})
        this.name = 'SchemaDriftError'; this.layout = options.layout; this.recordId = options.recordId; this.portal = options.portal
        this.phase = options.phase ?? (options.portal ? 'portal' : options.recordId ? 'record' : 'metadata'); this.issues = options.issues
    }
}

/** Decorates any provider with generated, provider-neutral metadata and result validation. */
export function withSchemaValidation (provider: DatabaseProvider, schema: DatabaseRuntimeSchema): DatabaseProvider {
    return {name: provider.name, formatting: provider.formatting, async connect (context): Promise<ProviderConnection> {
        const connection = await provider.connect(context)
        return {formatting: connection.formatting, maxSessions: connection.maxSessions, close: connection.close?.bind(connection), async openSession (signal): Promise<ProviderSession> {
            const session = await connection.openSession(signal)
            return {close: session.close.bind(session), fetchContainer: session.fetchContainer.bind(session), async execute<K extends DatabaseOperationType> (operation: DatabaseOperation<K>): Promise<DatabaseOperationResult<K>> {
                let result = await session.execute(operation)
                if (operation.type === 'layout.metadata') {
                    result = stripInaccessibleMetadata(result as any) as DatabaseOperationResult<K>
                    validateMetadata(schema, operation.layout, result)
                }
                if (operation.type === 'record.get') { result = stripRecord(result as ProviderRecord) as DatabaseOperationResult<K>; validateRecord(schema, operation.layout, result as ProviderRecord) }
                if (operation.type === 'record.list') { result = (result as ProviderRecord[]).map(stripRecord) as DatabaseOperationResult<K>; for (const record of result as ProviderRecord[]) validateRecord(schema, operation.layout, record) }
                return result
            }}
        }}
    }}
}

function stripRecord (record: ProviderRecord): ProviderRecord {
    return {...record, fieldData: stripInaccessibleFieldData(record.fieldData), portalData: record.portalData && Object.fromEntries(Object.entries(record.portalData).map(([name, rows]) => [name, rows.map(row => stripInaccessibleFieldData(row))]))}
}

function validateRecord (schema: DatabaseRuntimeSchema, layout: string, record: ProviderRecord) {
    const layoutSchema = schema.layouts[layout]; if (!layoutSchema) return
    assertValid(schema.validator, layoutSchema.record, record, {layout, recordId: record.recordId, phase: 'record'})
}

function assertValid (validator: RuntimeValidator, validationSchema: unknown, value: unknown, context: Omit<ConstructorParameters<typeof SchemaDriftError>[0], 'issues'>) {
    const result = validator.validate(validationSchema, value)
    if (!result.success) throw new SchemaDriftError({...context, issues: result.issues}, result.cause)
}

function validateMetadata (schema: DatabaseRuntimeSchema, layout: string, value: unknown) {
    const expected = schema.layouts[layout]?.metadata; if (!expected) return
    const actual = value as {fieldMetaData?: Array<{name: string, result: string, type: string}>, portalMetaData?: Record<string, Array<{name: string, result: string, type: string}>>}
    const issues: ValidationIssue[] = []
    compareFields(expected.fields, actual.fieldMetaData ?? [], ['fieldMetaData'], issues)
    for (const [portal, fields] of Object.entries(expected.portals)) compareFields(fields, actual.portalMetaData?.[portal] ?? [], ['portalMetaData', portal], issues)
    for (const portal of Object.keys(actual.portalMetaData ?? {})) if (!(portal in expected.portals)) issues.push({path: ['portalMetaData', portal], message: 'Unexpected portal'})
    if (issues.length) throw new SchemaDriftError({layout, phase: 'metadata', issues})
}

function compareFields (expected: Record<string, ExpectedFieldMetadata>, actualFields: Array<{name: string, result: string, type: string}>, path: PropertyKey[], issues: ValidationIssue[]) {
    const actual = new Map(actualFields.map(field => [field.name, field]))
    for (const [name, field] of Object.entries(expected)) {
        const found = actual.get(name)
        if (!found) issues.push({path: [...path, name], message: 'Missing field'})
        else {
            if (found.result !== field.result) issues.push({path: [...path, name, 'result'], message: `Expected ${field.result}, received ${found.result}`})
            if (found.type !== field.type) issues.push({path: [...path, name, 'type'], message: `Expected ${field.type}, received ${found.type}`})
        }
    }
    for (const name of actual.keys()) if (!(name in expected)) issues.push({path: [...path, name], message: 'Unexpected field'})
}
