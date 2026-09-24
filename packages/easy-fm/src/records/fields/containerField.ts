import {BaseField, Parentable, RawValueData} from "./baseField.js";
import {FMError} from '../../FMError.js'
import {Readable} from 'node:stream'
import {HttpError} from '../../connection/Session.js'
import {ApiResults} from "../../models/apiResults.js";

interface StreamOptions {
    abortSignal?: AbortSignal
}

export class ContainerField extends BaseField<string, 'container'> {
    static firstContainerDownload: Promise<any> | null = null

    constructor(record: Parentable, id: string, value: RawValueData) {
        super(record, id, value);
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

    async #streamAsync(options: StreamOptions = {}): Promise<Response> {


        const req = await this.parent.layout.database.fetch(this.value, {
            signal: options.abortSignal ?? null
        })
        // const req = await this.parent.layout.database._apiRequestRaw(this.string, {useCookieJar: true})
        if (!req.ok || !req.body) {
            throw new Error(`HTTP Error: ${req.status} (${req.statusText})`)
        }
        return req
    }

    async stream(): Promise<{
        data: Readable
        mime: string
    }>
    /**
     * @deprecated use webStream instead.
     */
    async stream() {
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
     * Returns the container download as a Web `Response`.
     */
    async webStream(options: StreamOptions) {
        return await this.#streamAsync(options)
    }

    /** Downloads the full container contents into memory. */
    async arrayBuffer(): Promise<{ data: ArrayBuffer, mime: string }> {
        const stream = await this.#streamAsync()
        if (!stream.ok) throw await HttpError.new(stream)
        return {data: await stream.arrayBuffer(), mime: stream.headers.get('Content-Type') ?? ''}
    }
}