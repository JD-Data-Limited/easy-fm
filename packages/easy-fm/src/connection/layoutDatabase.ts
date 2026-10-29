import {Layout} from "../layouts/layout.js";
import type {LayoutInterface} from "../layouts/layoutInterface.js";
import type {Script} from "../types.js";
import {Database} from "./database.js";

interface LayoutDatabaseStructure {
    layouts: Record<string, LayoutInterface>;
}

/** Database API for providers whose records are addressed through layouts. */
export class LayoutDatabase<
    T extends LayoutDatabaseStructure = LayoutDatabaseStructure,
> extends Database {
    readonly #layoutCache = new Map<string, Layout<LayoutInterface>>();

    async listLayouts(page = 0) {
        const {value} = await this.execute({type: 'layout.list', page});
        return value.map((name) => new Layout(this, name));
    }

    layout<R extends keyof T['layouts']>(name: R): Layout<T['layouts'][R]>;
    layout<R extends LayoutInterface>(name: string): Layout<R>;
    layout(name: string): Layout<any> {
        let layout = this.#layoutCache.get(name);
        if (!layout) {
            layout = new Layout<LayoutInterface>(this, name);
            this.#layoutCache.set(name, layout);
        }

        return layout;
    }

    clearLayoutCache() {
        this.#layoutCache.clear();
    }

    script(name: string, parameter = ''): Script {
        return {name, parameter};
    }
}