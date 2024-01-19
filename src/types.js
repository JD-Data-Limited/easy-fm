/*
 * Copyright (c) 2022-2024. See LICENSE file for more information
 */
export var DOWNLOAD_MODES;
(function (DOWNLOAD_MODES) {
    DOWNLOAD_MODES[DOWNLOAD_MODES["Stream"] = 0] = "Stream";
    DOWNLOAD_MODES[DOWNLOAD_MODES["Buffer"] = 1] = "Buffer";
})(DOWNLOAD_MODES || (DOWNLOAD_MODES = {}));
export var RecordTypes;
(function (RecordTypes) {
    RecordTypes[RecordTypes["UNKNOWN"] = 0] = "UNKNOWN";
    RecordTypes[RecordTypes["LAYOUT"] = 1] = "LAYOUT";
    RecordTypes[RecordTypes["PORTAL"] = 2] = "PORTAL";
})(RecordTypes || (RecordTypes = {}));
