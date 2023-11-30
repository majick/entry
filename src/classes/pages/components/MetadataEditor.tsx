/**
 * @file Handle metadata editor
 * @name metadata-editor.tsx
 * @license MIT
 */

import BaseParser from "../../db/helpers/BaseParser";
import { render } from "preact";

import Checkbox from "./form/Checkbox";
import { Card } from "fusion";

/**
 * @function Editor
 *
 * @export
 * @param {string} _metadata
 * @param {string} id
 * @return {*}
 */
export function Editor(_metadata: string, id: string): any {
    const metadata: { [key: string]: any } = {
        root: BaseParser.parse(_metadata),
    };

    // fill missing values from schema
    // ...comments
    if (!metadata.root.Comments) metadata.root.Comments = { Enabled: true };

    if (metadata.root.Comments.Enabled === undefined)
        metadata.root.Comments.Enabled = true;

    if (metadata.root.Comments.ReportsEnabled === undefined)
        metadata.root.Comments.ReportsEnabled = true;

    // ...extras
    if (metadata.root.ShowOwnerEnabled === undefined)
        metadata.root.ShowOwnerEnabled = true;

    if (metadata.root.ShowViewCount === undefined)
        metadata.root.ShowViewCount = true;

    if (metadata.root.Locked === undefined) metadata.root.Locked = false;
    if (metadata.root.Badges === undefined) metadata.root.Badges = "";
    if (metadata.root.PrivateSource === undefined)
        metadata.root.PrivateSource = false;

    // ...
    function UpdateMetadata() {
        return ((document.getElementById("Metadata") as HTMLInputElement).value =
            BaseParser.stringify(metadata.root));
    }

    const Inputs: any[] = [];
    function GenerateInputFields(object: { [key: string]: any }, nested?: string[]) {
        for (const data of Object.entries(object)) {
            if (typeof data[1] === "object") {
                // contains nested values, parse those instead
                GenerateInputFields(data[1], [...(nested || []), data[0]]);
                continue;
            }

            // push to inputs
            const ValueType = typeof data[1];

            if (ValueType !== "boolean") {
                Inputs.push(
                    <Card class="flex justify-space-between align-center flex-wrap g-4">
                        <label htmlFor={data[0]}>
                            <b>
                                {(nested || ["root"]).join(".")}.{data[0]}
                            </b>
                        </label>

                        <input
                            type={ValueType === "string" ? "text" : "number"}
                            name={data[0]}
                            id={data[0]}
                            value={data[1]}
                            onBlur={(event: Event<HTMLInputElement>) => {
                                // update value (handle json nesting too)
                                let prev = metadata;

                                for (const _key of nested || ["root"]) {
                                    prev = prev[_key]; // set new previous

                                    // validate
                                    if (
                                        prev === undefined ||
                                        prev[data[0]] === undefined
                                    )
                                        continue;

                                    // update value
                                    prev[data[0]] = (
                                        event.target as HTMLInputElement
                                    ).value;
                                }

                                // regenerate metadata
                                UpdateMetadata();
                            }}
                            style={{
                                width: "20rem",
                                maxWidth: "100%",
                            }}
                        />
                    </Card>
                );
            } else {
                Inputs.push(
                    <Card class="flex justify-space-between align-center flex-wrap g-4">
                        <label htmlFor={data[0]}>
                            <b>
                                {(nested || ["root"]).join(".")}.{data[0]}
                            </b>
                        </label>

                        <Checkbox
                            name={data[0]}
                            title={`${(nested || ["root"]).join(".")}.${data[0]}`}
                            checked={data[1]}
                            changed={(event: Event<HTMLInputElement>) => {
                                // update value (handle json nesting too)
                                let prev = metadata;

                                // validate
                                for (const _key of nested || ["root"]) {
                                    prev = prev[_key]; // set new previous

                                    if (
                                        prev === undefined ||
                                        prev[data[0]] === undefined
                                    )
                                        continue;

                                    // update value
                                    prev[data[0]] = (
                                        event.target as HTMLInputElement
                                    ).checked;
                                }

                                // regenerate metadata
                                UpdateMetadata();
                            }}
                        />
                    </Card>
                );
            }
        }
    }

    // initial metadata update
    UpdateMetadata();
    GenerateInputFields(metadata);

    // render and return
    return render(
        <div class={"flex flex-column g-4"}>
            <Card class="flex justify-space-between align-center flex-wrap g-4">
                <b>Key</b>
                <span>Value</span>
            </Card>

            {Inputs}
        </div>,
        document.getElementById(id) as HTMLElement
    );
}

/**
 * @function ClientEditor
 *
 * @export
 * @param {string} _metadata
 * @param {string} id
 * @return {*}
 */
