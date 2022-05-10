import assert from "assert";
import {RequestHandler} from "express";
import {Provider} from "oidc-provider";
import otpGenerator from 'otp-generator';
import {oidcProvider, sendCodeToAccount, validateAccountWithCode} from "./config/dependencies";

let GLOBAL_OTP: string = '';

export const startInteractionController: RequestHandler = async (req, res, next) => {
    try {
        const {
            uid, prompt, params,
        } = await oidcProvider.interactionDetails(req, res);
        // console.log('see what else is available to you for interaction views', await provider.interactionDetails(req, res));
        const client = await oidcProvider.Client.find(params.client_id as string);

        const otp = await sendCodeToAccount(req.body?.email ?? 'c.eliacheff@gmail.com')

        if (prompt.name === 'consent' || prompt.name === 'login') {
            return res.render('interaction', {
                client: '',
                uid,
                details: prompt.details,
                params,
                title: 'Authorize Tchap',
                flash: 'OTP generated:' + otp,
                login_hint: req.body?.email,
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

export const loginInteractionController: RequestHandler = async (req, res, next) => {
    try {
        const {uid, prompt, params} = await oidcProvider.interactionDetails(req, res);
        assert.strictEqual(prompt.name, 'login');
        const client = await oidcProvider.Client.find(params.client_id as string);

        let accountId;
        try {
            accountId = await validateAccountWithCode(req.body?.email ?? 'c.eliacheff@gmail.com', req.body.otp)
        } catch (err) {
            return res.render('interaction', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Authorize Tchap',
                flash: `Invalid OTP, use ${GLOBAL_OTP}`
            });
        }
        // const accountId = await Account.authenticate(req.body.email, req.body.password);
        // const accountId = '1';

        // if (!accountId) {
        //     res.render('login', {
        //         client,
        //         uid,
        //         details: prompt.details,
        //         params: {
        //             ...params,
        //             login_hint: req.body.email,
        //         },
        //         title: 'Sign-in Tchap',
        //         flash: 'Invalid email or password.',
        //     });
        //     return;
        // }

        const result = {
            login: {accountId},
        };

        await oidcProvider.interactionFinished(req, res, result, {mergeWithLastSubmission: false});
    } catch (err) {
        next(err);
    }

    await next();
}

export const endInteractionController: RequestHandler = async (req, res, next) => {
    try {
        const interactionDetails = await oidcProvider.interactionDetails(req, res);
        // console.log(req.body.otp)
        // @ts-ignore fixme
        const {prompt: {name, details}, params, session, uid} = interactionDetails;
        // assert.strictEqual(name, 'consent');

        const accountId = '1';

        // Auto consent in provider.ts
        // https://github.com/panva/node-oidc-provider/blob/f70decd804d2c0ac785e8efd7b08dd9308b07fd5/recipes/skip_consent.md
        // let {grantId} = interactionDetails;
        // grantId = await getGrantId(grantId, provider, accountId, params.clientId as string, details);
        //
        // const consent = {};
        // if (!interactionDetails.grantId) {
        //     // we don't have to pass grantId to consent, we're just modifying existing one
        //     // @ts-ignore
        //     consent.grantId = grantId;
        // }

        const result = {
            // consent,
            login: {accountId},
        };
        await oidcProvider.interactionFinished(req, res, result, {mergeWithLastSubmission: true});
    } catch (err) {
        next(err);
    }
}

export const abortInteractionController: RequestHandler = async (req, res, next) => {
    try {
        const result = {
            error: 'access_denied',
            error_description: 'End-User aborted interaction',
        };
        await oidcProvider.interactionFinished(req, res, result, {mergeWithLastSubmission: false});
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
