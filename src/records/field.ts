/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordTypes} from '../types.js'
import {
    ApiFieldDisplayTypes,
    type ApiFieldMetadata,
    ApiFieldResultTypes,
    ApiFieldTypes,
    ApiResults
} from '../models/apiResults.js'
import {type LayoutBase} from '../layouts/layoutBase.js'
import {type Moment} from 'moment'
import {FMError} from '../FMError.js'
import {Readable} from 'node:stream'
import {HttpError} from '../connection/Session.js'
import {type z} from 'zod'

export type FieldValue = string | number | Moment | Container
export type Container = null

export interface Parentable {
    layout: LayoutBase
    type: RecordTypes
    endpoint: string
    portal?: { name: string }
}

interface StreamOptions {
    abortSignal?: AbortSignal
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
    #originalContents: T | null

    static firstContainerDownload: Promise<any> | null = null

    constructor (record: Parentable, id: string, originalContents: T) {
        this.parent = record
        this.id = id
        this._value = originalContents
        this.#originalContents = originalContents
    }

    get edited () {
        return this.#originalContents !== this._value
    }

    /**
     * Resets the 'edited' state of this field, without changing its value
     */
    updateOriginalContents () {
        this.#originalContents = this._value
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
    }

    get metadata (): z.infer<typeof ApiFieldMetadata> {
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
                repetitionStart: 1,
                repetitionEnd: 1,
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
                    repetitionStart: 1,
                    repetitionEnd: 1,
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
                repetitionStart: 1,
                repetitionEnd: 1,
                valueList: ''
            }
        }
    }

    get value (): T | null {
        // if (this.metadata.result === "container") throw "Use await field.stream() to get the contents of a container field, instead of field.value"
        return this._value
    }

    set value (value: T) {
        this.set(value)
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
     * @param {Buffer} file - The file content as a buffer.
     *
     * @throws {Error} - Cannot upload a file to the field if it's not a container field.
     * @throws {Error} - Upload failed with HTTP error.
     *
     * @returns {Promise<void>} - A promise that resolves when the file is successfully uploaded.
     */
    async upload (file: File): Promise<void> {
        if (this.metadata.result !== 'container') {
            throw new Error('Cannot upload a file to the field; ' + this.id + ' (not a container field)')
        }
        const form = new FormData()
        form.append('upload', file)

        const res = await this.parent.layout.database.fetch(`${this.parent.endpoint}/containers/${this.id}/1`, {
            method: 'POST',
            body: form
        })

        if (!res.ok) {
            throw await HttpError.new(res)
        }
        const data = ApiResults.parse(await res.json())
        if (data.messages[0].code === 0) return
        else {
            throw new FMError(data.messages[0].code, res.status, res)
        }
    }

    async #streamAsync (options: StreamOptions = {}): Promise<Response> {
        const req = await this.parent.layout.database.fetch(this.string, {
            signal: options.abortSignal ?? null,
        })
        // const req = await this.parent.layout.database._apiRequestRaw(this.string, {useCookieJar: true})
        if (!req.ok || !req.body) {
            throw new Error(`HTTP Error: ${req.status} (${req.statusText})`)
        }
        return req
    }

    async stream (): Promise<{
        data: Readable
        mime: string
    }>
    /**
     * @deprecated use webStream instead.
     * @param webApi
     */
    async stream () {
        const stream = await this.#streamAsync()
        if (!stream.body) {
            throw await HttpError.new(stream)
        }
        return {
            // @ts-expect-error stream types are correct
            data: Readable.fromWeb(stream.body),
            mime: stream.headers.get('Content-Type') ?? ''
        }
    }

    /**
     * Returns a readable stream. Use Readable.fromWeb(stream.body) to convert it to a Node.js Readable stream.
     */
    async webStream (options: StreamOptions) {
        return await this.#streamAsync(options)
    }

    async arrayBuffer (): Promise<{ data: ArrayBuffer, mime: string }> {
        const stream = await this.#streamAsync()
        if (!stream.ok) throw await HttpError.new(stream)
        return {data: await stream.arrayBuffer(), mime: stream.headers.get('Content-Type') ?? ''}
    }
}
