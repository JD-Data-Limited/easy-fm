"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Database: () => Database,
  FMError: () => FMError,
  Field: () => Field,
  Layout: () => Layout,
  LayoutRecord: () => LayoutRecord,
  LayoutRecordManager: () => LayoutRecordManager,
  Portal: () => Portal,
  PortalRecord: () => PortalRecord,
  RecordBase: () => RecordBase,
  RecordGetOperation: () => RecordGetOperation,
  TYPES: () => types_exports,
  asDate: () => asDate,
  asTime: () => asTime,
  asTimestamp: () => asTimestamp,
  default: () => src_default,
  query: () => query,
  queryEscape: () => queryEscape
});
module.exports = __toCommonJS(src_exports);

// src/connection/generateAuthorizationHeaders.js
function generateAuthorizationHeaders(credentials) {
  switch (credentials.method) {
    case "filemaker":
      return {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(credentials.username + ":" + credentials.password).toString("base64")
      };
    case "claris":
      return {
        "Content-Type": "application/json",
        Authorization: credentials.claris.fmid
      };
    case "oauth":
      return {
        "Content-Type": "application/json",
        "X-FM-Data-OAuth-RequestId": credentials.oauth.requestId,
        "X-FM-Data-OAuth-Identifier": credentials.oauth.requestIdentifier
      };
  }
}

