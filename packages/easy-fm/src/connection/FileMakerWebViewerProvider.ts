import type {
    DatabaseFormatting,
    DatabaseOperation,
    DatabaseOperationResult,
    DatabaseOperationType,
    DatabaseProvider,
    ProviderConnection,
    ProviderContext,
    ProviderSession,
} from './databaseProvider.js';
import { FMError } from '../FMError.js';
import { ApiResults } from '../models/apiResults.js';

export type FileMakerScriptOption = '0' | '1' | '2' | '3' | '4' | '5';
export const FILEMAKER_WEBVIEWER_PROTOCOL = 'easy-fm.webviewer/v1' as const;
export const FILEMAKER_WEBVIEWER_SCRIPT = '__EasyFM_WebViewerCallback' as const;
export const FILEMAKER_WEBVIEWER_BOOTSTRAP_PARAM = '__easyFMWebViewerBootstrap' as const;
export type JsonValue =
    null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface FileMakerAPI {
    PerformScript(scriptName: string, parameter?: string): void;
    PerformScriptWithOption(
        scriptName: string,
        parameter: string,
        option: FileMakerScriptOption,
    ): void;
}
export interface FileMakerWebViewerBootstrapConfig {
    recordNumber: string;
    token: string;
    webViewerName: string;
    window: string;
}
export type FileMakerWebViewerBootstrapRequest = FileMakerWebViewerBootstrapConfig & {
    protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
    id: string;
    action: 'connect';
    callbackName: string;
};
export type FileMakerWebViewerDisconnectRequest = FileMakerWebViewerBootstrapConfig & {
    protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
    id: string;
    action: 'disconnect';
    callbackName: string;
};
export type FileMakerWebViewerBootstrapResponse =
    | {
          protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
          id: string;
          ok: true;
          result: JsonValue;
      }
    | {
          protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
          id: string;
          ok: false;
          error: FileMakerWebViewerError;
      };

export interface FileMakerWebViewerProviderOptions {
    /** FileMaker script receiving data operations. Defaults to __EasyFM_WebViewerCallback. */
    scriptName?: string;
    scriptOption?: FileMakerScriptOption;
    timeout?: number;
    formatting?: Partial<DatabaseFormatting>;
    fileMaker?: FileMakerAPI;
    /** Defaults to globalThis.location.href. Useful for non-window hosts and tests. */
    bootstrapUrl?: string | URL;
    /** Defaults to the browser global event target. */
    lifecycleTarget?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
}

interface RequestBase extends FileMakerWebViewerBootstrapConfig {
    protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
    id: string;
}
export interface FileMakerWebViewerDataApiRequest extends RequestBase {
    type: 'dataApi';
    request: JsonValue;
    scripts?: JsonValue;
}
export interface FileMakerWebViewerScriptRequest extends RequestBase {
    type: 'script';
    layout: string;
    script: string;
    parameter?: string;
}
export interface FileMakerWebViewerUploadRequest extends RequestBase {
    type: 'container.upload';
    layout: string;
    recordId: number;
    field: string;
    file: { name: string; type: string; lastModified: number; data: string };
}
export interface FileMakerWebViewerContainerRequest extends RequestBase {
    type: 'container.fetch';
    reference: string;
}
export type FileMakerWebViewerRequest =
    | FileMakerWebViewerDataApiRequest
    | FileMakerWebViewerScriptRequest
    | FileMakerWebViewerUploadRequest
    | FileMakerWebViewerContainerRequest;
export interface FileMakerWebViewerError {
    message: string;
    name?: string;
    code?: string | number;
    details?: JsonValue;
}
export type FileMakerWebViewerResponse =
    | {
          protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
          id: string;
          ok: true;
          result: JsonValue;
      }
    | {
          protocol: typeof FILEMAKER_WEBVIEWER_PROTOCOL;
          id: string;
          ok: false;
          error: FileMakerWebViewerError;
      };
export interface FileMakerWebViewerContainerResult {
    body: string;
    bodyEncoding: 'base64' | 'text';
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
}

