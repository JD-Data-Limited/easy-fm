/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {LayoutInterface} from "../../layouts/layoutInterface.js";
import {Layout} from "../../layouts/layout.js";
import {Portal} from "../portal.js";
import {limitPortalsInterface} from "../../types.js";

export class RecordGetOperation<T extends LayoutInterface> {
    protected layout: Layout<T>
    protected limit: number = 100
    protected scripts: object
    protected sort: object[]
    protected limitPortals: limitPortalsInterface[] = []
    protected offset: number = 0

    constructor(layout: Layout<T>) {
        this.layout = layout
        this.scripts = {
            "script": null, // Runs after everything
            "script.prerequeset": null, // Runs before the request
            "script.presort": null // Runs before the sort
        }
        this.sort = []
    }

    /*
    addToPortalLimit() will adjust the results of the get request so that if a layout has multiple portals in it,
    only data from the specified ones will be read. This may help reduce load on your FileMaker API
    */
    addToPortalLimit(portal: Portal<any>, offset = 0, limit = 100) {
        if (offset < 0) throw "Portal offset cannot be less than 0"
        this.limitPortals.push({portal, offset, limit})
        return this
    }

    setLimit(limit: number) {
        if (limit < 1) throw "Record limit too low"
        this.limit = limit
        return this
    }

    addSort(fieldName, sortOrder) {
        this.sort.push({fieldName, sortOrder})
        return this
    }

    setOffset(offset: number) {
        if (offset < 0) throw "Record offset too low"
        this.limit = offset
        return this
    }
}