import {Database} from "./database.js";
import {Table} from "../tables/table.js";
import {TableInterface} from "../tables/tableInterface.js";
import {ODataMetadata} from "../tables/odataMetadata.js";

interface TableDatabaseStructure {
    tables: Record<string, TableInterface>;
}

/** Base API for providers whose records are addressed directly through tables. */
export class TableDatabase<
    T extends TableDatabaseStructure = TableDatabaseStructure
> extends Database {
    tableMetadata: ODataMetadata | null = null
    #tableCache = new Map<string, Table<never>>()

    async listTables() {
        
    }

    async refreshMetadata() {
        const result = await this.execute({ type: "tables.metadata" })
        this.tableMetadata = new ODataMetadata(result.value, this.name)
        return this.tableMetadata
    }

    table<R extends keyof T['tables']>(name: R): Table<T['tables'][R]>;
    table<R extends TableInterface>(name: string): Table<R>;
    table(name: string) {
        let table = this.#tableCache.get(name);
        if (table) {return table}
        
        table = new Table(this, name)
        this.#tableCache.set(name, table)
        return table
    }
}