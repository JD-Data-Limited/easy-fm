import {Database} from '../connection/database.js'
import {DataApiProvider, type DataApiProviderOptions} from '../connection/DataApiProvider.js'
import type {SchemaSource, TypegenDiagnostic, TypegenField, TypegenSchema} from './types.js'
import {ApiLayoutMetadata, isAccessibleFieldMetadata} from '../models/apiResults.js'

export function dataApiSchemaSource (options: DataApiProviderOptions): SchemaSource {
    return {
        async introspect (): Promise<TypegenSchema> {
            const database = Database.create({provider: new DataApiProvider(options)})
            try {
                const layouts = await database.listLayouts()
                const inspected = await Promise.all(layouts.map(async layout => {
                        // Read raw metadata here so inaccessible placeholders can produce diagnostics before stripping.
                        const {value} = await database.execute({type: 'layout.metadata', layout: layout.name})
                        const metadata = ApiLayoutMetadata.parse(value)
                        const diagnostics: TypegenDiagnostic[] = metadata.fieldMetaData.filter(isInaccessible).map(field => ({level: 'warning', layout: layout.name, message: `Field ${JSON.stringify(field.name)} is inaccessible and was excluded from generated types. Check this account's field privileges.`}))
                        for (const [portal, fields] of Object.entries(metadata.portalMetaData)) for (const field of fields.filter(isInaccessible)) diagnostics.push({level: 'warning', layout: layout.name, portal, message: `Portal field ${JSON.stringify(field.name)} is inaccessible and was excluded from generated types. Check this account's field privileges.`})
                        return {
                            layout: {name: layout.name, fields: unique(metadata.fieldMetaData.filter(isAccessibleFieldMetadata).map(toField)), portals: Object.fromEntries(Object.entries(metadata.portalMetaData).map(([name, fields]) => [name, unique(fields.filter(isAccessibleFieldMetadata).map(toField))]))},
                            diagnostics
                        }
                    }))
                return {version: 1, layouts: inspected.map(item => item.layout), diagnostics: inspected.flatMap(item => item.diagnostics)}
            } finally {
                await database.close()
            }
        }
    }
}

function isInaccessible (field: Parameters<typeof isAccessibleFieldMetadata>[0]) { return field.type === 'invalid' || field.result === 'invalid' || field.name.includes('<No Access>') }

function toField (field: Parameters<typeof isAccessibleFieldMetadata>[0]): TypegenField {
    if (!isAccessibleFieldMetadata(field)) throw new Error('Cannot generate an inaccessible field')
    return {name: field.name, result: field.result as TypegenField['result'], type: field.type as TypegenField['type'], writable: field.type === 'normal', required: field.notEmpty}
}

function unique (fields: TypegenField[]) {
    return [...new Map(fields.map(field => [field.name, field])).values()]
}
