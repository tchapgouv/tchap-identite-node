import assert from "assert";
import 'dotenv/config';
import {Application} from 'express'
import {port} from "./config";
import server from "./server";

// assert(process.env.PORT, 'process.env.PORT missing');
assert(process.env.SECURE_KEY, 'process.env.SECURE_KEY missing');
assert.equal(process.env.SECURE_KEY.split(',').length, 2, 'process.env.SECURE_KEY format invalid');
// assert(process.env.REDIS_URL, 'process.env.REDIS_URL missing');

const app: Application = server();

app.listen(port, function () {
    console.log(`App is listening on port ${port} !`)
})
