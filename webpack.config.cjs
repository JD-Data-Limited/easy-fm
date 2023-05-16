/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

const path = require("path")

module.exports = {
    entry: "./dist/index.js",
    output: {
        filename: "index.min.js",
        path: path.resolve(__dirname, "dist"),
        library: "EasyFM",
        libraryExport: "default",
        libraryTarget: "umd"
    },
    target: "web",
    externals: {
        "node-fetch": "fetch"
    }
}