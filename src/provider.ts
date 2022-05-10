import {Configuration, FindAccount, KoaContextWithOIDC} from "oidc-provider";
import {BaseClient, Client} from "openid-client";
import jwks from './jkws.json'
import RedisAdapter from "./redis_adapter";

function isFirstParty(client: Client): Boolean {
    return true;
}

// Allows to skip consent
const loadExistingGrant = async (ctx: KoaContextWithOIDC) => {
    console.log('toto', ctx.oidc.client)
    const grantId = (ctx.oidc.result
        && ctx.oidc.result.consent
        && ctx.oidc.result.consent.grantId) || ctx.oidc.session!.grantIdFor(ctx.oidc.client!.clientId);

    if (grantId) {
        // keep grant expiry aligned with session expiry
        // to prevent consent prompt being requested when grant expires
        const grant = await ctx.oidc.provider.Grant.find(grantId);

        // this aligns the Grant ttl with that of the current session
        // if the same Grant is used for multiple sessions, or is set
        // to never expire, you probably do not want this in your code
        if (ctx.oidc.account && grant!.exp! < ctx.oidc.session!.exp) {
            grant!.exp = ctx.oidc.session!.exp;

            await grant!.save();
        }

        return grant;
    } else if (ctx.oidc.client && isFirstParty(ctx.oidc.client as any)) {
        const grant = new ctx.oidc.provider.Grant({
            clientId: ctx.oidc.client!.clientId,
            accountId: ctx.oidc.session!.accountId,
        });

        grant.addOIDCScope('openid email profile');
        // grant.addOIDCClaims(['first_name']);
        // grant.addResourceScope('urn:example:resource-indicator', 'api:read api:write');
        await grant.save();
        return grant;
    }
}

const findAccount: FindAccount = async (ctx, id) => {
    return {
        accountId: id,
        async claims(use: any, scope: any) {
            return {sub: id};
        },
    };
}

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
    findAccount,
    interactions: {
        url(ctx, interaction) {
            return `/interaction/${interaction.uid}`;
        },
    },
    loadExistingGrant,
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
