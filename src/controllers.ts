import assert from "assert";
import {RequestHandler} from "express";
import {Provider} from "oidc-provider";
import otpGenerator from 'otp-generator';

let GLOBAL_OTP: string = '';

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

        GLOBAL_OTP = otp;

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

export const makeLoginInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const {uid, prompt, params} = await provider.interactionDetails(req, res);
        assert.strictEqual(prompt.name, 'login');
        const client = await provider.Client.find(params.client_id as string);

        // const accountId = await Account.authenticate(req.body.email, req.body.password);
        const accountId = '1';

        if (!req.body.otp || !GLOBAL_OTP || req.body.otp !== GLOBAL_OTP) {
            return res.render('interaction', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Authorize Tchap',
                flash: `Invalid OTP, use ${GLOBAL_OTP}`
            });
        }

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

        await provider.interactionFinished(req, res, result, {mergeWithLastSubmission: false});
    } catch (err) {
        next(err);
    }

    await next();
}

export const makeEndInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const interactionDetails = await provider.interactionDetails(req, res);
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
        await provider.interactionFinished(req, res, result, {mergeWithLastSubmission: true});
    } catch (err) {
        next(err);
    }
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
