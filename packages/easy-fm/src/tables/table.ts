import {TableRecordManager} from "./tableRecordManager.js";
import {TableDatabase} from "../connection/tableDatabase.js";
import {TableInterface} from "./tableInterface.js";

export class Table<T extends TableInterface> {
    readonly records = new TableRecordManager<T>(this)
    
    get metadata() {
        if (!this.database.tableMetadata) {return null}
        const namespace = this.database.tableMetadata.getThisNamespace(true)
        return namespace.getTypeForEntitySet(this.name)
    }

    constructor(readonly database: TableDatabase, readonly name: string) {
    }

    async getTableEntitySetMeta() {
        const tableMetadata = this.database.tableMetadata || await this.database.refreshMetadata()
        const namespace = tableMetadata.getThisNamespace(true)
        return namespace.getTypeForEntitySet(this.name)
    }
}