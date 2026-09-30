import type { ApiFieldResultTypes, ApiFieldTypes } from '../models/apiResults.js';

export interface TypegenField {
    name: string;
    result: (typeof ApiFieldResultTypes)[keyof typeof ApiFieldResultTypes];
    type: (typeof ApiFieldTypes)[keyof typeof ApiFieldTypes];
    writable: boolean;
    required: boolean;
}

export interface TypegenLayout {
    name: string;
    clientName?: string;
    fields: TypegenField[];
    portals: Record<string, TypegenField[]>;
}

export interface TypegenDiagnostic {
    level: 'warning';
    message: string;
    layout?: string;
    portal?: string;
}
export interface TypegenSchema {
    version: 1;
    layouts: TypegenLayout[];
    diagnostics?: TypegenDiagnostic[];
}
export type TypegenTransport = 'data-api' | 'odata';

export interface SchemaSource {
    introspect(): Promise<TypegenSchema>;
}

/** Code-generation plugin for a runtime validation library. */
export interface TypegenValidator {
    readonly imports: readonly string[];
    readonly runtimeValidator: string;
    /** Render a validator for the complete canonical ProviderRecord. */
    renderRecord(layout: TypegenLayout): string;
}

export interface TypegenConfig {
    output: string;
    /** User-owned runtime entrypoint. Created once and never overwritten. */
    entrypoint?: string;
    runtime?: DataApiRuntimeDescriptor;
    /** Single-database shorthand. */
    source?: SchemaSource;
    /** Placeholder describing intended runtime transports. */
    transports?: TypegenTransport[];
    /** Restrict output to these FileMaker layout names. */
    layouts?: string[];
    /** Defaults to the built-in strict Zod validator. */
    validator?: TypegenValidator;
    databases?: Record<string, TypegenDatabaseConfig>;
    onDiagnostic?: (diagnostic: TypegenDiagnostic & { database: string }) => void;
}

export interface TypegenDatabaseConfig {
    source: SchemaSource;
    provider?: string;
    transports?: TypegenTransport[];
    layouts?: string[];
    validator?: TypegenValidator;
    runtime?: DataApiRuntimeDescriptor;
}

export interface DataApiRuntimeDescriptor {
    provider: 'data-api';
    hostnameEnv: string;
    databaseEnv: string;
    usernameEnv: string;
    passwordEnv: string;
}

export function defineTypegenConfig(config: TypegenConfig): TypegenConfig {
    return config;
}
