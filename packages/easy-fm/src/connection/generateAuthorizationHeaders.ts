/*
 * Copyright (c) 2023. See LICENSE file for more information
 */

import {
    type AuthorizationHeaders,
    type AuthorizationHeadersOAuth,
    type loginOptionsClaris,
    type loginOptionsFileMaker,
    type loginOptionsOAuth
} from '../types.js'

export function generateAuthorizationHeaders (credentials: loginOptionsOAuth | loginOptionsFileMaker | loginOptionsClaris): AuthorizationHeaders | AuthorizationHeadersOAuth {
    switch (credentials.method) {
        case 'filemaker':
            return {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from((credentials).username + ':' + (credentials).password).toString('base64')
            } satisfies AuthorizationHeaders
        case 'claris':
            return {
                'Content-Type': 'application/json',
                Authorization: (credentials).claris.fmid
            } satisfies AuthorizationHeaders
        case 'oauth':
            return {
                'Content-Type': 'application/json',
                'X-FM-Data-OAuth-RequestId': (credentials).oauth.requestId,
                'X-FM-Data-OAuth-Identifier': (credentials).oauth.requestIdentifier
            } satisfies AuthorizationHeadersOAuth
    }
}
