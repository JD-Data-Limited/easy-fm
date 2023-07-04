/*
 * Copyright (c) 2022-2023. See LICENSE file for more information
 */

// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
import fetch, {
    Blob,
    blobFrom,
    blobFromSync,
    File,
    fileFrom,
    fileFromSync,
    FormData,
    Headers, HeadersInit,
    Request,
    Response
} from 'node-fetch';
import {EventEmitter} from "events";
// @ts-ignore
import * as moment from "moment"
import * as http from "http";
import * as https from "https";

// import * as btoa from "btoa";
interface databaseOptionsBase {
    database: string
    credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken,
}

interface databaseOptionsWithExternalSources extends databaseOptionsBase {
    database: string
    credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris | loginOptionsToken,
    externalSources: databaseOptionsBase[]
}

interface loginOptionsToken {
    method: "token"
    token: string
}

interface loginOptionsOAuth {
    method: "oauth"
    oauth: {
        requestId: string,
        requestIdentifier: string
    }
}

interface loginOptionsFileMaker {
    method: "filemaker"
    username: string,
    password: string,
}

interface loginOptionsClaris {
    method: "claris"
    claris: {
        fmid: string
    }
}

interface limitPortalsInterface {
    portal: Portal,
    offset: number,
    limit: number
}

interface extraBodyOptions {
    scripts?: {
        prerequest?: Script,
        presort?: Script,
        after?: Script,
    }
}

export enum DOWNLOAD_MODES {
    Stream,
    Buffer
}

