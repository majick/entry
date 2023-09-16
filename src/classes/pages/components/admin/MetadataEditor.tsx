/**
 * @file Handle metadata editor
 * @name metadata-editor.tsx
 * @license MIT
 */

import BaseParser from "../../../db/helpers/BaseParser";
import { render } from "preact";
import Checkbox from "../form/Checkbox";

export default function Editor(_metadata: string, id: string) {
    const metadata: { [key: string]: any } = {
        root: JSON.parse(_metadata),
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

    if (metadata.root.Locked === undefined) metadata.root.Locked = false;

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
                    <div
                        className="card"
                        style={{
                            background: "var(--background-surface)",
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
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
                    </div>
                );
            } else {
                Inputs.push(
                    <div
                        className="card"
                        style={{
                            background: "var(--background-surface)",
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
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
                    </div>
                );
            }
        }
    }

    // initial metadata update
    UpdateMetadata();
    GenerateInputFields(metadata);

    // render and return
    return render(
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
            }}
        >
            <div
                className="card"
                style={{
                    background: "var(--background-surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.5rem",
                }}
            >
                <b>Key</b>
                <span>Value</span>
            </div>

            {Inputs}
        </div>,
        document.getElementById(id) as HTMLElement
    );
}
