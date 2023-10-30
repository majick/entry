/**
 * @file Handle toolbox components
 * @name Toolbox.tsx
 * @license MIT
 */

import type { Paste } from "../../../../db/EntryDB";
import Modal from "../../site/modals/Modal";

import { CurrentPage, Document, Selected, Update } from "../Builder";
import BaseParser from "../../../../db/helpers/BaseParser";
import parser from "../parser";

/**
 * @function SaveModal
 *
 * @export
 * @return {*}
 */
export function SaveModal(): any {
    return (
        <Modal
            buttonid="entry:button.SaveToToolbox"
            modalid="entry:modal.SaveToToolbox"
            noIdMatch={true}
            round={true}
        >
            <h4 style={{ textAlign: "center", width: "25rem", maxWidth: "100%" }}>
                Publish Component
            </h4>

            <hr />

            <form
                class={"full flex flex-column g-8"}
                onSubmit={async (event: Event<HTMLFormElement>) => {
                    event.preventDefault();

                    // get target
                    const target: HTMLFormElement = event.target as HTMLFormElement;
                    if (!target) return;

                    // create paste
                    const Paste: Paste = {
                        CustomURL: crypto.randomUUID(),
                        Content:
                            // build component
                            encodeURIComponent(
                                `_builder.component:${JSON.stringify({
                                    Name: target.ComponentName.value,
                                    Component: BaseParser.stringify(Selected),
                                })}`
                            ),
                        EditPassword: target.EditCode.value,
                        PubDate: new Date().getTime(),
                        EditDate: new Date().getTime(),
                    };

                    // create formdata body
                    let body: string[] = [];

                    // ...fill formdata body
                    for (const [key, value] of Object.entries(Paste))
                        body.push(`${key}=${value}`);

                    // send request
                    const res = await fetch("/api/new", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: body.join("&"),
                    });

                    // check if there was an error
                    if (res.headers.get("X-Entry-Error"))
                        return alert(res.headers.get("X-Entry-Error"));

                    // redirect to view
                    return (window.location.href = `/components/${Paste.CustomURL}`);
                }}
            >
                <label htmlFor="ComponentName">
                    <b>Name</b>
                </label>

                <input
                    type="text"
                    name={"ComponentName"}
                    id={"ComponentName"}
                    className="full round"
                    minLength={2}
                    maxLength={500}
                    placeholder={"New Component"}
                    required
                />

                <label htmlFor="EditCode">
                    <b>Edit code</b>
                </label>

                <input
                    type="text"
                    name={"EditCode"}
                    id={"EditCode"}
                    className="full round"
                    minLength={5}
                    maxLength={256}
                    placeholder={"Edit code"}
                    required
                />

                <button className="full green round">Publish</button>
            </form>

            <hr />

            <form method={"dialog"} class={"full"}>
                <button className="red full round">Cancel</button>
            </form>
        </Modal>
    );
}

/**
 * @function Browser
 *
 * @export
 * @return {*}
 */
export function Browser(): any {
    // get saved components
    const saved = JSON.parse(window.localStorage.getItem("entry:library") || "[]");

    // return
    return (
        <div
            style={{
                maxWidth: "100%",
            }}
        >
            <div
                style={{
                    display: "flex",
                    gap: "0.5rem",
                    padding: "1rem",
                    border: "dashed 1px var(--background-surface2)",
                    borderRadius: "0.4rem",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {saved.map(
                    (component: string[]) =>
                        component !== null && (
                            <button
                                onClick={async () => {
                                    // close modal
                                    (window as any).modals["entry:modal.Toolbox"](
                                        false
                                    );

                                    // fetch component
                                    const res = await (
                                        await fetch(`/api/raw/${component[1]}`)
                                    ).text();

                                    // parse response
                                    const parsed = BaseParser.parse(
                                        JSON.parse(
                                            res.split("_builder.component:")[1]
                                        ).Component
                                    ) as any;

                                    // randomize ID (so we don't have any ID conflicts)
                                    parsed.ID = crypto.randomUUID();

                                    // set node
                                    Document.Pages[CurrentPage].Children.push(
                                        parsed
                                    );

                                    // refresh all nodes
                                    parser.ResetNodes();

                                    // return and update
                                    return Update();
                                }}
                                className="border"
                                style={{
                                    borderRadius: "0.4rem",
                                }}
                            >
                                {component[0]}
                            </button>
                        )
                )}
            </div>
        </div>
    );
}

// default export
export default {
    SaveModal,
    Browser,
};