// src/FMError.js
var errs = [
  {
    e: -1,
    d: "Unknown error"
  },
  {
    e: 0,
    d: "No error"
  },
  {
    e: 1,
    d: "User canceled action"
  },
  {
    e: 2,
    d: "Memory error"
  },
  {
    e: 3,
    d: "Command is unavailable (for example, wrong operating system or mode)"
  },
  {
    e: 4,
    d: "Command is unknown"
  },
  {
    e: 5,
    d: "Command is invalid (for example, a Set Field script step does not have a calculation specified)"
  },
  {
    e: 6,
    d: "File is read-only"
  },
  {
    e: 7,
    d: "Running out of memory"
  },
  {
    e: 8,
    d: "Empty result"
  },
  {
    e: 9,
    d: "Insufficient privileges"
  },
  {
    e: 10,
    d: "Requested data is missing"
  },
  {
    e: 11,
    d: "Name is not valid"
  },
  {
    e: 12,
    d: "Name already exists"
  },
  {
    e: 13,
    d: "File or object is in use"
  },
  {
    e: 14,
    d: "Out of range"
  },
  {
    e: 15,
    d: "Can't divide by zero"
  },
  {
    e: 16,
    d: "Operation failed; request retry (for example, a user query)"
  },
  {
    e: 17,
    d: "Attempt to convert foreign character set to UTF-16 failed"
  },
  {
    e: 18,
    d: "Client must provide account information to proceed"
  },
  {
    e: 19,
    d: "String contains characters other than A-Z, a-z, 0-9 (ASCII)"
  },
  {
    e: 20,
    d: "Command/operation canceled by triggered script"
  },
  {
    e: 21,
    d: "Request not supported (for example, when creating a hard link on a file system that does not support hard links)"
  },
  {
    e: 100,
    d: "File is missing"
  },
  {
    e: 101,
    d: "Record is missing"
  },
  {
    e: 102,
    d: "Field is missing"
  },
  {
    e: 103,
    d: "Relationship is missing"
  },
  {
    e: 104,
    d: "Script is missing"
  },
  {
    e: 105,
    d: "Layout is missing"
  },
  {
    e: 106,
    d: "Table is missing"
  },
  {
    e: 107,
    d: "Index is missing"
  },
  {
    e: 108,
    d: "Value list is missing"
  },
  {
    e: 109,
    d: "Privilege set is missing"
  },
  {
    e: 110,
    d: "Related tables are missing"
  },
  {
    e: 111,
    d: "Field repetition is invalid"
  },
  {
    e: 112,
    d: "Window is missing"
  },
  {
    e: 113,
    d: "Function is missing"
  },
  {
    e: 114,
    d: "File reference is missing"
  },
  {
    e: 115,
    d: "Menu set is missing"
  },
  {
    e: 116,
    d: "Layout object is missing"
  },
  {
    e: 117,
    d: "Data source is missing"
  },
  {
    e: 118,
    d: "Theme is missing"
  },
  {
    e: 130,
    d: "Files are damaged or missing and must be reinstalled"
  },
  {
    e: 131,
    d: "Language pack files are missing"
  },
  {
    e: 200,
    d: "Record access is denied"
  },
  {
    e: 201,
    d: "Field cannot be modified"
  },
  {
    e: 202,
    d: "Field access is denied"
  },
  {
    e: 203,
    d: "No records in file to print, or password doesn't allow print access"
  },
  {
    e: 204,
    d: "No access to field(s) in sort order"
  },
  {
    e: 205,
    d: "User does not have access privileges to create new records; import will overwrite existing data"
  },
  {
    e: 206,
    d: "User does not have password change privileges, or file is not modifiable"
  },
  {
    e: 207,
    d: "User does not have privileges to change database schema, or file is not modifiable"
  },
  {
    e: 208,
    d: "Password does not contain enough characters"
  },
  {
    e: 209,
    d: "New password must be different from existing one"
  },
  {
    e: 210,
    d: "User account is inactive"
  },
  {
    e: 211,
    d: "Password has expired "
  },
  {
    e: 212,
    d: "Invalid user account and/or password; please try again"
  },
  {
    e: 214,
    d: "Too many login attempts"
  },
  {
    e: 215,
    d: "Administrator privileges cannot be duplicated"
  },
  {
    e: 216,
    d: "Guest account cannot be duplicated"
  },
  {
    e: 217,
    d: "User does not have sufficient privileges to modify administrator account"
  },
  {
    e: 218,
    d: "Password and verify password do not match"
  },
  {
    e: 300,
    d: "File is locked or in use"
  },
  {
    e: 301,
    d: "Record is in use by another user"
  },
  {
    e: 302,
    d: "Table is in use by another user"
  },
  {
    e: 303,
    d: "Database schema is in use by another user"
  },
  {
    e: 304,
    d: "Layout is in use by another user"
  },
  {
    e: 306,
    d: "Record modification ID does not match"
  },
  {
    e: 307,
    d: "Transaction could not be locked because of a communication error with the host"
  },
  {
    e: 308,
    d: "Theme is locked and in use by another user"
  },
  {
    e: 400,
    d: "Find criteria are empty"
  },
  {
    e: 401,
    d: "No records match the request"
  },
  {
    e: 402,
    d: "Selected field is not a match field for a lookup"
  },
  {
    e: 404,
    d: "Sort order is invalid"
  },
  {
    e: 405,
    d: "Number of records specified exceeds number of records that can be omitted"
  },
  {
    e: 406,
    d: "Replace/reserialize criteria are invalid"
  },
  {
    e: 407,
    d: "One or both match fields are missing (invalid relationship)"
  },
  {
    e: 408,
    d: "Specified field has inappropriate data type for this operation"
  },
  {
    e: 409,
    d: "Import order is invalid"
  },
  {
    e: 410,
    d: "Export order is invalid"
  },
  {
    e: 412,
    d: "Wrong version of FileMaker Pro Advanced used to recover file"
  },
  {
    e: 413,
    d: "Specified field has inappropriate field type"
  },
  {
    e: 414,
    d: "Layout cannot display the result"
  },
  {
    e: 415,
    d: "One or more required related records are not available"
  },
  {
    e: 416,
    d: "A primary key is required from the data source table"
  },
  {
    e: 417,
    d: "File is not a supported data source"
  },
  {
    e: 418,
    d: "Internal failure in INSERT operation into a field"
  },
  {
    e: 500,
    d: "Date value does not meet validation entry options"
  },
  {
    e: 501,
    d: "Time value does not meet validation entry options"
  },
  {
    e: 502,
    d: "Number value does not meet validation entry options"
  },
  {
    e: 503,
    d: "Value in field is not within the range specified in validation entry options"
  },
  {
    e: 504,
    d: "Value in field is not unique, as required in validation entry options"
  },
  {
    e: 505,
    d: "Value in field is not an existing value in the file, as required in validation entry options"
  },
  {
    e: 506,
    d: "Value in field is not listed in the value list specified in validation entry option"
  },
  {
    e: 507,
    d: "Value in field failed calculation test of validation entry option"
  },
  {
    e: 508,
    d: "Invalid value entered in Find mode"
  },
  {
    e: 509,
    d: "Field requires a valid value"
  },
  {
    e: 510,
    d: "Related value is empty or unavailable"
  },
  {
    e: 511,
    d: "Value in field exceeds maximum field size"
  },
  {
    e: 512,
    d: "Record was already modified by another user"
  },
  {
    e: 513,
    d: "No validation was specified but data cannot fit into the field"
  },
  {
    e: 600,
    d: "Print error has occurred"
  },
  {
    e: 601,
    d: "Combined header and footer exceed one page"
  },
  {
    e: 602,
    d: "Body doesn't fit on a page for current column setup"
  },
  {
    e: 603,
    d: "Print connection lost"
  },
  {
    e: 700,
    d: "File is of the wrong file type for import"
  },
  {
    e: 706,
    d: "EPS file has no preview image"
  },
  {
    e: 707,
    d: "Graphic translator cannot be found"
  },
  {
    e: 708,
    d: "Can't import the file, or need color monitor support to import file"
  },
  {
    e: 711,
    d: "Import translator cannot be found"
  },
  {
    e: 714,
    d: "Password privileges do not allow the operation"
  },
  {
    e: 715,
    d: "Specified Excel worksheet or named range is missing"
  },
  {
    e: 716,
    d: "A SQL query using DELETE, INSERT, or UPDATE is not allowed for ODBC import"
  },
  {
    e: 717,
    d: "There is not enough XML/XSL information to proceed with the import or export"
  },
  {
    e: 718,
    d: "Error in parsing XML file (from Xerces)"
  },
  {
    e: 719,
    d: "Error in transforming XML using XSL (from Xalan)"
  },
  {
    e: 720,
    d: "Error when exporting; intended format does not support repeating fields"
  },
  {
    e: 721,
    d: "Unknown error occurred in the parser or the transformer"
  },
  {
    e: 722,
    d: "Cannot import data into a file that has no fields"
  },
  {
    e: 723,
    d: "You do not have permission to add records to or modify records in the target table"
  },
  {
    e: 724,
    d: "You do not have permission to add records to the target table"
  },
  {
    e: 725,
    d: "You do not have permission to modify records in the target table"
  },
  {
    e: 726,
    d: "Source file has more records than the target table; not all records were imported"
  },
  {
    e: 727,
    d: "Target table has more records than the source file; not all records were updated"
  },
  {
    e: 729,
    d: "Errors occurred during import; records could not be imported"
  },
  {
    e: 730,
    d: "Unsupported Excel version; convert file to the current Excel format and try again"
  },
  {
    e: 731,
    d: "File you are importing from contains no data"
  },
  {
    e: 732,
    d: "This file cannot be inserted because it contains other files"
  },
  {
    e: 733,
    d: "A table cannot be imported into itself"
  },
  {
    e: 734,
    d: "This file type cannot be displayed as a picture"
  },
  {
    e: 735,
    d: "This file type cannot be displayed as a picture; it will be inserted and displayed as a file"
  },
  {
    e: 736,
    d: "Too much data to export to this format; data will be truncated"
  },
  {
    e: 738,
    d: "The theme you are importing already exists"
  },
  {
    e: 800,
    d: "Unable to create file on disk"
  },
  {
    e: 801,
    d: "Unable to create temporary file on System disk"
  },
  {
    e: 802,
    d: "Unable to open file"
  },
  {
    e: 803,
    d: "File is single-user, or host cannot be found"
  },
  {
    e: 804,
    d: "File cannot be opened as read-only in its current state"
  },
  {
    e: 805,
    d: "File is damaged; use Recover command"
  },
  {
    e: 806,
    d: "File cannot be opened with this version of a FileMaker client"
  },
  {
    e: 807,
    d: "File is not a FileMaker Pro Advanced file or is severely damaged"
  },
  {
    e: 808,
    d: "Cannot open file because access privileges are damaged"
  },
  {
    e: 809,
    d: "Disk/volume is full"
  },
  {
    e: 810,
    d: "Disk/volume is locked"
  },
  {
    e: 811,
    d: "Temporary file cannot be opened as FileMaker Pro Advanced file"
  },
  {
    e: 812,
    d: "Exceeded host\u2019s capacity"
  },
  {
    e: 813,
    d: "Record synchronization error on network"
  },
  {
    e: 814,
    d: "File(s) cannot be opened because maximum number is open"
  },
  {
    e: 815,
    d: "Couldn\u2019t open lookup file"
  },
  {
    e: 816,
    d: "Unable to convert file"
  },
  {
    e: 817,
    d: "Unable to open file because it does not belong to this solution"
  },
  {
    e: 819,
    d: "Cannot save a local copy of a remote file"
  },
  {
    e: 820,
    d: "File is being closed"
  },
  {
    e: 821,
    d: "Host forced a disconnect"
  },
  {
    e: 822,
    d: "FileMaker Pro Advanced files not found; reinstall missing files"
  },
  {
    e: 823,
    d: "Cannot set file to single-user; guests are connected"
  },
  {
    e: 824,
    d: "File is damaged or not a FileMaker Pro Advanced file"
  },
  {
    e: 825,
    d: "File is not authorized to reference the protected file"
  },
  {
    e: 826,
    d: "File path specified is not a valid file path"
  },
  {
    e: 827,
    d: "File was not created because the source contained no data or is a reference"
  },
  {
    e: 850,
    d: "Path is not valid for the operating system"
  },
  {
    e: 851,
    d: "Cannot delete an external file from disk"
  },
  {
    e: 852,
    d: "Cannot write a file to the external storage"
  },
  {
    e: 853,
    d: "One or more containers failed to transfer"
  },
  {
    e: 900,
    d: "General spelling engine error"
  },
  {
    e: 901,
    d: "Main spelling dictionary not installed"
  },
  {
    e: 903,
    d: "Command cannot be used in a shared file"
  },
  {
    e: 905,
    d: "Command requires a field to be active"
  },
  {
    e: 906,
    d: "Current file is not shared; command can be used only if the file is shared"
  },
  {
    e: 920,
    d: "Cannot initialize the spelling engine"
  },
  {
    e: 921,
    d: "User dictionary cannot be loaded for editing"
  },
  {
    e: 922,
    d: "User dictionary cannot be found"
  },
  {
    e: 923,
    d: "User dictionary is read-only"
  },
  {
    e: 951,
    d: "An unexpected error occurred (*)"
  },
  {
    e: 952,
    d: "Invalid FileMaker Data API token (*)"
  },
  {
    e: 953,
    d: "Exceeded limit on data the FileMaker Data API can transmit (*)"
  },
  {
    e: 954,
    d: "Unsupported XML grammar (*)"
  },
  {
    e: 955,
    d: "No database name (*)"
  },
  {
    e: 956,
    d: "Maximum number of database sessions exceeded (*)"
  },
  {
    e: 957,
    d: "Conflicting commands (*)"
  },
  {
    e: 958,
    d: "Parameter missing (*)"
  },
  {
    e: 959,
    d: "Custom Web Publishing technology is disabled"
  },
  {
    e: 960,
    d: "Parameter is invalid"
  },
  {
    e: 1200,
    d: "Generic calculation error"
  },
  {
    e: 1201,
    d: "Too few parameters in the function"
  },
  {
    e: 1202,
    d: "Too many parameters in the function"
  },
  {
    e: 1203,
    d: "Unexpected end of calculation"
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
    d: "Text constant must end with a quotation mark"
  },
  {
    e: 1207,
    d: "Unbalanced parenthesis"
  },
  {
    e: 1208,
    d: 'Operator missing, function not found, or "(" not expected'
  },
  {
    e: 1209,
    d: "Name (such as field name or layout name) is missing"
  },
  {
    e: 1210,
    d: "Plug-in function or script step has already been registered"
  },
  {
    e: 1211,
    d: "List usage is not allowed in this function"
  },
  {
    e: 1212,
    d: "An operator (for example, +, -, *) is expected here"
  },
  {
    e: 1213,
    d: "This variable has already been defined in the Let function"
  },
  {
    e: 1214,
    d: "Average, Count, Extend, GetRepetition, Max, Min, NPV, StDev, Sum, and GetSummary: expression found where a field alone is needed"
  },
  {
    e: 1215,
    d: "This parameter is an invalid Get function parameter"
  },
  {
    e: 1216,
    d: "Only summary fields are allowed as first argument in GetSummary"
  },
  {
    e: 1217,
    d: "Break field is invalid"
  },
  {
    e: 1218,
    d: "Cannot evaluate the number"
  },
  {
    e: 1219,
    d: "A field cannot be used in its own formula"
  },
  {
    e: 1220,
    d: "Field type must be normal or calculated"
  },
  {
    e: 1221,
    d: "Data type must be number, date, time, or timestamp"
  },
  {
    e: 1222,
    d: "Calculation cannot be stored"
  },
  {
    e: 1223,
    d: "Function referred to is not yet implemented"
  },
  {
    e: 1224,
    d: "Function referred to does not exist"
  },
  {
    e: 1225,
    d: "Function referred to is not supported in this context"
  },
  {
    e: 1300,
    d: "The specified name can't be used"
  },
  {
    e: 1301,
    d: "A parameter of the imported or pasted function has the same name as a function in the file"
  },
  {
    e: 1400,
    d: "ODBC client driver initialization failed; make sure ODBC client drivers are properly installed"
  },
  {
    e: 1401,
    d: "Failed to allocate environment (ODBC)"
  },
  {
    e: 1402,
    d: "Failed to free environment (ODBC)"
  },
  {
    e: 1403,
    d: "Failed to disconnect (ODBC)"
  },
  {
    e: 1404,
    d: "Failed to allocate connection (ODBC)"
  },
  {
    e: 1405,
    d: "Failed to free connection (ODBC)"
  },
  {
    e: 1406,
    d: "Failed check for SQL API (ODBC)"
  },
  {
    e: 1407,
    d: "Failed to allocate statement (ODBC)"
  },
  {
    e: 1408,
    d: "Extended error (ODBC)"
  },
  {
    e: 1409,
    d: "Error (ODBC)"
  },
  {
    e: 1413,
    d: "Failed communication link (ODBC)"
  },
  {
    e: 1414,
    d: "SQL statement is too long"
  },
  {
    e: 1450,
    d: "Action requires PHP privilege extension (*)"
  },
  {
    e: 1451,
    d: "Action requires that current file be remote"
  },
  {
    e: 1501,
    d: "SMTP authentication failed"
  },
  {
    e: 1502,
    d: "Connection refused by SMTP server"
  },
  {
    e: 1503,
    d: "Error with SSL"
  },
  {
    e: 1504,
    d: "SMTP server requires the connection to be encrypted"
  },
  {
    e: 1505,
    d: "Specified authentication is not supported by SMTP server"
  },
  {
    e: 1506,
    d: "Email message(s) could not be sent successfully"
  },
  {
    e: 1507,
    d: "Unable to log in to the SMTP server"
  },
  {
    e: 1550,
    d: "Cannot load the plug-in, or the plug-in is not a valid plug-in"
  },
  {
    e: 1551,
    d: "Cannot install the plug-in; cannot delete an existing plug-in or write to the folder or disk"
  },
  {
    e: 1552,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1553,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1554,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1555,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1556,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1557,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1558,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1559,
    d: "Returned by plug-ins; see the documentation that came with the plug-in"
  },
  {
    e: 1626,
    d: "Protocol is not supported"
  },
  {
    e: 1627,
    d: "Authentication failed"
  },
  {
    e: 1628,
    d: "There was an error with SSL"
  },
  {
    e: 1629,
    d: "Connection timed out; the timeout value is 60 seconds"
  },
  {
    e: 1630,
    d: "URL format is incorrect"
  },
  {
    e: 1631,
    d: "Connection failed"
  },
  {
    e: 1632,
    d: "The certificate has expired"
  },
  {
    e: 1633,
    d: "The certificate is self-signed"
  },
  {
    e: 1634,
    d: "A certificate verification error occurred"
  },
  {
    e: 1635,
    d: "Connection is unencrypted"
  }
];
var FMError = class _FMError extends Error {
  httpStatus;
  res;
  code;
  messages;
  constructor(code, httpStatus, res, trace) {
    if (typeof code === "string")
      code = parseInt(code);
    super(errs.find((err) => err.e === code)?.d ?? "Unknown error");
    this.httpStatus = httpStatus;
    this.res = res;
    this.messages = res.messages;
    this.code = typeof code === "string" ? parseInt(code) : code;
    Error.captureStackTrace(this, _FMError);
    if (trace)
      this.stack = trace.stack;
  }
};

