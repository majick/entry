/**
 * @file Handle metadata editor
 * @name metadata-editor.tsx
 * @license MIT
 */

import type { PasteMetadata } from "../../../db/EntryDB";
import BaseParser from "../../../db/helpers/BaseParser";

import { render } from "preact";

export default function Editor(_metadata: string, id: string) {
    const metadata: { [key: string]: any } = {
        root: JSON.parse(_metadata),
    };

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
                        type={typeof data[1] === "string" ? "text" : "number"}
                        name={data[0]}
                        id={data[0]}
                        value={data[1]}
                        onBlur={(event: Event<HTMLInputElement>) => {
                            // update value (handle json nesting too)
                            let prev = metadata;

                            for (const _key of nested || ["root"]) {
                                prev = prev[_key]; // set new previous
                                if (prev === undefined) continue; // validate

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
