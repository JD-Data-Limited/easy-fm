import type {ApiFieldResultTypes, ApiFieldTypes} from '../models/apiResults.js'

export interface TypegenField {
    name: string
    result: typeof ApiFieldResultTypes[keyof typeof ApiFieldResultTypes]
    type: typeof ApiFieldTypes[keyof typeof ApiFieldTypes]
    writable: boolean
    required: boolean
}

export interface TypegenLayout {
    name: string
    clientName?: string
    fields: TypegenField[]
    portals: Record<string, TypegenField[]>
}

export interface TypegenSchema {version: 1, layouts: TypegenLayout[]}
export type TypegenTransport = 'data-api' | 'odata'

export interface SchemaSource {
    introspect(): Promise<TypegenSchema>
}

/** Code-generation plugin for a runtime validation library. */
export interface TypegenValidator {
    readonly imports: readonly string[]
    readonly runtimeValidator: string
    /** Render a validator for the complete canonical ProviderRecord. */
    renderRecord(layout: TypegenLayout): string
}

export interface TypegenConfig {
    source: SchemaSource
    output: string
    /** Placeholder describing intended runtime transports. */
    transports?: TypegenTransport[]
    /** Restrict output to these FileMaker layout names. */
    layouts?: string[]
    /** Defaults to the built-in strict Zod validator. */
    validator?: TypegenValidator
}

export function defineTypegenConfig (config: TypegenConfig): TypegenConfig { return config }