// src/connection/database.js
var import_events2 = require("events");

// src/records/recordBase.js
var import_events = require("events");
var moment = __toESM(require("moment"), 1);

// src/types.js
var types_exports = {};
__export(types_exports, {
  RecordTypes: () => RecordTypes
});
var RecordTypes;
(function(RecordTypes2) {
  RecordTypes2[RecordTypes2["UNKNOWN"] = 0] = "UNKNOWN";
  RecordTypes2[RecordTypes2["LAYOUT"] = 1] = "LAYOUT";
  RecordTypes2[RecordTypes2["PORTAL"] = 2] = "PORTAL";
})(RecordTypes || (RecordTypes = {}));

// src/models/apiResults.js
var ApiFieldTypes;
(function(ApiFieldTypes2) {
  ApiFieldTypes2["NORMAL"] = "normal";
  ApiFieldTypes2["CALCULATION"] = "calculation";
  ApiFieldTypes2["SUMMARY"] = "summary";
})(ApiFieldTypes || (ApiFieldTypes = {}));
var ApiFieldDisplayTypes;
(function(ApiFieldDisplayTypes2) {
  ApiFieldDisplayTypes2["EDIT_TEXT"] = "editText";
  ApiFieldDisplayTypes2["POPUP_LIST"] = "popupList";
  ApiFieldDisplayTypes2["CHECKBOX"] = "checkBox";
  ApiFieldDisplayTypes2["RADIO_BUTTONS"] = "radioButtons";
  ApiFieldDisplayTypes2["SELECTION_LIST"] = "selectionList";
  ApiFieldDisplayTypes2["CALENDAR"] = "calendar";
  ApiFieldDisplayTypes2["SECURE_TEXT"] = "secureText";
})(ApiFieldDisplayTypes || (ApiFieldDisplayTypes = {}));
var ApiFieldResultTypes;
(function(ApiFieldResultTypes2) {
  ApiFieldResultTypes2["TEXT"] = "text";
  ApiFieldResultTypes2["NUMBER"] = "number";
  ApiFieldResultTypes2["DATE"] = "date";
  ApiFieldResultTypes2["TIME"] = "time";
  ApiFieldResultTypes2["TIMESTAMP"] = "timeStamp";
  ApiFieldResultTypes2["CONTAINER"] = "container";
})(ApiFieldResultTypes || (ApiFieldResultTypes = {}));

