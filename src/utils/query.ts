/*
 * Copyright (c) 2024. See LICENSE file for more information
 */

import {Moment} from "moment";
import moment from "moment/moment.js";

export const FindRequestSymbol = Symbol("easyfm-findrequest");
const SPECIAL_CHARACTERS = ["\\", "=", "<", "≤", "≥", ">", "…", "...", "//", "@", "#", "*", "\"", "~"]
type QueryParameter = string | number | Moment
export type Query = {[FindRequestSymbol]: (string | Moment)[]}

export function queryEscape(str: string) {
    for (let char of SPECIAL_CHARACTERS) {
        str = str.replace(char, `\\${char}`)
    }
    return str
}

export function query(strings: TemplateStringsArray, ...args: QueryParameter[]): Query {
    let argStrings = args.map(item => {
        if (moment.isMoment(item)) return item
        else if (typeof item === "number") {
            return queryEscape(item.toString())
        }
        else return queryEscape(item)
    })

    // Zip the parameters together
    const query = strings.map((str, index) => {
        return [str, (argStrings[index] || '')]
    }).flat(1)
    return {[FindRequestSymbol]: query}
}