type PendingCall = {
    resolve(value: unknown): void;
    reject(reason: unknown): void;
    timer?: ReturnType<typeof setTimeout>;
};
type WithoutRequestBase<T> = T extends RequestBase ? Omit<T, keyof RequestBase> : never;
type RequestPayload = WithoutRequestBase<FileMakerWebViewerRequest>;
type DataApiRequestPayload = WithoutRequestBase<FileMakerWebViewerDataApiRequest>;
type BrowserGlobal = typeof globalThis &
    Record<string, unknown> & {
        location?: { href: string };
        addEventListener?: EventTarget['addEventListener'];
        removeEventListener?: EventTarget['removeEventListener'];
    };

declare global {
    interface Window {
        FileMaker?: FileMakerAPI;
    }
    // eslint-disable-next-line no-var
    var FileMaker: FileMakerAPI | undefined;
}

export class FileMakerWebViewerProvider implements DatabaseProvider {
    readonly name = 'FileMaker WebViewer';
    readonly formatting: DatabaseFormatting;
    readonly #options: FileMakerWebViewerProviderOptions;
    readonly #pending = new Map<string, PendingCall>();
    readonly #callbackName = `__easyFM_${randomToken().replaceAll('-', '')}`;
    readonly #callback = (response: string) => this.#receive(response);
    readonly #lifecycleTarget?: Pick<
        EventTarget,
        'addEventListener' | 'removeEventListener'
    >;
    #bootstrap?: FileMakerWebViewerBootstrapConfig;
    #connected = false;
    #fileMaker?: FileMakerAPI;
    #connectPromise?: Promise<void>;
    #cleanupSent = false;

    constructor(options: FileMakerWebViewerProviderOptions = {}) {
        this.#options = options;
        this.formatting = {
            dateFormat: 'MM/DD/YYYY',
            timeFormat: 'HH:mm:ss',
            timeStampFormat: 'MM/DD/YYYY HH:mm:ss',
            ...options.formatting,
        };
        const browserWindow = typeof window === 'undefined' ? undefined : window;
        this.#lifecycleTarget = options.lifecycleTarget ?? browserWindow;
    }

