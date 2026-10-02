# Provider API

`Database` works with semantic providers. Providers choose transport and session creation;
core schedules sessions and translates results into layouts and records.

```ts
import type {
    DatabaseProvider,
    ProviderConnection,
    ProviderSession,
} from '@jd-data-limited/easy-fm';
```

A provider exposes synchronous formatting defaults and lazy connection:

```ts
const provider: DatabaseProvider = {
  formatting: {
    dateFormat: "MM/DD/YYYY",
    timeFormat: "HH:mm:ss",
    timeStampFormat: "MM/DD/YYYY HH:mm:ss"
  },
  async connect(context): Promise<ProviderConnection> {
    return {
      formatting: this.formatting,
      async openSession(signal): Promise<ProviderSession> {
        return {
          async execute(operation) {
            // Translate semantic operation to provider transport.
          },
          async fetchContainer(reference, signal) {
            // Preserve this session's auth/cookie state.
            // Non-HTTP implementations may synthesize Response.
            return new Response(...)
          },
          async close() {}
        }
      }
    }
  }
}

const database = Database.create({provider})
```

## Rules

- Omitted `maxSessions` selects serialized single-session behavior; values greater than
  one enable bounded pooling.
- `execute` receives typed layout, script, record, and upload operations—not HTTP paths.
- Throw `ProviderSessionExpiredError` when session cannot continue. Core retries safe
  reads once.
- Container reference is opaque and bound to session that produced it.
- `fetchContainer` must return Web `Response`; transport itself may be HTTP or custom.
- Do not replay operations inside provider. Core owns retry policy.

## FileMaker WebViewer

`FileMakerWebViewerProvider` bridges the semantic provider API to FileMaker Pro's global
JavaScript API:

```ts
import { Database, FileMakerWebViewerProvider } from '@jd-data-limited/easy-fm';

const database = Database.create({
    provider: new FileMakerWebViewerProvider(),
});
```

Set `scriptOption` to `"0"` through `"5"` to use `PerformScriptWithOption`; otherwise
provider uses `PerformScript`. Calls time out after 30 seconds by default; set `timeout`
in milliseconds (`0` disables timeout).

### Bootstrap

FileMaker loads the application with a URL-encoded JSON query parameter named
`__easyFMWebViewerBootstrap`:

```json
{
    "recordNumber": "1",
    "token": "A9FD270F-4D0C-394F-A890-C9659C696BF8",
    "webViewerName": "Web Viewer",
    "window": "F1D79DCE303387489D83CBA0A0AC84A6"
}
```

On connect, provider installs a non-enumerable global callback with a cryptographically
random name and calls `__EasyFM_WebViewerCallback` with:

```json
{
    "recordNumber": "1",
    "token": "A9FD270F-4D0C-394F-A890-C9659C696BF8",
    "webViewerName": "Web Viewer",
    "window": "F1D79DCE303387489D83CBA0A0AC84A6",
    "protocol": "easy-fm.webviewer/v1",
    "id": "bootstrap-request-id",
    "action": "connect",
    "callbackName": "__easyFM_…"
}
```

FileMaker calls that callback with one JSON string. Successful bootstrap acknowledges that
original token is active:

```json
{
    "protocol": "easy-fm.webviewer/v1",
    "id": "bootstrap-request-id",
    "ok": true,
    "result": null
}
```

Bootstrap failure uses the standard error shape:

```json
{
    "protocol": "easy-fm.webviewer/v1",
    "id": "bootstrap-request-id",
    "ok": false,
    "error": {
        "message": "Bootstrap token is invalid",
        "name": "FileMakerError",
        "code": 9
    }
}
```

After successful bootstrap, provider listens for `pagehide`. It calls
`__EasyFM_WebViewerCallback` once with `action: "disconnect"`, the original token and
identity fields, callback name, protocol, and a new request ID, then deletes callback. No
disconnect response is required. Explicit database close uses same cleanup path.

### Data protocol

Transport is always one JSON string in each direction. Current protocol identifier is
`easy-fm.webviewer/v1`. Bootstrap, operations, and disconnect all include `protocol` and a
cryptographically random `id`. Every response callback echoes that `id`, so FileMaker can
use one correlation path for every callback. Data requests contain:

- `protocol`: `"easy-fm.webviewer/v1"`
- `token`: original token from `__easyFMWebViewerBootstrap`
- `recordNumber`, `webViewerName`, and `window`: original bootstrap identity values
- `id`: cryptographically random correlation ID; return unchanged
- `type`: `"dataApi"`, `"script"`, `"container.upload"`, or `"container.fetch"`

Each call runs `__EasyFM_WebViewerCallback` by default. `scriptName` can override the
data-operation script without changing bootstrap/cleanup script:

