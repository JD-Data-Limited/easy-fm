import type {
    DatabaseOperation,
    DatabaseOperationResult,
    DatabaseOperationType,
    SessionBinding
} from './databaseProvider.js'

export interface DatabaseBase {
    readonly name: string
    readonly timeFormat: string
    readonly dateFormat: string
    readonly timeStampFormat: string
    connect: () => Promise<void>
    close: () => Promise<void>
    logout: () => Promise<void>
    execute: <K extends DatabaseOperationType>(operation: DatabaseOperation<K>) => Promise<{value: DatabaseOperationResult<K>, binding: SessionBinding}>
    fetchContainer: (reference: string, binding: SessionBinding, signal?: AbortSignal) => Promise<Response>
}
