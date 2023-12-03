/**
 * @file Handle Socket endpoints
 * @name API.ts
 * @license MIT
 */

import type WSAssetStreamer from "wsas/src";

export default function CreateSocketRoutes(AssetStreamer: WSAssetStreamer) {
    // channels (pub/sub)

    // api/subscribe
    AssetStreamer.register({
        path: "api/subscribe",
        method: "send",
        handler: async (request) => {
            let content: Uint8Array | string = request.body!;
            if (typeof content !== "string")
                content = new TextDecoder().decode(content);

            // get channel
            const body = JSON.parse(content);

            if (!body.channel)
                return {
                    request,
                    status: 400,
                    head: {
                        type: "text/plain",
                    },
                    body: "Missing channel!",
                };

            // subscribe
            request.sock.subscribe(body.channel);

            // return
            return {
                request,
                status: 200,
                head: {
                    type: "text/plain",
                },
                body: `Subscribed to channel! (${body.channel})`,
            };
        },
    });

    // api/unsubscribe
    AssetStreamer.register({
        path: "api/unsubscribe",
        method: "send",
        handler: async (request) => {
            let content: Uint8Array | string = request.body!;
            if (typeof content !== "string")
                content = new TextDecoder().decode(content);

            // get channel
            const body = JSON.parse(content);

            if (!body.channel)
                return {
                    request,
                    status: 400,
                    head: {
                        type: "text/plain",
                    },
                    body: "Missing channel!",
                };

            // unsubscribe
            request.sock.unsubscribe(body.channel);

            // return
            return {
                request,
                status: 200,
                head: {
                    type: "text/plain",
                },
                body: `Unsubscribed from channel! (${body.channel})`,
            };
        },
    });
}
