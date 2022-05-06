import assert from "assert";
import 'dotenv/config';
import {Application} from 'express'
import {Provider} from 'oidc-provider';
import {configuration} from "./provider";
import {routes} from "./routes";
import server from "./server";
import testRouter from "./test-flow";
import  {client} from "./notifications/bot";

// Now that the client is all set up and the event handler is registered, start the
// client up. This will start it syncing.
client.start().then(() => console.log("Client started!"));

// assert(process.env.PORT, 'process.env.PORT missing');
assert(process.env.SECURE_KEY, 'process.env.SECURE_KEY missing');
assert.equal(process.env.SECURE_KEY.split(',').length, 2, 'process.env.SECURE_KEY format invalid');
// assert(process.env.REDIS_URL, 'process.env.REDIS_URL missing');


const port: number = 3000;

const app: Application = server();
const provider = new Provider(`http://localhost:${port}`, configuration);
provider.proxy = true;

// !!!!!!!!!!!! DEV ONLY !!!!!!!!!!!!!
// Allows localhost and insecure redirects
// @ts-ignore
const {invalidate: orig} = provider.Client.Schema.prototype;

// @ts-ignore
provider.Client.Schema.prototype.invalidate = function invalidate(message: any, code: any) {
    if (code === 'implicit-force-https' || code === 'implicit-forbid-localhost') {
        return;
    }

    orig.call(this, message);
};

app.use(testRouter);

// !!!!!!!!!!!! DEV ONLY !!!!!!!!!!!!!

routes(app, provider);
app.use('/', provider.callback());

app.listen(port, function () {
    console.log(`App is listening on port ${port} !`)
})