export function ClientEditor(_metadata: string, id: string): any {
    const metadata: { [key: string]: any } = {
        root: BaseParser.parse(_metadata),
    };

    // fill missing values from schema
    // ...comments
    if (!metadata.root.Comments) metadata.root.Comments = { Enabled: true };

    if (metadata.root.Comments.Enabled === undefined)
        metadata.root.Comments.Enabled = true;

    // ...
    function UpdateMetadata() {
        return ((document.getElementById("Metadata") as HTMLInputElement).value =
            BaseParser.stringify(metadata.root));
    }

    const Inputs: any[] = [];
    function GenerateInputFields(
        object: { [key: string]: [any, string] },
        nested?: string[]
    ) {
        for (const data of Object.entries(object)) {
            if (typeof data[1][0] === "object")
                // contains nested values, ignore
                continue;

            const ValueType = typeof data[1][0];

            // add divider
            if (data[1][0] === "div") {
                Inputs.push(
                    <div>
                        <hr id={data[0]} />
                        <h4>{data[1][1]}</h4>
                    </div>
                );
                continue;
            }

            // push to inputs
            // these should all just be true or false inputs
            Inputs.push(
                <Card
                    round={true}
                    border={true}
                    secondary={true}
                    class="flex justify-space-between align-center flex-wrap g-4"
                >
                    <div
                        className="flex flex-column g-4 mobile\:max"
                        style={{ width: "45%" }}
                    >
                        <label
                            htmlFor={data[0]}
                            title={`${(nested || ["root"]).join(".")}.${data[0]}`}
                        >
                            <b>
                                {(nested || []).join(".")}
                                {(nested || []).length > 0 ? "." : ""}
                                {data[0]}
                            </b>
                        </label>
                        {data[1][1] && <p>{data[1][1]}</p>}
                    </div>

                    {(ValueType === "boolean" && (
                        <Checkbox
                            name={data[0]}
                            round={true}
                            checked={data[1][0]}
                            secondary={true}
                            changed={(event: Event<HTMLInputElement>) => {
                                // update value (handle json nesting too)
                                let prev = metadata;

                                // validate
                                if (nested && !nested.includes("root"))
                                    nested = ["root", ...nested];

                                for (const _key of nested || ["root"]) {
                                    prev = prev[_key]; // set new previous
                                    if (prev === undefined) continue;

                                    // update value
                                    prev[data[0]] = (
                                        event.target as HTMLInputElement
                                    ).checked;
                                }

                                // regenerate metadata
                                UpdateMetadata();
                            }}
                        />
                    )) || (
                        <input
                            type={ValueType === "string" ? "text" : "number"}
                            name={data[0]}
                            id={data[0]}
                            value={data[1][0]}
                            onBlur={(event: Event<HTMLInputElement>) => {
                                // update value (handle json nesting too)
                                let prev = metadata;

                                // validate
                                if (nested && !nested.includes("root"))
                                    nested = ["root", ...nested];

                                for (const _key of nested || ["root"]) {
                                    prev = prev[_key]; // set new previous
                                    if (prev === undefined) continue;

                                    // update value
                                    prev[data[0]] = (
                                        event.target as HTMLInputElement
                                    ).value;
                                }

                                // regenerate metadata
                                UpdateMetadata();
                            }}
                            class={"round secondary"}
                            style={{
                                width: "20rem",
                                maxWidth: "100%",
                            }}
                        />
                    )}
                </Card>
            );
        }
    }

    // generate only the fields we want
    GenerateInputFields({
        // tab display section
        TabDisplay: ["div", "Tab Display"],
        Favicon: [
            metadata.root.Favicon || "",
            "Change the tab favicon when viewing this paste",
        ],
        Title: [
            metadata.root.Title || "",
            "Change the tab title when viewing this paste",
        ],
        Description: [
            metadata.root.Description || "",
            "Change the social embed description for this paste",
        ],
        EmbedColor: [
            metadata.root.EmbedColor || "#55a4e0",
            "Change the social embed color for this paste",
        ],
        EmbedImage: [
            metadata.root.EmbedImage || "",
            "Change the large embed image for this paste (thumbnail)",
        ],
        // privacy section
        Privacy: ["div", "Privacy and Security"],
        PrivateSource: [
            metadata.root.PrivateSource === undefined
                ? false
                : metadata.root.PrivateSource,
            "Make the source of this paste private unless associated with this paste or its owner",
        ],
        ShowOwnerEnabled: [
            metadata.root.ShowOwnerEnabled === undefined
                ? true
                : metadata.root.ShowOwnerEnabled,
            "Toggle the owner label on this paste",
        ],
        ShowViewCount: [
            metadata.root.ShowViewCount === undefined
                ? true
                : metadata.root.ShowViewCount,
            "Toggle the views counter on this paste",
        ],
        // social section
        Social: ["div", "Social Options"],
        SocialIcon: [
            metadata.root.SocialIcon || "",
            "Social icon shown in some places (like comments)",
        ],
        // danger section
        Danger: ["div", "Danger Zone"],
        Owner: [
            metadata.root.Owner || "",
            "Change the owner of the paste, takes another paste URL",
        ],
    });

    if (
        metadata.root.Comments &&
        (window as any).ENTRYDB_CONFIG_ENABLE_COMMENTS === true
    ) {
        GenerateInputFields(
            {
                Comments: ["div", "Comments"],
                Enabled: [metadata.root.Comments.Enabled, ""],
                Filter: [
                    metadata.root.Comments.Filter || "",
                    'Comma separated list of banned words, comments containing these words will not be posted (ex: "bad,words")',
                ],
            },
            ["Comments"]
        );
    }

    // render and return
    return render(
        <div class={"flex flex-column g-4"}>{Inputs}</div>,
        document.getElementById(id) as HTMLElement
    );
}

// default export
export default {
    Editor,
    ClientEditor,
};
