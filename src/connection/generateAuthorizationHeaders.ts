/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {
    AuthorizationHeaders,
    AuthorizationHeadersOAuth,
    loginOptionsClaris,
    loginOptionsFileMaker,
    loginOptionsOAuth
} from "../types.js";

export function generateAuthorizationHeaders(credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris): AuthorizationHeaders | AuthorizationHeadersOAuth {
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