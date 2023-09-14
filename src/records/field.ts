/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {RecordBase, RecordTypes} from "./recordBase.js";
import fetch, {File, FormData} from "node-fetch";
import * as http from "http";
import {ContainerBufferResult, DOWNLOAD_MODES, FieldMetaData} from "../types.js";
import {FMError} from "../FMError.js";

export type FieldValue = string | number | Date | Container
export type Container = null

export class Field<T extends FieldValue> {
    record: RecordBase<any>;
    id: string;
    protected _value: T;
    edited: boolean;

    constructor(record, id, contents) {
        this.record = record
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

    get metadata(): FieldMetaData {
        if (!this.record.layout.metadata) {
            // Default to a regular text field
            return {
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
        if (this.record.type === RecordTypes.PORTAL) {
            // @ts-ignore
            return this.record.layout.metadata.portalMetaData[this.record.portal.name || "portal not attached"].find(i => i.name === this.id) as FieldMetaData || {
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
            return this.record.layout.metadata.fieldMetaData.find(i => i.name === this.id) as FieldMetaData || {
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

    upload(buffer: Buffer, filename: string, mime: string): Promise<void> {
        let trace = new Error()
        if (this.metadata.result !== "container") throw "Cannot upload a file to the field; " + this.id + " (not a container field)"
        return new Promise(async (resolve, reject) => {
            let form = new FormData()
            form.append("upload", new File([buffer], filename, {type: mime}))

            let _fetch = await fetch(`${this.record.endpoint}/containers/${this.id}/1`, {
                method: "POST",
                // @ts-ignore
                headers: {"Authorization": "Bearer " + this.record.layout.database.token},
                body: form
            }).then(res => res.json())
                .then(data => {
                    let _res = data as any
                    if (_res.messages[0].code === "0") {
                        resolve()
                    }
                    else {
                        reject(new FMError(_res.messages[0].code, _res.status, data, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    download(mode: DOWNLOAD_MODES.Stream): Promise<http.IncomingMessage>
    download(mode: DOWNLOAD_MODES.Buffer): Promise<ContainerBufferResult>
    download(mode: DOWNLOAD_MODES = DOWNLOAD_MODES.Stream): Promise<http.IncomingMessage | ContainerBufferResult> {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            this.record.layout.database.streamContainer(this, this._value)
                .then(stream => {
                    if (mode === DOWNLOAD_MODES.Stream) {
                        resolve(stream)
                        return
                    }

                    let body = []
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
                .catch(e => {
                    reject(e)
                })
        })
    }
}