// @ts-ignore
const errs = [
    {
        "e": -1,
        "d": "Unknown error"
    },
    {
        "e": 0,
        "d": "No error"
    },
    {
        "e": 1,
        "d": "User canceled action"
    },
    {
        "e": 2,
        "d": "Memory error"
    },
    {
        "e": 3,
        "d": "Command is unavailable (for example, wrong operating system or mode)"
    },
    {
        "e": 4,
        "d": "Command is unknown"
    },
    {
        "e": 5,
        "d": "Command is invalid (for example, a Set Field script step does not have a calculation specified)"
    },
    {
        "e": 6,
        "d": "File is read-only"
    },
    {
        "e": 7,
        "d": "Running out of memory"
    },
    {
        "e": 8,
        "d": "Empty result"
    },
    {
        "e": 9,
        "d": "Insufficient privileges"
    },
    {
        "e": 10,
        "d": "Requested data is missing"
    },
    {
        "e": 11,
        "d": "Name is not valid"
    },
    {
        "e": 12,
        "d": "Name already exists"
    },
    {
        "e": 13,
        "d": "File or object is in use"
    },
    {
        "e": 14,
        "d": "Out of range"
    },
    {
        "e": 15,
        "d": "Can't divide by zero"
    },
    {
        "e": 16,
        "d": "Operation failed; request retry (for example, a user query)"
    },
    {
        "e": 17,
        "d": "Attempt to convert foreign character set to UTF-16 failed"
    },
    {
        "e": 18,
        "d": "Client must provide account information to proceed"
    },
    {
        "e": 19,
        "d": "String contains characters other than A-Z, a-z, 0-9 (ASCII)"
    },
    {
        "e": 20,
        "d": "Command/operation canceled by triggered script"
    },
    {
        "e": 21,
        "d": "Request not supported (for example, when creating a hard link on a file system that does not support hard links)"
    },
    {
        "e": 100,
        "d": "File is missing"
    },
    {
        "e": 101,
        "d": "Record is missing"
    },
    {
        "e": 102,
        "d": "Field is missing"
    },
    {
        "e": 103,
        "d": "Relationship is missing"
    },
    {
        "e": 104,
        "d": "Script is missing"
    },
    {
        "e": 105,
        "d": "Layout is missing"
    },
    {
        "e": 106,
        "d": "Table is missing"
    },
    {
        "e": 107,
        "d": "Index is missing"
    },
    {
        "e": 108,
        "d": "Value list is missing"
    },
    {
        "e": 109,
        "d": "Privilege set is missing"
    },
    {
        "e": 110,
        "d": "Related tables are missing"
    },
    {
        "e": 111,
        "d": "Field repetition is invalid"
    },
    {
        "e": 112,
        "d": "Window is missing"
    },
    {
        "e": 113,
        "d": "Function is missing"
    },
    {
        "e": 114,
        "d": "File reference is missing"
    },
    {
        "e": 115,
        "d": "Menu set is missing"
    },
    {
        "e": 116,
        "d": "Layout object is missing"
    },
    {
        "e": 117,
        "d": "Data source is missing"
    },
    {
        "e": 118,
        "d": "Theme is missing"
    },
    {
        "e": 130,
        "d": "Files are damaged or missing and must be reinstalled"
    },
    {
        "e": 131,
        "d": "Language pack files are missing"
    },
    {
        "e": 200,
        "d": "Record access is denied"
    },
    {
        "e": 201,
        "d": "Field cannot be modified"
    },
    {
        "e": 202,
        "d": "Field access is denied"
    },
    {
        "e": 203,
        "d": "No records in file to print, or password doesn't allow print access"
    },
    {
        "e": 204,
        "d": "No access to field(s) in sort order"
    },
    {
        "e": 205,
        "d": "User does not have access privileges to create new records; import will overwrite existing data"
    },
    {
        "e": 206,
        "d": "User does not have password change privileges, or file is not modifiable"
    },
    {
        "e": 207,
        "d": "User does not have privileges to change database schema, or file is not modifiable"
    },
    {
        "e": 208,
        "d": "Password does not contain enough characters"
    },
    {
        "e": 209,
        "d": "New password must be different from existing one"
    },
    {
        "e": 210,
        "d": "User account is inactive"
    },
    {
        "e": 211,
        "d": "Password has expired "
    },
    {
        "e": 212,
        "d": "Invalid user account and/or password; please try again"
    },
    {
        "e": 214,
        "d": "Too many login attempts"
    },
    {
        "e": 215,
        "d": "Administrator privileges cannot be duplicated"
    },
    {
        "e": 216,
        "d": "Guest account cannot be duplicated"
    },
    {
        "e": 217,
        "d": "User does not have sufficient privileges to modify administrator account"
    },
    {
        "e": 218,
        "d": "Password and verify password do not match"
    },
    {
        "e": 300,
        "d": "File is locked or in use"
    },
    {
        "e": 301,
        "d": "Record is in use by another user"
    },
    {
        "e": 302,
        "d": "Table is in use by another user"
    },
    {
        "e": 303,
        "d": "Database schema is in use by another user"
    },
    {
        "e": 304,
        "d": "Layout is in use by another user"
    },
    {
        "e": 306,
        "d": "Record modification ID does not match"
    },
    {
        "e": 307,
        "d": "Transaction could not be locked because of a communication error with the host"
    },
    {
        "e": 308,
        "d": "Theme is locked and in use by another user"
    },
    {
        "e": 400,
        "d": "Find criteria are empty"
    },
    {
        "e": 401,
        "d": "No records match the request"
    },
    {
        "e": 402,
        "d": "Selected field is not a match field for a lookup"
    },
    {
        "e": 404,
        "d": "Sort order is invalid"
    },
    {
        "e": 405,
        "d": "Number of records specified exceeds number of records that can be omitted"
    },
    {
        "e": 406,
        "d": "Replace/reserialize criteria are invalid"
    },
    {
        "e": 407,
        "d": "One or both match fields are missing (invalid relationship)"
    },
    {
        "e": 408,
        "d": "Specified field has inappropriate data type for this operation"
    },
    {
        "e": 409,
        "d": "Import order is invalid"
    },
    {
        "e": 410,
        "d": "Export order is invalid"
    },
    {
        "e": 412,
        "d": "Wrong version of FileMaker Pro Advanced used to recover file"
    },
    {
        "e": 413,
        "d": "Specified field has inappropriate field type"
    },
    {
        "e": 414,
        "d": "Layout cannot display the result"
    },
    {
        "e": 415,
        "d": "One or more required related records are not available"
    },
    {
        "e": 416,
        "d": "A primary key is required from the data source table"
    },
    {
        "e": 417,
        "d": "File is not a supported data source"
    },
    {
        "e": 418,
        "d": "Internal failure in INSERT operation into a field"
    },
    {
        "e": 500,
        "d": "Date value does not meet validation entry options"
    },
    {
        "e": 501,
        "d": "Time value does not meet validation entry options"
    },
    {
        "e": 502,
        "d": "Number value does not meet validation entry options"
    },
    {
        "e": 503,
        "d": "Value in field is not within the range specified in validation entry options"
    },
    {
        "e": 504,
        "d": "Value in field is not unique, as required in validation entry options"
    },
    {
        "e": 505,
        "d": "Value in field is not an existing value in the file, as required in validation entry options"
    },
    {
        "e": 506,
        "d": "Value in field is not listed in the value list specified in validation entry option"
    },
    {
        "e": 507,
        "d": "Value in field failed calculation test of validation entry option"
    },
    {
        "e": 508,
        "d": "Invalid value entered in Find mode"
    },
    {
        "e": 509,
        "d": "Field requires a valid value"
    },
    {
        "e": 510,
        "d": "Related value is empty or unavailable"
    },
    {
        "e": 511,
        "d": "Value in field exceeds maximum field size"
    },
    {
        "e": 512,
        "d": "Record was already modified by another user"
    },
    {
        "e": 513,
        "d": "No validation was specified but data cannot fit into the field"
    },
    {
        "e": 600,
        "d": "Print error has occurred"
    },
    {
        "e": 601,
        "d": "Combined header and footer exceed one page"
    },
    {
        "e": 602,
        "d": "Body doesn't fit on a page for current column setup"
    },
    {
        "e": 603,
        "d": "Print connection lost"
    },
    {
        "e": 700,
        "d": "File is of the wrong file type for import"
    },
    {
        "e": 706,
        "d": "EPS file has no preview image"
    },
    {
        "e": 707,
        "d": "Graphic translator cannot be found"
    },
    {
        "e": 708,
        "d": "Can't import the file, or need color monitor support to import file"
    },
    {
        "e": 711,
        "d": "Import translator cannot be found"
    },
    {
        "e": 714,
        "d": "Password privileges do not allow the operation"
    },
    {
        "e": 715,
        "d": "Specified Excel worksheet or named range is missing"
    },
    {
        "e": 716,
        "d": "A SQL query using DELETE, INSERT, or UPDATE is not allowed for ODBC import"
    },
    {
        "e": 717,
        "d": "There is not enough XML/XSL information to proceed with the import or export"
    },
    {
        "e": 718,
        "d": "Error in parsing XML file (from Xerces)"
    },
    {
        "e": 719,
        "d": "Error in transforming XML using XSL (from Xalan)"
    },
    {
        "e": 720,
        "d": "Error when exporting; intended format does not support repeating fields"
    },
    {
        "e": 721,
        "d": "Unknown error occurred in the parser or the transformer"
    },
    {
        "e": 722,
        "d": "Cannot import data into a file that has no fields"
    },
    {
        "e": 723,
        "d": "You do not have permission to add records to or modify records in the target table"
    },
    {
        "e": 724,
        "d": "You do not have permission to add records to the target table"
    },
    {
        "e": 725,
        "d": "You do not have permission to modify records in the target table"
    },
    {
        "e": 726,
        "d": "Source file has more records than the target table; not all records were imported"
    },
    {
        "e": 727,
        "d": "Target table has more records than the source file; not all records were updated"
    },
    {
        "e": 729,
        "d": "Errors occurred during import; records could not be imported"
    },
    {
        "e": 730,
        "d": "Unsupported Excel version; convert file to the current Excel format and try again"
    },
    {
        "e": 731,
        "d": "File you are importing from contains no data"
    },
    {
        "e": 732,
        "d": "This file cannot be inserted because it contains other files"
    },
    {
        "e": 733,
        "d": "A table cannot be imported into itself"
    },
    {
        "e": 734,
        "d": "This file type cannot be displayed as a picture"
    },
    {
        "e": 735,
        "d": "This file type cannot be displayed as a picture; it will be inserted and displayed as a file"
    },
    {
        "e": 736,
        "d": "Too much data to export to this format; data will be truncated"
    },
    {
        "e": 738,
        "d": "The theme you are importing already exists"
    },
    {
        "e": 800,
        "d": "Unable to create file on disk"
    },
    {
        "e": 801,
        "d": "Unable to create temporary file on System disk"
    },
    {
        "e": 802,
        "d": "Unable to open file"
    },
    {
        "e": 803,
        "d": "File is single-user, or host cannot be found"
    },
    {
        "e": 804,
        "d": "File cannot be opened as read-only in its current state"
    },
    {
        "e": 805,
        "d": "File is damaged; use Recover command"
    },
    {
        "e": 806,
        "d": "File cannot be opened with this version of a FileMaker client"
    },
    {
        "e": 807,
        "d": "File is not a FileMaker Pro Advanced file or is severely damaged"
    },
    {
        "e": 808,
        "d": "Cannot open file because access privileges are damaged"
    },
    {
        "e": 809,
        "d": "Disk/volume is full"
    },
    {
        "e": 810,
        "d": "Disk/volume is locked"
    },
    {
        "e": 811,
        "d": "Temporary file cannot be opened as FileMaker Pro Advanced file"
    },
    {
        "e": 812,
        "d": "Exceeded host’s capacity"
    },
    {
        "e": 813,
        "d": "Record synchronization error on network"
    },
    {
        "e": 814,
        "d": "File(s) cannot be opened because maximum number is open"
    },
    {
        "e": 815,
        "d": "Couldn’t open lookup file"
    },
    {
        "e": 816,
        "d": "Unable to convert file"
    },
    {
        "e": 817,
        "d": "Unable to open file because it does not belong to this solution"
    },
    {
        "e": 819,
        "d": "Cannot save a local copy of a remote file"
    },
    {
        "e": 820,
        "d": "File is being closed"
    },
    {
        "e": 821,
        "d": "Host forced a disconnect"
    },
    {
        "e": 822,
        "d": "FileMaker Pro Advanced files not found; reinstall missing files"
    },
    {
        "e": 823,
        "d": "Cannot set file to single-user; guests are connected"
    },
    {
        "e": 824,
        "d": "File is damaged or not a FileMaker Pro Advanced file"
    },
    {
        "e": 825,
        "d": "File is not authorized to reference the protected file"
    },
    {
        "e": 826,
        "d": "File path specified is not a valid file path"
    },
    {
        "e": 827,
        "d": "File was not created because the source contained no data or is a reference"
    },
    {
        "e": 850,
        "d": "Path is not valid for the operating system"
    },
    {
        "e": 851,
        "d": "Cannot delete an external file from disk"
    },
    {
        "e": 852,
        "d": "Cannot write a file to the external storage"
    },
    {
        "e": 853,
        "d": "One or more containers failed to transfer"
    },
    {
        "e": 900,
        "d": "General spelling engine error"
    },
    {
        "e": 901,
        "d": "Main spelling dictionary not installed"
    },
    {
        "e": 903,
        "d": "Command cannot be used in a shared file"
    },
    {
        "e": 905,
        "d": "Command requires a field to be active"
    },
    {
        "e": 906,
        "d": "Current file is not shared; command can be used only if the file is shared"
    },
    {
        "e": 920,
        "d": "Cannot initialize the spelling engine"
    },
    {
        "e": 921,
        "d": "User dictionary cannot be loaded for editing"
    },
    {
        "e": 922,
        "d": "User dictionary cannot be found"
    },
    {
        "e": 923,
        "d": "User dictionary is read-only"
    },
    {
        "e": 951,
        "d": "An unexpected error occurred (*)"
    },
    {
        "e": 952,
        "d": "Invalid FileMaker Data API token (*)"
    },
    {
        "e": 953,
        "d": "Exceeded limit on data the FileMaker Data API can transmit (*)"
    },
    {
        "e": 954,
        "d": "Unsupported XML grammar (*)"
    },
    {
        "e": 955,
        "d": "No database name (*)"
    },
    {
        "e": 956,
        "d": "Maximum number of database sessions exceeded (*)"
    },
    {
        "e": 957,
        "d": "Conflicting commands (*)"
    },
    {
        "e": 958,
        "d": "Parameter missing (*)"
    },
    {
        "e": 959,
        "d": "Custom Web Publishing technology is disabled"
    },
    {
        "e": 960,
        "d": "Parameter is invalid"
    },
    {
        "e": 1200,
        "d": "Generic calculation error"
    },
    {
        "e": 1201,
        "d": "Too few parameters in the function"
    },
    {
        "e": 1202,
        "d": "Too many parameters in the function"
    },
    {
        "e": 1203,
        "d": "Unexpected end of calculation"
    },
    {
        "e": 1204,
        "d": "Number, text constant, field name, or \"(\" expected"
    },
    {
        "e": 1205,
        "d": "Comment is not terminated with \"*/\""
    },
    {
        "e": 1206,
        "d": "Text constant must end with a quotation mark"
    },
    {
        "e": 1207,
        "d": "Unbalanced parenthesis"
    },
    {
        "e": 1208,
        "d": "Operator missing, function not found, or \"(\" not expected"
    },
    {
        "e": 1209,
        "d": "Name (such as field name or layout name) is missing"
    },
    {
        "e": 1210,
        "d": "Plug-in function or script step has already been registered"
    },
    {
        "e": 1211,
        "d": "List usage is not allowed in this function"
    },
    {
        "e": 1212,
        "d": "An operator (for example, +, -, *) is expected here"
    },
    {
        "e": 1213,
        "d": "This variable has already been defined in the Let function"
    },
    {
        "e": 1214,
        "d": "Average, Count, Extend, GetRepetition, Max, Min, NPV, StDev, Sum, and GetSummary: expression found where a field alone is needed"
    },
    {
        "e": 1215,
        "d": "This parameter is an invalid Get function parameter"
    },
    {
        "e": 1216,
        "d": "Only summary fields are allowed as first argument in GetSummary"
    },
    {
        "e": 1217,
        "d": "Break field is invalid"
    },
    {
        "e": 1218,
        "d": "Cannot evaluate the number"
    },
    {
        "e": 1219,
        "d": "A field cannot be used in its own formula"
    },
    {
        "e": 1220,
        "d": "Field type must be normal or calculated"
    },
    {
        "e": 1221,
        "d": "Data type must be number, date, time, or timestamp"
    },
    {
        "e": 1222,
        "d": "Calculation cannot be stored"
    },
    {
        "e": 1223,
        "d": "Function referred to is not yet implemented"
    },
    {
        "e": 1224,
        "d": "Function referred to does not exist"
    },
    {
        "e": 1225,
        "d": "Function referred to is not supported in this context"
    },
    {
        "e": 1300,
        "d": "The specified name can't be used"
    },
    {
        "e": 1301,
        "d": "A parameter of the imported or pasted function has the same name as a function in the file"
    },
    {
        "e": 1400,
        "d": "ODBC client driver initialization failed; make sure ODBC client drivers are properly installed"
    },
    {
        "e": 1401,
        "d": "Failed to allocate environment (ODBC)"
    },
    {
        "e": 1402,
        "d": "Failed to free environment (ODBC)"
    },
    {
        "e": 1403,
        "d": "Failed to disconnect (ODBC)"
    },
    {
        "e": 1404,
        "d": "Failed to allocate connection (ODBC)"
    },
    {
        "e": 1405,
        "d": "Failed to free connection (ODBC)"
    },
    {
        "e": 1406,
        "d": "Failed check for SQL API (ODBC)"
    },
    {
        "e": 1407,
        "d": "Failed to allocate statement (ODBC)"
    },
    {
        "e": 1408,
        "d": "Extended error (ODBC)"
    },
    {
        "e": 1409,
        "d": "Error (ODBC)"
    },
    {
        "e": 1413,
        "d": "Failed communication link (ODBC)"
    },
    {
        "e": 1414,
        "d": "SQL statement is too long"
    },
    {
        "e": 1450,
        "d": "Action requires PHP privilege extension (*)"
    },
    {
        "e": 1451,
        "d": "Action requires that current file be remote"
    },
    {
        "e": 1501,
        "d": "SMTP authentication failed"
    },
    {
        "e": 1502,
        "d": "Connection refused by SMTP server"
    },
    {
        "e": 1503,
        "d": "Error with SSL"
    },
    {
        "e": 1504,
        "d": "SMTP server requires the connection to be encrypted"
    },
    {
        "e": 1505,
        "d": "Specified authentication is not supported by SMTP server"
    },
    {
        "e": 1506,
        "d": "Email message(s) could not be sent successfully"
    },
    {
        "e": 1507,
        "d": "Unable to log in to the SMTP server"
    },
    {
        "e": 1550,
        "d": "Cannot load the plug-in, or the plug-in is not a valid plug-in"
    },
    {
        "e": 1551,
        "d": "Cannot install the plug-in; cannot delete an existing plug-in or write to the folder or disk"
    },
    {
        "e": 1552,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1553,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1554,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1555,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1556,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1557,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1558,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1559,
        "d": "Returned by plug-ins; see the documentation that came with the plug-in"
    },
    {
        "e": 1626,
        "d": "Protocol is not supported"
    },
    {
        "e": 1627,
        "d": "Authentication failed"
    },
    {
        "e": 1628,
        "d": "There was an error with SSL"
    },
    {
        "e": 1629,
        "d": "Connection timed out; the timeout value is 60 seconds"
    },
    {
        "e": 1630,
        "d": "URL format is incorrect"
    },
    {
        "e": 1631,
        "d": "Connection failed"
    },
    {
        "e": 1632,
        "d": "The certificate has expired"
    },
    {
        "e": 1633,
        "d": "The certificate is self-signed"
    },
    {
        "e": 1634,
        "d": "A certificate verification error occurred"
    },
    {
        "e": 1635,
        "d": "Connection is unencrypted"
    }
]

