/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type extraBodyOptions, RecordTypes} from '../types.js';
import {RecordBase} from './recordBase.js';
import {PortalRecord} from './portalRecord.js';
import {Portal} from './portal.js';
import {type LayoutInterface} from '../layouts/layoutInterface.js';
import {FMError} from '../FMError.js';
import {type LayoutRecordBase} from './layoutRecordBase.js';
import {
    type ApiFieldData,
    ApiFieldMetadata,
    type ApiPortalData,
    type ApiRowDataDef,
    stripInaccessibleFieldData,
} from '../models/apiResults.js';
import {type LayoutBase} from '../layouts/layoutBase.js';
import z, {z} from 'zod';
import {Field} from './fields/field.js';
import {DateField, NumberField, TextField, TimeField, TimeStampField, ValueFieldBase} from './fields/valueField.js';
import {ContainerField} from './fields/containerField.js';
import {type SessionBinding} from '../connection/databaseProvider.js';
import {RecordFieldsMap, TableInterface} from "../tables/tableInterface.js";
import {ODataFieldData} from "../models/odataResults.js";
import {Table} from "../tables/table.js";
import {LayoutRecord} from "./layoutRecord.js";
import {a} from "vitest/dist/chunks/suite.d.udJtyAgw.js";
import {filter} from "typedoc/dist/types/utils-common/index.js";
import test from "node:test";
import Error = module

export class TableRecord<TABLE extends TableInterface> extends RecordBase<TABLE['fields']> {
    fields: TABLE['fields']
    type = RecordTypes.TABLE

    /**
     * set #id to "new" when record is new and not commited yet.
     * @private
     */
    #id: string
    #editLink: string

    get id() {
        return this.#id
    }

    get editLink() {
        return this.#editLink
    }

    get internalUUID() {
        const pathParts = this.id.split('/');
        const segment = pathParts[pathParts.length - 1];
        const uuid = segment.match(/\('([0-9a-f-]{36})'\)$/i)
        if (!uuid) throw new Error("Cannot get internalUUID. Record ID is invalid.")
        return uuid[1]
    }

    constructor(
        readonly table: Table<never>,
        data: z.infer<typeof ODataFieldData>,
        sessionBinding?: SessionBinding,
    ) {
        super(sessionBinding);
        this.#id = data["@id"]
        this.#editLink = data["@editLink"]
        this.fields = this.processFieldData(data)
    }

    isNew(): boolean {
        return this.#id === "new";
    }

    /**
     * Takes an Odata record object as input and converts them into Field objects
     * @param fieldData
     * @protected
     */
    protected processFieldData(fieldData: z.infer<typeof ODataFieldData>) {
        const fields: RecordFieldsMap = {};

        for (const [key, value] of Object.entries(fieldData)) {
            if (key in ["@id", "@editLink"]) {continue}
            
            const fieldMeta = this.getFieldMetadata(key);
            let field: Field;
            switch (fieldMeta["$Type"]) {
                case 'Edm.String':
                    field = new TextField(this, key, value);
                    break;
                case 'Edm.Int16':
                case 'Edm.Int32':
                case 'Edm.Int64':
                    field = new NumberField(this, key, value);
                    break;
                case 'Edm.Binary':
                    field = new ContainerField(this, key, value);
                    break;
                case 'Edm.DateTimeOffset':
                    field = new TimeStampField(this, key, value);
                    break;
                case 'Edm.TimeOfDay':
                    field = new TimeField(this, key, value);
                    break;
                case 'Edm.Date':
                    field = new DateField(this, key, value);
                    break;
                default:
                    throw new Error(
                        `Attempted to parse unknown field type: ${fieldMeta["$Type"]}`,
                    );
            }

            fields[key] = field;
        }
        this.fields = fields as TABLE['fields'];
        return fields as TABLE['fields'];
    }

    /**
     * Saves this record back to FileMaker.
     * @returns {Promise<this>} - A promise that resolves with the modified object.
     * @throws {FMError} - If an error occurs during the commit process.
     */
    async commit(): Promise<this> {
        if (this.isNew()) {
            await this.table.database.execute({
                type: "table.record.create",
                databaseName: this.table.database.name,
                tableName: this.table.name,
                data: this.toObject()
            })
        } else {
            await this.table.database.execute({
                type: "table.record.update",
                databaseName: this.table.database.name,
                tableName: this.table.name,
                primaryKeyValue: this.internalUUID,
                data: this.toObject()
            })
        }

        this._onSave();
        return this;
    }

    getFieldMetadata(fieldId: string) {
        if (!this.table.metadata) {
            throw new Error(
                'Field metadata not found. Ensure you run layout.getLayoutMeta() first.',
            );
        }
        const result = this.table.metadata.fields[fieldId]
        if (!result) {
            throw new Error(
                'Field metadata not found. Ensure you run layout.getLayoutMeta() first.',
            );
        }
        return result;
    }

    /**
     * Reloads this record from FileMaker.
     * Throws if this record has not been saved yet.
     *
     * @return {Promise<this>} A Promise that resolves to this RecordBase instance if the record is successfully retrieved.
     * @throws {Error} If commit() has not been called.
     * @throws {FMError} If the retrieval fails.
     */
    async get(
        portals: Record<string, { limit: number; offset: number }> = {},
    ): Promise<this> {
        if (this.recordId === -1) {
            throw new Error('Cannot get this RecordBase until a commit() is done.');
        }
        if (!this.layout.metadata) {
            await this.layout.getLayoutMeta();
        }
        const { value: record, binding } = await this.layout.database.execute({
            type: 'record.get',
            layout: this.layout.name,
            recordId: this.recordId,
            options: { scripts: {}, portals },
        });

        // console.log(res, res.response.data)
        this.sessionBinding = binding;
        this.processFieldData(record.fieldData);
        if (record.portalData) {
            this.processPortalData(record.portalData);
        }
        return this;
    }

    /** Deletes this record from FileMaker. */
    async delete(): Promise<void> {
        await this.table.database.execute({
            type: 'table.record.delete',
            databaseName: this.table.database.name,
            tableName: this.table.name,
            primaryKeyValue: this.internalUUID,
        });
        this.emit('deleted');
    }

    async refreshContainer(fieldId: string): Promise<ContainerField> {
        await this.get();
        const field = this.fields[fieldId];
        if (!(field instanceof ContainerField)) {
            throw new Error(
                `Container field ${fieldId} was not returned while refreshing record`,
            );
        }
        return field;
    }

    /** Returns this record and its portal edits as a FileMaker API payload. */
    toObject(filter: (a: Field) => boolean = (a) => a instanceof ValueFieldBase && a.edited) {
        return Object.fromEntries(this.fieldsArray.filter(filter).map(field => {
            return [field.id, field.serializeRawValue()];
        }))
    }
}