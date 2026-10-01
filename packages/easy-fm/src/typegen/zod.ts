import type { TypegenField, TypegenLayout, TypegenValidator } from './types.js';

/**
 * @deprecated Zod is now built into typegen. Existing v5 configurations may
 * keep calling this helper; the returned marker is intentionally ignored.
 */
export function zodTypegenValidator(): TypegenValidator {
    return { kind: 'zod' };
}

/** Render the strict Zod schema for one complete canonical ProviderRecord. */
export function renderProviderRecord(
    layout: TypegenLayout,
    overrideExpression?: string,
) {
    const fieldOverrides = overrideExpression
        ? `${overrideExpression}?.fields`
        : undefined;
    const fieldData = objectSchema(layout.fields, fieldOverrides);
    const portals = Object.entries(layout.portals)
        .map(([name, fields]) =>
            `${quote(name)}: z.array(${portalRowSchema(fields, overrideExpression ? `${overrideExpression}?.portals?.[${quote(name)}]` : undefined)})`,
        )
        .join(', ');
    const portalData = `z.object({${portals}}).partial().strict().optional()`;
    return `z.object({recordId: z.string(), modId: z.string(), fieldData: ${fieldData}, portalData: ${portalData}}).strict()`;
}

function objectSchema(fields: readonly TypegenField[], overrides?: string) {
    const entries = fields.map(
        (field) => `${quote(field.name)}: ${fieldSchema(field)}`,
    );
    if (overrides) {
        entries.push(`...(${overrides} ?? {})`);
    }
    return `z.object({${entries.join(', ')}}).strict()`;
}

function portalRowSchema(fields: readonly TypegenField[], overrides?: string) {
    const entries = fields.map((field) => `${quote(field.name)}: ${fieldSchema(field)}`);
    entries.push(
        'recordId: z.union([z.string(), z.number()])',
        'modId: z.union([z.string(), z.number()])',
    );
    if (overrides) {
        entries.push(`...(${overrides} ?? {})`);
    }
    return `z.object({${entries.join(', ')}}).strict()`;
}

function fieldSchema(field: TypegenField) {
    if (field.result === 'number') {
        return 'z.number().nullable()';
    }
    if (
        field.result === 'date' ||
        field.result === 'time' ||
        field.result === 'timeStamp'
    ) {
        return 'z.string().nullable()';
    }
    if (field.result === 'container') {
        return 'z.string().nullable()';
    }
    return 'z.string()';
}

function quote(value: string) {
    return JSON.stringify(value);
}
