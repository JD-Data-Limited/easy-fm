import {dataApiSchemaSource, defineTypegenConfig, zodTypegenValidator} from '@jd-data-limited/easy-fm/typegen'

function required (name) {
    const value = process.env[name]
    if (!value) throw new Error(`Missing required environment variable ${name}`)
    return value
}

export default defineTypegenConfig({
    output: "./src/easyfm-generated",
    transports: ["data-api","odata"],
    validator: zodTypegenValidator(),
    source: dataApiSchemaSource({
        hostname: required('FM_HOST'),
        database: required('FM_DATABASE'),
        credentials: {method: 'filemaker', username: required('FM_USERNAME'), password: required('FM_PASSWORD')},
        externalSources: []
    })
})
