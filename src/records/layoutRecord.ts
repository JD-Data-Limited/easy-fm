/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {type extraBodyOptions} from '../types.js'
import {RecordBase} from './recordBase.js'
import {PortalRecord} from './portalRecord.js'
import {Portal} from './portal.js'
import {type LayoutInterface} from '../layouts/layoutInterface.js'
import {FMError} from '../FMError.js'
import {type LayoutRecordBase} from './layoutRecordBase.js'
import {
    type ApiFieldData,
    type ApiPortalData,
    type ApiRecordResponseObj,
    type ApiRowDataDef
} from '../models/apiResults.js'
import {type LayoutBase} from '../layouts/layoutBase.js'
import * as moment from 'moment/moment.js'
import {type Field, type FieldValue} from './field.js'

export class LayoutRecord<LAYOUT extends LayoutInterface> extends RecordBase<LAYOUT['fields']> implements LayoutRecordBase {
    portals: LAYOUT['portals'] = {}
    private readonly portalsToInclude: Array<string | number | symbol>

    constructor (
        layout: LayoutBase,
        recordId: number | string,
        modId = recordId,
        fieldData: Record<string, string | number> = {},
        portalData: ApiPortalData | null = null, portalsToInclude: Array<keyof LAYOUT['portals']> = []) {
        super(layout, parseInt(recordId as string), parseInt(modId as string), fieldData)
        this.portalsToInclude = portalsToInclude
        if (portalData) {
            this.processPortalData(portalData)
        }
    }

    get portalsArray (): Array<Portal<any>> {
        return Object.values(this.portals)
    }

