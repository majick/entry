/**
 * @file Handle builder endpoint
 * @name index.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";

import EntryDB, { Paste } from "../../../db/EntryDB";
import { db } from "../../api/API";
import _404Page from "../404";
import Modal from "../Modal";

/**
 * @export
 * @class Builder
 * @implements {Endpoint}
 */
export default class Builder implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // check if builder is enabled
        if (
            EntryDB.config &&
            EntryDB.config.app &&
            EntryDB.config.app.enable_builder === false
        )
            return new _404Page().request(request);

        // get document
        let Document = {
            Pages: [
                {
                    Type: "Page",
                    ID: "home",
                    NotRemovable: true,
                    Children: [
                        {
                            Type: "Card",
                            Children: [
                                {
                                    Type: "Text",
                                    Content: "nothing here yet! :)",
                                    Alignment: "center",
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        // get editing paste (if it exists)
        if (search.get("edit")) {
            // get paste
            const result = (await db.GetPasteFromURL(search.get("edit")!)) as Paste;

            // make sure paste exists AND is a builder paste
            if (!result || !result.Content.startsWith("_builder:"))
                return new _404Page().request(request);

            // parse content
            const TrueContent = JSON.parse(
                atob(result.Content.split("_builder:")[1])
            );

            // set document
            Document = TrueContent;
        }

        // return
        return new Response(
            Renderer.Render(
                <>
                    <noscript>
                        <div
                            class={"mdnote note-error"}
                            style={{
                                marginBottom: "0.5rem",
                            }}
                        >
                            <b class={"mdnote-title"}>JavaScript Disabled</b>
                            <p>This page does not work without JavaScript access!</p>
                        </div>
                    </noscript>

                    <div id="builder" />

                    <script
                        type={"module"}
                        dangerouslySetInnerHTML={{
                            __html: `import Builder from "/Builder.js";
                            Builder(${JSON.stringify(Document)}, true);`,
                        }}
                    />
                </>,
                <>
                    <title>Builder</title>
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                },
            }
        );
    }
}
