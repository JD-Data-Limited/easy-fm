
import { z } from "zod";

// --------------------------------------------------
// Primitive types and identifiers
// --------------------------------------------------

const EdmTypeSchema = z.enum([
    "Edm.String",
    "Edm.Boolean",
    "Edm.Byte",
    "Edm.SByte",
    "Edm.Int16",
    "Edm.Int32",
    "Edm.Int64",
    "Edm.Single",
    "Edm.Double",
    "Edm.Decimal",
    "Edm.Guid",
    "Edm.Binary",
    "Edm.Date",
    "Edm.TimeOfDay",
    "Edm.DateTimeOffset",
    "Edm.Duration",
]);

const FieldIdSchema = z.string()
    .regex(/^FMFID:\d+$/);

const TableIdSchema = z.string()
    .regex(/^FMTID:\d+$/);

const ScriptIdSchema = z.string()
    .regex(/^FMSID:\d+$/);

const PermissionSchema = z.enum([
    "Org.OData.Core.V1.Permission@Read",
    "Org.OData.Core.V1.Permission@Write",
    "Org.OData.Core.V1.Permission@ReadWrite",
    "Org.OData.Core.V1.Permission@None",
]);

// --------------------------------------------------
// Field metadata
// --------------------------------------------------

export const FieldSchema = z.strictObject({
    "@FieldID": FieldIdSchema,

    "$Type": EdmTypeSchema,

    "$Nullable": z.boolean().optional(),

    "$DefaultValue": z.string().optional(),

    "@Org.OData.Core.V1.Computed":
        z.boolean().optional(),

    "@Org.OData.Core.V1.Permissions":
        PermissionSchema.optional(),

    "@Index": z.boolean().optional(),

    "@VersionID": z.boolean().optional(),

    "@FMComment": z.string().optional(),
});

export type Field = z.infer<typeof FieldSchema>;

// --------------------------------------------------
// Entity types
// --------------------------------------------------

const EntityHeaderSchema = z.strictObject({
    $Kind: z.literal("EntityType"),

    "@TableID": TableIdSchema,

    $Key: z.array(z.string().min(1))
        .min(1),
});

export const EntityTypeSchema = z.object({
    $Kind: z.literal("EntityType"),
    "@TableID": TableIdSchema,
    $Key: z.array(z.string().min(1)).min(1),
})
    .catchall(z.unknown())
    .transform((raw, ctx) => {
        const fields: Record<string, Field> =
            Object.create(null);

        for (const [name, value] of Object.entries(raw)) {
            if (
                name === "$Kind" ||
                name === "@TableID" ||
                name === "$Key"
            ) {
                continue;
            }

            // Prevent unexpected entity-level properties.
            if (name.startsWith("$") || name.startsWith("@")) {
                ctx.addIssue({
                    code: "custom",
                    path: [name],
                    message: "Unsupported entity annotation",
                });
                continue;
            }

            const parsed = FieldSchema.safeParse(value);

            if (!parsed.success) {
                for (const issue of parsed.error.issues) {
                    ctx.addIssue({
                        code: "custom",
                        path: [name, ...issue.path],
                        message: issue.message,
                    });
                }
                continue;
            }

            fields[name] = parsed.data;
        }

        // Every primary key must refer to a real field.
        for (const key of raw.$Key) {
            if (!Object.hasOwn(fields, key)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["$Key"],
                    message: `Unknown primary key: ${key}`,
                });
            }
        }

        return {
            kind: "EntityType" as const,
            tableId: raw["@TableID"],
            keys: raw.$Key,
            fields,
        };
    });

export type EntityType =
    z.output<typeof EntityTypeSchema>;

// --------------------------------------------------
// FileMaker script actions
// --------------------------------------------------

const ActionParameterSchema = z.strictObject({
    $Name: z.string().min(1),
    $Type: EdmTypeSchema,
    $Nullable: z.boolean().optional(),
});

const ActionReturnSchema = z.strictObject({
    $Type: EdmTypeSchema,
    $Nullable: z.boolean().optional(),
});

