/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {EventEmitter} from 'node:events'
import {RecordTypes} from '../types.js'
import {type LayoutBase} from '../layouts/layoutBase.js'
import {type ApiFieldData, type ApiFieldMetadata} from '../models/apiResults.js'
import {type z} from 'zod'
import {RecordFieldsMap} from "../layouts/layoutInterface.js";
import {Field} from "./fields/field.js";
import {DateField, NumberField, TextField, TimeField, TimeStampField, ValueFieldBase} from "./fields/valueField.js";
import {ContainerField} from "./fields/containerField.js";
import {type SessionBinding} from '../connection/databaseProvider.js'

export abstract class RecordBase<T extends RecordFieldsMap> extends EventEmitter {
    readonly layout: LayoutBase
    readonly type: RecordTypes = RecordTypes.UNKNOWN
    public recordId: number
    modId: number
    /**
     * An object containing each field in this record.
     *
     * @template T - The type of the field.
     */
    fields: T
    protected portalData: any[] = []
    sessionBinding?: SessionBinding

    protected constructor (layout: LayoutBase, recordId: number, modId = recordId, fieldData: z.infer<typeof ApiFieldData>, sessionBinding?: SessionBinding) {
        super()
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
        this.sessionBinding = sessionBinding
        this.fields = this.processFieldData(fieldData)
    }

    /**
     * A boolean indicating whether this record has been modified and should be committed
     *
     * @returns {boolean} A boolean value indicating whether any of the fields have been edited.
     */
    get edited (): boolean {
        return !!this.fieldsArray.find(i => i instanceof ValueFieldBase && i.edited)
    }

    get fieldsArray (): Array<Field> {
        // Generated layout types may expose a narrower read-only view, while
        // runtime records always contain concrete Field instances.
        return Object.values(this.fields) as Array<Field>
    }

    abstract getFieldMetadata(fieldId: string): z.infer<typeof ApiFieldMetadata>
    abstract refreshContainer(fieldId: string): Promise<ContainerField>

    protected processFieldData (fieldData: z.infer<typeof ApiFieldData>) {
        const fields: RecordFieldsMap = {}

        for (const [key, value] of Object.entries(fieldData)) {
            const fieldMeta = this.getFieldMetadata(key)
            let field: Field
            switch (fieldMeta.result) {
            case "text":
                field = new TextField(this, key, value)
                break
            case "number":
                field = new NumberField(this, key, value)
                break
            case "container":
                field = new ContainerField(this, key, value)
                break
            case "timeStamp":
                field = new TimeStampField(this, key, value)
                break
            case "time":
                field = new TimeField(this, key, value)
                break
            case "date":
                field = new DateField(this, key, value)
                break
            default:
                throw new Error(`Attempted to parse unknown field type: ${fieldMeta.result}`)
            }

            fields[key] = field
        }
        this.fields = fields as T
        return fields as T
    }

    _onSave () {
        this.emit('saved')
        for (const field of this.fieldsArray) {
            if (field instanceof ValueFieldBase) field.updateOriginalContents()
        }
    }
}
