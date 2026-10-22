import {
    FileMakerWebViewerProvider,
    parseFileMakerWebViewerBootstrap,
} from '../dist/connection/FileMakerWebViewerProvider.js';
import type { FileMakerAPI } from '../src/connection/FileMakerWebViewerProvider.js';

const config = {
    recordNumber: '1',
    token: 'A9FD270F-4D0C-394F-A890-C9659C696BF8',
    webViewerName: 'Web Viewer',
    window: 'F1D79DCE303387489D83CBA0A0AC84A6',
};
const bootstrapUrl = `https://app.example/?__easyFMWebViewerBootstrap=${encodeURIComponent(JSON.stringify(config))}`;

describe('FileMakerWebViewerProvider', () => {
    it('parses its bootstrap configuration from the URL', () => {
        expect(parseFileMakerWebViewerBootstrap(bootstrapUrl)).toEqual(config);
    });

    it('bootstraps through a random callback and sends authenticated operations', async () => {
        const calls: Array<{ script: string; value: any }> = [];
        let callbackName = '';
        const fileMaker: FileMakerAPI = {
            PerformScript(script, parameter) {
                const value = JSON.parse(parameter ?? '');
                calls.push({ script, value });
                if (value.action === 'connect') {
                    callbackName = value.callbackName;
                    expect(callbackName).toMatch(/^__easyFM_[a-f\d]{32}$/i);
                    expect(
                        Object.prototype.propertyIsEnumerable.call(
                            globalThis,
                            callbackName,
                        ),
                    ).toBe(false);
                    (globalThis as any)[callbackName](
                        JSON.stringify({
                            protocol: 'easy-fm.webviewer/v1',
                            id: value.id,
                            ok: true,
                            result: null,
                        }),
                    );
                }
            },
            PerformScriptWithOption() {},
        };
        const provider = new FileMakerWebViewerProvider({ fileMaker, bootstrapUrl });
        const connection = await provider.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        const promise = session.execute({ type: 'layout.list', page: 1 });
        await Promise.resolve();
        const request = calls[1].value;
        expect(calls[0]).toMatchObject({
            script: '__EasyFM_WebViewerCallback',
            value: {
                ...config,
                protocol: 'easy-fm.webviewer/v1',
                id: expect.any(String),
                action: 'connect',
                callbackName,
            },
        });
        expect(request).toMatchObject({
            ...config,
            protocol: 'easy-fm.webviewer/v1',
            type: 'dataApi',
            request: {
                action: 'metaData',
                version: 'vLatest',
                layouts: '',
            },
        });
        (globalThis as any)[callbackName](
            JSON.stringify({
                protocol: 'easy-fm.webviewer/v1',
                id: request.id,
                ok: true,
                result: {
                    messages: [{ code: '0', message: 'OK' }],
                    response: { layouts: [{ name: 'Contacts' }] },
                },
            }),
        );
        await expect(promise).resolves.toEqual(['Contacts']);
    });

    it('notifies FileMaker and removes the callback on pagehide', async () => {
        const lifecycle = new EventTarget();
        const calls: any[] = [];
        let callbackName = '';
        const fileMaker: FileMakerAPI = {
            PerformScript(_script, parameter) {
                const value = JSON.parse(parameter ?? '');
                calls.push(value);
                if (value.action === 'connect') {
                    callbackName = value.callbackName;
                    (globalThis as any)[callbackName](
                        JSON.stringify({
                            protocol: 'easy-fm.webviewer/v1',
                            id: value.id,
                            ok: true,
                            result: null,
                        }),
                    );
                }
            },
            PerformScriptWithOption() {},
        };
        const provider = new FileMakerWebViewerProvider({
            fileMaker,
            bootstrapUrl,
            lifecycleTarget: lifecycle,
        });
        await provider.connect({ signal: new AbortController().signal, debug: false });
        lifecycle.dispatchEvent(new Event('pagehide'));
        expect(calls[1]).toEqual({
            ...config,
            token: config.token,
            protocol: 'easy-fm.webviewer/v1',
            id: expect.any(String),
            action: 'disconnect',
            callbackName,
        });
        expect((globalThis as any)[callbackName]).toBeUndefined();
    });

    it('rejects a FileMaker protocol error', async () => {
        let callbackName = '';
        let request: any;
        const fileMaker: FileMakerAPI = {
            PerformScript(_script, parameter) {
                const value = JSON.parse(parameter ?? '');
                if (value.action === 'connect') {
                    callbackName = value.callbackName;
                    (globalThis as any)[callbackName](
                        JSON.stringify({
                            protocol: 'easy-fm.webviewer/v1',
                            id: value.id,
                            ok: true,
                            result: null,
                        }),
                    );
                } else {
                    request = value;
                }
            },
            PerformScriptWithOption() {},
        };
        const provider = new FileMakerWebViewerProvider({ fileMaker, bootstrapUrl });
        const connection = await provider.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        const promise = session.execute({ type: 'layout.list', page: 1 });
        await Promise.resolve();
        (globalThis as any)[callbackName](
            JSON.stringify({
                protocol: 'easy-fm.webviewer/v1',
                id: request.id,
                ok: false,
                error: {
                    name: 'FileMakerError',
                    message: 'Access denied',
                    code: 9,
                    details: { operation: 'layout.list' },
                },
            }),
        );
        await expect(promise).rejects.toMatchObject({
            name: 'FileMakerError',
            message: 'Access denied',
            code: 9,
            details: { operation: 'layout.list' },
        });
    });

    it('sends writes in Execute FileMaker Data API format', async () => {
        const calls: any[] = [];
        let callbackName = '';
        const fileMaker: FileMakerAPI = {
            PerformScript(_script, parameter) {
                const value = JSON.parse(parameter ?? '');
                calls.push(value);
                if (value.action === 'connect') {
                    callbackName = value.callbackName;
                    (globalThis as any)[callbackName](
                        JSON.stringify({
                            protocol: 'easy-fm.webviewer/v1',
                            id: value.id,
                            ok: true,
                            result: null,
                        }),
                    );
                }
            },
            PerformScriptWithOption() {},
        };
        const provider = new FileMakerWebViewerProvider({ fileMaker, bootstrapUrl });
        const connection = await provider.connect({
            signal: new AbortController().signal,
            debug: false,
        });
        const session = await connection.openSession(new AbortController().signal);
        const promise = session.execute({
            type: 'record.update',
            layout: 'Contacts',
            recordId: 12,
            body: {
                fieldData: { Name: 'Ada' },
                deleteRelatedRecords: [{ table: 'Notes', recordId: 4 }],
            },
            options: {
                portals: {},
                scripts: { after: { name: 'Audit', parameter: '12' } },
            },
        });
        await Promise.resolve();
        const request = calls[1];
        expect(request).toMatchObject({
            ...config,
            protocol: 'easy-fm.webviewer/v1',
            type: 'dataApi',
            request: {
                action: 'update',
                version: 'vLatest',
                layouts: 'Contacts',
                recordId: 12,
                fieldData: {
                    Name: 'Ada',
                    deleteRelated: ['Notes.4'],
                },
            },
            scripts: { after: { name: 'Audit', parameter: '12' } },
        });
        (globalThis as any)[callbackName](
            JSON.stringify({
                protocol: 'easy-fm.webviewer/v1',
                id: request.id,
                ok: true,
                result: {
                    messages: [{ code: '0', message: 'OK' }],
                    response: { modId: '2' },
                },
            }),
        );
        await expect(promise).resolves.toEqual({ modId: '2', status: 200 });
    });
});