export const ActionSchema = z.strictObject({
    $Kind: z.literal("Action"),

    "@ScriptID": ScriptIdSchema,

    $Parameter: z.array(
        ActionParameterSchema
    ).optional(),

    $ReturnType:
        ActionReturnSchema.optional(),
}).transform((raw) => ({
    kind: raw.$Kind,
    scriptId: raw["@ScriptID"],
    parameters: raw.$Parameter ?? [],
    returnType: raw.$ReturnType,
}));

export type Action =
    z.output<typeof ActionSchema>;

// --------------------------------------------------
// Entity sets
// --------------------------------------------------

export const EntitySetSchema = z.strictObject({
    $Kind: z.literal("EntitySet"),

    $Type: z.string()
        .regex(
            /^[A-Za-z_][A-Za-z0-9_.]*$/
        ),
}).transform((raw) => ({
    kind: raw.$Kind,
    entityType: raw.$Type,
}));

export type EntitySet =
    z.output<typeof EntitySetSchema>;

// --------------------------------------------------
// Namespace
// --------------------------------------------------

export interface Namespace {
    schemaVersion?: string;
    entityTypes: Record<string, EntityType>;
    actions: Record<string, Action>;
    entitySets: Record<string, EntitySet>;
}

export const NamespaceSchema = z.record(
    z.string(),
    z.unknown()
).transform((raw, ctx): Namespace => {
    const entityTypes: Record<string, EntityType> =
        Object.create(null);

    const actions: Record<string, Action> =
        Object.create(null);

    const entitySets: Record<string, EntitySet> =
        Object.create(null);

    const versionKey =
        "@Org.OData.Core.V1.SchemaVersion";

    let schemaVersion: string | undefined;

    if (Object.hasOwn(raw, versionKey)) {
        const version = z.string()
            .min(1)
            .safeParse(raw[versionKey]);

        if (!version.success) {
            ctx.addIssue({
                code: "custom",
                path: [versionKey],
                message: "Invalid schema version",
            });
        } else {
            schemaVersion = version.data;
        }
    }

    for (const [name, value] of Object.entries(raw)) {
        if (name === versionKey) {continue;}

        if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value) ||
            !Object.hasOwn(value, "$Kind")
        ) {
            ctx.addIssue({
                code: "custom",
                path: [name],
                message: "Invalid metadata definition",
            });
            continue;
        }

        const kind = Reflect.get(value, "$Kind");

        const schema =
            kind === "EntityType"
                ? EntityTypeSchema
                : kind === "Action"
                    ? ActionSchema
                    : kind === "EntitySet"
                        ? EntitySetSchema
                        : null;

        if (!schema) {
            ctx.addIssue({
                code: "custom",
                path: [name, "$Kind"],
                message: `Unsupported kind: ${String(kind)}`,
            });
            continue;
        }

        const parsed = schema.safeParse(value);

        if (!parsed.success) {
            for (const issue of parsed.error.issues) {
                ctx.addIssue({
                    code: "custom",
                    path: [name, ...issue.path],
                    message: issue.message,
                });
            }
            continue;
        }

        switch (parsed.data.kind) {
            case "EntityType":
                entityTypes[name] = parsed.data;
                break;

            case "Action":
                actions[name] = parsed.data;
                break;

            case "EntitySet":
                entitySets[name] = parsed.data;
                break;
        }
    }

    return {
        schemaVersion,
        entityTypes,
        actions,
        entitySets,
    };
});

// --------------------------------------------------
// Root OData metadata
// --------------------------------------------------

