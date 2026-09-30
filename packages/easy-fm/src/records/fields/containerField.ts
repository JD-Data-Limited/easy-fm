import { Readable } from 'node:stream';
import { BaseField, type Parentable, type RawValueData } from './baseField.js';
import {
    type ContainerDownloadOptions,
    ContainerSessionAffinityError,
} from '../../connection/databaseProvider.js';

export class ContainerField extends BaseField<string, 'container'> {
    constructor(record: Parentable, id: string, value: RawValueData) {
        super(record, id, value);
    }

    async upload(file: File): Promise<void> {
        if (this.metadata.result !== 'container') {
            throw new Error(
                `Cannot upload a file to the field; ${this.id} (not a container field)`,
            );
        }
        if (this.parent.recordId === -1) {
            throw new Error('Cannot upload to an unsaved record');
        }
        await this.parent.layout.database.execute({
            type: 'container.upload',
            layout: this.parent.layout.name,
            recordId: this.parent.recordId,
            field: this.id,
            file,
        });
    }

    async #response(options: ContainerDownloadOptions = {}): Promise<Response> {
        if (!this.value) {
            throw new Error(`Container field ${this.id} is empty`);
        }
        const binding = this.parent.sessionBinding;
        if (!binding) {
            throw new ContainerSessionAffinityError(
                'Container has no originating provider session',
            );
        }
        try {
            const response = await this.parent.layout.database.fetchContainer(
                this.value,
                binding,
                options.signal,
            );
            if (!response.ok || !response.body) {
                throw new Error(
                    `Container response failed: ${response.status} (${response.statusText})`,
                );
            }
            return response;
        } catch (error) {
            if (
                !(error instanceof ContainerSessionAffinityError) ||
                !options.refreshOnSessionLoss
            ) {
                throw error;
            }
            const refreshed = await this.parent.refreshContainer(this.id);
            this.updateFromRawValue(refreshed.value);
            this.parent.sessionBinding = refreshed.parent.sessionBinding;
            return await this.#response({ ...options, refreshOnSessionLoss: false });
        }
    }

    /** @deprecated Use webStream instead. */
    async stream(
        options: ContainerDownloadOptions = {},
    ): Promise<{ data: Readable; mime: string }> {
        const response = await this.#response(options);
        return {
            data: Readable.fromWeb(response.body! as any),
            mime: response.headers.get('Content-Type') ?? '',
        };
    }

    async webStream(options: ContainerDownloadOptions = {}) {
        return await this.#response(options);
    }

    async arrayBuffer(
        options: ContainerDownloadOptions = {},
    ): Promise<{ data: ArrayBuffer; mime: string }> {
        const response = await this.#response(options);
        return {
            data: await response.arrayBuffer(),
            mime: response.headers.get('Content-Type') ?? '',
        };
    }
}
