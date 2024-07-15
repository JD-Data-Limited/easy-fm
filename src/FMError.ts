/*
 * Copyright (c) 2023-2024. See LICENSE file for more information
 */

export const errs: Array<{ e: number, d: string }> = [
    {
        e: -1,
        d: 'Unknown error'
    },
    {
        e: 0,
        d: 'No error'
    },
    {
        e: 1,
        d: 'User canceled action'
    },
    {
        e: 2,
        d: 'Memory error'
    },
    {
        e: 3,
        d: 'Command is unavailable (for example, wrong operating system or mode)'
    },
    {
        e: 4,
        d: 'Command is unknown'
    },
    {
        e: 5,
        d: 'Command is invalid (for example, a Set Field script step does not have a calculation specified)'
    },
    {
        e: 6,
        d: 'File is read-only'
    },
    {
        e: 7,
        d: 'Running out of memory'
    },
    {
        e: 8,
        d: 'Empty result'
    },
    {
        e: 9,
        d: 'Insufficient privileges'
    },
    {
        e: 10,
        d: 'Requested data is missing'
    },
    {
        e: 11,
        d: 'Name is not valid'
    },
    {
        e: 12,
        d: 'Name already exists'
    },
    {
        e: 13,
        d: 'File or object is in use'
    },
    {
        e: 14,
        d: 'Out of range'
    },
    {
        e: 15,
        d: "Can't divide by zero"
    },
    {
        e: 16,
        d: 'Operation failed; request retry (for example, a user query)'
    },
    {
        e: 17,
        d: 'Attempt to convert foreign character set to UTF-16 failed'
    },
    {
        e: 18,
        d: 'Client must provide account information to proceed'
    },
    {
        e: 19,
        d: 'String contains characters other than A-Z, a-z, 0-9 (ASCII)'
    },
    {
        e: 20,
        d: 'Command/operation canceled by triggered script'
    },
    {
        e: 21,
        d: 'Request not supported (for example, when creating a hard link on a file system that does not support hard links)'
    },
    {
        e: 100,
        d: 'File is missing'
    },
    {
        e: 101,
        d: 'Record is missing'
    },
    {
        e: 102,
        d: 'Field is missing'
    },
    {
        e: 103,
        d: 'Relationship is missing'
    },
    {
        e: 104,
        d: 'Script is missing'
    },
    {
        e: 105,
        d: 'Layout is missing'
    },
    {
        e: 106,
        d: 'Table is missing'
    },
    {
        e: 107,
        d: 'Index is missing'
    },
    {
        e: 108,
        d: 'Value list is missing'
    },
    {
        e: 109,
        d: 'Privilege set is missing'
    },
    {
        e: 110,
        d: 'Related tables are missing'
    },
    {
        e: 111,
        d: 'Field repetition is invalid'
    },
    {
        e: 112,
        d: 'Window is missing'
    },
    {
        e: 113,
        d: 'Function is missing'
    },
    {
        e: 114,
        d: 'File reference is missing'
    },
    {
        e: 115,
        d: 'Menu set is missing'
    },
    {
        e: 116,
        d: 'Layout object is missing'
    },
    {
        e: 117,
        d: 'Data source is missing'
    },
    {
        e: 118,
        d: 'Theme is missing'
    },
    {
        e: 130,
        d: 'Files are damaged or missing and must be reinstalled'
    },
    {
        e: 131,
        d: 'Language pack files are missing'
    },
    {
        e: 200,
        d: 'Record access is denied'
    },
    {
        e: 201,
        d: 'Field cannot be modified'
    },
    {
        e: 202,
        d: 'Field access is denied'
    },
    {
        e: 203,
        d: "No records in file to print, or password doesn't allow print access"
    },
    {
        e: 204,
        d: 'No access to field(s) in sort order'
    },
    {
        e: 205,
        d: 'User does not have access privileges to create new records; import will overwrite existing data'
    },
    {
        e: 206,
        d: 'User does not have password change privileges, or file is not modifiable'
    },
    {
        e: 207,
        d: 'User does not have privileges to change database schema, or file is not modifiable'
    },
    {
        e: 208,
        d: 'Password does not contain enough characters'
    },
    {
        e: 209,
        d: 'New password must be different from existing one'
    },
    {
        e: 210,
        d: 'User account is inactive'
    },
    {
        e: 211,
        d: 'Password has expired '
    },
    {
        e: 212,
        d: 'Invalid user account and/or password; please try again'
    },
    {
        e: 214,
        d: 'Too many login attempts'
    },
    {
        e: 215,
        d: 'Administrator privileges cannot be duplicated'
    },
    {
        e: 216,
        d: 'Guest account cannot be duplicated'
    },
    {
        e: 217,
        d: 'User does not have sufficient privileges to modify administrator account'
    },
    {
        e: 218,
        d: 'Password and verify password do not match'
    },
    {
        e: 300,
        d: 'File is locked or in use'
    },
    {
        e: 301,
        d: 'Record is in use by another user'
    },
    {
        e: 302,
        d: 'Table is in use by another user'
    },
    {
        e: 303,
        d: 'Database schema is in use by another user'
    },
    {
        e: 304,
        d: 'Layout is in use by another user'
    },
    {
        e: 306,
        d: 'Record modification ID does not match'
    },
    {
        e: 307,
        d: 'Transaction could not be locked because of a communication error with the host'
    },
    {
        e: 308,
        d: 'Theme is locked and in use by another user'
    },
    {
        e: 400,
        d: 'Find criteria are empty'
    },
    {
        e: 401,
        d: 'No records match the request'
    },
    {
        e: 402,
        d: 'Selected field is not a match field for a lookup'
    },
    {
        e: 404,
        d: 'Sort order is invalid'
    },
    {
        e: 405,
        d: 'Number of records specified exceeds number of records that can be omitted'
    },
    {
        e: 406,
        d: 'Replace/reserialize criteria are invalid'
    },
    {
        e: 407,
        d: 'One or both match fields are missing (invalid relationship)'
    },
    {
        e: 408,
        d: 'Specified field has inappropriate data type for this operation'
    },
    {
        e: 409,
        d: 'Import order is invalid'
    },
    {
        e: 410,
        d: 'Export order is invalid'
    },
    {
        e: 412,
        d: 'Wrong version of FileMaker Pro Advanced used to recover file'
    },
    {
        e: 413,
        d: 'Specified field has inappropriate field type'
    },
    {
        e: 414,
        d: 'Layout cannot display the result'
    },
    {
        e: 415,
        d: 'One or more required related records are not available'
    },
    {
        e: 416,
        d: 'A primary key is required from the data source table'
    },
    {
        e: 417,
        d: 'File is not a supported data source'
    },
    {
        e: 418,
        d: 'Internal failure in INSERT operation into a field'
    },
    {
        e: 500,
        d: 'Date value does not meet validation entry options'
    },
    {
        e: 501,
        d: 'Time value does not meet validation entry options'
    },
    {
        e: 502,
        d: 'Number value does not meet validation entry options'
    },
    {
        e: 503,
        d: 'Value in field is not within the range specified in validation entry options'
    },
    {
        e: 504,
        d: 'Value in field is not unique, as required in validation entry options'
    },
    {
        e: 505,
        d: 'Value in field is not an existing value in the file, as required in validation entry options'
    },
    {
        e: 506,
        d: 'Value in field is not listed in the value list specified in validation entry option'
    },
    {
        e: 507,
        d: 'Value in field failed calculation test of validation entry option'
    },
    {
        e: 508,
        d: 'Invalid value entered in Find mode'
    },
    {
        e: 509,
        d: 'Field requires a valid value'
    },
    {
        e: 510,
        d: 'Related value is empty or unavailable'
    },
    {
        e: 511,
        d: 'Value in field exceeds maximum field size'
    },
    {
        e: 512,
        d: 'Record was already modified by another user'
    },
    {
        e: 513,
        d: 'No validation was specified but data cannot fit into the field'
    },
    {
        e: 600,
        d: 'Print error has occurred'
    },
    {
        e: 601,
        d: 'Combined header and footer exceed one page'
    },
    {
        e: 602,
        d: "Body doesn't fit on a page for current column setup"
    },
    {
        e: 603,
        d: 'Print connection lost'
    },
    {
        e: 700,
        d: 'File is of the wrong file type for import'
    },
    {
        e: 706,
        d: 'EPS file has no preview image'
    },
    {
        e: 707,
        d: 'Graphic translator cannot be found'
    },
    {
        e: 708,
        d: "Can't import the file, or need color monitor support to import file"
    },
    {
        e: 711,
        d: 'Import translator cannot be found'
    },
    {
        e: 714,
        d: 'Password privileges do not allow the operation'
    },
    {
        e: 715,
        d: 'Specified Excel worksheet or named range is missing'
    },
    {
        e: 716,
        d: 'A SQL query using DELETE, INSERT, or UPDATE is not allowed for ODBC import'
    },
    {
        e: 717,
        d: 'There is not enough XML/XSL information to proceed with the import or export'
    },
    {
        e: 718,
        d: 'Error in parsing XML file (from Xerces)'
    },
    {
        e: 719,
        d: 'Error in transforming XML using XSL (from Xalan)'
    },
    {
        e: 720,
        d: 'Error when exporting; intended format does not support repeating fields'
    },
    {
        e: 721,
        d: 'Unknown error occurred in the parser or the transformer'
    },
    {
        e: 722,
        d: 'Cannot import data into a file that has no fields'
    },
    {
        e: 723,
        d: 'You do not have permission to add records to or modify records in the target table'
    },
    {
        e: 724,
        d: 'You do not have permission to add records to the target table'
    },
    {
        e: 725,
        d: 'You do not have permission to modify records in the target table'
    },
    {
        e: 726,
        d: 'Source file has more records than the target table; not all records were imported'
    },
    {
        e: 727,
        d: 'Target table has more records than the source file; not all records were updated'
    },
    {
        e: 729,
        d: 'Errors occurred during import; records could not be imported'
    },
    {
        e: 730,
        d: 'Unsupported Excel version; convert file to the current Excel format and try again'
    },
    {
        e: 731,
        d: 'File you are importing from contains no data'
    },
    {
        e: 732,
        d: 'This file cannot be inserted because it contains other files'
    },
    {
        e: 733,
        d: 'A table cannot be imported into itself'
    },
    {
        e: 734,
        d: 'This file type cannot be displayed as a picture'
    },
    {
        e: 735,
        d: 'This file type cannot be displayed as a picture; it will be inserted and displayed as a file'
    },
    {
        e: 736,
        d: 'Too much data to export to this format; data will be truncated'
    },
    {
        e: 738,
        d: 'The theme you are importing already exists'
    },
    {
        e: 800,
        d: 'Unable to create file on disk'
    },
    {
        e: 801,
        d: 'Unable to create temporary file on System disk'
    },
    {
        e: 802,
        d: 'Unable to open file'
    },
    {
        e: 803,
        d: 'File is single-user, or host cannot be found'
    },
    {
        e: 804,
        d: 'File cannot be opened as read-only in its current state'
    },
    {
        e: 805,
        d: 'File is damaged; use Recover command'
    },
    {
        e: 806,
        d: 'File cannot be opened with this version of a FileMaker client'
    },
    {
        e: 807,
        d: 'File is not a FileMaker Pro Advanced file or is severely damaged'
    },
    {
        e: 808,
        d: 'Cannot open file because access privileges are damaged'
    },
    {
        e: 809,
        d: 'Disk/volume is full'
    },
    {
        e: 810,
        d: 'Disk/volume is locked'
    },
    {
        e: 811,
        d: 'Temporary file cannot be opened as FileMaker Pro Advanced file'
    },
    {
        e: 812,
        d: 'Exceeded host’s capacity'
    },
    {
        e: 813,
        d: 'Record synchronization error on network'
    },
    {
        e: 814,
        d: 'File(s) cannot be opened because maximum number is open'
    },
    {
        e: 815,
        d: 'Couldn’t open lookup file'
    },
    {
        e: 816,
        d: 'Unable to convert file'
    },
    {
        e: 817,
        d: 'Unable to open file because it does not belong to this solution'
    },
    {
        e: 819,
        d: 'Cannot save a local copy of a remote file'
    },
    {
        e: 820,
        d: 'File is being closed'
    },
    {
        e: 821,
        d: 'Host forced a disconnect'
    },
    {
        e: 822,
        d: 'FileMaker Pro Advanced files not found; reinstall missing files'
    },
    {
        e: 823,
        d: 'Cannot set file to single-user; guests are connected'
    },
    {
        e: 824,
        d: 'File is damaged or not a FileMaker Pro Advanced file'
    },
    {
        e: 825,
        d: 'File is not authorized to reference the protected file'
    },
    {
        e: 826,
        d: 'File path specified is not a valid file path'
    },
    {
        e: 827,
        d: 'File was not created because the source contained no data or is a reference'
    },
    {
        e: 850,
        d: 'Path is not valid for the operating system'
    },
    {
        e: 851,
        d: 'Cannot delete an external file from disk'
    },
    {
        e: 852,
        d: 'Cannot write a file to the external storage'
    },
    {
        e: 853,
        d: 'One or more containers failed to transfer'
    },
    {
        e: 900,
        d: 'General spelling engine error'
    },
    {
        e: 901,
        d: 'Main spelling dictionary not installed'
    },
    {
        e: 903,
        d: 'Command cannot be used in a shared file'
    },
    {
        e: 905,
        d: 'Command requires a field to be active'
    },
    {
        e: 906,
        d: 'Current file is not shared; command can be used only if the file is shared'
    },
    {
        e: 920,
        d: 'Cannot initialize the spelling engine'
    },
    {
        e: 921,
        d: 'User dictionary cannot be loaded for editing'
    },
    {
        e: 922,
        d: 'User dictionary cannot be found'
    },
    {
        e: 923,
        d: 'User dictionary is read-only'
    },
    {
        e: 951,
        d: 'An unexpected error occurred (*)'
    },
    {
        e: 952,
        d: 'Invalid FileMaker Data API token (*)'
    },
    {
        e: 953,
        d: 'Exceeded limit on data the FileMaker Data API can transmit (*)'
    },
    {
        e: 954,
        d: 'Unsupported XML grammar (*)'
    },
    {
        e: 955,
        d: 'No database name (*)'
    },
    {
        e: 956,
        d: 'Maximum number of database sessions exceeded (*)'
    },
    {
        e: 957,
        d: 'Conflicting commands (*)'
    },
    {
        e: 958,
        d: 'Parameter missing (*)'
    },
    {
        e: 959,
        d: 'Custom Web Publishing technology is disabled'
    },
    {
        e: 960,
        d: 'Parameter is invalid'
    },
    {
        e: 1200,
        d: 'Generic calculation error'
    },
    {
        e: 1201,
        d: 'Too few parameters in the function'
    },
    {
        e: 1202,
        d: 'Too many parameters in the function'
    },
    {
        e: 1203,
        d: 'Unexpected end of calculation'
    },
    {
        e: 1204,
        d: 'Number, text constant, field name, or "(" expected'
    },
    {
        e: 1205,
        d: 'Comment is not terminated with "*/"'
    },
    {
        e: 1206,
        d: 'Text constant must end with a quotation mark'
    },
    {
        e: 1207,
        d: 'Unbalanced parenthesis'
    },
    {
        e: 1208,
        d: 'Operator missing, function not found, or "(" not expected'
    },
    {
        e: 1209,
        d: 'Name (such as field name or layout name) is missing'
    },
    {
        e: 1210,
        d: 'Plug-in function or script step has already been registered'
    },
    {
        e: 1211,
        d: 'List usage is not allowed in this function'
    },
    {
        e: 1212,
        d: 'An operator (for example, +, -, *) is expected here'
    },
    {
        e: 1213,
        d: 'This variable has already been defined in the Let function'
    },
    {
        e: 1214,
        d: 'Average, Count, Extend, GetRepetition, Max, Min, NPV, StDev, Sum, and GetSummary: expression found where a field alone is needed'
    },
    {
        e: 1215,
        d: 'This parameter is an invalid Get function parameter'
    },
    {
        e: 1216,
        d: 'Only summary fields are allowed as first argument in GetSummary'
    },
    {
        e: 1217,
        d: 'Break field is invalid'
    },
    {
        e: 1218,
        d: 'Cannot evaluate the number'
    },
    {
        e: 1219,
        d: 'A field cannot be used in its own formula'
    },
    {
        e: 1220,
        d: 'Field type must be normal or calculated'
    },
    {
        e: 1221,
        d: 'Data type must be number, date, time, or timestamp'
    },
    {
        e: 1222,
        d: 'Calculation cannot be stored'
    },
    {
        e: 1223,
        d: 'Function referred to is not yet implemented'
    },
    {
        e: 1224,
        d: 'Function referred to does not exist'
    },
    {
        e: 1225,
        d: 'Function referred to is not supported in this context'
    },
    {
        e: 1300,
        d: "The specified name can't be used"
    },
    {
        e: 1301,
        d: 'A parameter of the imported or pasted function has the same name as a function in the file'
    },
    {
        e: 1400,
        d: 'ODBC client driver initialization failed; make sure ODBC client drivers are properly installed'
    },
    {
        e: 1401,
        d: 'Failed to allocate environment (ODBC)'
    },
    {
        e: 1402,
        d: 'Failed to free environment (ODBC)'
    },
    {
        e: 1403,
        d: 'Failed to disconnect (ODBC)'
    },
    {
        e: 1404,
        d: 'Failed to allocate connection (ODBC)'
    },
    {
        e: 1405,
        d: 'Failed to free connection (ODBC)'
    },
    {
        e: 1406,
        d: 'Failed check for SQL API (ODBC)'
    },
    {
        e: 1407,
        d: 'Failed to allocate statement (ODBC)'
    },
    {
        e: 1408,
        d: 'Extended error (ODBC)'
    },
    {
        e: 1409,
        d: 'Error (ODBC)'
    },
    {
        e: 1413,
        d: 'Failed communication link (ODBC)'
    },
    {
        e: 1414,
        d: 'SQL statement is too long'
    },
    {
        e: 1450,
        d: 'Action requires PHP privilege extension (*)'
    },
    {
        e: 1451,
        d: 'Action requires that current file be remote'
    },
    {
        e: 1501,
        d: 'SMTP authentication failed'
    },
    {
        e: 1502,
        d: 'Connection refused by SMTP server'
    },
    {
        e: 1503,
        d: 'Error with SSL'
    },
    {
        e: 1504,
        d: 'SMTP server requires the connection to be encrypted'
    },
    {
        e: 1505,
        d: 'Specified authentication is not supported by SMTP server'
    },
    {
        e: 1506,
        d: 'Email message(s) could not be sent successfully'
    },
    {
        e: 1507,
        d: 'Unable to log in to the SMTP server'
    },
    {
        e: 1550,
        d: 'Cannot load the plug-in, or the plug-in is not a valid plug-in'
    },
    {
        e: 1551,
        d: 'Cannot install the plug-in; cannot delete an existing plug-in or write to the folder or disk'
    },
    {
        e: 1552,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1553,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1554,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1555,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1556,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1557,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1558,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1559,
        d: 'Returned by plug-ins; see the documentation that came with the plug-in'
    },
    {
        e: 1626,
        d: 'Protocol is not supported'
    },
    {
        e: 1627,
        d: 'Authentication failed'
    },
    {
        e: 1628,
        d: 'There was an error with SSL'
    },
    {
        e: 1629,
        d: 'Connection timed out; the timeout value is 60 seconds'
    },
    {
        e: 1630,
        d: 'URL format is incorrect'
    },
    {
        e: 1631,
        d: 'Connection failed'
    },
    {
        e: 1632,
        d: 'The certificate has expired'
    },
    {
        e: 1633,
        d: 'The certificate is self-signed'
    },
    {
        e: 1634,
        d: 'A certificate verification error occurred'
    },
    {
        e: 1635,
        d: 'Connection is unencrypted'
    }
]

export class FMError extends Error {
    readonly httpStatus: number
    readonly res: any
    readonly code: number
    readonly messages: string

    constructor (code: string | number, httpStatus: number, res: any, trace?: Error) {
        if (typeof code === 'string') code = parseInt(code)
        super(errs.find(err => err.e === code)?.d ?? 'Unknown error')
        this.httpStatus = httpStatus
        this.res = res
        this.messages = res.messages
        this.code = typeof code === 'string' ? parseInt(code) : code
        Error.captureStackTrace(this, FMError)

        if (trace) this.stack = trace.stack
    }
}
