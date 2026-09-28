import type {TypegenField, TypegenLayout, TypegenValidator} from './types.js'

/** Strict Zod generator. Extra, missing, and wrongly typed fields fail validation. */
export function zodTypegenValidator (): TypegenValidator {
    return {
        imports: ["import {z} from 'zod'"],
        runtimeValidator: 'zodValidator',
        renderRecord: renderProviderRecord
    }
}

function renderProviderRecord (layout: TypegenLayout) {
    const fieldData = objectSchema(layout.fields)
    const portals = Object.entries(layout.portals).map(([name, fields]) => `${quote(name)}: z.array(${portalRowSchema(fields)})`).join(', ')
    const portalData = `z.object({${portals}}).partial().strict().optional()`
    return `z.object({recordId: z.string(), modId: z.string(), fieldData: ${fieldData}, portalData: ${portalData}}).strict()`
}

function objectSchema (fields: readonly TypegenField[]) {
    return `z.object({${fields.map(field => `${quote(field.name)}: ${fieldSchema(field)}`).join(', ')}}).strict()`
}

function portalRowSchema (fields: readonly TypegenField[]) {
    const entries = fields.map(field => `${quote(field.name)}: ${fieldSchema(field)}`)
    entries.push('recordId: z.union([z.string(), z.number()])', 'modId: z.union([z.string(), z.number()])')
    return `z.object({${entries.join(', ')}}).strict()`
}

function fieldSchema (field: TypegenField) {
    if (field.result === 'number') return 'z.number().nullable()'
    if (field.result === 'date' || field.result === 'time' || field.result === 'timeStamp') return 'z.string().nullable()'
    if (field.result === 'container') return 'z.string().nullable()'
    return 'z.string()'
}

function quote (value: string) { return JSON.stringify(value) }
