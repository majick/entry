/**
 * @file Handle builder endpoint
 * @name index.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";

import EntryDB, { Paste } from "../../../db/EntryDB";
import { PageHeaders, db, GetAssociation } from "../../api/API";
import { OpenGraph } from "../../Pages";
import _404Page from "../404";

import parser from "../../../db/helpers/BaseParser";
import { BuilderDocument } from "./schema";

/**
 * @export
 * @class Builder
 * @implements {Endpoint}
 */
export class Builder implements Endpoint {
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
                        {
                            ID: "PageStar",
                            Type: "StarInfo",
                            NotRemovable: true,
                            Source: "",
                        },
                    ],
                },
            ],
        };

        // get editing paste (if it exists)
        let result: Paste | undefined;
        if (search.get("edit")) {
            // get paste
            result = (await db.GetPasteFromURL(search.get("edit")!)) as Paste;

            // make sure paste exists
            if (!result) return new _404Page().request(request);

            // get association
            const Association = await GetAssociation(request, null);

            // check PrivateSource value
            if (
                result.Metadata &&
                result.Metadata.PrivateSource === true &&
                result.Metadata.Owner &&
                result.Metadata.Owner !== Association[1]
            )
                return new _404Page().request(request);

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

            // parse content
            const TrueContent = parser.parse(result.Content.split("_builder:")[1]);

            // set document
            Document = TrueContent as BuilderDocument;
        }

        // stringify
        const stringified = parser.stringify(Document);

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
                    <div id="debug" />

                    <script
                        type={"module"}
                        dangerouslySetInnerHTML={{
                            __html: `import Builder, { Debug } from "/Builder.js";
                            Builder(\`${stringified}\`, true); window.Debug = Debug;`,
                        }}
                    />
                </>,
                <>
                    <title>Builder</title>
                    <link rel="icon" href="/favicon" />

                    <OpenGraph
                        title={
                            result === undefined
                                ? "Create a new builder paste..."
                                : `Edit ${result.CustomURL}...`
                        }
                    />
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

// default export
export default {
    Builder,
};
