import {RecordBase} from "./recordBase.js";
import {RecordFieldsMap} from "../layouts/layoutInterface.js";
import {ApiFieldData, ApiFieldMetadata, stripInaccessibleFieldData} from "../models/apiResults.js";
import {z} from "zod"
import {Field} from "./fields/field.js";
import {DateField, NumberField, TextField, TimeField, TimeStampField} from "./fields/valueField.js";
import {ContainerField} from "./fields/containerField.js";
import type {LayoutBase} from "../layouts/layoutBase.js";
import type {SessionBinding} from "../connection/databaseProvider.js";

export abstract class LayoutishRecordBase<T extends RecordFieldsMap> extends RecordBase<T> {
    protected portalData: unknown[] = [];
    readonly layout: LayoutBase;

    public recordId: number;
    modId: number;

    fields: T;

    protected constructor(
        layout: LayoutBase,
        recordId: number,
        modId = recordId,
        fieldData: z.infer<typeof ApiFieldData>,
        sessionBinding?: SessionBinding,
    ) {
        super(sessionBinding);
        this.recordId = recordId;
        this.modId = modId;
        this.layout = layout;
        this.fields = this.processFieldData(fieldData)
    }

    isNew(): boolean {
        return this.recordId === -1;
    }

    abstract getFieldMetadata(fieldId: string): z.infer<typeof ApiFieldMetadata>;

    /**
     * Takes an api record object as input and converts them into Field objects
     * @param fieldData
     * @protected
     */
    protected processFieldData(fieldData: z.infer<typeof ApiFieldData>) {
        const fields: RecordFieldsMap = {};

        for (const [key, value] of Object.entries(
            stripInaccessibleFieldData(fieldData),
        )) {
            if (key.includes('<No Access>')) {
                continue;
            }
            const fieldMeta = this.getFieldMetadata(key);
            let field: Field;
            switch (fieldMeta.result) {
                case 'text':
                    field = new TextField(this, key, value);
                    break;
                case 'number':
                    field = new NumberField(this, key, value);
                    break;
                case 'container':
                    field = new ContainerField(this, key, value);
                    break;
                case 'timeStamp':
                    field = new TimeStampField(this, key, value);
                    break;
                case 'time':
                    field = new TimeField(this, key, value);
                    break;
                case 'date':
                    field = new DateField(this, key, value);
                    break;
                default:
                    throw new Error(
                        `Attempted to parse unknown field type: ${fieldMeta.result}`,
                    );
            }

            fields[key] = field;
        }
        this.fields = fields as T;
        return fields as T;
    }
}