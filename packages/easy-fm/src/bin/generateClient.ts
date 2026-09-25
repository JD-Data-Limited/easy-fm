import {Database} from '../connection/database.js'
import {DataApiProvider} from '../connection/DataApiProvider.js'
import * as fs from "node:fs";

const DATABASE_HOST = process?.env.FM_DB_HOST ?? 'http://localhost'
const DATABASE_NAME = process.env.FM_DB_NAME ?? 'EasyFMBenchmark.fmp12'
const DATABASE_ACCOUNT = process.env.FM_DB_ACCOUNT ?? 'Admin'
const DATABASE_PASSWORD = process.env.FM_DB_PASSWORD ?? 'Admin'

const FIELD_TYPE_MAP = {
    number: {class: "NumberField", zodType: "z.string()"},
    date: {class: "DateField", zodType: "z.string()"},
    text: {class: "TextField", zodType: "z.string()"},
    time: {class: "TimeField", zodType: "z.string()"},
    timeStamp: {class: "TimeStampField", zodType: "z.string()"},
    container: {class: "ContainerField", zodType: "z.string()"}
}

export async function generateClient() {
    const DATABASE = Database.create({provider: new DataApiProvider({
        hostname: DATABASE_HOST,
        database: 'EasyFMBenchmark',
        credentials: {
            method: 'filemaker',
            username: DATABASE_ACCOUNT,
            password: DATABASE_PASSWORD
        },
        externalSources: [],
        debug: true
    }), debug: true})

    const LAYOUTS = await DATABASE.listLayouts()
    const schema = await Promise.all(LAYOUTS.map(async layout => {
        const metadata = await layout.getLayoutMeta()

        // Generate type maps
        const fieldTypesMap = metadata.fieldMetaData.map(field => {
            return `${JSON.stringify(field.name)}: ${FIELD_TYPE_MAP[field.result].class}`
        })

        // Generate validation
        const fieldValidation = `z.object({${metadata.fieldMetaData.map(field => {
            return `${JSON.stringify(field.name)}: ${FIELD_TYPE_MAP[field.result].zodType}`
        })})`

        return {layout, fieldTypesMap, fieldValidation}
    }))

    // Generate DB schema
    const typeScriptSchema = `interface DatabaseSchema extends __DatabaseSchema {${schema.map(layout => {
        return `${JSON.stringify(layout.layout.name)}: {${layout.fieldTypesMap.join(",")}}`
    })}}`

    fs.writeFileSync("./easyFMClient.ts", `import {Database, DataApiProvider, DatabaseSchema as __DatabaseSchema} from "@jd-data-limited/easy-fm"

${typeScriptSchema}`)
}
