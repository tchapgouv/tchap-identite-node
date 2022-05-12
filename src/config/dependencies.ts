import {Provider} from "oidc-provider";
import {makeSendCodeToAccount, makeValidateAccountWithCode} from "../authUsecases";
import {matrixClient} from "../notifications/matrixBot";
import {appUrl} from "./config";
import {configuration} from "./provider";

const oidcProvider = new Provider(appUrl, configuration);
oidcProvider.proxy = true;

// !!!!!!!!!!!! DEV ONLY !!!!!!!!!!!!!
// Allows localhost and insecure redirects
// @ts-ignore
const {invalidate: orig} = oidcProvider.Client.Schema.prototype;

// @ts-ignore
oidcProvider.Client.Schema.prototype.invalidate = function invalidate(message: any, code: any) {
    if (code === 'implicit-force-https' || code === 'implicit-forbid-localhost') {
        return;
    }

    orig.call(this, message);
};
// !!!!!!!!!!!! DEV ONLY !!!!!!!!!!!!!

// Now that the client is all set up and the event handler is registered, start the
// client up. This will start it syncing.
matrixClient.start().then(() => console.log("Client started!"));

const otpGenerator = () => ({
    generate: () => '123'
})

const sendCodeToAccount = makeSendCodeToAccount(matrixClient, otpGenerator, null);
const validateAccountWithCode = makeValidateAccountWithCode(null, null);

export {
    oidcProvider,
    sendCodeToAccount,
    validateAccountWithCode
}
