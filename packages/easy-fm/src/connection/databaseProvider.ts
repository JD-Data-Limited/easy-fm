import type {z} from 'zod'
import type {ApiFieldData, ApiLayoutMetadata, ApiPortalData} from '../models/apiResults.js'

export interface DatabaseFormatting {
    readonly dateFormat: string
    readonly timeFormat: string
    readonly timeStampFormat: string
}

export interface ProviderContext { readonly signal: AbortSignal, readonly debug: boolean }
export interface DatabaseProvider {
    readonly name?: string
    /** Synchronous formatting defaults, refined in place when connect resolves. */
    readonly formatting: DatabaseFormatting
    connect: (context: ProviderContext) => Promise<ProviderConnection>
}
export interface ProviderConnection {
    readonly formatting: DatabaseFormatting
    readonly maxSessions: number
    openSession: (signal: AbortSignal) => Promise<ProviderSession>
    close?: () => Promise<void>
}
export interface ProviderSession {
    execute: <K extends DatabaseOperationType>(operation: DatabaseOperation<K>) => Promise<DatabaseOperationResult<K>>
    /** Use this exact session. Non-HTTP transports may synthesize a Web Response. */
    fetchContainer: (reference: string, signal?: AbortSignal) => Promise<Response>
    close: () => Promise<void>
}

export interface ProviderRecord {
    recordId: string
    modId: string
    fieldData: z.infer<typeof ApiFieldData>
    portalData?: z.infer<typeof ApiPortalData>
}
export interface RecordQueryClause { omit: boolean, fields: Record<string, string> }
export interface RecordOperationOptions {
    scripts: {
        prerequest?: {name: string, parameter: string}
        presort?: {name: string, parameter: string}
        after?: {name: string, parameter: string}
    }
    portals: Record<string, {limit: number, offset: number}>
}
export interface RecordQueryOptions extends RecordOperationOptions {
    limit: number
    offset: number
    sort: Array<{fieldName: string, sortOrder: 'ascend' | 'descend'}>
}
export interface RecordWriteBody {
    fieldData: Record<string, unknown>
    portalData?: Record<string, unknown>
    options?: Record<string, unknown>
    deleteRelatedRecords?: Array<{table: string, recordId: number}>
}

export interface DatabaseOperationMap {
    'layout.list': {operation: {page: number}, result: string[]}
    'layout.metadata': {operation: {layout: string}, result: z.infer<typeof ApiLayoutMetadata>}
    'script.run': {operation: {layout: string, script: string, parameter?: string}, result: {scriptError?: number, scriptResult?: string, status?: number}}
    'record.list': {operation: {layout: string, query: RecordQueryClause[], options: RecordQueryOptions}, result: ProviderRecord[]}
    'record.get': {operation: {layout: string, recordId: number, options: RecordOperationOptions}, result: ProviderRecord}
    'record.create': {operation: {layout: string, body: RecordWriteBody, options: RecordOperationOptions}, result: {recordId: string, modId: string, scriptError?: number, status?: number}}
    'record.update': {operation: {layout: string, recordId: number, body: RecordWriteBody, options: RecordOperationOptions}, result: {modId: string, scriptError?: number, status?: number}}
    'record.duplicate': {operation: {layout: string, recordId: number, options: RecordOperationOptions}, result: {recordId: string, modId: string, scriptError?: number, status?: number}}
    'record.delete': {operation: {layout: string, recordId: number, options: RecordOperationOptions}, result: {scriptError?: number, status?: number}}
    'container.upload': {operation: {layout: string, recordId: number, field: string, file: File}, result: undefined}
}
export type DatabaseOperationType = keyof DatabaseOperationMap
export type DatabaseOperation<K extends DatabaseOperationType = DatabaseOperationType> = K extends DatabaseOperationType ? {type: K} & DatabaseOperationMap[K]['operation'] : never
export type DatabaseOperationResult<K extends DatabaseOperationType> = DatabaseOperationMap[K]['result']

export class ProviderSessionExpiredError extends Error {
    constructor (message = 'Provider session expired', options?: ErrorOptions) { super(message, options); this.name = 'ProviderSessionExpiredError' }
}
export class ContainerSessionAffinityError extends Error {
    constructor (message = 'The session associated with this container is no longer available', options?: ErrorOptions) { super(message, options); this.name = 'ContainerSessionAffinityError' }
}
export interface ContainerDownloadOptions { signal?: AbortSignal, refreshOnSessionLoss?: boolean }
/** @internal */
export interface SessionBinding { readonly id: symbol }
