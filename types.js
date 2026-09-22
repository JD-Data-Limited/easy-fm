"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var easy_fm_1 = require("@jd-data-limited/easy-fm");
// 2 layouts found
var HOST = new easy_fm_1.default("https://carlson45-d.jd-data.com", "780", "true");
HOST.database();
var LAYOUTS = {
    WEB_API_DEXIE_CHANGES: HOST.getLayout("Web_API_Dexie_Changes"),
    API_ASSETS: HOST.getLayout("API_Assets")
};
