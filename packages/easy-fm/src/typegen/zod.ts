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
        (field) =>
            `${quote(field.name)}: ${fieldSchema(
                field,
                overrides ? `${overrides}?.[${quote(field.name)}]` : undefined,
            )}`,
    );
    return `z.object({${entries.join(', ')}}).strict()`;
}

function portalRowSchema(fields: readonly TypegenField[], overrides?: string) {
    const entries = fields.map(
        (field) =>
            `${quote(field.name)}: ${fieldSchema(
                field,
                overrides ? `${overrides}?.[${quote(field.name)}]` : undefined,
            )}`,
    );
    entries.push(
        'recordId: z.union([z.string(), z.number()])',
        'modId: z.union([z.string(), z.number()])',
    );
    return `z.object({${entries.join(', ')}}).strict()`;
}

function fieldSchema(field: TypegenField, override?: string) {
    const selected = (fallback: string) =>
        override ? `(${override} ?? ${fallback})` : fallback;
    if (field.result === 'number') {
        return `emptyFileMakerValueToNull(${selected('z.number()')})`;
    }
    if (
        field.result === 'date' ||
        field.result === 'time' ||
        field.result === 'timeStamp'
    ) {
        return `emptyFileMakerValueToNull(${selected('z.string()')})`;
    }
    if (field.result === 'container') {
        return `emptyFileMakerValueToNull(${selected('z.string()')})`;
    }
    return selected('z.string()');
}

function quote(value: string) {
    return JSON.stringify(value);
}
