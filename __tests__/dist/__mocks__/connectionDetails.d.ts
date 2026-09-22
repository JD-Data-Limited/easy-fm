import {type Container, type Field, type Portal} from '../dist/index.js';

export declare const DATABASE_HOST: string;
export declare const DATABASE_NAME: string;
export declare const DATABASE_ACCOUNT: string;
export declare const DATABASE_PASSWORD: string;
export declare const HOST: any;
export interface DatabaseSchema {
    layouts: {
        EasyFMBenchmark: {
            fields: {
                Container: Field<Container>;
                OneVeryLongField: Field<string>;
                PrimaryKey: Field<string>;
                AVeryStrictField: Field<string>;
            };
            portals: {
                test: Portal<{
                    field1: Field<string>;
                }>;
            };
        };
    };
}
export declare const DATABASE: any;
