import {AutojoinRoomsMixin, MatrixClient, RustSdkCryptoStorageProvider, SimpleFsStorageProvider,} from "matrix-bot-sdk";

// where you would point a client to talk to a homeserver
const homeserverUrl = "https://matrix.i.tchap.gouv.fr";

// see https://t2bot.io/docs/access_tokens
const accessToken = process.env.BOT_ACCESS_TOKEN!;

// We'll want to make sure the bot doesn't have to do an initial sync every
// time it restarts, so we need to prepare a storage provider. Here we use
// a simple JSON database.
const storage = new SimpleFsStorageProvider("hello-bot.json");
// const cryptoProvider = new RustSdkCryptoStorageProvider("./secure-storage");


// Now we can create the client and set it up to automatically join rooms.
const client = new MatrixClient(homeserverUrl, accessToken, storage);
AutojoinRoomsMixin.setupOnClient(client);

// We also want to make sure we can receive events - this is where we will
// handle our command.
// fixme client.on("room.message", handleCommand);
client.on("room.event", handleCommand);

// This is our event handler for dealing with the `!hello` command.
async function handleCommand(roomId: string, event: any) {
    console.log('log', event)
    if (event["sender"] === await client.getUserId()) return;

    if (event["type"] === "m.room.encrypted") {
        const sender = event["sender"];

        await client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": `Hello ${sender}, sorry, i couldn't decrypt your message`,
        });

        return
    }

    // Don't reply to bot
    if (!event["content"]) return;

    const sender = event["sender"];

    await client.sendMessage(roomId, {
        "msgtype": "m.notice",
        "body": `Hello ${sender} I can decrypt your message`,
    });
}

export {
    client
}