    async connect(context: ProviderContext): Promise<ProviderConnection> {
        const fileMaker = this.#options.fileMaker ?? globalThis.FileMaker;
        if (!fileMaker)
            throw new Error(
                'FileMaker JavaScript API is unavailable. Open this code inside a FileMaker WebViewer.',
            );
        if (context.signal.aborted) throw context.signal.reason;
        this.#fileMaker = fileMaker;
        this.#connectPromise ??= this.#bootstrapConnection(context.signal);
        await this.#connectPromise;
        return {
            formatting: this.formatting,
            openSession: async (signal) => {
                if (!this.#connected || !this.#bootstrap)
                    throw new Error('FileMaker WebViewer is not connected');
                return new FileMakerWebViewerSession(
                    fileMaker,
                    this.#options,
                    signal,
                    this.#bootstrap,
                    this.#pending,
                );
            },
            close: async () => this.#cleanup(),
        };
    }

    async #bootstrapConnection(signal: AbortSignal): Promise<void> {
        this.#bootstrap = parseBootstrapConfig(this.#options.bootstrapUrl);
        this.#mountCallback();
        const id = randomToken();
        const response = this.#waitForResponse<JsonValue>(id, signal, 'bootstrap');
        try {
            this.#performScript(FILEMAKER_WEBVIEWER_SCRIPT, {
                ...this.#bootstrap,
                protocol: FILEMAKER_WEBVIEWER_PROTOCOL,
                id,
                action: 'connect',
                callbackName: this.#callbackName,
            } satisfies FileMakerWebViewerBootstrapRequest);
            await response;
            this.#connected = true;
            this.#lifecycleTarget?.addEventListener('pagehide', this.#onPageHide, {
                once: true,
            });
        } catch (error) {
            const call = this.#pending.get(id);
            this.#pending.delete(id);
            if (call?.timer) clearTimeout(call.timer);
            delete (globalThis as Record<string, unknown>)[this.#callbackName];
            throw error;
        }
    }

    #waitForResponse<T>(
        id: string,
        signal: AbortSignal,
        description: string,
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeout = this.#options.timeout ?? 30_000;
            const call: PendingCall = { resolve, reject };
            if (timeout > 0)
                call.timer = setTimeout(() => {
                    this.#pending.delete(id);
                    reject(
                        new Error(
                            `FileMaker WebViewer ${description} timed out after ${timeout}ms`,
                        ),
                    );
                }, timeout);
            this.#pending.set(id, call);
            signal.addEventListener(
                'abort',
                () => {
                    if (!this.#pending.delete(id)) return;
                    if (call.timer) clearTimeout(call.timer);
                    reject(signal.reason);
                },
                { once: true },
            );
        });
    }

    #receive(response: string): void {
        let parsed: FileMakerWebViewerResponse;
        try {
            parsed = JSON.parse(response) as FileMakerWebViewerResponse;
        } catch (cause) {
            throw new Error('FileMaker WebViewer response is not valid JSON', { cause });
        }
        if (parsed.protocol !== FILEMAKER_WEBVIEWER_PROTOCOL)
            throw new Error(
                `Unsupported FileMaker WebViewer protocol: ${String(parsed.protocol)}`,
            );
        const call = this.#pending.get(parsed.id);
        if (!call) return;
        if (parsed.ok) this.#resolve(parsed.id, call, parsed.result);
        else this.#reject(parsed.id, call, toError(parsed.error));
    }

    #mountCallback() {
        Object.defineProperty(globalThis, this.#callbackName, {
            value: this.#callback,
            configurable: true,
            enumerable: false,
            writable: false,
        });
    }
    #performScript(scriptName: string, value: JsonValue) {
        const parameter = JSON.stringify(value);
        if (this.#options.scriptOption === undefined)
            this.#fileMaker!.PerformScript(scriptName, parameter);
        else
            this.#fileMaker!.PerformScriptWithOption(
                scriptName,
                parameter,
                this.#options.scriptOption,
            );
    }
    readonly #onPageHide = () => this.#cleanup();
    #cleanup() {
        if (this.#cleanupSent || !this.#connected || !this.#bootstrap || !this.#fileMaker)
            return;
        this.#cleanupSent = true;
        this.#lifecycleTarget?.removeEventListener('pagehide', this.#onPageHide);
        this.#performScript(FILEMAKER_WEBVIEWER_SCRIPT, {
            ...this.#bootstrap,
            protocol: FILEMAKER_WEBVIEWER_PROTOCOL,
            id: randomToken(),
            action: 'disconnect',
            callbackName: this.#callbackName,
        } satisfies FileMakerWebViewerDisconnectRequest);
        for (const [id, call] of this.#pending)
            this.#reject(id, call, new Error('FileMaker WebViewer connection closed'));
        delete (globalThis as Record<string, unknown>)[this.#callbackName];
    }
    #resolve(id: string, call: PendingCall, value: unknown) {
        this.#pending.delete(id);
        if (call.timer) clearTimeout(call.timer);
        call.resolve(value);
    }
    #reject(id: string, call: PendingCall, error: unknown) {
        this.#pending.delete(id);
        if (call.timer) clearTimeout(call.timer);
        call.reject(error);
    }
}

