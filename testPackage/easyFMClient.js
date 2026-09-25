import { FMHost, TextField, DateField, TimeField, TimeStampField, ContainerField } from "@jd-data-limited/easy-fm";
const HOST = new FMHost();
const DATABASE = HOST.database < {
    "EasyFMBenchmark": {
        "OneVeryLongField": TextField,
        "PrimaryKey": TextField,
        "CreationTimestamp": TimeStampField,
        "Date": DateField,
        "Time": TimeField,
        "Timestamp": TimeStampField,
        "Container": ContainerField,
        "AVeryStrictField": TextField
    },
    "Specimen": { "TaxonomyID": TextField, "OriginID": TextField },
    "Taxonomy": { "Name": TextField, "PrimaryKey": TextField },
    "Origin": { "Country": TextField, "PrimaryKey": TextField }
} > ();
