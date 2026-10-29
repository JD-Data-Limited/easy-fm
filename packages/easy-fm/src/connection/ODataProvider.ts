import { FMError } from '../FMError.js';
import type { databaseOptionsBase, loginOptionsFileMaker } from '../types.js';
import { FMHostMetadata } from '../types.js';
import { ApiResults } from '../models/apiResults.js';
import { generateAuthorizationHeaders } from './generateAuthorizationHeaders.js';
import { addHeaders } from '../utils/addHeaders.js';
import type {
    DatabaseFormatting,
    DatabaseOperation,
    DatabaseOperationResult,
    DatabaseOperationType,
    DatabaseProvider,
    ProviderConnection,
    ProviderContext,
    ProviderSession,
    RecordOperationOptions,
} from './databaseProvider.js';
import {z} from "zod";
import {FileMakerMetadataSchema} from "../models/odataResults.js";
type Credentials = loginOptionsFileMaker;
export interface ODataProviderOptions extends databaseOptionsBase<Credentials> {
    hostname: string;
    verify?: boolean;
}

export class ODataProvider implements DatabaseProvider<'table'> {
    static readonly databaseType = 'table';
    readonly databaseType = ODataProvider.databaseType;
    readonly name: string;
    readonly formatting: DatabaseFormatting = {
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'HH:mm:ss',
        timeStampFormat: 'MM/DD/YYYY HH:mm:ss',
    };
    readonly #options: ODataProviderOptions;
    readonly #origin: string;
    readonly #endpoint: string;

    #databaseMetadataPromise: Promise<z.infer<typeof FileMakerMetadataSchema>> | null = null

    constructor(options: ODataProviderOptions) {
        const host = new URL(options.hostname);
        if (host.protocol !== 'http:' && host.protocol !== 'https:') {
            throw new Error('hostname MUST begin with either http:// or https://');
        }
        this.#options = options;
        this.name = options.database;
        this.#origin = host.origin;
        this.#endpoint = `${host.origin}/fmi/odata/v4/${encodeURIComponent(options.database)}`;
    }

    /**
     * Fetches database metadata using the OData protocol
     */
    async getDatabaseMetadata() {
        if (this.#databaseMetadataPromise) {return this.#databaseMetadataPromise;}
        this.#databaseMetadataPromise = (async () => {
            const response = await fetch(`${this.#origin}/fmi/odata/v4/${this.name}/$metadata`)
            if (!response.ok) {
                throw new Error(`Failed to get Database Meta; ${response.status} ${response.statusText}`)
                throw error
            }

            return FileMakerMetadataSchema.parse(response.body);
        })()
        return this.#databaseMetadataPromise;
    }

    async connect(context: ProviderContext): Promise<ProviderConnection> {
        const credentials = this.#options.credentials;
        const response = await fetch(`${this.#origin}/fmi/data/v2/productInfo`, {
            signal: context.signal,
            headers: generateAuthorizationHeaders(credentials),
        });
        const raw = await response.json();
        const parsed = ApiResults.extend({ response: FMHostMetadata.optional() }).parse(
            raw,
        );
        if (parsed.messages[0].code !== 0 || !parsed.response) {
            throw new FMError(parsed.messages[0].code, response.status, parsed);
        }
        const info = parsed.response.productInfo;
        Object.assign(this.formatting, {
            dateFormat: info.dateFormat.replace('dd', 'DD').replace('yyyy', 'YYYY'),
            timeFormat: info.timeFormat,
            timeStampFormat: info.timeStampFormat
                .replace('dd', 'DD')
                .replace('yyyy', 'YYYY'),
        });
        return {
            formatting: this.formatting,
            maxSessions: credentials.sessionPoolSize ?? 8,
            openSession: async (signal) =>
                new ODataRequestExecutor(
                    this.#endpoint,
                    credentials,
                    signal,
                    context.debug || this.#options.debug === true,
                ),
        };
    }
}

class ODataRequestExecutor implements ProviderSession {
    constructor(
        private readonly endpoint: string,
        private readonly credentials: loginOptionsFileMaker,
        private readonly databaseSignal: AbortSignal,
        private readonly debug: boolean,
    ) {}