interface Script {
    name: string
    parameter: string
}

interface recordObject {
    recordId: number
    modId: number,
    fieldData: any,
    portalData?: portalDataObject
}

interface fileMakerResponse {
    response: any,
    messages: any[]
}

interface portalDataObject {
    [key: string]: recordObject
}

interface FieldMetaData {
    name: string,
    type: string,
    displayType: string,
    result: string,
    global: boolean,
    autoEnter: boolean,
    fourDigitYear: boolean,
    maxRepeat: number,
    maxCharacters: number,
    notEmpty: boolean,
    numeric: boolean,
    timeOfDay: false,
    repetitionStart: number,
    repetitionEnd: number
}

interface LayoutMetaData {
    fieldMetaData: FieldMetaData[],
    portalMetaData?: {
        [key: string]: FieldMetaData[]
    }
}

interface FMHostMetadata {
    productInfo: {
        buildDate: Date,
        name: string,
        version: string,
        dateFormat: string,
        timeFormat: string,
        timeStampFormat: string
    }
}

export interface ScriptResult {
    scriptError?: FMError,
    scriptResult?: string
}

export interface ContainerBufferResult {
    buffer: Buffer,
    mime: string,
    request: http.IncomingMessage
}
export default class FMHost {
    readonly hostname: string
    readonly timezoneOffset: number
    readonly verify: boolean
    metadata: FMHostMetadata