    /**
     * Asynchronously commits the changes made to the current record.
     * @param {extraBodyOptions} extraBody - The options for the extra body elements.
     * @returns {Promise<this>} - A promise that resolves with the modified object.
     * @throws {FMError} - If an error occurs during the commit process.
     */
    async commit (extraBody: extraBodyOptions = {}): Promise<this> {
        const data: any = this.toObject()
        delete data.recordId
        delete data.modId

        if (extraBody.scripts?.after) {
            data.script = extraBody.scripts.after.name
            if (extraBody.scripts.after.parameter) data['script.param'] = extraBody.scripts.after.parameter
        }
        if (extraBody.scripts?.prerequest) {
            data['script.prerequest'] = extraBody.scripts.prerequest.name
            if (extraBody.scripts.prerequest.parameter) data['script.prerequest.param'] = extraBody.scripts.prerequest.parameter
        }
        if (extraBody.scripts?.presort) {
            data['script.presort'] = extraBody.scripts.presort.name
            if (extraBody.scripts.presort.parameter) data['script.presort.param'] = extraBody.scripts.presort.parameter
        }
        if (extraBody.options) data.options = extraBody.options
        if (extraBody.deleteRelatedRecords) data.fieldData.deleteRelated = extraBody.deleteRelatedRecords.map(i => `${i.table}.${i.recordId}`)

        if (this.recordId === -1) {
            // This is a new LayoutRecord
            const res = await this.layout.database._apiRequestJSON<{ recordId: string, modId: string }>(`${this.layout.endpoint}/records`, {
                method: 'POST',
                body: JSON.stringify(data)
            })

            if (!res.response) {
                throw new FMError(res.messages[0].code, res.httpStatus, res)
            } else if (typeof res.response.scriptError !== 'undefined' && res.response.scriptError !== '0') {
                throw new FMError(res.response.scriptError, res.httpStatus, res)
            } else if (res.messages[0].code === '0') {
                this.recordId = parseInt(res.response.recordId)
                this.modId = parseInt(res.response.modId)
                return this
            } else {
                throw new FMError(res.messages[0].code, res.httpStatus, res)
            }
        }

        // for (let item of Object.keys(data)) extraBody[item] = data[item]
        const res = await this.layout.database._apiRequestJSON<{
            modId: string,
            newPortalRecordInfo: Array<{
                tableName: string
                recordId: string
                modId: string
            }>
        }>(this.endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        })
        if (!res.response) {
            throw new FMError(res.messages[0].code, res.httpStatus, res)
        } else if (typeof res.response.scriptError !== 'undefined' && res.response.scriptError !== '0') {
            throw new FMError(res.response.scriptError, res.httpStatus, res)
        } else if (res.messages[0].code === '0') {
            this.modId = +res.response.modId
            this._onSave()
            return this
        } else {
            throw new FMError(res.messages[0].code, res.httpStatus, res)
        }
    }

    protected processPortalData (portalData: ApiPortalData): void {
        for (const portalName of Object.keys(portalData)) {
            const _portal = new Portal(this, portalName)
            _portal.records = portalData[portalName].map(item => {
                const fieldData = item
                delete fieldData.recordId
                delete fieldData.modId
                return new PortalRecord(this, _portal, parseInt(item.recordId as string), parseInt(item.modId as string), fieldData)
            })

            // @ts-expect-error - This code is actually correct, but throws a typescript error
            this.portals[portalName] = _portal
        }
    }

    /**
     * Re-fetches the current record from the database server.
     * Throws an error if commit() has not been called.
     *
     * @return {Promise<this>} A Promise that resolves to this RecordBase instance if the record is successfully retrieved.
     * @throws {Error} If commit() has not been called.
     * @throws {FMError} If the retrieval fails.
     */
    async get (): Promise<this> {
        if (this.recordId === -1) {
            throw new Error('Cannot get this RecordBase until a commit() is done.')
        }
        if (!this.layout.metadata) await this.layout.getLayoutMeta()
        const res = await this.layout.database._apiRequestJSON<ApiRecordResponseObj>(this.endpoint, {
            method: 'GET'
        })

        if (res.response && res.messages[0].code === '0') {
            // console.log(res, res.response.data)
            this.modId = +res.response.data[0].modId
            this.processFieldData(res.response.data[0].fieldData)
            this.portalData = []
            if (res.response.data[0].portalData) this.processPortalData(res.response.data[0].portalData)
            return this
        } else {
            throw new FMError(res.messages[0].code, res.httpStatus, res)
        }
    }

    async duplicate (): Promise<LayoutRecord<LAYOUT>> {
        const trace = new Error()
        const res = await this.layout.database._apiRequestJSON<{ recordId: string, modId: string }>(this.endpoint, {
            method: 'POST'
        })
        if (!res.response) {
            throw new FMError(res.messages[0].code, res.httpStatus, res, trace)
        } else if (typeof res.response.scriptError !== 'undefined' && res.response.scriptError !== '0') {
            throw new FMError(res.response.scriptError, res.httpStatus, res, trace)
        } else if (res.messages[0].code === '0') {
            const data = this.toObject((a) => true, (a) => true, (a) => false, (a) => false)
            const _res = new LayoutRecord<LAYOUT>(this.layout, res.response.recordId, res.response.modId, data.fieldData, data.portalData)

            this.emit('duplicated')
            return _res
        } else {
            throw new FMError(res.messages[0].code, res.httpStatus, res, trace)
        }
    }

    async delete (): Promise<void> {
        const res = await this.layout.database._apiRequestJSON(this.endpoint, {
            method: 'DELETE'
        })
        if (typeof res.response?.scriptError !== 'undefined' && res.response?.scriptError !== '0') {
            throw new FMError(res.response.scriptError, res.httpStatus, res)
        } else if (res.messages[0].code === '0') {
            this.emit('deleted')
        } else {
            throw new FMError(res.messages[0].code, res.httpStatus, res)
        }
    }

    fieldsToObject (filter = (a: Field<FieldValue>) => a.edited): Omit<ApiRowDataDef, 'portalData'> {
        const fields_processed: ApiFieldData = {}
        let field: Field<FieldValue>
        for (field of this.fieldsArray.filter(field => filter(field))) {
            let value = field.value as string | number | Date
            if (value instanceof Date) {
                let _value = moment.default(value)
                _value = _value
                    .utcOffset(this.layout.database.host.timezoneOffsetFunc(_value))

                switch (field.metadata.result) {
                    case 'time':
                        value = _value.format(this.layout.database.host.timeFormat)
                        break
                    case 'date':
                        value = _value.format(this.layout.database.host.dateFormat)
                        break
                    default:
                        value = _value.format(this.layout.database.host.timeStampFormat)
                }
            }
            fields_processed[field.id] = value
        }
        const obj = {
            recordId: this.recordId.toString(),
            modId: this.modId.toString(),
            fieldData: fields_processed
        }
        return obj
    }

    toObject (
        filter: (a: Field<FieldValue>) => any = (a) => a.edited,
        portalFilter: (a: Portal<any>) => any = (a) => a.records.find(record => record.edited),
        portalRowFilter: (a: PortalRecord<never>) => any = (a) => a.edited,
        portalFieldFilter: (a: Field<FieldValue>) => any = (a) => a.edited
    ) {
        const obj: ApiRowDataDef = {
            ...this.fieldsToObject(filter),
            portalData: {}
        }

        // Check if there's been any edited portal information
        const portals = this.portalsArray.filter(a => portalFilter(a))
        if (portals) {
            obj.portalData = {}
            for (const portal of portals) {
                // @ts-expect-error
                obj.portalData[portal.name] = portal.records.filter(a => portalRowFilter(a)).map(record => {
                    return record.toObject(portalFieldFilter)
                })
            }
        }

        return obj
    }
}
