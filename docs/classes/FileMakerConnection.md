# Class: FileMakerConnection

## Constructor

```javascript
export default class FileMakerConnection {
    public hostname: string;
    public database: string;
    public token: any;
    private username: any;
    private password: any;
    private rejectUnauthroized: boolean;

    constructor() {
    }
}
```

This is the primary class as it holds information about the FileMaker connection

## Methods

### login(hostname, database, username, password, rejectUnauthorised)

Creates a new login session on the FileMaker server, using the specified account.

#### Parameters

| Parameter          | Optional? | Default | Supported types |
|--------------------|-----------|---------|-----------------|
| hostname           | No        | N/A     | string          |
| database           | No        | N/A     | string          |
| username           | No        | N/A     | string          |
| password           | No        | N/A     | string          |
| rejectUnauthorised | Yes       | true    | boolean         |

#### Returns:

Promise &lt;token&gt;

### importSession(token, rejectUnauthorised)

Allows you to import and use a FileMaker Data API token that was generated in another application.

#### Parameters

| Parameter          | Optional? | Default | Supported types |
|--------------------|-----------|---------|-----------------|
| token              | No        | N/A     | string          |
| rejectUnauthorised | Yes       | true    | boolean         |

#### Returns:

Promise &lt;void&gt;

### getLayout(name)

#### Parameters

| Parameter          | Optional? | Default | Supported types | Description                               |
|--------------------|-----------|---------|-----------------|-------------------------------------------|
| name               | No        | N/A     | string          | The name of the layout you wish to access |

#### Returns:

[layout](layout.md)

### apiRequest(name)

#### Parameters

| Parameter          | Optional? | Default | Supported types | Description                               |
|--------------------|-----------|---------|-----------------|-------------------------------------------|
| name               | No        | N/A     | string          | The name of the layout you wish to access |

#### Returns:

[layout](layout.md)

### logout()

Ends the current database session

#### Returns:

Promise &lt;void&gt;