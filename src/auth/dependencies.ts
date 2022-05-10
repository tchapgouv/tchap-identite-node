import {MatrixClient} from "matrix-bot-sdk";
import {Provider} from "oidc-provider";
import {appUrl} from "../config";
import {makeAbortInteraction, makeEndInteraction, makeLoginInteraction, makeStartInteraction} from "./controllers";
import {matrixClient} from "../notifications/matrixClient";
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

const startInteractionController = makeStartInteraction(oidcProvider, matrixClient);
const loginInteractionController = makeLoginInteraction(oidcProvider);
const endInteractionController = makeEndInteraction(oidcProvider);
const abortInteractionController = makeAbortInteraction(oidcProvider);

export {
    oidcProvider,
    startInteractionController,
    loginInteractionController,
    endInteractionController,
    abortInteractionController
}