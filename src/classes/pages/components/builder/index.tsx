/**
 * @file Handle builder endpoint
 * @name index.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";

import EntryDB, { Paste } from "../../../db/EntryDB";
import { PageHeaders, db } from "../../api/API";
import _404Page from "../404";

import parser from "../../../db/helpers/BaseParser";
import { BuilderDocument } from "./schema";

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
        let Document: BuilderDocument = {
            Pages: [
                {
                    Type: "Page",
                    ID: "home",
                    NotRemovable: true,
                    AlignX: "center",
                    AlignY: "center",
                    Children: [
                        {
                            Type: "Card",
                            Children: [
                                {
                                    Type: "Text",
                                    Content: "nothing here yet! :)",
                                    ID: "first-element",
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

            // make sure paste exists
            if (!result) return new _404Page().request(request);

            // if paste isn't a builder paste, convert it
            if (
                !result.Content.startsWith("_builder:") &&
                result.GroupName !== "components"
            ) {
                Document.Pages[0].Children[0] = {
                    Type: "Text",
                    Content: result.Content,
                };

                result.Content = `_builder:${parser.stringify(Document)}`;
            }

            // convert component to page
            if (result.GroupName === "components") {
                // get content
                const ComponentMeta = JSON.parse(
                    result.Content.split("_builder.component:")[1]
                );

                // get component node
                const Node = parser.parse(ComponentMeta.Component);

                // add to page and regenerate content
                Document.Pages[0].Children[0] = Node as any;
                result.Content = `_builder:${parser.stringify(Document)}`;
            }

            // parse content
            const TrueContent = parser.parse(result.Content.split("_builder:")[1]);

            // set document
            Document = TrueContent as BuilderDocument;
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
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Content-Security-Policy": PageHeaders[
                        "Content-Security-Policy"
                    ].replace("default-src 'self'", "default-src *"),
                },
            }
        );
    }
}
