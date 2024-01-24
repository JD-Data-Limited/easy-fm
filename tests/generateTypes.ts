/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {ApiFieldMetadata, ApiFieldResultTypes} from "../src/models/apiResults.js";
import {DATABASE} from "./connectionDetails.js";

function sub(str: string) {
    return str
        .replace(/[^a-zA-Z0-9-_]/g, "") // Remove non-alphanumeric characters
        .replace(/^[0-9]+/g,'') // Removing leading numbers
}

function generateFieldType(field: ApiFieldMetadata) {
    switch (field.result) {
        case ApiFieldResultTypes.TEXT:
            return "FieldBase<string>"
        case ApiFieldResultTypes.CONTAINER:
            return "FieldBase<Container>"
        case ApiFieldResultTypes.DATE:
            return "FieldBase<Date>"
        case ApiFieldResultTypes.NUMBER:
            return "FieldBase<number>"
        case ApiFieldResultTypes.TIME:
            return "FieldBase<Date>"
        case ApiFieldResultTypes.TIMESTAMP:
            return "FieldBase<Date>"
    }
}

function processFieldsChunk(fields: ApiFieldMetadata[]) {
    let existing_fields: string[] = []
    fields = fields.filter(field => {
        if (existing_fields.includes(field.name)) return false
        existing_fields.push(field.name)
        return true
    })

    return fields.map(field => {
        return JSON.stringify(field.name) + ": " + generateFieldType(field)
    })
}

function camelToSnakeCase(str: string) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

DATABASE.login().then(async () => {
    let layouts = await DATABASE.listLayouts()
    console.log(`import {Container, FieldBase, LayoutInterface, Portal} from "./src";`)
    console.info("// " + layouts.length + " layouts found")

    let layoutInterfaces = new Map<string, {
        interfaceName: string,
        interface: string
    }>()
    for (let layout of layouts) {
        let metadata = await layout.getLayoutMeta()
        let fields = processFieldsChunk(metadata.fieldMetaData)

        let portals = metadata.portalMetaData
        let portalsProcessed = Object.keys(portals).map(portalName => {
            return `${JSON.stringify(portalName)}: Portal<{${processFieldsChunk(
                portals[portalName]
            )}}>`
        })

        let interfaceName = sub(layout.name) + "LayoutInterface"
        layoutInterfaces.set(layout.name, {
            interfaceName,
            interface: `export interface ${interfaceName} extends LayoutInterface {
            fields: {${fields.join(",\n    ")}},
            portals: {${portalsProcessed.join(",\n   ")}}
        }`
        })
    }

    let layoutInterfaceLinks: [string, string][] = []
    for (let layout of layoutInterfaces) {
        layoutInterfaceLinks.push([
            `${JSON.stringify(layout[0])}: ${layout[1].interfaceName}`,
            `${sub(camelToSnakeCase(layout[0]).toUpperCase().replace(" ", "_"))}: HOST.getLayout<${layout[1].interfaceName}>(${JSON.stringify(layout[0])})`
        ])
    }


    console.log(`HOST.database<{layouts:{${
        layoutInterfaceLinks.map(i => i[0]).join(",")
    }}}>()`)

    console.log("\n\n")
    console.log(`const LAYOUTS = {${
        layoutInterfaceLinks.map(i => i[1]).join(",")
    }}`)

    for (let layout of layoutInterfaces) {
        console.log("\n\n")
        console.log(layout[1].interface)
    }

    // StructureKind
    //
    // const project = new Project({
    //     tsConfigFilePath: "../tsconfig.json"
    // })
    // project.resolveSourceFileDependencies()

    await DATABASE.logout()
})