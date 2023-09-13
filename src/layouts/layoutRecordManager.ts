/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutRecord} from "../records/layoutRecord";
import {Layout} from "./layout";
import {LayoutInterface} from "./layoutInterface";
import {RecordGetRange} from "../records/getOperations/recordGetRange";
import {Find} from "../records/getOperations/find";

export class LayoutRecordManager<T extends LayoutInterface> {
    readonly layout: Layout<T>

    constructor(layout: Layout<T>) {
        this.layout = layout
    }

    create(): Promise<LayoutRecord<T["fields"], T["portals"]>> {
        return new Promise((resolve, reject) => {
            // Get the layout's metadata
            this.layout.getLayoutMeta().then(layout => {
                let fields = {}
                for (let _field of this.layout.metadata.fieldMetaData) {
                    fields[_field.name] = ""
                }
                let portals = {}
                for (let _portal of Object.keys(this.layout.metadata.portalMetaData)) portals[_portal] = []
                resolve(new LayoutRecord(this.layout, -1, 0, fields, portals))
            }).catch(e => {
                reject(e)
            })
        })
    }

    get(recordId): Promise<LayoutRecord<T["fields"], T["portals"]>> {
        return new Promise((resolve, reject) => {
            let record
            this.layout.getLayoutMeta()
                .then(layout => {
                    record = new LayoutRecord(this.layout, recordId)
                    return record.get()
                })
                .then(() => {
                    resolve(record)
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    range(start = 0, limit = 100) {
        return new RecordGetRange(this.layout, start, limit)
    }

    find(start = 0, limit = 100): Find<T> {
        return new Find(this.layout, start, limit)
    }
}