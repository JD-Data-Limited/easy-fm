import {Database} from '../connection/database.js'
import {DataApiProvider, type DataApiProviderOptions} from '../connection/DataApiProvider.js'
import type {SchemaSource, TypegenField, TypegenSchema} from './types.js'

export function dataApiSchemaSource (options: DataApiProviderOptions): SchemaSource {
    return {
        async introspect (): Promise<TypegenSchema> {
            const database = Database.create({provider: new DataApiProvider(options)})
            try {
                const layouts = await database.listLayouts()
                return {
                    version: 1,
                    layouts: await Promise.all(layouts.map(async layout => {
                        const metadata = await layout.getLayoutMeta()
                        return {
                            name: layout.name,
                            fields: unique(metadata.fieldMetaData.map(toField)),
                            portals: Object.fromEntries(Object.entries(metadata.portalMetaData).map(([name, fields]) => [name, unique(fields.map(toField))]))
                        }
                    }))
                }
            } finally {
                await database.close()
            }
        }
    }
}

function toField (field: {name: string, result: TypegenField['result'], type: TypegenField['type'], notEmpty: boolean}): TypegenField {
    return {name: field.name, result: field.result, type: field.type, writable: field.type === 'normal', required: field.notEmpty}
}

function unique (fields: TypegenField[]) {
    return [...new Map(fields.map(field => [field.name, field])).values()]
}
