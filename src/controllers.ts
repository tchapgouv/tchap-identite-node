import assert from "assert";
import {RequestHandler} from "express";
import {Provider} from "oidc-provider";
import otpGenerator from 'otp-generator';
import {matrixClient} from "./notifications/matrixBot";


export const makeStartInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const {
            uid, prompt, params,
        } = await provider.interactionDetails(req, res);
        // console.log('see what else is available to you for interaction views', await provider.interactionDetails(req, res));

        const client = await provider.Client.find(params.client_id as string);

        const otp = otpGenerator.generate(6, {
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false
        })
        console.log(otp);

        if (prompt.name === 'consent' || prompt.name === 'login') {
            return res.render('interaction', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Authorize Tchap',
                flash: undefined,
            });
        }

        return res.status(500).render('error', {
            error_code: 'unknown_interaction_name',
            error_message: prompt.name,
        });
    } catch (err) {
        return next(err);
    }
}

export const makeEndInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const interactionDetails = await provider.interactionDetails(req, res);
        // @ts-ignore fixme
        const {prompt: {name, details}, params, session, uid} = interactionDetails;
        assert.strictEqual(name, 'consent');

        // todo check account here
        const accountId = '1';

        if (req.body.otp !== '123') {
            return res.render('interaction', {
                client: '',
                uid,
                details,
                params,
                title: 'Authorize Tchap',
                flash: 'Invalid OTP (123)'
            });
        }

        let {grantId} = interactionDetails;
        // fixme maybe we doesn't need consent / grants checks
        grantId = await getGrantId(grantId, provider, accountId, params.clientId as string, details);

        const consent = {};
        if (!interactionDetails.grantId) {
            // we don't have to pass grantId to consent, we're just modifying existing one
            // @ts-ignore
            consent.grantId = grantId;
        }

        const result = {
            consent,
            login: {accountId},
        };
        await provider.interactionFinished(req, res, result, {mergeWithLastSubmission: true});
    } catch (err) {
        next(err);
    }

    await next();
}

export const makeAbortInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const result = {
            error: 'access_denied',
            error_description: 'End-User aborted interaction',
        };
        await provider.interactionFinished(req, res, result, {mergeWithLastSubmission: false});
    } catch (err) {
        next(err);
    }
}

async function getGrantId(grantId: string | undefined, provider: Provider, accountId: string, clientId: string, details: any): Promise<string | undefined> {
    let grant: any;

    if (grantId) {
        // we'll be modifying existing grant in existing session
        grant = await provider.Grant.find(grantId);
    } else {
        // we're establishing a new grant
        grant = new provider.Grant({
            accountId,
            clientId,
        });
    }

    if (details.missingproviderScope) {
        // @ts-ignore
        grant.addOIDCScope(details.missingproviderScope.join(' '));
        // use grant.rejectproviderScope to reject a subset or the whole thing
    }
    if (details.missingproviderClaims) {
        // @ts-ignore
        grant.addOIDCClaims(details.missingproviderClaims);
        // use grant.rejectproviderClaims to reject a subset or the whole thing
    }
    if (details.missingResourceScopes) {
        // eslint-disable-next-line no-restricted-syntax
        // @ts-ignore
        for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
            grant.addResourceScope(indicator, (scopes as Array<any>).join(' '));
            // use grant.rejectResourceScope to reject a subset or the whole thing
        }
    }

    return await grant!.save();
}
