import {Configuration} from "oidc-provider";
import jwks from './jkws.json'
import RedisAdapter from "./redis_adapter";

const configuration: Configuration = {
    adapter: RedisAdapter,
    clients: [
        {
            client_id: 'flow-not-allowed',
            redirect_uris: ['http://localhost:3000/cb'],
            grant_types: ['implicit'],
            response_types: ['id_token'],
            token_endpoint_auth_method: 'none',
        },
        {
            client_id: 'bar',
            client_secret: 'baz',
            redirect_uris: ['http://localhost:3000/cb'],
            response_types: ['code']
        }
    ],
    cookies: {
        keys: process.env.SECURE_KEY!.split(','),
    },
    jwks,
    responseTypes: ['code'],
    findAccount: (ctx, id) => {
        return {
            accountId: id,
            async claims(use, scope) {
                return {sub: id};
            },
        };
    },
    interactions: {
        url(ctx, interaction) {
            return `/interaction/${interaction.uid}`;
        },
    },
    features: {
        // disable the packaged interactions
        devInteractions: {enabled: false},
        encryption: { enabled: true },
        introspection: { enabled: true },
    },
    ttl: {
        AccessToken: 1 * 60 * 60, // 1 hour in seconds
        AuthorizationCode: 10 * 60, // 10 minutes in seconds
        IdToken: 1 * 60 * 60, // 1 hour in seconds
        DeviceCode: 10 * 60, // 10 minutes in seconds
        RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
        Interaction: 1 * 60 * 60,
        Session: 1 * 24 * 60 * 60,
        Grant: 1 * 60 * 60,
    },
}

export {configuration};
