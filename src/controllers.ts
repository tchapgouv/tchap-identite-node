import assert from "assert";
import {RequestHandler} from "express";
import {Provider} from "oidc-provider";


export const makeStartInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const {
            uid, prompt, params,
        } = await provider.interactionDetails(req, res);
        // console.log('see what else is available to you for interaction views', details);

        const client = await provider.Client.find(params.client_id as string);

        if (prompt.name === 'login') {
            return res.render('login', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Sign-in Tchap',
                flash: undefined,
            });
        }
        if (prompt.name === 'consent') {
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

export const makeLoginInteraction = (provider: Provider): RequestHandler => async (req, res, next) => {
    try {
        const {uid, prompt, params} = await provider.interactionDetails(req, res);
        assert.strictEqual(prompt.name, 'login');
        const client = await provider.Client.find(params.client_id as string);

        // const accountId = await Account.authenticate(req.body.email, req.body.password);
        const accountId = '1';

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
        // TODO check OTP here
        const interactionDetails = await provider.interactionDetails(req, res);
        // console.log(req.body.otp)
        // @ts-ignore fixme
        const {prompt: {name, details}, params, session: {accountId}, uid} = interactionDetails;
        assert.strictEqual(name, 'consent');

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
        let grant: any;

        if (grantId) {
            // we'll be modifying existing grant in existing session
            grant = await provider.Grant.find(grantId);
        } else {
            // we're establishing a new grant
            grant = new provider.Grant({
                accountId,
                clientId: params.client_id as string,
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

        grantId = await grant!.save();

        const consent = {};
        if (!interactionDetails.grantId) {
            // we don't have to pass grantId to consent, we're just modifying existing one
            // @ts-ignore
            consent.grantId = grantId;
        }

        const result = {consent};
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
