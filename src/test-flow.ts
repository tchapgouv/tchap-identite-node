import {Router} from "express";
import {generators, Issuer} from 'openid-client';
import {appUrl} from "./config";

const testRouter = Router();

testRouter.get('/test', async (req, res) => {
    return res.render('test', {
        loginUrl: appUrl + '/login'
    });
});

testRouter.get('/login', async (req, res) => {
    const issuer = await Issuer.discover(appUrl);
    // console.log('Discovered issuer %s %O', issuer.issuer, issuer.metadata);

    const client = new issuer.Client({
        client_id: 'bar',
        client_secret: 'baz',
        redirect_uris: [appUrl + '/cb'],
        response_types: ['code'],
        // id_token_signed_response_alg (default "RS256")
        // token_endpoint_auth_method (default "client_secret_basic")
    }); // => Client

    const code_verifier = generators.codeVerifier();
    // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
    // it should be httpOnly (not readable by javascript) and encrypted.

    const code_challenge = generators.codeChallenge(code_verifier);

    const redirect_url = client.authorizationUrl({
        scope: 'openid email profile',
        code_challenge,
        code_challenge_method: 'S256',
        login_hint: 'c.eliacheff@gmail.com'
    });

    res.redirect(redirect_url)
});

testRouter.get('/cb', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(req.query));
});

export default testRouter;
