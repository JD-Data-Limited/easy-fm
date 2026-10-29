import {z} from "zod";
import {FileMakerMetadataSchema, NamespaceSchema} from "../models/odataResults.js";

/**
 * ODataMetadata takes in a raw OData metadata object as input, and provides utlity functions for reading it.
 */
export class ODataMetadata {
    readonly #namespaces: Map<string, ODataNamespaceMetadata>

    constructor(
        readonly raw: z.infer<typeof FileMakerMetadataSchema>,
        readonly databaseName: string
    ) {
        this.#namespaces = new Map(
            Object.entries(raw.namespaces).map(([key, value]) => [key, new ODataNamespaceMetadata(value, this)])
        );
    }

    get version() {
        return this.raw.version;
    }

    get serverVersion() {
        return this.raw.serverVersion;
    }


    getNamespace(namespace: string, guarntee: true): ODataNamespaceMetadata
    getNamespace(namespace: string, guarntee?: false | boolean): ODataNamespaceMetadata | undefined
    getNamespace(namespaceName: string, guarntee?: boolean) {
        const namespace = this.#namespaces.get(namespaceName)
        if (!namespace && guarntee) {throw new Error(`Namespace ${namespaceName} doesn't exist`)}
        return namespace
    }

    getThisNamespace(guarntee: true): ODataNamespaceMetadata
    getThisNamespace(guarntee?: false | boolean): ODataNamespaceMetadata | undefined
    getThisNamespace(guarntee?: boolean) {
        return this.getNamespace(this.databaseName, guarntee)
    }

    test() {
        this.getNamespace("test")?.getTypeForEntitySet("test");
    }
}

export class ODataNamespaceMetadata {
    readonly meta: z.infer<typeof NamespaceSchema>

    constructor(
        meta: z.infer<typeof NamespaceSchema>,
        readonly parent: ODataMetadata
    ) {
        this.meta = deepFreeze(meta)
    }

    getTypeForEntitySet(entitySet: string) {
        const entityType = this.meta.entitySets[entitySet].entityType;
        const [namespaceName, type] = entityType.split('.');

        /*
         In most cases the namespace should be 'this' namespace. But since the spec allows for it to reference a different namespace, we allow for it.
         */
        const namespace = this.parent.getNamespace(namespaceName);
        if (!namespace) throw new Error(`Failed to fetch type for entity set ${entitySet}. Set references unknown namespace ${namespaceName}`);
        return namespace.meta.entityTypes[type]
    }
}

function deepFreeze<T>(obj: T) {
    if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
        Object.values(obj).forEach(deepFreeze);
        Object.freeze(obj);
    }
    return obj;
}