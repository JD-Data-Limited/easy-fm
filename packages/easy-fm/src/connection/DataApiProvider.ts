import { FMError } from '../FMError.js';
import type {
    databaseOptionsWithExternalSources,
    loginOptionsClaris,
    loginOptionsFileMaker,
    loginOptionsOAuth,
    loginOptionsToken,
} from '../types.js';
import { FMHostMetadata } from '../types.js';
import { ApiResults } from '../models/apiResults.js';
import { CookieJar } from './CookieJar.js';
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
import { ProviderSessionExpiredError } from './databaseProvider.js';

type Credentials =
    loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken;
export interface DataApiProviderOptions extends databaseOptionsWithExternalSources<Credentials> {
    hostname: string;
    verify?: boolean;
}

export class DataApiProvider implements DatabaseProvider {
    readonly name: string;
    readonly formatting: DatabaseFormatting = {
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'HH:mm:ss',
        timeStampFormat: 'MM/DD/YYYY HH:mm:ss',
    };
    readonly #options: DataApiProviderOptions;
    readonly #origin: string;
    readonly #endpoint: string;

    constructor(options: DataApiProviderOptions) {
        const host = new URL(options.hostname);
        if (host.protocol !== 'http:' && host.protocol !== 'https:') {
            throw new Error('hostname MUST begin with either http:// or https://');
        }
        this.#options = options;
        this.name = options.database;
        this.#origin = host.origin;
        this.#endpoint = `${host.origin}/fmi/data/v2/databases/${encodeURIComponent(options.database)}`;
    }

    async connect(context: ProviderContext): Promise<ProviderConnection> {
        const response = await fetch(`${this.#origin}/fmi/data/v2/productInfo`, {
            signal: context.signal,
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
        const credentials = this.#options.credentials;
        const maxSessions =
            credentials.method === 'filemaker' ? (credentials.sessionPoolSize ?? 8) : 1;
        return {
            formatting: this.formatting,
            maxSessions,
            openSession: async (signal) =>
                await this.#openSession(
                    signal,
                    context.debug || this.#options.debug === true,
                ),
        };
    }

    async #openSession(signal: AbortSignal, debug: boolean): Promise<ProviderSession> {
        const credentials = this.#options.credentials;
        if (this.#options.externalSources.length && credentials.method !== 'filemaker') {
            throw new Error(
                "External sources are only supported with the 'filemaker' login method",
            );
        }
        if (credentials.method === 'token') {
            return new DataApiSession(
                this.#endpoint,
                credentials.token,
                new CookieJar(),
                signal,
                debug,
                false,
            );
        }

        const url = new URL(`${this.#endpoint}/sessions`);
        const jar = new CookieJar();
        const response = await fetch(url, {
            method: 'POST',
            headers: generateAuthorizationHeaders(credentials),
            body: JSON.stringify({
                fmDataSource: this.#options.externalSources.map((source) => ({
                    database: source.database,
                    username: source.credentials.username,
                    password: source.credentials.password,
                })),
            }),
            signal,
        });
        for (const cookie of response.headers.getSetCookie()) {
            jar.addCookie(url, cookie);
        }
        const raw = await response.json();
        const parsed = ApiResults.parse(raw);
        if (!response.ok || parsed.messages[0].code !== 0) {
            throw new FMError(parsed.messages[0].code, response.status, parsed);
        }
        return new DataApiSession(
            this.#endpoint,
            response.headers.get('x-fm-data-access-token') ?? '',
            jar,
            signal,
            debug,
            true,
        );
    }
}

class DataApiSession implements ProviderSession {
    #closed = false;
    constructor(
        private readonly endpoint: string,
        private readonly token: string,
        private readonly cookies: CookieJar,
        private readonly databaseSignal: AbortSignal,
        private readonly debug: boolean,
        private readonly ownsToken: boolean,
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
            case 'record.list': {
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
            case 'record.get':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}?${recordParams(operation.options)}`;
                break;
            case 'record.create':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records`;
                options = {
                    method: 'POST',
                    body: JSON.stringify(recordBody(operation.body, operation.options)),
                };
                break;
            case 'record.update':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}`;
                options = {
                    method: 'PATCH',
                    body: JSON.stringify(recordBody(operation.body, operation.options)),
                };
                break;
            case 'record.duplicate':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}?${recordParams(operation.options)}`;
                options = { method: 'POST' };
                break;
            case 'record.delete':
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}?${recordParams(operation.options)}`;
                options = { method: 'DELETE' };
                break;
            case 'container.upload': {
                path = `/layouts/${encodeURIComponent(operation.layout)}/records/${operation.recordId}/containers/${encodeURIComponent(operation.field)}/1`;
                const form = new FormData();
                form.append('upload', operation.file);
                options = { method: 'POST', body: form };
                break;
            }
        }
        if (operation.type !== 'container.upload') {
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
            const headers = new Headers(options.headers);
            headers.set('Authorization', `Bearer ${this.token}`);
            const cookie = this.cookies.getCookieHeader(url);
            if (cookie) {
                headers.set('Cookie', cookie);
            }
            const response = await fetch(url, {
                ...options,
                headers,
                redirect: 'manual',
            });
            for (const value of response.headers.getSetCookie()) {
                this.cookies.addCookie(url, value);
            }
            if (response.status === 401) {
                throw new ProviderSessionExpiredError();
            }
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
    async close() {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        if (!this.ownsToken) {
            return;
        }
        await fetch(`${this.endpoint}/sessions/${this.token}`, {
            method: 'DELETE',
        }).catch(() => {});
    }
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
        case 'record.list':
            return response?.data ?? [];
        case 'record.get':
            return response?.data?.[0];
        case 'record.create':
        case 'record.update':
        case 'record.duplicate':
        case 'record.delete':
            return {
                ...(response ?? {}),
                scriptError:
                    response?.scriptError === undefined
                        ? undefined
                        : Number(response.scriptError),
                status,
            };
        case 'container.upload':
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