    constructor(_hostname: string, timezoneOffset = 0 - (new Date()).getTimezoneOffset(), verify = true) {
        if (!(/^https?:\/\//).test(_hostname)) throw "hostname MUST begin with either http:// or https://"
        this.hostname = _hostname
        this.timezoneOffset = timezoneOffset
        this.verify = verify
    }

    async listDatabases(credentials?: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris) {
        let headers = {}
        if (credentials) {
            headers = generateAuthorizationHeaders(credentials)
        }

        let _fetch = await fetch(`${this.hostname}/fmi/data/v2/databases`, {
            method: "GET",
            headers
        })
        let data = await _fetch.json() as fileMakerResponse
        // console.log(data.messages[0])

        if (data.messages[0].code === "0") {
            return data.response.databases
        }
        else {
            // @ts-ignore
            throw new FMError(data.messages[0].code, data.status, data)
        }
    }

    database(data: databaseOptionsWithExternalSources) {
        return new Database(this, data)
    }

    async getMetadata() {
        if (this.metadata) return this.metadata

        let _fetch = await fetch(`${this.hostname}/fmi/data/v2/productInfo`, {
            method: "GET",
        })
        let data = await _fetch.json() as fileMakerResponse
        // console.log(data.messages[0])

        if (data.messages[0].code === "0") {
            this.metadata = data.response
            return data.response
        }
        else {
            // @ts-ignore
            throw new FMError(data.messages[0].code, data.status, data)
        }
    }
}

export class Database extends EventEmitter {
    private _token: any;
    readonly host: FMHost;
    private connection_details: databaseOptionsWithExternalSources
    private cookies: { [key: string]: string } = {}
    readonly name: string;

    constructor(host: FMHost, conn: databaseOptionsWithExternalSources) {
        super()
        this.host = host
        this.name = conn.database
        this.connection_details = conn
    }

    private generateExternalSourceLogin(data: databaseOptionsBase) {
        if (data.credentials.method === "filemaker") {
            let _data = <loginOptionsFileMaker>data.credentials
            return {
                database: data.database,
                username: _data.username,
                password: _data.password
            }
        }
        else {
            throw "Not yet supported login method"
        }
    }

    logout(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!this.token) reject(new Error("Not logged in"))

            let _fetch = await fetch(`${this.endpoint}/sessions/${this.token}`, {
                method: "DELETE",
                headers: {
                    "content-type": "application/json"
                }
            })
            let data = await _fetch.json()
            // console.log(data)
            this._token = null
            resolve()
        })
    }

    login() {
        return new Promise<string>(async (resolve, reject) => {
            // Reset cookies
            this.cookies = {}

            try {
                await this.host.getMetadata()
            } catch (e) {
                reject(e)
                return
            }
            if (this.token) throw new Error("Already logged in. Run logout() first")

            if (this.connection_details.credentials.method === "token") {
                this._token = (<loginOptionsToken>this.connection_details.credentials).token
                resolve(this.token)
            }
            else {
                fetch(`${this.endpoint}/sessions`, {
                    hostname: this.host.hostname,
                    port: 443,
                    method: "POST",
                    headers: generateAuthorizationHeaders(this.connection_details.credentials) as unknown as HeadersInit,
                    body: JSON.stringify({
                        fmDataSource: this.connection_details.externalSources.map(i => {
                            let _i = <databaseOptionsBase>i
                            return this.generateExternalSourceLogin(_i)
                        })
                    })
                }).then(async res => {
                    let _res = <any>(await res.json())
                    if (res.status === 200) {
                        this._token = res.headers.get('x-fm-data-access-token')
                        resolve(this._token)
                    }
                    else {
                        reject(new FMError(_res.messages[0].code, _res.status, res))
                    }
                })
                    .catch(e => {
                        reject(e)
                    })
            }
        })
    }

    get token() {
        return this._token
    }

    get endpoint(): string {
        return `${this.host.hostname}/fmi/data/v2/databases/${this.name}`
    }

    async apiRequest(url: string | Request, options: any = {}, autoRelogin = true): Promise<any> {
        if (!options.headers) options.headers = {}
        options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json"
        options.headers["authorization"] = "Bearer " + this._token
        options.rejectUnauthorized = this.host.verify

        let _fetch = await fetch(url, options)
        if (_fetch.headers.get('set-cookie')) {
            for (let cookie of _fetch.headers.get('set-cookie')) {
                let cookie_split = cookie.split("=")
                this.cookies[cookie_split[0]] = cookie_split[1]
            }
        }
        let data = await _fetch.json() as fileMakerResponse
        // console.log(data.messages[0])
        if (data.messages[0].code == 952 && autoRelogin) {
            this._token = null
            await this.login()
            return await this.apiRequest(url, options, false)
        }
        return (data as any)
    }

    getLayout(name): Layout {
        return new Layout(this, name)
    }

    setGlobals(globalFields): Promise<void> {
        // console.log({globalFields})
        return new Promise((resolve, reject) => {
            this.apiRequest(`${this.endpoint}/globals`, {
                method: "PATCH",
                body: JSON.stringify({globalFields})
            }).then(res => {
                // console.log(res)
                if (res.messages[0].code === "0") {
                    resolve()
                }
                else {
                    reject(
                        (res.messages[0].code, res.status, res))
                }
            })
                .catch(e => {
                    reject(e)
                })
        })
    }

    script(name, parameter = ""): Script {
        return ({name, parameter} as Script)
    }

    _tokenExpired() {
        this.emit("token_expired")
    }

    streamContainer(field, url): Promise<http.IncomingMessage> {
        return new Promise((resolve, reject) => {
            if (field.metadata.result !== "container") {
                reject("Cannot stream the field " + field.id + " as it is not a container")
                return
            }
            if (!url || typeof url !== "string") {
                reject("Container is empty, or has invalid value")
                return
            }

            let headers = {}
            if (Object.keys(this.cookies).length !== 0) {
                headers["Cookie"] = Object.keys(this.cookies)
                    .map(key => {
                        return key + "=" + this.cookies[key]
                    })
                    .join("; ")
            }

            // Automatically switch between the http and https modules, based on which is needed
            (url.startsWith("https") ? https : http).get(url, {
                headers
            }, (res) => {
                // Check for the 'set-cookie' header. If it exists, remember it and strip it for better security.
                if (res.headers['set-cookie']) {
                    for (let cookie of res.headers['set-cookie']) {
                        let cookie_split = cookie.split("=")
                        this.cookies[cookie_split[0]] = cookie_split[1]
                    }
                    res.headers['set-cookie'] = null
                }

                resolve(res)
            })
        })
    }
}