    async execute<K extends DatabaseOperationType>(
        operation: DatabaseOperation<K>,
    ): Promise<DatabaseOperationResult<K>> {
        let path: string;
        let options: RequestInit = {};
        switch (operation.type) {
            case 'layout.list':
                path = `/layouts?page=${encodeURIComponent(operation.page)}`;
                break;
            case 'layout.metadata':
                path = `/layouts/${encodeURIComponent(operation.layout)}`;
                break;
            case 'script.run':
                path = `/layouts/${encodeURIComponent(operation.layout)}/script/${encodeURIComponent(operation.script)}`;
                if (operation.parameter) {
                    path += `?script.param=${encodeURIComponent(operation.parameter)}`;
                }
                break;
            case 'layout.record.list': {
                const request = operation.options;
                if (!operation.query.length) {
                    const params = new URLSearchParams({
                        _limit: String(request.limit),
                        _offset: String(request.offset),
                        dateformats: '2',
                        portal: JSON.stringify(Object.keys(request.portals)),
                    });
                    if (request.sort.length) {
                        params.set('_sort', JSON.stringify(request.sort));
                    }
                    addScriptParams(params, request.scripts);
                    addPortalParams(params, request.portals);
                    path = `/layouts/${encodeURIComponent(operation.layout)}/records?${params}`;
                } else {
                    const body: Record<string, unknown> = {
                        limit: String(request.limit),
                        offset: String(request.offset),
                        dateformats: 2,
                        query: operation.query.map((clause) => ({
                            ...clause.fields,
                            ...(clause.omit ? { omit: 'true' } : {}),
                        })),
                        portal: Object.keys(request.portals),
                    };
                    if (request.sort.length) {
                        body.sort = request.sort;
                    }
                    addScriptBody(body, request.scripts);
                    addPortalBody(body, request.portals);
                    path = `/layouts/${encodeURIComponent(operation.layout)}/_find`;
                    options = { method: 'POST', body: JSON.stringify(body) };
                }
                break;
            }
            case 'layout.record.get':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}?${recordParams(operation.options)}`;
                break;
            case 'layout.record.create':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records`;
                options = {
                    method: 'POST',
                    body: JSON.stringify(recordBody(operation.body, operation.options)),
                };
                break;
            case 'layout.record.update':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}`;
                options = {
                    method: 'PATCH',
                    body: JSON.stringify(recordBody(operation.body, operation.options)),
                };
                break;
            case 'layout.record.duplicate':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}?${recordParams(operation.options)}`;
                options = { method: 'POST' };
                break;
            case 'layout.record.delete':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}?${recordParams(operation.options)}`;
                options = { method: 'DELETE' };
                break;
            case 'layout.container.upload': {
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}/containers/${encodeURIComponent(operation.field)}/1`;
                const form = new FormData();
                form.append('upload', operation.file);
                options = { method: 'POST', body: form };
                break;
            }
        }
        if (operation.type !== 'layout.container.upload') {
            addHeaders(options, { 'Content-Type': 'application/json' });
        }
        const { response, body } = await this.#requestJSON(
            `${this.endpoint}${path}`,
            options,
        );
        const value = normalize(operation, body.response, response.status);
        return value as DatabaseOperationResult<K>;
    }

    async #requestJSON(url: string, options: RequestInit) {
        const response = await this.#request(url, options);
        const body = await response.json();
        if (this.debug) {
            console.log(body.response);
        }
        const parsed = ApiResults.passthrough().parse(body);
        if (parsed.messages[0].code !== 0) {
            throw new FMError(parsed.messages[0].code, response.status, parsed);
        }
        return { response, body: parsed as typeof parsed & { response?: any } };
    }

    async #request(input: string, init: RequestInit = {}) {
        let url = new URL(input);
        let options = { ...init };
        options.signal = options.signal
            ? AbortSignal.any([options.signal, this.databaseSignal])
            : this.databaseSignal;
        for (let count = 0; count < 10; count++) {
            const headers = new Headers(generateAuthorizationHeaders(this.credentials));
            new Headers(options.headers).forEach((value, name) =>
                headers.set(name, value),
            );
            const response = await fetch(url, {
                ...options,
                headers,
                redirect: 'manual',
            });
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (!location) {
                    throw new Error(
                        `Redirect response missing Location header for ${url}`,
                    );
                }
                url = new URL(location, url);
                const method = (options.method ?? 'GET').toUpperCase();
                if (
                    response.status === 303 ||
                    ((response.status === 301 || response.status === 302) &&
                        method === 'POST')
                ) {
                    options = { ...options, method: 'GET', body: undefined };
                }
                continue;
            }
            return response;
        }
        throw new Error(`Too many redirects while fetching ${url}`);
    }

    async fetchContainer(reference: string, signal?: AbortSignal): Promise<Response> {
        return await this.#request(reference, { signal });
    }
    async close() {}
}

