/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

const SPECIAL_CHARACTERS = ["\\", "=", "<", "≤", "≥", ">", "…", "...", "//", "@", "#", "*", "\"", "~"]
type QueryParameter = string | number | Date

export function queryEscape(str: string) {
    for (let char of SPECIAL_CHARACTERS) {
        str = str.replace(char, `\\${char}`)
    }
    return str
}

export function query(strings: TemplateStringsArray, ...args: QueryParameter[]) {
    let argStrings = args.map(item => {
        return queryEscape(item.toString())
    })

    // Zip the parameters together
    const query = strings.map((str, index) => {
        return str + (argStrings[index] || '')
    })
    return query.join("")
}