export class Layout {
    readonly database: Database;
    readonly records = new LayoutRecordManager(this)
    protected name: string;
    metadata: any;

    constructor(database: Database, name: string) {
        this.database = database
        this.name = name
    }

    get endpoint() {
        return `${this.database.endpoint}/layouts/${this.name}`
    }

    /**
     * @deprecated use layout.records.create() instead
     */
    createRecord(): Promise<LayoutRecord> {
        return this.records.create()
    }

    /**
     * @deprecated use layout.records.get() instead
     */
    getRecord(recordId): Promise<LayoutRecord> {
        return this.records.get(recordId)
    }

    /**
     * @deprecated use layout.records.find() instead
     */
    newFind(): Find {
        return this.records.find()
    }

    runScript(script): Promise<ScriptResult> {
        let trace = new Error()
        return new Promise(async (resolve, reject)  => {
            let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`
            if (script.parameter) url += "?script.param=" + encodeURIComponent(script.parameter)
            this.database.apiRequest(url, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        let error = parseInt(res.response.scriptError)
                        let msg: ScriptResult = {
                            scriptError: error ? new FMError(error, 200, res, trace) : undefined,
                            scriptResult: res.response.scriptResult
                        }
                        resolve(msg)
                    }
                    else {
                        // console.log(res)
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    public getLayoutMeta(): Promise<Layout | FMError> {
        return new Promise((resolve, reject) => {
            if (this.metadata) {
                resolve(this.metadata)
                return
            }

            this.database.apiRequest(this.endpoint).then(res => {
                this.metadata = res.response
                resolve(this)
            })
                .catch(e => reject(e))
        })
    }
}

class LayoutRecordManager {
    readonly layout: Layout

    constructor(layout: Layout) {
        this.layout = layout
    }

    create(): Promise<LayoutRecord> {
        return new Promise((resolve, reject) => {
            // Get the layout's metadata
            this.layout.getLayoutMeta().then(layout => {
                let fields = {}
                for (let _field of this.layout.metadata.fieldMetaData) {
                    fields[_field.name] = ""
                }
                let portals = {}
                for (let _portal of Object.keys(this.layout.metadata.portalMetaData)) portals[_portal] = []
                resolve(new LayoutRecord(this.layout, -1, 0, fields, portals))
            }).catch(e => {
                reject(e)
            })
        })
    }

    get(recordId): Promise<LayoutRecord> {
        return new Promise((resolve, reject) => {
            let record
            this.layout.getLayoutMeta()
                .then(layout => {
                    record = new LayoutRecord(this.layout, recordId)
                    return record.get()
                })
                .then(() => {
                    resolve(record)
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    range(start = 0, limit = 100) {
        return new RecordGetRange(this.layout, start, limit)
    }

    find(start = 0, limit = 100): Find {
        return new Find(this.layout, start, limit)
    }
}

export class RecordBase extends EventEmitter {
    readonly layout: Layout;
    public recordId: number;
    modId: number;
    fields: Field[];
    portals: Portal[] = [];
    protected portalData: any[];

    constructor(layout, recordId, modId = recordId) {
        super();
        this.layout = layout
        this.recordId = recordId
        this.modId = modId
    }

    get endpoint(): string {
        return `${this.layout.endpoint}/records/${this.recordId}`
    }

    get edited(): boolean {
        return !!this.fields.find(i => i.edited)
    }

    processFieldData(fieldData): Field[] {
        return Object.keys(fieldData).map(item => {
            let _field = new Field(this, item, fieldData[item])
            if (!!fieldData[item]) {
                if (_field.metadata.result === "timeStamp") {
                    // @ts-ignore
                    let date = moment.default(fieldData[item], this.layout.database.host.metadata.productInfo.timeStampFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date.toDate())
                    _field.edited = false

                }
                else if (_field.metadata.result === "time") {
                    // @ts-ignore
                    let date = moment.default(fieldData[item], this.layout.database.host.metadata.productInfo.timeFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date.toDate())
                    _field.edited = false
                }
                else if (_field.metadata.result === "date") {
                    // @ts-ignore
                    let date = moment.default(fieldData[item], this.layout.database.host.metadata.productInfo.dateFormat.replace("dd", "DD"))
                        .utcOffset(this.layout.database.host.timezoneOffset, true)
                        .local()
                    _field.set(date.toDate())
                    _field.edited = false
                }
            }
            return _field
        })
    }

    _onSave() {
        this.emit("saved")
        for (let field of this.fields) field.edited = false
    }

    getField(field) {
        return this.fields.find(_field => _field.id === field)
    }

    toObject(filter = (a) => a.edited,
             portalFilter = (a) => a.records.find(record => record.edited),
             portalRowFilter = (a) => a.edited,
             portalFieldFilter = (a) => a.edited
    ): recordObject {
        let fields_processed = {}
        for (let field of this.fields.filter(field => filter(field))) {
            let value = field.value
            if (value instanceof Date) {
                // @ts-ignore
                let _value = moment.default(value)
                    .utcOffset(this.layout.database.host.timezoneOffset)

                // @ts-ignore

                switch (field.metadata.result) {
                    case "time":
                        value = _value.format(this.layout.database.host.metadata.productInfo.timeFormat.replace("dd", "DD"))
                        break
                    case "date":
                        value = _value.format(this.layout.database.host.metadata.productInfo.dateFormat.replace("dd", "DD"))
                        break
                    default:
                        value = _value.format(this.layout.database.host.metadata.productInfo.timeStampFormat.replace("dd", "DD"))
                }
            }
            fields_processed[field.id] = value
        }
        let obj = {
            "recordId": this.recordId,
            "modId": this.modId,
            "fieldData": fields_processed
        }

        // Check if there's been any edited portal information
        let portals = this.portals.filter(a => portalFilter(a))
        if (portals) {
            obj["portalData"] = {}
            for (let portal of portals) {
                obj["portalData"][portal.name] = portal.records.filter(a => portalRowFilter(a)).map(record => {
                    return record.toObject(portalFieldFilter)
                })
            }
        }
        return obj
    }
}

export class LayoutRecord extends RecordBase {
    portals: Portal[];

    constructor(layout, recordId, modId = recordId, fieldData = {}, portalData = null) {
        super(layout, recordId, modId);
        this.fields = this.processFieldData(fieldData)
        this.portals = []
        if (portalData) {
            this.processPortalData(portalData)
        }
    }

    commit(extraBody: extraBodyOptions = {}): Promise<this> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            let data = this.toObject()
            delete data.recordId
            delete data.modId

            if (extraBody.scripts?.after) {
                data["script"] = extraBody.scripts.after.name
                if (extraBody.scripts.after.parameter) data["script.param"] = extraBody.scripts.after.parameter
            }
            if (extraBody.scripts?.prerequest) {
                data["script.prerequest"] = extraBody.scripts.after.name
                if (extraBody.scripts.prerequest.parameter) data["script.prerequest.param"] = extraBody.scripts.prerequest.parameter
            }
            if (extraBody.scripts?.presort) {
                data["script.presort"] = extraBody.scripts.presort.name
                if (extraBody.scripts.presort.parameter) data["script.presort.param"] = extraBody.scripts.presort.parameter
            }

            if (this.recordId === -1) {
                // This is a new LayoutRecord

                this.layout.database.apiRequest(`${this.layout.endpoint}/records`, {
                    port: 443,
                    method: "POST",
                    body: JSON.stringify(data)
                })
                    .then(res => {
                        if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                            reject(new FMError(res.response.scriptError, res.status, res, trace))
                        }
                        else if (res.messages[0].code === "0") {
                            this.recordId = parseInt(res.response.recordId)
                            this.modId = parseInt(res.response.modId)
                            resolve(this)
                        }
                        else {
                            reject(new FMError(res.messages[0].code, res.status, res, trace))
                        }
                    })
                    .catch(e => {
                        reject(e)
                    })

                return
            }

            // for (let item of Object.keys(data)) extraBody[item] = data[item]
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "PATCH",
                body: JSON.stringify(data)
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res, trace))
                    }
                    else if (res.messages[0].code === "0") {
                        this.modId = res.response.modId
                        this._onSave()
                        resolve(this)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    protected processPortalData(portalData): void {
        this.portals = []
        for (let item of Object.keys(portalData)) {
            let _portal = new Portal(this, item)
            _portal.records = portalData[item].map(item => {
                let fieldData = item;
                delete fieldData.recordId;
                delete fieldData.modId;
                return new PortalRecord(this, _portal, item.recordId, item.modId, fieldData);
            })
            this.portals.push(_portal);
        }
    }

    get(): Promise<this> {
        let trace = new Error()
        if (this.recordId === -1) {
            throw "Cannot get this RecordBase until a commit() is done."
        }
        return new Promise(async (resolve, reject) => {
            if (!this.layout.metadata) await this.layout.getLayoutMeta()

            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "GET"
            })
                .then(res => {
                    if (res.messages[0].code === "0") {
                        // console.log(res, res.response.data)
                        this.modId = res.response.data[0].modId
                        this.fields = this.processFieldData(res.response.data[0].fieldData)
                        this.portalData = []
                        if (res.response.data[0].portalData) this.processPortalData(res.response.data[0].portalData)
                        resolve(this)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    getPortal(portal) {
        return this.portals.find(p => p.name === portal)
    }

    duplicate(): Promise<LayoutRecord> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "POST"
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res, trace))
                    }
                    else if (res.messages[0].code === "0") {
                        let data = this.toObject((a) => true, (a) => true, (a) => false, (a) => false)
                        let _res = new LayoutRecord(this.layout, res.response.recordId, res.response.modId, data.fieldData, data.portalData)

                        this.emit("duplicated")
                        resolve(_res)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    delete(): Promise<void> {
        let trace = new Error()
        return new Promise(async (resolve, reject) => {
            this.layout.database.apiRequest(this.endpoint, {
                port: 443,
                method: "DELETE"
            })
                .then(res => {
                    if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== '0') {
                        reject(new FMError(res.response.scriptError, res.status, res, trace))
                    }
                    else if (res.messages[0].code === "0") {
                        this.emit("deleted")
                        resolve()
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }
}

export class Field {
    record: RecordBase;
    id: string;
    protected _value: string | number | Date;
    edited: boolean;

    constructor(record, id, contents) {
        this.record = record
        this.id = id
        this._value = contents
        this.edited = false
    }

    set(content: string | number | Date | undefined | null) {
        if (this.metadata.result === "container") throw "Cannot set container value using set(). Use upload() instead."
        if (
            (this.metadata.result === "timeStamp" ||
                this.metadata.result === "date" ||
                this.metadata.result === "time")
            && !(content instanceof Date) && !!content
        ) {
            throw "Value was not an instance of Date: " + content
        }
        if (!content) this._value = ""
        else this._value = content
        this.edited = true
    }

    get metadata(): FieldMetaData {
        if (!this.record.layout.metadata) {
            // Default to a regular text field
            return {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            } as FieldMetaData
        }
        if (this.record instanceof PortalRecord) {
            return this.record.layout.metadata.portalMetaData[this.record.portal.name || "portal not attached"].find(i => i.name === this.id) as FieldMetaData || {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            } as FieldMetaData
        }
        else {
            return this.record.layout.metadata.fieldMetaData.find(i => i.name === this.id) as FieldMetaData || {
                name: this.id.toString(),
                type: 'normal',
                displayType: 'editText',
                result: 'text',
                global: false,
                autoEnter: true,
                fourDigitYear: false,
                maxRepeat: 1,
                maxCharacters: 0,
                notEmpty: false,
                numeric: false,
                timeOfDay: false,
                repetitionStart: 1,
                repetitionEnd: 1
            } as FieldMetaData
        }
    }

    get value() {
        // if (this.metadata.result === "container") throw "Use await field.stream() to get the contents of a container field, instead of field.value"
        return this._value
    }

    get string(): string {
        if (typeof this._value === "string") {
            return this._value
        }
        throw "Field value is not a string"
    }

    get date(): Date {
        if (this._value instanceof Date) {
            return this._value
        }
        throw "Field value is not a date"
    }

    get number(): number {
        if (typeof this._value === "number") {
            return this._value
        }
        throw "Field value is not a number"
    }

    upload(buffer: Buffer, filename: string, mime: string): Promise<void> {
        let trace = new Error()
        if (this.metadata.result !== "container") throw "Cannot upload a file to the field; " + this.id + " (not a container field)"
        return new Promise(async (resolve, reject) => {
            let form = new FormData()
            form.append("upload", new File([buffer], filename, {type: mime}))

            let _fetch = await fetch(`${this.record.endpoint}/containers/${this.id}/1`, {
                method: "POST",
                headers: {"Authorization": "Bearer " + this.record.layout.database.token},
                body: form
            }).then(res => res.json())
                .then(data => {
                    let _res = data as any
                    if (_res.messages[0].code === "0") {
                        resolve()
                    }
                    else {
                        reject(new FMError(_res.messages[0].code, _res.status, data, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }

    download(mode: DOWNLOAD_MODES.Stream): Promise<http.IncomingMessage>
    download(mode: DOWNLOAD_MODES.Buffer): Promise<ContainerBufferResult>
    download(mode: DOWNLOAD_MODES = DOWNLOAD_MODES.Stream): Promise<http.IncomingMessage | ContainerBufferResult> {
        return new Promise((resolve, reject) => {
            this.record.layout.database.streamContainer(this, this._value)
                .then(stream => {
                    if (mode === DOWNLOAD_MODES.Stream) {
                        resolve(stream)
                        return
                    }

                    let body = []
                    stream.on("data", chunk => {
                        body.push(chunk)
                    })
                    stream.on("error", (e) => {
                        reject(e)
                    })
                    stream.on("end", () => {
                        resolve({
                            buffer: Buffer.concat(body),
                            mime: stream.headers["content-type"],
                            request: stream
                        } as ContainerBufferResult)
                    })
                })
                .catch(e => {
                    reject(e)
                })
        })
    }
}

export class Portal {
    readonly record: LayoutRecord;
    readonly name: string;
    public records: PortalRecord[];

    constructor(record: LayoutRecord, name: string) {
        this.record = record
        this.name = name
    }

    create() {
        let fields = {}
        for (let _field of this.record.layout.metadata.portalMetaData[this.name]) {
            fields[_field.name] = ""
        }
        let record = new PortalRecord(this.record, this, -1, -1, fields)
        this.records.push(record)
        return record
    }
}

export class PortalRecord extends RecordBase {
    readonly portal: Portal;

    constructor(record, portal, recordId, modId = recordId, fieldData = {}) {
        super(record.layout, recordId, modId);

        this.portal = portal
        this.fields = this.processFieldData(fieldData)
    }

    _onSave() {
        super._onSave();
        this.portal.record._onSave()
    }

    commit(extraBody: extraBodyOptions = {}) {
        return this.portal.record.commit(extraBody)
    }

    toObject(fieldFilter): any {
        super.toObject()
        let res = {
            recordId: this.recordId === -1 ? undefined : this.recordId, modId: this.modId === - 1 ? undefined : this.modId
        } as recordObject
        for (let field of this.fields.filter(a => fieldFilter(a))) res[field.id] = field.value
        // console.log(res)
        return res
    }

    getField(field) {
        return this.fields.find(_field => _field.id === field) || this.fields.find(_field => _field.id === this.portal.name + "::" + field)
    }
}

export class RecordGetOperation {
    protected layout: Layout
    protected limit: number = 100
    protected scripts: object
    protected sort: object[]
    protected limitPortals: limitPortalsInterface[] = []
    protected offset: number = 0

    constructor(layout) {
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
    addToPortalLimit(portal: Portal, offset = 0, limit = 100) {
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

export class RecordGetRange extends RecordGetOperation {
    constructor(layout, start = 0, limit = 100) {
        super(layout)
        this.setOffset(start)
        this.setLimit(limit)
    }

    private generateQueryParams(extraBody: extraBodyOptions = {}) {
        let params = []
        if (this.limit !== 100) params.push("_limit=" + this.limit)
        if (this.offset !== 0) params.push("_offset=" + this.offset)
        if (this.sort.length > 0) params.push("_sort=" + encodeURI(JSON.stringify(this.sort)))
        if (this.limitPortals.length > 0) {
            params.push("portal=" + encodeURI(JSON.stringify(this.limitPortals.map(p => p.portal.name))))
            for (let item of this.limitPortals) {
                if (item.offset !== 0) params.push("_offset." + item.portal.name.replace(/[^0-9A-z]/g, "") + "=" + item.offset)
                if (item.limit !== 100) params.push("_limit." + item.portal.name.replace(/[^0-9A-z]/g, "") + "=" + item.limit)
            }
        }
        if (extraBody.scripts) {
            if (extraBody.scripts.prerequest) {
                params.push("script.prerequest=" + extraBody.scripts.prerequest.name)
                if (extraBody.scripts.prerequest.parameter) params.push("script.prerequest.param=" + extraBody.scripts.prerequest.parameter)
            }
            if (extraBody.scripts.presort) {
                params.push("script.presort=" + extraBody.scripts.presort.name)
                if (extraBody.scripts.presort.parameter) params.push("script.presort.param=" + extraBody.scripts.presort.parameter)
            }
            if (extraBody.scripts.after) {
                params.push("script=" + extraBody.scripts.after.name)
                if (extraBody.scripts.after.parameter) params.push("script.param=" + extraBody.scripts.after.parameter)
            }
        }

        if (params.length === 0) return ""
        return "?" + params.join("&")
    }

    /**
     * @deprecated in favour of .fetch()
     */
    run(extraBody: extraBodyOptions = {}): Promise<LayoutRecord[]> {
        return this.fetch(extraBody)
    }

    fetch(extraBody: extraBodyOptions = {}): Promise<LayoutRecord[]> {
        let trace = new Error()
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.getLayoutMeta().then(() => {
                return this.layout.database.apiRequest(`${this.layout.endpoint}/records${this.generateQueryParams(extraBody)}`, {
                    method: "GET"
                })
            })
                .then(async res => {
                    // // console.log(res)
                    if (res.messages[0].code === "0") {
                        // console.log("RESOLVING")
                        if (!this.layout.metadata) await this.layout.getLayoutMeta()
                        let data = res.response.data.map(item => {
                            return new LayoutRecord(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
                        })
                        resolve(data)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }
}

export class Find extends RecordGetOperation {
    protected queries: object[]

    constructor(layout, start = 0, limit = 100) {
        super(layout)
        this.setOffset(start)
        this.setLimit(limit)
        this.queries = []
    }

    private toObject() {
        let out = {query: this.queries, sort: undefined}
        if (this.sort.length !== 0) out.sort = this.sort

        for (let item of Object.keys(this.scripts)) {
            if (this.scripts[item]) {
                out[item] = this.scripts[item].name
                if (this.scripts[item].parameter) out[item + ".param"] = this.scripts[item].parameter
            }
        }

        if (this.limit !== 100) out["limit"] = this.limit
        if (this.offset !== 0) out["offset"] = this.offset
        if (this.limitPortals.length > 0) {
            out["portal"] = this.limitPortals.map(p => p.portal.name)
            for (let item of this.limitPortals) {
                out["offset." + item.portal.name.replace(/[^0-9A-z]/g, "")] = item.offset
                out["limit." + item.portal.name.replace(/[^0-9A-z]/g, "")] = item.limit
            }
        }

        return out
    }

    addRequests(...requests) {
        for (let item of requests) this.queries.push(item)
        return this
    }

    /**
     * @deprecated in favour of .fetch()
     */
    run() {
        return this.fetch()
    }

    fetch(): Promise<LayoutRecord[]> {
        let trace = new Error()
        return new Promise((resolve, reject) => {
            // console.log(this.#toObject())
            this.layout.getLayoutMeta()
                .then(() => {
                    return this.layout.database.apiRequest(`${this.layout.endpoint}/_find`, {
                        port: 443,
                        method: "POST",
                        body: JSON.stringify(this.toObject())
                    })
                })
                .then(async res => {
                    // // console.log(res)
                    if (res.messages[0].code === "0") {
                        // console.log("RESOLVING")
                        if (!this.layout.metadata) await this.layout.getLayoutMeta()
                        let data = res.response.data.map(item => {
                            return new LayoutRecord(this.layout, item.recordId, item.modId, item.fieldData, item.portalData)
                        })
                        resolve(data)
                    }
                    else {
                        reject(new FMError(res.messages[0].code, res.status, res, trace))
                    }
                })
                .catch(e => {
                    reject(e)
                })
        })
    }
}

export class FMError extends Error {
    readonly httpStatus: number
    readonly res: any
    readonly code: number
    readonly message: string
    readonly messages: string

    constructor(code, httpStatus, res, trace?: Error) {
        if (typeof code === "string") code = parseInt(code)
        super(errs.find(err => err.e === code).d || "Unknown error");
        this.httpStatus = httpStatus
        this.res = res
        this.messages = res.messages
        this.code = typeof code === "string" ? parseInt(code) : code
        Error.captureStackTrace(this, FMError)

        if (trace) this.stack = trace.stack
    }
}

//
// module.exports = {
//     default: {FileMakerConnection}
// }

interface AuthorizationHeaders {
    "Content-Type": "application/json"
    Authorization: string
}

interface AuthorizationHeadersOAuth {
    "Content-Type": "application/json"
    "X-FM-Data-OAuth-RequestId": string,
    "X-FM-Data-OAuth-Identifier": string
}

function generateAuthorizationHeaders(credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris): AuthorizationHeaders | AuthorizationHeadersOAuth {
    switch (credentials.method) {
        case "filemaker":
            return {
                "Content-Type": "application/json",
                "Authorization": "Basic " + Buffer.from((<loginOptionsFileMaker>credentials).username + ":" + (<loginOptionsFileMaker>credentials).password).toString("base64")
            } as AuthorizationHeaders
        case "claris":
            return {
                "Content-Type": "application/json",
                "Authorization": (<loginOptionsClaris>credentials).claris.fmid,
            } as AuthorizationHeaders
        case "oauth":
            return {
                "Content-Type": "application/json",
                "X-FM-Data-OAuth-RequestId": (<loginOptionsOAuth>credentials).oauth.requestId,
                "X-FM-Data-OAuth-Identifier": (<loginOptionsOAuth>credentials).oauth.requestIdentifier
            } as AuthorizationHeadersOAuth
    }
}
