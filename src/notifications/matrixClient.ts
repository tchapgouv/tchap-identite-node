import {AutojoinRoomsMixin, MatrixClient, RoomEvent, SimpleFsStorageProvider,} from "matrix-bot-sdk";
import {Notifications} from "./notifications";

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
const matrixClient = new MatrixClient(homeserverUrl, accessToken, storage);
AutojoinRoomsMixin.setupOnClient(matrixClient);

// We also want to make sure we can receive events - this is where we will
// handle our command.
// fixme client.on("room.message", handleCommand);
// For now encrypted events are not supported so we listen to all room events to test
matrixClient.on("room.event", handleCommand);

// This is our event handler for dealing with the `!hello` command.
async function handleCommand(roomId: string, event: RoomEvent) {
    console.log('log', event)

    // Don't reply to bot
    if (event["sender"] === await matrixClient.getUserId()) return;
    if (!event["content"]) return;

    const sender = event["sender"];
    if (event["type"] === "m.room.encrypted") {
        await matrixClient.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": `Hello ${sender}, sorry, i couldn't decrypt your message`,
        });
        return
    }

    await matrixClient.sendMessage(roomId, {
        "msgtype": "m.notice",
        "body": `Hello ${sender} I can decrypt your message: ${event.content}`,
    });
}

// const matrixBot: Notifications = {
//     send: async (message, roomId) => {
//         await matrixClient.sendMessage(roomId, {
//             "msgtype": "m.notice",
//             "body": message,
//         })
//     }
// }

export {
    // matrixBot,
    matrixClient
}