const CapabilitiesSchema = z.strictObject({
    "@Org.OData.Capabilities.V1.DereferenceableIDs":
        z.boolean().optional(),

    "@Org.OData.Capabilities.V1.ConventionalIDs":
        z.boolean().optional(),

    "@Org.OData.Capabilities.V1.ConformanceLevel":
        z.strictObject({
            $EnumMember: z.string().min(1),
        }).optional(),

    "@Org.OData.Capabilities.V1.SupportedFormats":
        z.array(z.string()).optional(),

    "Org.OData.Capabilities.V1.AsynchronousRequestsSupported":
        z.boolean().optional(),

    "Org.OData.Capabilities.V1.BatchContinueOnErrorSupported":
        z.boolean().optional(),

    "Org.OData.Capabilities.V1.BatchContentIdReferencingInRequestBodiesSupported":
        z.boolean().optional(),

    "@Org.OData.Capabilities.V1.FilterFunctions":
        z.array(z.string()).optional(),

    "@Org.OData.Aggregation.V1.ApplySupportedDefaults":
        z.strictObject({
            Transformations: z.array(z.string()),
        }).optional(),
});

const ROOT_KEYS = new Set([
    "$Version",
    "@ServerVersion",
    ...Object.keys(CapabilitiesSchema.shape),
]);

export const FileMakerMetadataSchema = z.object({
    $Version: z.literal("4.01"),
    "@ServerVersion": z.string().min(1),
})
    .catchall(z.unknown())
    .transform((raw, ctx) => {
        const namespaces: Record<string, Namespace> =
            Object.create(null);

        const capabilityValues: Record<string, unknown> =
            Object.create(null);

        for (const [key, value] of Object.entries(raw)) {
            if (key === "$Version" || key === "@ServerVersion") {
                continue;
            }

            if (ROOT_KEYS.has(key)) {
                capabilityValues[key] = value;
                continue;
            }

            // Unknown root annotations are rejected.
            if (key.startsWith("@") || key.startsWith("$")) {
                ctx.addIssue({
                    code: "custom",
                    path: [key],
                    message: "Unknown root annotation",
                });
                continue;
            }

            const parsed = NamespaceSchema.safeParse(value);

            if (!parsed.success) {
                for (const issue of parsed.error.issues) {
                    ctx.addIssue({
                        code: "custom",
                        path: [key, ...issue.path],
                        message: issue.message,
                    });
                }
                continue;
            }

            namespaces[key] = parsed.data;
        }

        const capabilities =
            CapabilitiesSchema.safeParse(capabilityValues);

        if (!capabilities.success) {
            for (const issue of capabilities.error.issues) {
                ctx.addIssue({
                    code: "custom",
                    path: [...issue.path],
                    message: issue.message,
                });
            }
        }

        if (Object.keys(namespaces).length === 0) {
            ctx.addIssue({
                code: "custom",
                message: "No valid OData namespaces found",
            });
        }

        // Validate entity set references.
        for (const [namespaceName, namespace] of
            Object.entries(namespaces)) {

            for (const [setName, entitySet] of
                Object.entries(namespace.entitySets)) {

                const type = entitySet.entityType;

                const separator = type.lastIndexOf(".");

                const referencedNamespace =
                    type.slice(0, separator);

                const entityName =
                    type.slice(separator + 1);

                const targetNamespace =
                    namespaces[referencedNamespace];

                if (
                    separator < 1 ||
                    !targetNamespace ||
                    !Object.hasOwn(
                        targetNamespace.entityTypes,
                        entityName
                    )
                ) {
                    ctx.addIssue({
                        code: "custom",
                        path: [namespaceName, setName, "$Type"],
                        message: `Unknown entity type: ${type}`,
                    });
                }
            }
        }

        return {
            version: raw.$Version,
            serverVersion: raw["@ServerVersion"],
            namespaces,
            capabilities: capabilities.success
                ? capabilities.data
                : undefined,
        };
    });

export type FileMakerMetadata =
    z.output<typeof FileMakerMetadataSchema>;

// --------------------------------------------------
// Secure parsing entry point
// --------------------------------------------------

export function parseFileMakerMetadata(
    input: unknown
): FileMakerMetadata {
    return FileMakerMetadataSchema.parse(input);
}

export const ODataFieldData = z.object({
    "@id": z.string(),
    "@editLink": z.string(),
}).catchall(z.string())