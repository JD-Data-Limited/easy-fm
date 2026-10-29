import {Table} from "./table.js"
import {TableInterface} from "./tableInterface.js";
import {TableRecord} from "../records/tableRecord.js";

export class TableRecordManager<T extends TableInterface>  {
    constructor(private readonly table: Table<T>) {
    }

    async create() {
        const entityType = await this.table.getTableEntitySetMeta()
        const fields: Record<string, string> = {}
        for (const field of Object.keys(entityType.fields)) {
            fields[field] = ""
        }

        return new TableRecord(this.table, -1, 0, fields, portals)
    }
    async get(recordId: string) {}
    async list() {}
}