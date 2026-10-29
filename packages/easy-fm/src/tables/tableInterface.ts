/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */


export interface TableInterface {
    fields: RecordFieldsMap;
}

/** Public field views, including generated read-only views, satisfy this shape. */
export type RecordFieldsMap = Record<string, { readonly value: unknown }>;