```json
{
    "protocol": "easy-fm.webviewer/v1",
    "token": "…",
    "recordNumber": "1",
    "webViewerName": "Web Viewer",
    "window": "F1D79DCE303387489D83CBA0A0AC84A6",
    "id": "…",
    "type": "dataApi",
    "request": {
        "action": "read",
        "version": "vLatest",
        "layouts": "Contacts",
        "limit": 100,
        "offset": 1,
        "query": [{ "Name": "Ada*" }],
        "sort": [{ "fieldName": "Name", "sortOrder": "ascend" }]
    }
}
```

For `type: "dataApi"`, `request` is ready to pass to FileMaker's **Execute FileMaker Data
API** script step. FileMaker should validate the token and request policy first, pass
`request` unchanged to that step, and return the step's complete JSON result. EasyFM
validates `messages`, converts nonzero FileMaker codes to `FMError`, and extracts the
operation result from `response`.

Record script options are placed in top-level `scripts`, outside `request`, because the
script step ignores Data API script keys. The FileMaker wrapper must run these at the
corresponding prerequest, presort, and after points. Related-record deletions are already
translated into `request.fieldData.deleteRelated`, so `request` remains directly usable.

Operations the script step cannot perform use explicit request types:

```json
{"protocol":"easy-fm.webviewer/v1","token":"…","id":"…","type":"script","layout":"Contacts","script":"Refresh","parameter":"full"}
{"protocol":"easy-fm.webviewer/v1","token":"…","id":"…","type":"container.upload","layout":"Contacts","recordId":12,"field":"Photo","file":{"name":"photo.jpg","type":"image/jpeg","lastModified":1760000000000,"data":"BASE64…"}}
{"protocol":"easy-fm.webviewer/v1","token":"…","id":"…","type":"container.fetch","reference":"https://…"}
```

After handling it, use FileMaker's **Perform JavaScript in Web Viewer** script step to
call callback name registered during bootstrap with one JSON string. Never pass a
JavaScript object. Responses use explicit `ok` discriminator:

```json
{"protocol":"easy-fm.webviewer/v1","id":"…","ok":true,"result":{"messages":[{"code":"0","message":"OK"}],"response":{"data":[]}}}
{"protocol":"easy-fm.webviewer/v1","id":"…","ok":false,"error":{"name":"FileMakerError","message":"Request failed","code":401,"details":{"layout":"Contacts"}}}
```

`result` and optional `error.details` must be JSON values. Error always has string
`message`; string `name`, string-or-number `code`, and JSON `details` are optional.
Provider reconstructs JavaScript `Error`, preserves these fields, and rejects awaiting
operation. Unknown or late response IDs are ignored. Malformed JSON and unsupported
protocol versions throw immediately in the WebViewer.

For `script`, `result` is script result. For `container.upload`, it may be `null`.
`container.fetch` has required `body` and `bodyEncoding` (`"text"` or `"base64"`), plus
optional numeric `status`, string `statusText`, and string-to-string `headers`. Container
uploads encode `file.data` as base64 and include `name`, `type`, and numeric
`lastModified`.

Public TypeScript exports (`FileMakerWebViewerRequest`, `FileMakerWebViewerResponse`,
`FileMakerWebViewerContainerResult`, and `FILEMAKER_WEBVIEWER_PROTOCOL`) are normative.
Protocol additions require a new protocol identifier rather than silently changing v1.

### Security boundary

Callback names and request IDs use browser cryptographic randomness. Original bootstrap
token is reused as FileMaker-facing session capability on every call. Random callback is
WebViewer-facing return capability. Callback and request IDs remain correlation values,
not substitutes for FileMaker token validation. JavaScript already running in same
WebViewer can observe requests, call `FileMaker`, and read active tokens.

Treat FileMaker as authorization boundary:

- Host only trusted, immutable WebViewer code. Avoid third-party scripts and remote HTML.
- Restrict WebViewer navigation and allowed domains. Do not render user-supplied HTML.
- Use a dedicated FileMaker script. Parse JSON, require exact protocol/type/keys, reject
  unknown operations, cap string and base64 sizes, and validate every value.
- Execute each operation under current FileMaker account privileges. Never accept account
  names, privilege escalation flags, arbitrary script names, or arbitrary calculations
  from request without an explicit allowlist.
- Return minimal errors. Do not expose credentials, stack traces, file paths, or unrelated
  record data.
- Apply FileMaker privilege sets, record-level access, and script full-access settings as
  if WebViewer were an untrusted client.
- Use HTTPS and a restrictive Content Security Policy when WebViewer content is remote.

No browser-side token can protect against malicious JavaScript executing in same page.