function normalize(operation: DatabaseOperation, response: any, status: number): unknown {
    switch (operation.type) {
        case 'layout.list':
            return flattenLayouts(response?.layouts ?? []);
        case 'layout.metadata':
            return response;
        case 'script.run':
            return {
                scriptError: Number(response?.scriptError ?? 0),
                scriptResult: response?.scriptResult,
                status,
            };
        case 'layout.record.list':
            return response?.data ?? [];
        case 'layout.record.get':
            return response?.data?.[0];
        case 'layout.record.create':
        case 'layout.record.update':
        case 'layout.record.duplicate':
        case 'layout.record.delete':
            return {
                ...(response ?? {}),
                scriptError:
                    response?.scriptError === undefined
                        ? undefined
                        : Number(response.scriptError),
                status,
            };
        case 'layout.container.upload':
            return undefined;
    }
}
function flattenLayouts(layouts: any[]): string[] {
    return layouts.flatMap((item) =>
        item.folderLayoutNames ? flattenLayouts(item.folderLayoutNames) : [item.name],
    );
}
function recordParams(options: RecordOperationOptions) {
    const params = new URLSearchParams();
    addScriptParams(params, options.scripts);
    addPortalParams(params, options.portals);
    return params;
}
function recordBody(body: object, options: RecordOperationOptions) {
    const result: Record<string, any> = { ...body };
    if (Array.isArray(result.deleteRelatedRecords)) {
        result.fieldData = {
            ...(result.fieldData ?? {}),
            deleteRelated: result.deleteRelatedRecords.map(
                (item: { table: string; recordId: number }) =>
                    `${item.table}.${item.recordId}`,
            ),
        };
        delete result.deleteRelatedRecords;
    }
    addScriptBody(result, options.scripts);
    return result;
}
function addScriptParams(
    params: URLSearchParams,
    scripts: RecordOperationOptions['scripts'],
) {
    for (const [key, script] of Object.entries(scripts)) {
        const name = key === 'after' ? 'script' : `script.${key}`;
        params.set(name, script.name);
        if (script.parameter) {
            params.set(`${name}.param`, script.parameter);
        }
    }
}
function addScriptBody(
    body: Record<string, unknown>,
    scripts: RecordOperationOptions['scripts'],
) {
    for (const [key, script] of Object.entries(scripts)) {
        const name = key === 'after' ? 'script' : `script.${key}`;
        body[name] = script.name;
        if (script.parameter) {
            body[`${name}.param`] = script.parameter;
        }
    }
}
function addPortalParams(
    params: URLSearchParams,
    portals: RecordOperationOptions['portals'],
) {
    const names = Object.keys(portals);
    if (names.length) {
        params.set('portal', JSON.stringify(names));
    }
    for (const [name, page] of Object.entries(portals)) {
        params.set(`_offset.${name}`, String(page.offset));
        params.set(`_limit.${name}`, String(page.limit));
    }
}
function addPortalBody(
    body: Record<string, unknown>,
    portals: RecordOperationOptions['portals'],
) {
    for (const [name, page] of Object.entries(portals)) {
        body[`offset.${name}`] = page.offset;
        body[`limit.${name}`] = page.limit;
    }
}
