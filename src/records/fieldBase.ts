/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

import * as http from "http";
import {ContainerBufferResult, DOWNLOAD_MODES, FieldMetaData, RecordTypes} from "../types.js";
import {ApiFieldDisplayTypes, ApiFieldMetadata, ApiFieldResultTypes, ApiFieldTypes} from "../models/apiResults.js";
import {LayoutBase} from "../layouts/layoutBase.js";

export type FieldValue = string | number | Date | Container
export type Container = null

export type Parentable = {layout: LayoutBase, type: RecordTypes, endpoint: string}
export class FieldBase<T extends FieldValue> {
    parent: Parentable;
    id: string;
    protected _value: T;
    edited: boolean;

    constructor(record: Parentable, id: string, contents: T) {
        this.parent = record
        this.id = id
        this._value = contents
        this.edited = false
    }

    set(content: string | number | Date | undefined | null) {
        if (this.metadata.result === "container") throw "Cannot set container value using set(). Use upload() instead."
        if (
            (this.metadata.result === "timeStamp" ||
                this.metadata.result === "date" ||
                this.metadata.result === "time")
            && !(content instanceof Date) && !!content
        ) {
            throw "Value was not an instance of Date: " + content
        }
        // @ts-ignore
        if (!content) this._value = ""
        // @ts-ignore
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
                valueList: ""
            }
        }
        if (this.parent.type === RecordTypes.PORTAL) {
            // @ts-ignore
            return this.parent.layout.metadata.portalMetaData[this.parent.portal.name || "portal not attached"].find(i => i.name === this.id) as FieldMetaData || {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            } as FieldMetaData
        }
        else {
            return this.parent.layout.metadata.fieldMetaData.find(i => i.name === this.id) || {
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
                valueList: ""
            }
        }
    }

    get value(): T {
        // if (this.metadata.result === "container") throw "Use await field.stream() to get the contents of a container field, instead of field.value"
        return this._value
    }

    set value(value: T) {
        this._value = value
    }

    get string(): string {
        if (typeof this._value === "string") {
            return this._value
        }
        throw "Field value is not a string"
    }

    get date(): Date {
        if (this._value instanceof Date) {
            return this._value
        }
        throw "Field value is not a date"
    }

    get number(): number {
        if (typeof this._value === "number") {
            return this._value
        }
        throw "Field value is not a number"
    }

    async upload(buffer: Buffer, filename: string, mime: string): Promise<void> {
        let trace = new Error()
        if (this.metadata.result !== "container") throw "Cannot upload a file to the field; " + this.id + " (not a container field)"
        let form = new FormData()
        form.append("upload", new File([buffer], filename, {type: mime}))

        let res = await this.parent.layout.database.apiRequestRaw(`${this.parent.endpoint}/containers/${this.id}/1`, {
            method: "POST",
            // @ts-ignore
            body: form
        })
        if (!res.ok) throw new Error(`Upload failed with HTTP error: ${res.status} (${res.statusText})`)
    }

    download(mode: DOWNLOAD_MODES.Stream): Promise<http.IncomingMessage>
    download(mode: DOWNLOAD_MODES.Buffer): Promise<ContainerBufferResult>
    async download(mode: DOWNLOAD_MODES = DOWNLOAD_MODES.Stream): Promise<http.IncomingMessage | ContainerBufferResult> {
        if (this.metadata.result !== ApiFieldResultTypes.CONTAINER) throw new Error("Cannot perform download() on a non-container field")

        let stream = await this.parent.layout.database.streamURL(this.string)
        if (mode === DOWNLOAD_MODES.Stream) {
            return stream
        }

        let body: Uint8Array[] = []
        return new Promise((resolve, reject) => {
            stream.on("data", chunk => {
                body.push(chunk)
            })
            stream.on("error", (e) => {
                reject(e)
            })
            stream.on("end", () => {
                resolve({
                    buffer: Buffer.concat(body),
                    mime: stream.headers["content-type"],
                    request: stream
                } as ContainerBufferResult)
            })
        })
    }
}