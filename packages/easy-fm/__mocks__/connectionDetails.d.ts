import FMHost, {
    ContainerField,
    type Database,
    DateField,
    type LayoutInterface,
    type Portal,
    TextField,
    TimeField,
    TimeStampField
} from '../dist/index.js';

export declare const DATABASE_HOST: string;
export declare const DATABASE_NAME: string;
export declare const DATABASE_ACCOUNT: string;
export declare const DATABASE_PASSWORD: string;
export declare const HOST: FMHost;
export interface EasyFMBenchmarkLayout extends LayoutInterface {
    fields: {
        Container: ContainerField;
        OneVeryLongField: TextField;
        PrimaryKey: TextField;
        AVeryStrictField: TextField;
        CreationTimestamp: TimeStampField;
        Date: DateField;
        Time: TimeField;
        Timestamp: TimeStampField;
    };
    portals: {
        test: Portal<{
            field1: TextField;
        }>;
    };
}
export type DatabaseSchema = {
    layouts: {
        EasyFMBenchmark: EasyFMBenchmarkLayout;
    };
};
export declare const DATABASE: Database<DatabaseSchema>;
