/**
 * @file Handle builder endpoint
 * @name index.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";

import type { Paste } from "../../../db/objects/Paste";
import EntryDB from "../../../db/EntryDB";

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
            Version: 2,
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
        let DisablePasswordField = false;
        let RevisionNumber = 0;

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

            // get revision
            if (search.get("r") && result) {
                const revision = await db.GetRevision(
                    search.get("edit")!,
                    parseFloat(search.get("r")!)
                );

                // ...return 404 if revision doesn't exist
                if (!revision[0] || !revision[2])
                    return new _404Page().request(request);

                // ...update result
                result.Content = revision[2].Content.split("_metadata:")[0];
                result.EditDate = revision[2].EditDate;
                RevisionNumber = revision[2].EditDate;
            }

            // if paste isn't a builder paste, convert it
            if (result.Metadata && result.Metadata.PasteType !== "builder") {
                Document.Pages[0].Children[0] = {
                    Type: "Source",
                    Content: await ParseMarkdown(result.Content),
                };

                result.Content = `_builder:${parser.stringify(Document)}`;
            }

            // parse content
            const TrueContent = parser.parse(result.Content.split("_builder:")[1]);

            // set document
            Document = TrueContent as BuilderDocument;

            // set DisablePasswordField
            if (result.Metadata && result.Metadata.Owner)
                DisablePasswordField =
                    Association[0] && Association[1] === result.Metadata!.Owner;
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
                            window.DisablePasswordField = ${DisablePasswordField};
                            window.EnableDrafts = ${
                                EntryDB.config.app &&
                                EntryDB.config.app.enable_versioning === true
                            };
                            window.ViewingRevision = ${RevisionNumber !== 0};
                            window.EnableGroups = ${
                                !EntryDB.config.app ||
                                EntryDB.config.app.enable_groups !== false
                            };
                            window.EnableExpiry = ${
                                !EntryDB.config.app ||
                                EntryDB.config.app.enable_expiry !== false
                            };
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
