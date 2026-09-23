/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordTypes} from '../../types.js'
import {type ApiFieldMetadata, FieldResultTypes} from '../../models/apiResults.js'
import {type LayoutBase} from '../../layouts/layoutBase.js'
import {type z} from 'zod'

export type ContainerValue = null
/**
 * RawValueData refers to the raw shapes of data we receive from or sent to FileMaker.
 */
export type RawValueData = string | number | null

export interface Parentable {
    layout: LayoutBase
    type: RecordTypes
    endpoint: string
    portal?: { name: string },
    getFieldMetadata(fieldId: string): z.infer<typeof ApiFieldMetadata>
}

/**
 * A class representing a field in a record.
 * API_FIELD_RESULT defines the value of field.metadata.result for the abstracted field type
 *
 * @template T - The type of the field value.
 */
export abstract class BaseField<
    T extends unknown,
    API_FIELD_RESULT extends FieldResultTypes,
> {
    parent: Parentable
    id: string
    protected _value: T

    /**
     * @internal
     * Use `layout.records.create()` instead to create a new LayoutRecord, as this may be safer.
     * @param record
     * @param id
     * @param value
     * @protected
     */
    protected constructor(record: Parentable, id: string, value: RawValueData) {
        this.parent = record
        this.id = id
        this._value = this.parseRawValue(value)
    }

    /**
     * Takes in data in the format that FileMaker gives us and converts it to a more JavaScript-friendly format.
     * This method is intended to be overriden.
     * @param value
     */
    parseRawValue(value: RawValueData): T {
        return value as T
    }

    /**
     * Converts data back into a format that can be sent to FileMaker. Intended to be overriden if conversion is non-standard.
     */
    serializeRawValue(): RawValueData {
        return this._value as RawValueData
    }

    updateFromRawValue(value: RawValueData) {
        this._value = this.parseRawValue(value)
    }

    /** Returns the FileMaker metadata for this field. */
    get metadata() {
        return this.parent.getFieldMetadata(this.id) as z.infer<typeof ApiFieldMetadata> & { result: API_FIELD_RESULT }
    }

    /** Gets or sets the current field value. */
    get value() {
        // if (this.metadata.result === "container") throw "Use await field.stream() to get the contents of a container field, instead of field.value"
        return this._value
    }

    isCalculationField() {
        return this.metadata.type === 'calculation'
    }

    isSummaryField() {
        return this.metadata.type === 'summary'
    }
}