class FileMakerWebViewerSession implements ProviderSession {
    #closed = false;
    constructor(
        private readonly fileMaker: FileMakerAPI,
        private readonly options: FileMakerWebViewerProviderOptions,
        private readonly databaseSignal: AbortSignal,
        private readonly bootstrap: FileMakerWebViewerBootstrapConfig,
        private readonly pending: Map<string, PendingCall>,
    ) {}
    async execute<K extends DatabaseOperationType>(
        operation: DatabaseOperation<K>,
    ): Promise<DatabaseOperationResult<K>> {
        this.#assertOpen();
        const payload = await operationToRequest(operation);
        const result = await this.#request(payload);
        return normalizeOperationResult(operation, result) as DatabaseOperationResult<K>;
    }
    async fetchContainer(reference: string, signal?: AbortSignal): Promise<Response> {
        this.#assertOpen();
        const result = (await this.#request(
            { type: 'container.fetch', reference },
            signal,
        )) as unknown as FileMakerWebViewerContainerResult;
        const body =
            result.bodyEncoding === 'base64' && result.body
                ? decodeBase64(result.body)
                : result.body;
        return new Response(body, {
            status: result.status,
            statusText: result.statusText,
            headers: result.headers,
        });
    }
    async close(): Promise<void> {
        this.#closed = true;
    }
    async #request(payload: RequestPayload, signal?: AbortSignal): Promise<unknown> {
        const id = randomToken();
        const requestSignal = signal
            ? AbortSignal.any([this.databaseSignal, signal])
            : this.databaseSignal;
        if (requestSignal.aborted) throw requestSignal.reason;
        const response = new Promise<unknown>((resolve, reject) => {
            const timeout = this.options.timeout ?? 30_000;
            const call: PendingCall = { resolve, reject };
            if (timeout > 0)
                call.timer = setTimeout(() => {
                    this.pending.delete(id);
                    reject(
                        new Error(
                            `FileMaker WebViewer request timed out after ${timeout}ms`,
                        ),
                    );
                }, timeout);
            this.pending.set(id, call);
            requestSignal.addEventListener(
                'abort',
                () => {
                    if (!this.pending.delete(id)) return;
                    if (call.timer) clearTimeout(call.timer);
                    reject(requestSignal.reason);
                },
                { once: true },
            );
        });
        const request = {
            ...this.bootstrap,
            protocol: FILEMAKER_WEBVIEWER_PROTOCOL,
            id,
            ...payload,
        } satisfies FileMakerWebViewerRequest;
        const parameter = JSON.stringify(request);
        try {
            const scriptName = this.options.scriptName ?? FILEMAKER_WEBVIEWER_SCRIPT;
            if (this.options.scriptOption === undefined)
                this.fileMaker.PerformScript(scriptName, parameter);
            else
                this.fileMaker.PerformScriptWithOption(
                    scriptName,
                    parameter,
                    this.options.scriptOption,
                );
        } catch (error) {
            const call = this.pending.get(id);
            this.pending.delete(id);
            if (call?.timer) clearTimeout(call.timer);
            call?.reject(error);
        }
        return await response;
    }
    #assertOpen() {
        if (this.#closed) throw new Error('FileMaker WebViewer session is closed');
    }
}

export function parseFileMakerWebViewerBootstrap(
    url: string | URL,
): FileMakerWebViewerBootstrapConfig {
    const value = new URL(url).searchParams.get(FILEMAKER_WEBVIEWER_BOOTSTRAP_PARAM);
    if (!value)
        throw new Error(`Missing ${FILEMAKER_WEBVIEWER_BOOTSTRAP_PARAM} query parameter`);
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch (cause) {
        throw new Error(`${FILEMAKER_WEBVIEWER_BOOTSTRAP_PARAM} is not valid JSON`, {
            cause,
        });
    }
    if (!isBootstrapConfig(parsed))
        throw new Error(
            `${FILEMAKER_WEBVIEWER_BOOTSTRAP_PARAM} must contain recordNumber, token, webViewerName, and window strings`,
        );
    return parsed;
}
function parseBootstrapConfig(
    configuredUrl?: string | URL,
): FileMakerWebViewerBootstrapConfig {
    const href = configuredUrl ?? (globalThis as BrowserGlobal).location?.href;
    if (!href) throw new Error('FileMaker WebViewer URL is unavailable');
    return parseFileMakerWebViewerBootstrap(href);
}
function isBootstrapConfig(value: unknown): value is FileMakerWebViewerBootstrapConfig {
    if (!value || typeof value !== 'object') return false;
    const item = value as Record<string, unknown>;
    return (
        typeof item.recordNumber === 'string' &&
        typeof item.token === 'string' &&
        typeof item.webViewerName === 'string' &&
        typeof item.window === 'string'
    );
}
function toError(details: FileMakerWebViewerError): Error {
    const error = new Error(details.message);
    if (details.name) error.name = details.name;
    Object.assign(error, { code: details.code, details: details.details });
    return error;
}
async function operationToRequest(operation: DatabaseOperation): Promise<RequestPayload> {
    switch (operation.type) {
        case 'layout.list':
            return {
                type: 'dataApi',
                request: { action: 'metaData', version: 'vLatest', layouts: '' },
            };
        case 'layout.metadata':
            return {
                type: 'dataApi',
                request: {
                    action: 'metaData',
                    version: 'vLatest',
                    layouts: operation.layout,
                },
            };
        case 'script.run':
            return {
                type: 'script',
                layout: operation.layout,
                script: operation.script,
                ...(operation.parameter === undefined
                    ? {}
                    : { parameter: operation.parameter }),
            };
        case 'record.list': {
            const request: Record<string, JsonValue> = {
                action: 'read',
                version: 'vLatest',
                layouts: operation.layout,
                limit: operation.options.limit,
                offset: operation.options.offset,
            };
            if (operation.query.length) {
                request.query = operation.query.map((clause) => ({
                    ...clause.fields,
                    ...(clause.omit ? { omit: 'true' } : {}),
                })) as JsonValue;
            }
            if (operation.options.sort.length)
                request.sort = operation.options.sort as JsonValue;
            addPortalRequest(request, operation.options.portals);
            return withScripts(request, operation.options.scripts);
        }
        case 'record.get': {
            const request: Record<string, JsonValue> = {
                action: 'read',
                version: 'vLatest',
                layouts: operation.layout,
                recordId: operation.recordId,
            };
            addPortalRequest(request, operation.options.portals);
            return withScripts(request, operation.options.scripts);
        }
        case 'record.create':
        case 'record.update': {
            const { deleteRelatedRecords, ...body } = operation.body;
            if (deleteRelatedRecords?.length)
                body.fieldData = {
                    ...body.fieldData,
                    deleteRelated: deleteRelatedRecords.map(
                        (item) => `${item.table}.${item.recordId}`,
                    ),
                };
            const request: Record<string, JsonValue> = {
                action: operation.type === 'record.create' ? 'create' : 'update',
                version: 'vLatest',
                layouts: operation.layout,
                ...(operation.type === 'record.update'
                    ? { recordId: operation.recordId }
                    : {}),
                ...(body as JsonValue as Record<string, JsonValue>),
            };
            return withScripts(request, operation.options.scripts);
        }
        case 'record.duplicate':
        case 'record.delete':
            return withScripts(
                {
                    action:
                        operation.type === 'record.duplicate' ? 'duplicate' : 'delete',
                    version: 'vLatest',
                    layouts: operation.layout,
                    recordId: operation.recordId,
                },
                operation.options.scripts,
            );
        case 'container.upload': {
            const bytes = new Uint8Array(await operation.file.arrayBuffer());
            return {
                type: 'container.upload',
                layout: operation.layout,
                recordId: operation.recordId,
                field: operation.field,
                file: {
                    name: operation.file.name,
                    type: operation.file.type,
                    lastModified: operation.file.lastModified,
                    data: encodeBase64(bytes),
                },
            };
        }
    }
}

