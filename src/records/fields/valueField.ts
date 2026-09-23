import {BaseField, Parentable, RawValueData} from "./baseField.js";
import {Temporal} from "temporal-polyfill"
import {FieldResultTypes} from "../../models/apiResults.js";
import {stringToTemporal, temporalToString} from "../../utils/temporal.js";

export abstract class ValueFieldBase<T, API_FIELD_RESULT extends FieldResultTypes> extends BaseField<T, API_FIELD_RESULT> {
    #originalContents: RawValueData

    /**
     * @internal
     * Use `layout.records.create()` instead to create a new LayoutRecord, as this may be safer.
     * @param record
     * @param id
     * @param value
     * @protected
     */
    constructor(record: Parentable, id: string, value: RawValueData) {
        super(record, id, value);
        this.#originalContents = value;
    }

    set(content: T) {
        /**
         * Sets the value of the field.
         *
         * @param {T | null} content - The new content value to be set. Can be either the type T or null.
         * @throws {Error} Cannot set container value using set(). Use upload() instead, if the result is a 'container'.
         */

        if (this.isCalculationField() || this.isSummaryField()) {
            throw new Error('Cannot modify the value of an immutable calculation or sumamry field.')
        } else this._value = content
    }

    /** `true` if this field has changed since it was last loaded or saved. */
    get edited() {
        return this.#originalContents !== this.serializeRawValue()
    }

    /**
     * Resets the 'edited' state of this field, without changing its value
     */
    updateOriginalContents() {
        this.#originalContents = this.serializeRawValue()
    }

    set value(value: T) {
        this.set(value)
    }

    get value(): T {
        return super.value
    }
}

export class TextField<T extends string = string> extends ValueFieldBase<T, 'text'> {}

export class NumberField<T extends number | null = number | null> extends ValueFieldBase<T, 'number'> {}

export class TimeStampField extends ValueFieldBase<Temporal.PlainDateTime | null, 'timeStamp'> {
    override parseRawValue(value: RawValueData) {
        if (value === '' || value === null) return null
        if (typeof value !== 'string') throw new Error("Received an invalid value for a temporal field.")
        try {
            return stringToTemporal(value, 'timestamp', this.parent.layout.database.host.timeStampFormat)
        } catch {
            return Temporal.PlainDateTime.from(value)
        }
    }

    override serializeRawValue(): RawValueData {
        if (this._value === null) return ''
        return temporalToString(this._value, this.parent.layout.database.host.timeStampFormat)
    }
}

export class DateField extends ValueFieldBase<Temporal.PlainDate | null, 'date'> {
    override parseRawValue(value: RawValueData) {
        if (value === '' || value === null) return null
        if (typeof value !== 'string') throw new Error("Received an invalid value for a temporal field.")
        try {
            return stringToTemporal(value, 'date', this.parent.layout.database.host.dateFormat)
        } catch {
            return Temporal.PlainDate.from(value)
        }
    }

    override serializeRawValue(): RawValueData {
        if (this._value === null) return ''
        return temporalToString(this._value, this.parent.layout.database.host.dateFormat)
    }
}

export class TimeField extends ValueFieldBase<Temporal.PlainTime | null, 'time'> {
    override parseRawValue(value: RawValueData) {
        if (value === '' || value === null) return null
        if (typeof value !== 'string') throw new Error("Received an invalid value for a temporal field.")
        try {
            return stringToTemporal(value, 'time', this.parent.layout.database.host.timeFormat)
        } catch {
            return Temporal.PlainTime.from(value)
        }
    }

    override serializeRawValue(): RawValueData {
        if (this._value === null) return ''
        return temporalToString(this._value, this.parent.layout.database.host.timeFormat)
    }
}

export type ValueField =
    | TextField
    | NumberField
    | TimeStampField
    | DateField
    | TimeField
