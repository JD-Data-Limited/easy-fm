/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import type * as http from 'http'
import {type ContainerBufferResult, DownloadModes, RecordTypes} from '../types.js'
import {ApiFieldDisplayTypes, type ApiFieldMetadata, ApiFieldResultTypes, ApiFieldTypes} from '../models/apiResults.js'
import {type LayoutBase} from '../layouts/layoutBase.js'
import {type Moment} from 'moment'

export type FieldValue = string | number | Moment | Container
export type Container = null

export interface Parentable {
    layout: LayoutBase
    type: RecordTypes
    endpoint: string
    portal?: { name: string }
}

/**
 * A class representing a field in a record.
 *
 * @template T - The type of the field value.
 */
export class Field<T extends FieldValue> {
    parent: Parentable
    id: string
    protected _value: T | null
    edited: boolean

    constructor (record: Parentable, id: string, contents: T) {
        this.parent = record
        this.id = id
        this._value = contents
        this.edited = false
    }

    /**
     * Sets the value of the field.
     *
     * @param {T | null} content - The new content value to be set. Can be either the type T or null.
     * @throws {Error} Cannot set container value using set(). Use upload() instead, if the result is a 'container'.
     */
    set (content: T | null) {
        if (this.metadata.result === 'container') throw new Error('Cannot set container value using set(). Use upload() instead.')
        else this._value = content
        this.edited = true
    }

    get metadata (): ApiFieldMetadata {
        if (!this.parent.layout.metadata) {
            // Default to a regular text field
            return {
                name: this.id.toString(),
                type: ApiFieldTypes.NORMAL,
                displayType: ApiFieldDisplayTypes.EDIT_TEXT,
                result: ApiFieldResultTypes.TEXT,
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitions: 1,
                valueList: ''
            }
        }
        if (this.parent.type === RecordTypes.PORTAL && this.parent.portal) {
            return this.parent.layout.metadata.portalMetaData[this.parent.portal.name || 'portal not attached'].find(i => i.name === this.id) ??
                {
                    name: this.id.toString(),
                    type: ApiFieldTypes.NORMAL,
                    displayType: ApiFieldDisplayTypes.EDIT_TEXT,
                    result: ApiFieldResultTypes.TEXT,
                    global: false,
                    autoEnter: true,
                    fourDigitYear: false,
                    maxRepeat: 1,
                    maxCharacters: 0,
                    notEmpty: false,
                    numeric: false,
                    timeOfDay: false,
                    repetitions: 1,
                    valueList: ''
                }
        } else {
            return this.parent.layout.metadata.fieldMetaData.find(i => i.name === this.id) ?? {
                name: this.id.toString(),
                type: ApiFieldTypes.NORMAL,
                displayType: ApiFieldDisplayTypes.EDIT_TEXT,
                result: ApiFieldResultTypes.TEXT,
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitions: 1,
                valueList: ''
            }
        }
    }

    get value (): T | null {
        // if (this.metadata.result === "container") throw "Use await field.stream() to get the contents of a container field, instead of field.value"
        return this._value
    }

    set value (value: T) {
        this._value = value
    }

    get string (): string {
        if (typeof this._value === 'string') {
            return this._value
        }
        throw new Error('Field value is not a string')
    }

    /**
     * Uploads a file to the container field.
     *
     * @param {Buffer} buffer - The file content as a buffer.
     * @param {string} filename - The filename of the file.
     * @param {string} mime - The MIME type of the file.
     *
     * @throws {Error} - Cannot upload a file to the field if it's not a container field.
     * @throws {Error} - Upload failed with HTTP error.
     *
     * @returns {Promise<void>} - A promise that resolves when the file is successfully uploaded.
     */
    async upload (buffer: Buffer, filename: string, mime: string): Promise<void> {
        if (this.metadata.result !== 'container') {
            throw new Error('Cannot upload a file to the field; ' + this.id + ' (not a container field)')
        }
        const form = new FormData()
        form.append('upload', new File([buffer], filename, {type: mime}))

        const res = await this.parent.layout.database._apiRequestRaw(`${this.parent.endpoint}/containers/${this.id}/1`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + this.parent.layout.database.token,
                'Content-Type': 'multipart/form-data'
            },
            body: form
        })
        if (!res.ok) throw new Error(`Upload failed with HTTP error: ${res.status} (${res.statusText})`)
    }

    /**
     * Downloads a resource from the server using the specified download mode.
     *
     * @param {DownloadModes} mode - The mode to use for downloading the resource.
     * @return {Promise<http.IncomingMessage>} - A promise that resolves with the incoming message representing the downloaded resource.
     */
    download (mode: DownloadModes.Stream): Promise<http.IncomingMessage>
    download (mode: DownloadModes.Buffer): Promise<ContainerBufferResult>
    async download (mode: DownloadModes = DownloadModes.Stream): Promise<http.IncomingMessage | ContainerBufferResult> {
        if (this.metadata.result !== ApiFieldResultTypes.CONTAINER) throw new Error('Cannot perform download() on a non-container field')

        const stream = await this.parent.layout.database.streamURL(this.string)
        if (mode === DownloadModes.Stream) {
            return stream
        }

        const body: Uint8Array[] = []
        return await new Promise((resolve, reject) => {
            stream.on('data', (chunk: Uint8Array) => {
                body.push(chunk)
            })
            stream.on('error', (e) => {
                reject(e)
            })
            stream.on('end', () => {
                resolve({
                    buffer: Buffer.concat(body),
                    mime: stream.headers['content-type'],
                    request: stream
                } satisfies ContainerBufferResult)
            })
        })
    }
}