function withScripts(
    request: Record<string, JsonValue>,
    scripts: Record<string, { name: string; parameter: string }>,
): DataApiRequestPayload {
    return {
        type: 'dataApi',
        request,
        ...(Object.keys(scripts).length ? { scripts: scripts as JsonValue } : {}),
    };
}

function addPortalRequest(
    request: Record<string, JsonValue>,
    portals: Record<string, { limit: number; offset: number }>,
) {
    const names = Object.keys(portals);
    if (names.length) request.portal = names;
    for (const [name, page] of Object.entries(portals)) {
        request[`offset.${name}`] = page.offset;
        request[`limit.${name}`] = page.limit;
    }
}

function normalizeOperationResult(operation: DatabaseOperation, raw: unknown): unknown {
    if (operation.type === 'script.run') return raw;
    if (operation.type === 'container.upload') return undefined;
    const parsed = ApiResults.passthrough().parse(raw) as {
        messages: Array<{ code: number; message: string }>;
        response?: any;
    };
    if (parsed.messages[0]?.code !== 0)
        throw new FMError(parsed.messages[0]?.code ?? -1, 200, parsed);
    const response = parsed.response;
    switch (operation.type) {
        case 'layout.list':
            return flattenLayouts(response?.layouts ?? []);
        case 'layout.metadata':
            return response;
        case 'record.list':
            return response?.data ?? [];
        case 'record.get':
            return response?.data?.[0];
        case 'record.create':
        case 'record.update':
        case 'record.duplicate':
        case 'record.delete':
            return { ...(response ?? {}), status: 200 };
    }
}

function flattenLayouts(layouts: any[]): string[] {
    return layouts.flatMap((item) =>
        item.folderLayoutNames ? flattenLayouts(item.folderLayoutNames) : [item.name],
    );
}
function encodeBase64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}
function decodeBase64(value: string): ArrayBuffer {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    const result = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(result).set(bytes);
    return result;
}
function randomToken(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function')
        return globalThis.crypto.randomUUID();
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Secure randomness is required for FileMaker WebViewer transport');
}
