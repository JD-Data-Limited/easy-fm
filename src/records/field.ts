/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import {RecordTypes} from '../types.js'
import {ApiFieldDisplayTypes, type ApiFieldMetadata, ApiFieldResultTypes, ApiFieldTypes} from '../models/apiResults.js'
import {type LayoutBase} from '../layouts/layoutBase.js'
import {type Moment} from 'moment'
import {FMError} from "../FMError.js";
import {PassThrough, Readable} from "node:stream"
import {EventEmitter} from "events";

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

    static firstContainerDownload: Promise<any> | null = null

    constructor(record: Parentable, id: string, contents: T) {
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
    set(content: T | null) {
        if (this.metadata.result === 'container') throw new Error('Cannot set container value using set(). Use upload() instead.')
        else this._value = content
        this.edited = true
    }

    get metadata(): ApiFieldMetadata {
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
        }
        else {
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

    get value(): T | null {
        // if (this.metadata.result === "container") throw "Use await field.stream() to get the contents of a container field, instead of field.value"
        return this._value
    }

    set value(value: T) {
        this._value = value
    }

    get string(): string {
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
    async upload(file: File): Promise<void> {
        if (this.metadata.result !== 'container') {
            throw new Error('Cannot upload a file to the field; ' + this.id + ' (not a container field)')
        }
        const form = new FormData()
        form.append('upload', file)

        console.log(`ENDPOINT: ${this.parent.endpoint}/containers/${this.id}/1`)
        const res = await this.parent.layout.database._apiRequestRaw(`${this.parent.endpoint}/containers/${this.id}/1`, {
            method: 'POST',
            headers: {
                // Authorization: 'Bearer ' + this.parent.layout.database.token,
                // 'Content-Type': 'multipart/form-data'
            },
            body: form
        })
        if (!res.ok) {
            console.log("RESULT:", await res.text())
            throw new Error(`Upload failed with HTTP error: ${res.status} (${res.statusText})`)
        }
        const data: { messages: Array<{ code: string }> } = await res.json() as any
        if (data.messages[0].code === "0") return
        else {
            console.log(data)
            throw new FMError(data.messages[0].code, res.status, res)
        }
    }

    @containerDownloadFunction
    async #streamAsync(stream: PassThrough) {
        let req = await this.parent.layout.database._apiRequestRaw(this.string, {useCookieJar: true})
        if (!req.ok || !req.body) {
            stream.destroy(new Error(`HTTP Error: ${req.status} (${req.statusText})`))
            return
        }
        req.body.pipe(stream)
    }

    stream(): Readable {
        const stream = new PassThrough()
        console.log(this.string)
        this.#streamAsync(stream)

        return stream
    }

    @containerDownloadFunction
    async arrayBuffer() {
        const req = await this.parent.layout.database._apiRequestRaw(this.string, {useCookieJar: true})
        if (!req.ok) throw new Error(`HTTP Error: ${req.status} (${req.statusText})`)
        console.log(req)
        return await req.arrayBuffer()
    }
}

function containerDownloadFunction<T extends FieldValue, R = unknown>(originalMethod: (...p: any[]) => Promise<R>, context: ClassMethodDecoratorContext<Field<T>>) {
    async function replacementMethod(this: Field<T>, ...args: any[]) {
        return ContainerDownloadExecutor.enqueue(() => originalMethod.call(this, ...args))
    }

    return replacementMethod
}

class ContainerDownloadExecutorClass extends EventEmitter {
    hasDownloadedFirstContainer: 0 | 1 | 2 = 0

    constructor() {
        super()
    }

    async enqueue<T extends () => Promise<any>>(task: T) {
        let isFirstTask = this.hasDownloadedFirstContainer === 0
        if (isFirstTask) {
            this.hasDownloadedFirstContainer = 1
            let res = await task()
            this.hasDownloadedFirstContainer = 2
            console.log("EMITTED!")
            this.emit("firstTaskDone")
            return res
        }
        else if (this.hasDownloadedFirstContainer === 1) {
            return new Promise((resolve, reject) => {
                this.once("firstTaskDone", async () => {
                    resolve(await task())
                })
            })
        }
        else return await task()
    }
}

const ContainerDownloadExecutor = new ContainerDownloadExecutorClass()