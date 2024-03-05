/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {ApiFieldMetadata, ApiFieldResultTypes} from "../models/apiResults.js";
import inquirer from 'inquirer';
import FMHost from "../connection/FMHost.js";
import * as fs from "fs";

function sub(str: string) {
    return str
        .replace(/[^a-zA-Z0-9_]/g, "") // Remove non-alphanumeric characters
        .replace(/^[0-9]+/g, '') // Removing leading numbers
}

function generateFieldType(field: ApiFieldMetadata) {
    switch (field.result) {
        case ApiFieldResultTypes.TEXT:
            return "Field<string>"
        case ApiFieldResultTypes.CONTAINER:
            return "Field<Container>"
        case ApiFieldResultTypes.DATE:
            return "Field<Date>"
        case ApiFieldResultTypes.NUMBER:
            return "Field<number>"
        case ApiFieldResultTypes.TIME:
            return "Field<Date>"
        case ApiFieldResultTypes.TIMESTAMP:
            return "Field<Date>"
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

function safeStringInjection(str: TemplateStringsArray, ...args: {toString(): string}[]) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        result += str[i];
        if (i < args.length) {
            result += JSON.stringify(args[i].toString());
        }
    }
    return result;
}

export async function generateTypesCLI() {
    process.stdout.write('\x1Bc');
    console.log("For this tool to work, you are required to have access to an account on the target database.\n" +
        "This account must have the fmrest extended privilege enabled.\n" +
        "This tool can only export type interfaces for layouts that the given account has access to.")
    console.log("\n")

    const data = await inquirer.prompt([
        {
            type: "input",
            name: "hostname",
            message: "The IP address/domain of your FileMaker server (must start with either http:// or https://)",
            validate(input: any): boolean | string | Promise<boolean | string> {
                return input.startsWith("http://") || input.startsWith("https://") || "Please enter a valid IP address/domain starting with http:// or https://";
            }
        },
        {
            type: "number",
            name: "timezoneOffset",
            message: "Server timezone offset (minutes)",
            default: 0 - (new Date()).getTimezoneOffset()
        },
        {
            type: "confirm",
            name: "verify",
            default: true,
            message: "Verify your server's identity",
            when(previousAnswers) {
                return previousAnswers.hostname.startsWith("https://")
            }
        },
        {
            type: "input",
            name: "database",
            message: "Database filename"
        },
        {
            type: "input",
            name: "username",
            message: "Database username"
        },
        {
            type: "password",
            name: "password",
            message: "Database password",
            mask: "*"
        }
    ])

    const HOST = new FMHost(data.hostname, data.timezoneOffset, data.verify)
    const DATABASE = HOST.database({
        database: data.database,
        credentials: {
            method: "filemaker",
            username: data.username,
            password: data.password
        },
        externalSources: []
    })

    await DATABASE.login()
    // Create file write stream
    const stream = fs.createWriteStream("./types.ts")
    let layouts = await DATABASE.listLayouts()

    stream.write(`import FMHost, {Container, FieldBase, LayoutInterface, Portal} from "@jd-data-limited/easy-fm";\n`)
    stream.write("// " + layouts.length + " layouts found\n\n")

    let layoutInterfaces = new Map<string, {
        interfaceName: string,
        interface: string
    }>()
    for (let layout of layouts) {
        let substituteName = sub(layout.name)
        if (!substituteName) continue
        console.log(substituteName)
        let metadata = await layout.getLayoutMeta()
        let fields = processFieldsChunk(metadata.fieldMetaData)

        let portals = metadata.portalMetaData
        let portalsProcessed = Object.keys(portals).map(portalName => {
            return `${JSON.stringify(portalName)}: Portal<{${processFieldsChunk(
                portals[portalName]
            )}}>`
        })

        let interfaceName = substituteName + "LayoutInterface"
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

    stream.write(safeStringInjection`const HOST = new FMHost(${data.hostname}, ${data.timezoneOffset}, ${data.verify});`)
    stream.write(`HOST.database<{layouts:{${
        layoutInterfaceLinks.map(i => i[0]).join(",")
    }}}>();`)

    stream.write("\n\n")
    stream.write(`const LAYOUTS = {${
        layoutInterfaceLinks.map(i => i[1]).join(",")
    }};`)

    for (let layout of layoutInterfaces) {
        stream.write("\n\n")
        stream.write(layout[1].interface + ";")
    }

    // StructureKind
    //
    // const project = new Project({
    //     tsConfigFilePath: "../tsconfig.json"
    // })
    // project.resolveSourceFileDependencies()

    await DATABASE.logout()
    console.log("DONE! Wrote database types to ./types.ts")
}