// src/records/field.js
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field") initializers.unshift(_);
      else descriptor[key] = _;
    }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};
var __setFunctionName = function(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var Field = (() => {
  let _instanceExtraInitializers = [];
  let _private_streamAsync_decorators;
  let _private_streamAsync_descriptor;
  let _arrayBuffer_decorators;
  return class Field {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
      _private_streamAsync_decorators = [containerDownloadFunction];
      _arrayBuffer_decorators = [containerDownloadFunction];
      __esDecorate(this, _private_streamAsync_descriptor = { value: __setFunctionName(async function() {
        const req = await this.parent.layout.database._apiRequestRaw(this.string, { useCookieJar: true });
        if (!req.ok || !req.body) {
          throw new Error(`HTTP Error: ${req.status} (${req.statusText})`);
        }
        return { data: req.body, mime: req.headers.get("Content-Type") ?? "" };
      }, "#streamAsync") }, _private_streamAsync_decorators, { kind: "method", name: "#streamAsync", static: false, private: true, access: { has: (obj) => #streamAsync in obj, get: (obj) => obj.#streamAsync }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _arrayBuffer_decorators, { kind: "method", name: "arrayBuffer", static: false, private: false, access: { has: (obj) => "arrayBuffer" in obj, get: (obj) => obj.arrayBuffer }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    parent = __runInitializers(this, _instanceExtraInitializers);
    id;
    _value;
    edited;
    static firstContainerDownload = null;
    constructor(record, id, contents) {
      this.parent = record;
      this.id = id;
      this._value = contents;
      this.edited = false;
    }
    /**
     * Sets the value of the field.
     *
     * @param {T | null} content - The new content value to be set. Can be either the type T or null.
     * @throws {Error} Cannot set container value using set(). Use upload() instead, if the result is a 'container'.
     */
    set(content) {
      if (this.metadata.result === "container")
        throw new Error("Cannot set container value using set(). Use upload() instead.");
      else
        this._value = content;
      this.edited = true;
    }
    get metadata() {
      if (!this.parent.layout.metadata) {
        return {
          name: this.id.toString(),
          type: ApiFieldTypes.NORMAL,
          displayType: ApiFieldDisplayTypes.EDIT_TEXT,
          result: ApiFieldResultTypes.TEXT,
          global: false,
          autoEnter: true,
          fourDigitYear: false,
          maxRepeat: 1,
          maxCharacters: 0,
          notEmpty: false,
          numeric: false,
          timeOfDay: false,
          repetitions: 1,
          valueList: ""
        };
      }
      if (this.parent.type === RecordTypes.PORTAL && this.parent.portal) {
        return this.parent.layout.metadata.portalMetaData[this.parent.portal.name || "portal not attached"].find((i) => i.name === this.id) ?? {
          name: this.id.toString(),
          type: ApiFieldTypes.NORMAL,
          displayType: ApiFieldDisplayTypes.EDIT_TEXT,
          result: ApiFieldResultTypes.TEXT,
          global: false,
          autoEnter: true,
          fourDigitYear: false,
          maxRepeat: 1,
          maxCharacters: 0,
          notEmpty: false,
          numeric: false,
          timeOfDay: false,
          repetitions: 1,
          valueList: ""
        };
      } else {
        return this.parent.layout.metadata.fieldMetaData.find((i) => i.name === this.id) ?? {
          name: this.id.toString(),
          type: ApiFieldTypes.NORMAL,
          displayType: ApiFieldDisplayTypes.EDIT_TEXT,
          result: ApiFieldResultTypes.TEXT,
          global: false,
          autoEnter: true,
          fourDigitYear: false,
          maxRepeat: 1,
          maxCharacters: 0,
          notEmpty: false,
          numeric: false,
          timeOfDay: false,
          repetitions: 1,
          valueList: ""
        };
      }
    }
    get value() {
      return this._value;
    }
    set value(value) {
      this._value = value;
    }
    get string() {
      if (typeof this._value === "string") {
        return this._value;
      }
      throw new Error("Field value is not a string");
    }
    /**
     * Uploads a file to the container field.
     *
     * @param {Buffer} file - The file content as a buffer.
     *
     * @throws {Error} - Cannot upload a file to the field if it's not a container field.
     * @throws {Error} - Upload failed with HTTP error.
     *
     * @returns {Promise<void>} - A promise that resolves when the file is successfully uploaded.
     */
    async upload(file) {
      if (this.metadata.result !== "container") {
        throw new Error("Cannot upload a file to the field; " + this.id + " (not a container field)");
      }
      const form = new FormData();
      form.append("upload", file);
      const res = await this.parent.layout.database._apiRequestRaw(`${this.parent.endpoint}/containers/${this.id}/1`, {
        method: "POST",
        headers: {
          // Authorization: 'Bearer ' + this.parent.layout.database.token,
          // 'Content-Type': 'multipart/form-data'
        },
        body: form
      });
      if (!res.ok) {
        throw new Error(`Upload failed with HTTP error: ${res.status} (${res.statusText})`);
      }
      const data = await res.json();
      if (data.messages[0].code === "0")
        return;
      else {
        throw new FMError(data.messages[0].code, res.status, res);
      }
    }
    get #streamAsync() {
      return _private_streamAsync_descriptor.value;
    }
    async stream() {
      return await this.#streamAsync();
    }
    async arrayBuffer() {
      const req = await this.parent.layout.database._apiRequestRaw(this.string, { useCookieJar: true });
      if (!req.ok)
        throw new Error(`HTTP Error: ${req.status} (${req.statusText})`);
      return { data: await req.arrayBuffer(), mime: req.headers.get("Content-Type") ?? "" };
    }
  };
})();
function containerDownloadFunction(originalMethod, context) {
  async function replacementMethod(...args) {
    return await ContainerDownloadExecutor.processTask(async () => await originalMethod.call(this, ...args));
  }
  return replacementMethod;
}
var ContainerDownloadExecutorClass = class {
  hasDownloadedFirstContainer = 0;
  waitingFuncs = [];
  async processTask(task) {
    const isFirstTask = this.hasDownloadedFirstContainer === 0;
    if (isFirstTask) {
      this.hasDownloadedFirstContainer = 1;
      let res;
      try {
        res = await task();
      } catch (e) {
        this.hasDownloadedFirstContainer = 0;
        const nextTask = this.waitingFuncs.splice(0, 1)[0];
        if (nextTask) {
          this.processTask(nextTask.func).then((res2) => nextTask.done(res2)).catch((e2) => nextTask.err(e2));
        }
        throw e;
      }
      this.hasDownloadedFirstContainer = 2;
      for (const task2 of this.waitingFuncs) {
        task2.func().then((res2) => task2.done(res2)).catch((e) => task2.err(e));
      }
      return res;
    } else if (this.hasDownloadedFirstContainer === 1) {
      return await new Promise((resolve, reject) => {
        this.waitingFuncs.push({
          func: task,
          done: resolve,
          err: reject
        });
      });
    } else
      return await task();
  }
};
var ContainerDownloadExecutor = new ContainerDownloadExecutorClass();

// src/records/recordBase.js
var RecordBase = class extends import_events.EventEmitter {
  layout;
  type = RecordTypes.UNKNOWN;
  recordId;
  modId;
  /**
   * An object containing each field in this record.
   *
   * @template T - The type of the field.
   */
  fields;
  portalData = [];
  constructor(layout, recordId, modId = recordId, fieldData) {
    super();
    this.layout = layout;
    this.recordId = recordId;
    this.modId = modId;
    this.fields = this.processFieldData(fieldData);
  }
  get endpoint() {
    return `${this.layout.endpoint}/records/${this.recordId}`;
  }
  /**
   * A boolean indicating whether this record has been modified and should be committed
   *
   * @returns {boolean} A boolean value indicating whether any of the fields have been edited.
   */
  get edited() {
    return !!this.fieldsArray.find((i) => i.edited);
  }
  get fieldsArray() {
    return Object.values(this.fields);
  }
  processFieldData(fieldData) {
    const fields = {};
    for (const key of Object.keys(fieldData)) {
      const _field = new Field(this, key, fieldData[key]);
      if (fieldData[key]) {
        if (_field.metadata.result === "timeStamp") {
          let date = moment.default(fieldData[key]);
          date = date.utcOffset(this.layout.database.host.timezoneOffsetFunc(date), true).local();
          _field.set(date);
          _field.edited = false;
        } else if (_field.metadata.result === "time") {
          let date = moment.default(fieldData[key]);
          date = date.utcOffset(this.layout.database.host.timezoneOffsetFunc(date), true).local();
          _field.set(date);
          _field.edited = false;
        } else if (_field.metadata.result === "date") {
          let date = moment.default(fieldData[key]);
          date = date.utcOffset(this.layout.database.host.timezoneOffsetFunc(date), true).local();
          _field.set(date);
          _field.edited = false;
        }
      }
      fields[key] = _field;
    }
    this.fields = fields;
    return fields;
  }
  _onSave() {
    this.emit("saved");
    for (const field of this.fieldsArray)
      field.edited = false;
  }
};

// src/records/portalRecord.js
var PortalRecord = class extends RecordBase {
  portal;
  type = RecordTypes.PORTAL;
  constructor(record, portal, recordId, modId = recordId, fieldData = {}) {
    super(record.layout, recordId, modId, fieldData);
    this.portal = portal;
  }
  _onSave() {
    super._onSave();
    this.portal.record._onSave();
  }
  /**
   * Commits the parent record, and in turn this one.
   *
   * @param {extraBodyOptions} [extraBody={}] - The optional extra body options.
   * @returns {Promise} - A promise that resolves when the record is committed.
   */
  async commit(extraBody = {}) {
    return await this.portal.record.commit(extraBody);
  }
  toObject(fieldFilter) {
    const res = {
      recordId: this.recordId === -1 ? void 0 : this.recordId.toString(),
      modId: this.modId === -1 ? void 0 : this.modId.toString()
    };
    for (const field of this.fieldsArray.filter((a) => fieldFilter(a)))
      res[field.id] = field.value?.toString();
    return res;
  }
};

// src/records/portal.js
var Portal = class {
  record;
  name;
  records = [];
  constructor(record, name) {
    this.record = record;
    this.name = name;
  }
  /**
   * Add a new record to the portal
   * @function create
   * @async
   * @summary Creates a new record.
   * @returns {Promise<PortalRecord<T>>} A Promise that resolves to the newly created record.
   */
  async create() {
    const fields = {};
    for (const _field of (await this.record.layout.getLayoutMeta()).portalMetaData[this.name]) {
      fields[_field.name] = "";
    }
    const record = new PortalRecord(this.record, this, -1, -1, fields);
    this.records.push(record);
    return record;
  }
};

// src/records/layoutRecord.js
var moment2 = __toESM(require("moment/moment.js"), 1);
var LayoutRecord = class _LayoutRecord extends RecordBase {
  portals = {};
  portalsToInclude;
  constructor(layout, recordId, modId = recordId, fieldData = {}, portalData = null, portalsToInclude = []) {
    super(layout, parseInt(recordId), parseInt(modId), fieldData);
    this.portalsToInclude = portalsToInclude;
    if (portalData) {
      this.processPortalData(portalData);
    }
  }
  get portalsArray() {
    return Object.values(this.portals);
  }
  /**
   * Asynchronously commits the changes made to the current record.
   * @param {extraBodyOptions} extraBody - The options for the extra body elements.
   * @returns {Promise<this>} - A promise that resolves with the modified object.
   * @throws {FMError} - If an error occurs during the commit process.
   */
  async commit(extraBody = {}) {
    const data = this.toObject();
    delete data.recordId;
    delete data.modId;
    if (extraBody.scripts?.after) {
      data.script = extraBody.scripts.after.name;
      if (extraBody.scripts.after.parameter)
        data["script.param"] = extraBody.scripts.after.parameter;
    }
    if (extraBody.scripts?.prerequest) {
      data["script.prerequest"] = extraBody.scripts.prerequest.name;
      if (extraBody.scripts.prerequest.parameter)
        data["script.prerequest.param"] = extraBody.scripts.prerequest.parameter;
    }
    if (extraBody.scripts?.presort) {
      data["script.presort"] = extraBody.scripts.presort.name;
      if (extraBody.scripts.presort.parameter)
        data["script.presort.param"] = extraBody.scripts.presort.parameter;
    }
    if (this.recordId === -1) {
      const res2 = await this.layout.database._apiRequestJSON(`${this.layout.endpoint}/records`, {
        method: "POST",
        body: JSON.stringify(data)
      });
      console.log(res2);
      if (!res2.response) {
        throw new FMError(res2.messages[0].code, res2.httpStatus, res2);
      } else if (typeof res2.response.scriptError !== "undefined" && res2.response.scriptError !== "0") {
        throw new FMError(res2.response.scriptError, res2.httpStatus, res2);
      } else if (res2.messages[0].code === "0") {
        this.recordId = parseInt(res2.response.recordId);
        this.modId = parseInt(res2.response.modId);
        return this;
      } else {
        throw new FMError(res2.messages[0].code, res2.httpStatus, res2);
      }
    }
    const res = await this.layout.database._apiRequestJSON(this.endpoint, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
    if (!res.response) {
      throw new FMError(res.messages[0].code, res.httpStatus, res);
    } else if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== "0") {
      throw new FMError(res.response.scriptError, res.httpStatus, res);
    } else if (res.messages[0].code === "0") {
      this.modId = +res.response.modId;
      this._onSave();
      return this;
    } else {
      throw new FMError(res.messages[0].code, res.httpStatus, res);
    }
  }
  processPortalData(portalData) {
    for (const portalName of Object.keys(portalData)) {
      const _portal = new Portal(this, portalName);
      _portal.records = portalData[portalName].map((item) => {
        const fieldData = item;
        delete fieldData.recordId;
        delete fieldData.modId;
        return new PortalRecord(this, _portal, parseInt(item.recordId), parseInt(item.modId), fieldData);
      });
      this.portals[portalName] = _portal;
    }
  }
  /**
   * Re-fetches the current record from the database server.
   * Throws an error if commit() has not been called.
   *
   * @return {Promise<this>} A Promise that resolves to this RecordBase instance if the record is successfully retrieved.
   * @throws {Error} If commit() has not been called.
   * @throws {FMError} If the retrieval fails.
   */
  async get() {
    if (this.recordId === -1) {
      throw new Error("Cannot get this RecordBase until a commit() is done.");
    }
    if (!this.layout.metadata)
      await this.layout.getLayoutMeta();
    const res = await this.layout.database._apiRequestJSON(this.endpoint, {
      method: "GET"
    });
    if (res.response && res.messages[0].code === "0") {
      this.modId = +res.response.data[0].modId;
      this.processFieldData(res.response.data[0].fieldData);
      this.portalData = [];
      if (res.response.data[0].portalData)
        this.processPortalData(res.response.data[0].portalData);
      return this;
    } else {
      throw new FMError(res.messages[0].code, res.httpStatus, res);
    }
  }
  async duplicate() {
    const trace = new Error();
    const res = await this.layout.database._apiRequestJSON(this.endpoint, {
      method: "POST"
    });
    if (!res.response) {
      throw new FMError(res.messages[0].code, res.httpStatus, res, trace);
    } else if (typeof res.response.scriptError !== "undefined" && res.response.scriptError !== "0") {
      throw new FMError(res.response.scriptError, res.httpStatus, res, trace);
    } else if (res.messages[0].code === "0") {
      const data = this.toObject((a) => true, (a) => true, (a) => false, (a) => false);
      const _res = new _LayoutRecord(this.layout, res.response.recordId, res.response.modId, data.fieldData, data.portalData);
      this.emit("duplicated");
      return _res;
    } else {
      throw new FMError(res.messages[0].code, res.httpStatus, res, trace);
    }
  }
  async delete() {
    const res = await this.layout.database._apiRequestJSON(this.endpoint, {
      method: "DELETE"
    });
    if (typeof res.response?.scriptError !== "undefined" && res.response?.scriptError !== "0") {
      throw new FMError(res.response.scriptError, res.httpStatus, res);
    } else if (res.messages[0].code === "0") {
      this.emit("deleted");
    } else {
      throw new FMError(res.messages[0].code, res.httpStatus, res);
    }
  }
  fieldsToObject(filter = (a) => a.edited) {
    const fields_processed = {};
    let field;
    for (field of this.fieldsArray.filter((field2) => filter(field2))) {
      let value = field.value;
      if (value instanceof Date) {
        let _value = moment2.default(value);
        _value = _value.utcOffset(this.layout.database.host.timezoneOffsetFunc(_value));
        switch (field.metadata.result) {
          case "time":
            value = _value.format(this.layout.database.host.timeFormat);
            break;
          case "date":
            value = _value.format(this.layout.database.host.dateFormat);
            break;
          default:
            value = _value.format(this.layout.database.host.timeStampFormat);
        }
      }
      fields_processed[field.id] = value;
    }
    const obj = {
      recordId: this.recordId.toString(),
      modId: this.modId.toString(),
      fieldData: fields_processed
    };
    return obj;
  }
  toObject(filter = (a) => a.edited, portalFilter = (a) => a.records.find((record) => record.edited), portalRowFilter = (a) => a.edited, portalFieldFilter = (a) => a.edited) {
    const obj = {
      ...this.fieldsToObject(filter),
      portalData: {}
    };
    const portals = this.portalsArray.filter((a) => portalFilter(a));
    if (portals) {
      obj.portalData = {};
      for (const portal of portals) {
        obj.portalData[portal.name] = portal.records.filter((a) => portalRowFilter(a)).map((record) => {
          return record.toObject(portalFieldFilter);
        });
      }
    }
    return obj;
  }
};

// src/utils/query.js
var import_moment = __toESM(require("moment"), 1);
var FindRequestSymbol = Symbol("easyfm-findrequest");
var SPECIAL_CHARACTERS = ["\\", "=", "<", "\u2264", "\u2265", ">", "\u2026", "...", "//", "@", "#", "*", '"', "~"];
function queryEscape(str) {
  for (const char of SPECIAL_CHARACTERS) {
    str = str.replace(char, `\\${char}`);
  }
  return str;
}
function query(strings, ...args) {
  const argStrings = args.map((item) => {
    if (typeof item === "number") {
      return queryEscape(item.toString());
    } else if (typeof item === "string")
      return queryEscape(item);
    else
      return item;
  });
  const query2 = strings.map((str, index) => {
    return [str, argStrings[index] || ""];
  }).flat(1);
  return { [FindRequestSymbol]: query2 };
}
function asDate(date) {
  return {
    type: "date",
    moment: (0, import_moment.default)(date)
  };
}
function asTime(date) {
  return {
    type: "time",
    moment: (0, import_moment.default)(date)
  };
}
function asTimestamp(date) {
  return {
    type: "timestamp",
    moment: (0, import_moment.default)(date)
  };
}

// src/records/getOperations/recordGetOperation.js
var RecordGetOperation = class {
  layout;
  limit = 100;
  scriptData = {};
  sortData = [];
  portals;
  offset = 1;
  queries = [];
  constructor(layout, options) {
    this.layout = layout;
    this.sortData = [];
    this.portals = options.portals;
    this.offset = options.offset ?? 1;
    this.limit = options.limit ?? 100;
  }
  get isFindRequest() {
    return this.queries.length !== 0;
  }
  formatQueries() {
    const test = this.queries.map((query2) => {
      const out = {};
      for (const key of Object.keys(query2.req)) {
        if (query2.req[key])
          out[key] = query2.req[key];
        else {
          out[key] = query2.req[key];
        }
      }
      if (query2.omit)
        out.omit = "true";
      return out;
    });
    return test;
  }
  generateParamsBody(offset, limit) {
    const params = {
      limit: limit.toString(),
      offset: offset.toString(),
      dateformats: 2
      // Ensure dates are received in ISO8601 format
    };
    if (this.sortData.length !== 0)
      params.sort = this.sortData;
    if (this.scriptData.after)
      params.script = this.scriptData.after.name;
    if (this.scriptData.after?.parameter)
      params["script.param"] = this.scriptData.after.parameter;
    if (this.scriptData.presort)
      params["script.presort"] = this.scriptData.presort.name;
    if (this.scriptData.presort?.parameter)
      params["script.presort.param"] = this.scriptData.presort.parameter;
    if (this.scriptData.prerequest)
      params["script.prerequest"] = this.scriptData.prerequest.name;
    if (this.scriptData.prerequest?.parameter)
      params["script.prerequest.param"] = this.scriptData.prerequest.parameter;
    if (this.queries.length !== 0)
      params.query = this.formatQueries();
    const portals = Object.keys(this.portals);
    params.portal = portals;
    for (const portal of portals) {
      params[`offset.${portal.toString()}`] = this.portals[portal]?.offset;
      params[`limit.${portal.toString()}`] = this.portals[portal]?.limit;
    }
    return params;
  }
  generateParamsURL(offset, limit) {
    const params = new URLSearchParams({
      _limit: limit.toString(),
      _offset: offset.toString(),
      dateformats: "2"
      // Ensure dates are received in ISO8601 format
    });
    if (this.sortData.length !== 0)
      params.set("_sort", JSON.stringify(this.sortData));
    if (this.scriptData.after)
      params.set("script", this.scriptData.after.name);
    if (this.scriptData.after?.parameter)
      params.set("script.param", this.scriptData.after.parameter);
    if (this.scriptData.presort)
      params.set("script.presort", this.scriptData.presort.name);
    if (this.scriptData.presort?.parameter)
      params.set("script.presort.param", this.scriptData.presort.parameter);
    if (this.scriptData.prerequest)
      params.set("script.prerequest", this.scriptData.prerequest.name);
    if (this.scriptData.prerequest?.parameter)
      params.set("script.prerequest.param", this.scriptData.prerequest.parameter);
    const portals = Object.keys(this.portals);
    for (const portal of portals) {
      params.set(`_offset.${portal.toString()}`, (this.portals[portal]?.limit ?? "").toString());
      params.set(`_offset.${portal.toString()}`, (this.portals[portal]?.offset ?? "").toString());
    }
    params.set("portal", JSON.stringify(portals));
    return params;
  }
  /**
   * Configures any FileMaker scripts to be run as a part of the request
   *
   * @param {ScriptRequestData} scripts - The script request data to set.
   * @return {this} - The current instance of the class.
   */
  scripts(scripts) {
    this.scriptData = scripts;
    return this;
  }
  /**
   * Sorts the data based on the given field name and sort order.
   *
   * @param {string} fieldName - The name of the field by which the data should be sorted.
   * @param {SortOrder} sortOrder - The sort order to be applied (either "asc" for ascending or "desc" for descending).
   *
   * @return {this} - Returns the current instance of the object.
   */
  sort(fieldName, sortOrder) {
    this.sortData.push({ fieldName, sortOrder });
    return this;
  }
  parseFindRequest(query2) {
    const out = {};
    for (const key of Object.keys(query2)) {
      out[key] = query2[key][FindRequestSymbol].map((item) => {
        if (typeof item === "string")
          return item;
        return item.moment.clone().utcOffset(this.layout.database.host.timezoneOffsetFunc(item.moment)).format(item.type === "date" ? this.layout.database.host.dateFormat : item.type == "time" ? this.layout.database.host.timeFormat : this.layout.database.host.timeStampFormat);
      }).join("");
    }
    return out;
  }
  /**
   * Adds a new request/query to the list of queries.
   *
   * @param {FindRequest} query - The find request to be added.
   * @param {boolean} [omit=false] - Flag to indicate if the find request should be omitted.
   * @return {Object} - The current object instance.
   */
  addRequest(query2, omit = false) {
    this.queries.push({ req: this.parseFindRequest(query2), omit });
    return this;
  }
  /**
   * Perform a fetch operation.
   *
   * @returns {Promise} A promise that resolves with the result of the fetch operation.
   */
  async fetch() {
    return await this.performFind(this.offset, this.limit);
  }
  async performFind(offset, limit) {
    const trace = new Error();
    await this.layout.getLayoutMeta();
    const isFind = this.isFindRequest;
    let endpoint = this.layout.endpoint + (isFind ? "/_find" : "/records");
    if (!isFind)
      endpoint += "?" + new URLSearchParams(this.generateParamsURL(offset, limit)).toString();
    const reqData = {
      // port: 443,
      method: isFind ? "POST" : "GET",
      body: isFind ? JSON.stringify(this.generateParamsBody(offset, limit)) : void 0
    };
    try {
      const res = await this.layout.database._apiRequestJSON(endpoint, reqData);
      if (res.messages[0].code === "0" && res.response) {
        if (!this.layout.metadata)
          await this.layout.getLayoutMeta();
        return res.response.data.map((item) => {
          return new LayoutRecord(this.layout, item.recordId, item.modId, item.fieldData, item.portalData);
        });
      } else {
        throw new FMError(res.messages[0].code, res.httpStatus, res, trace);
      }
    } catch (e) {
      if (e instanceof FMError) {
        if (e.code === 401) {
          return [];
        }
      }
      throw e;
    }
  }
  [Symbol.asyncIterator]() {
    let nextOffset = this.offset;
    const startOffset = JSON.parse(JSON.stringify(this.offset));
    const limit = this.limit;
    let exitAfterLastRecord = false;
    let records = [];
    const fetch3 = async () => {
      const theoreticalLimit = limit - nextOffset + startOffset;
      if (theoreticalLimit === 0) {
        exitAfterLastRecord = true;
        records = [];
        return;
      }
      records = await this.performFind(nextOffset, theoreticalLimit < 100 ? theoreticalLimit : 100);
      nextOffset += 100;
      if (records.length < 100)
        exitAfterLastRecord = true;
    };
    return {
      next: async () => {
        if (records.length === 0 && !exitAfterLastRecord) {
          await fetch3();
        }
        if (records.length === 0 && exitAfterLastRecord) {
          return { done: true, value: void 0 };
        } else {
          const record = records.shift();
          return { done: false, value: record };
        }
      }
    };
  }
};

// src/layouts/layoutRecordManager.js
var LayoutRecordManager = class {
  layout;
  constructor(layout) {
    this.layout = layout;
  }
  /**
   * Creates a new layout record with the provided options.
   *
   * @param {OPTIONS} options - The options for creating the layout record.
   * @return {Promise<LayoutRecord<PickPortals<T, OPTIONS['portals'][number]>>>}
   * The newly created layout record.
   */
  async create(options) {
    const metadata = await this.layout.getLayoutMeta();
    const fields = {};
    for (const _field of metadata.fieldMetaData) {
      fields[_field.name] = "";
    }
    const portals = {};
    for (const _portal of Object.keys(metadata.portalMetaData))
      portals[_portal] = [];
    return new LayoutRecord(this.layout, -1, 0, fields, portals);
  }
  /**
   * Retrieves a layout record based on the given recordId.
   *
   * @param {number} recordId - The identifier of the record to retrieve.
   *
   * @returns {Promise<LayoutRecord<PickPortals<T, never>>>} - A Promise that resolves with the retrieved layout record.
   */
  async get(recordId) {
    await this.layout.getLayoutMeta();
    const record = new LayoutRecord(this.layout, recordId);
    await record.get();
    return record;
  }
  /**
   * Creates a new instance of RecordGetOperation with the given options.
   *
   * @param {Array} options - An array of options for the operation.
   * @return {RecordGetOperation} - A new instance of RecordGetOperation.
   */
  list(options) {
    return new RecordGetOperation(this.layout, options);
  }
};

// src/layouts/layout.js
var Layout = class {
  database;
  name;
  records = new LayoutRecordManager(this);
  metadata = null;
  constructor(database, name) {
    this.database = database;
    this.name = name;
  }
  get endpoint() {
    return `${this.database.endpoint}/layouts/${this.name}`;
  }
  /**
   * Executes a FileMaker script on this layout asynchronously and returns the result.
   * @param {Script} script - The script to be executed.
   * @returns {Promise<ScriptResult>} - A promise that resolves to the script result or rejects with an error.
   */
  async runScript(script) {
    let url = `${this.endpoint}/script/${encodeURIComponent(script.name)}`;
    if (script.parameter)
      url += "?script.param=" + encodeURIComponent(script.parameter);
    const res = await this.database._apiRequestJSON(url, {
      method: "GET"
    });
    if (res.response && res.messages[0].code === "0") {
      const error = parseInt(res.response.scriptError);
      return {
        scriptError: error ? new FMError(error, 200, res) : void 0,
        scriptResult: res.response.scriptResult
      };
    } else {
      throw new FMError(res.messages[0].code, res.httpStatus, res);
    }
  }
  /**
   * Retrieves the layout metadata
   *
   * @returns {Promise<ApiLayoutMetadata>} The layout metadata.
   * @throws {FMError} If an error occurs during the API request.
   */
  async getLayoutMeta() {
    if (this.metadata) {
      return this.metadata;
    }
    const res = await this.database._apiRequestJSON(this.endpoint);
    if (!res.response)
      throw new FMError(res.messages[0].code, res.httpStatus, res);
    this.metadata = res.response;
    return this.metadata;
  }
};

// src/connection/database.js
var import_node_fetch = __toESM(require("node-fetch"), 1);
var import_node_fetch_cookies = __toESM(require("node-fetch-cookies"), 1);
var Database = class extends import_events2.EventEmitter {
  _token = "";
  host;
  connection_details;
  cookies = new import_node_fetch_cookies.CookieJar();
  name;
  debug;
  constructor(host, conn) {
    super();
    this.host = host;
    this.name = conn.database;
    this.connection_details = conn;
    this.debug = conn.debug ?? false;
  }
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  generateExternalSourceLogin(data) {
    if (data.credentials.method === "filemaker") {
      const _data = data.credentials;
      return {
        database: data.database,
        username: _data.username,
        password: _data.password
      };
    } else {
      throw new Error("Not yet supported login method");
    }
  }
  /**
   * Logs out the user by deleting the current session token.
   * Throws an error if the user is not logged in.
   *
   * @returns {Promise<void>} A promise that resolves with no value once the logout is successful.
   * @throws {Error} Throws an error if the user is not logged in.
   */
  async logout() {
    if (this.token === "")
      throw new Error("Not logged in");
    const _fetch = await (0, import_node_fetch.default)(`${this.endpoint}/sessions/${this.token}`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json"
      }
    });
    await _fetch.json();
    this._token = "";
  }
  /**
   * Logs in to the database. Not required, as this is often done automatically
   *
   * @param {boolean} [forceLogin=false] - Whether to force login even if already logged in.
   * @throws {Error} - Throws an error if already logged in and forceLogin is false.
   * @throws {FMError} - Throws an FMError if login fails.
   * @return {Promise<string>} - Returns a promise that resolves to the access token upon successful login.
   */
  async login(forceLogin = false) {
    if (this.token !== "" && !forceLogin)
      return;
    this.cookies = new import_node_fetch_cookies.CookieJar();
    await this.host.getMetadata();
    if (this.connection_details.credentials.method === "token") {
      this._token = this.connection_details.credentials.token;
      return this.token;
    } else {
      const url = new URL(`${this.endpoint}/sessions`);
      url.hostname = this.host.hostname;
      const res = await (0, import_node_fetch.default)(url, {
        method: "POST",
        headers: generateAuthorizationHeaders(this.connection_details.credentials),
        body: JSON.stringify({
          fmDataSource: this.connection_details.externalSources.map((i) => {
            const _i = i;
            return this.generateExternalSourceLogin(_i);
          })
        })
      });
      const _res = await res.json();
      if (res.status === 200) {
        this._token = res.headers.get("x-fm-data-access-token") ?? "";
        return this._token;
      } else {
        throw new FMError(_res.messages[0].code, _res.status, res);
      }
    }
  }
  get token() {
    return this._token;
  }
  /**
   * Returns the endpoint URL for the database connection.
   *
   * @returns {string} The endpoint URL.
   */
  get endpoint() {
    return `${this.host.protocol}//${this.host.hostname}/fmi/data/v2/databases/${this.name}`;
  }
  async _apiRequestRaw(url, options = {}, autoRelogin = true) {
    if (this.debug) {
      console.log(`EASYFM DEBUG: ${JSON.stringify(options)} ${url instanceof URL ? url.toString() : typeof url === "string" ? url : url.url}`);
    }
    const reqIsToDBHost = (url instanceof URL ? url : typeof url === "string" ? new URL(url) : new URL(url.url)).hostname === this.host.hostname;
    if (reqIsToDBHost && this.token === "")
      await this.login(true);
    if (!options.headers)
      options.headers = {};
    if (reqIsToDBHost)
      options.headers.authorization = "Bearer " + this._token;
    const _fetch = options.useCookieJar ? await (0, import_node_fetch_cookies.default)(this.cookies, url, options) : await (0, import_node_fetch.default)(url, options);
    if (!_fetch.ok && (!options.retries || options.retries > 0)) {
      if (this.debug) {
        console.log(`EASYFM DEBUG: RE-ATTEMPTING REQUEST (${_fetch.status}) ${url instanceof URL ? url.toString() : typeof url === "string" ? url : url.url}`);
      }
      return await this._apiRequestRaw(url, { ...options, retries: (options?.retries ?? 1) - 1 });
    } else if (_fetch.status === 401 && reqIsToDBHost && autoRelogin) {
      await this.login(true);
      return await this._apiRequestRaw(url, options, false);
    } else
      return _fetch;
  }
  async _apiRequestJSON(url, options = {}) {
    if (!options.headers)
      options.headers = {};
    options.headers["content-type"] = options.headers["content-type"] ? options.headers["content-type"] : "application/json";
    const _fetch = await this._apiRequestRaw(url, options);
    const data = await _fetch.json();
    if (data.response && Object.keys(data.response).length === 0)
      delete data.response;
    if (data.messages[0].code !== "0") {
      throw new FMError(data.messages[0].code, _fetch.status, data);
    }
    data.httpStatus = _fetch.status;
    return data;
  }
  /**
   * Retrieves a list of layouts in the current FileMaker database.
   *
   * @returns {Promise<Layout[]>} A promise that resolves to an array of Layout objects.
   * @throws {FMError} If there was an error retrieving the layouts.
   */
  async listLayouts() {
    const req = await this._apiRequestJSON(`${this.endpoint}/layouts?page=2`);
    if (!req.response)
      throw new FMError(req.messages[0].code, req.httpStatus, req.messages[0].message);
    const cycleLayoutNames = (layouts) => {
      let names = [];
      for (const layout of layouts) {
        if (layout.folderLayoutNames)
          names = names.concat(cycleLayoutNames(layout.folderLayoutNames));
        else
          names.push(layout.name);
      }
      return names;
    };
    return cycleLayoutNames(req.response.layouts).map((layout) => new Layout(this, layout));
  }
  layout(name) {
    return new Layout(this, name);
  }
  script(name, parameter = "") {
    return { name, parameter };
  }
};

// src/connection/FMHost.js
var FMHost = class {
  hostname;
  timezoneOffsetFunc;
  verify;
  protocol;
  _metadata = null;
  constructor(_hostname, timezoneOffset = (moment4) => 0 - (/* @__PURE__ */ new Date()).getTimezoneOffset(), verify = true) {
    if (!/^https?:\/\//.test(_hostname))
      throw new Error("hostname MUST begin with either http:// or https://");
    this.protocol = _hostname.startsWith("https:") ? "https:" : "http:";
    this.hostname = _hostname.split("//")[1];
    this.timezoneOffsetFunc = timezoneOffset;
    this.verify = verify;
  }
  get metadata() {
    return this._metadata ?? {
      productInfo: {
        buildDate: /* @__PURE__ */ new Date(),
        name: "",
        version: "",
        dateFormat: "MM/dd/yyyy",
        timeFormat: "HH:mm:ss",
        timeStampFormat: "MM/dd/yyyy HH:mm:ss"
      }
    };
  }
  get dateFormat() {
    return this.metadata.productInfo.dateFormat.replace("dd", "DD").replace("yyyy", "YYYY");
  }
  get timeFormat() {
    return this.metadata.productInfo.timeFormat;
  }
  get timeStampFormat() {
    return this.metadata.productInfo.timeStampFormat.replace("dd", "DD").replace("yyyy", "YYYY");
  }
  /**
   * Retrieves a list of databases from the FileMaker Server.
   *
   * @param {loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris} [credentials] - Optional credentials required for authentication.
   * @throws {FMError} If the request to the FileMaker Server fails or if the response contains an error.
   * @returns {Promise<any[]>} A promise that resolves to an array of database objects if successful.
   */
  async listDatabases(credentials) {
    let headers = {};
    if (credentials) {
      headers = generateAuthorizationHeaders(credentials);
    }
    const _fetch = await fetch(`${this.hostname}/fmi/data/v2/databases`, {
      method: "GET",
      headers
    });
    const data = await _fetch.json();
    if (data.messages[0].code === "0" && data.response) {
      return data.response.databases;
    } else {
      throw new FMError(data.messages[0].code, _fetch.status, data);
    }
  }
  /**
   * Creates a new database connection with the specified options.
   *
   * @template T - The type of the database structure.
   * @param {databaseOptionsWithExternalSources} data - The options for the database, including external sources.
   * @return {Database<T>} A new Database instance.
   */
  database(data) {
    return new Database(this, data);
  }
  async getMetadata() {
    if (this._metadata)
      return this._metadata;
    const _fetch = await fetch(`${this.protocol}//${this.hostname}/fmi/data/v2/productInfo`, {
      method: "GET"
    });
    const data = await _fetch.json();
    if (data.messages[0].code === "0" && data.response) {
      this._metadata = data.response;
      return data.response;
    } else {
      throw new FMError(data.messages[0].code, _fetch.status, data);
    }
  }
};

// src/index.ts
var src_default = FMHost;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Database,
  FMError,
  Field,
  Layout,
  LayoutRecord,
  LayoutRecordManager,
  Portal,
  PortalRecord,
  RecordBase,
  RecordGetOperation,
  TYPES,
  asDate,
  asTime,
  asTimestamp,
  query,
  queryEscape
});
