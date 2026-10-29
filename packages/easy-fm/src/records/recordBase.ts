/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {EventEmitter} from 'node:events';
import {RecordTypes} from '../types.js';
import {type LayoutBase} from '../layouts/layoutBase.js';
import {
    type ApiFieldMetadata,
} from '../models/apiResults.js';
import {type z} from 'zod';
import {RecordFieldsMap} from '../layouts/layoutInterface.js';
import {Field} from './fields/field.js';
import {ValueFieldBase} from './fields/valueField.js';
import {ContainerField} from './fields/containerField.js';
import {type SessionBinding} from '../connection/databaseProvider.js';

export abstract class RecordBase<
    T extends RecordFieldsMap,
> extends EventEmitter {
    readonly type: RecordTypes = RecordTypes.UNKNOWN;
    /**
     * An object containing each field in this record.
     *
     * @template T - The type of the field.
     */
    abstract fields: T;
    sessionBinding?: SessionBinding;

    protected constructor(
        sessionBinding?: SessionBinding,
    ) {
        super();
        this.sessionBinding = sessionBinding;
    }

    /**
     * A boolean indicating whether this record has been modified and should be committed
     *
     * @returns {boolean} A boolean value indicating whether any of the fields have been edited.
     */
    get edited(): boolean {
        return !!this.fieldsArray.find((i) => i instanceof ValueFieldBase && i.edited);
    }

    get fieldsArray(): Array<Field> {
        // Generated layout types may expose a narrower read-only view, while
        // runtime records always contain concrete Field instances.
        return Object.values(this.fields) as Array<Field>;
    }


    abstract refreshContainer(fieldId: string): Promise<ContainerField>;

    _onSave() {
        this.emit('saved');
        for (const field of this.fieldsArray) {
            if (field instanceof ValueFieldBase) {
                field.updateOriginalContents();
            }
        }
    }

    /**
     * Returns true if this record is new and hasn't been commited to the DB yet.
     */
    abstract isNew(): boolean;
}
