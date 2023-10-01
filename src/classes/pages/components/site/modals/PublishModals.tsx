import Modal from "./Modal";

export default function PublishModals(props: {
    EditingPaste?: string;
    Endpoints: {
        new: string;
        edit: string;
        delete: string;
    };
}) {
    // iframe load function
    function IframeLoadFunction(event: any) {
        // check path
        if (!event.target.contentWindow.location.pathname.startsWith("/")) return;

        // redirect (show error on this page instead)
        const SearchParams = new URLSearchParams(
            event.target.contentWindow.location.search
        );

        // get message or error
        const msg = SearchParams.get("msg");
        const err = SearchParams.get("err");

        const href = event.target.contentWindow.location.href;

        // redirect
        if (msg) window.location.href = `?msg=${msg}`;
        else if (err) window.location.href = `?err=${err}`;
        else window.location.href = href;
    }

    // return
    return (
        <Modal
            modalid="entry:modal.PublishPaste"
            buttonid="entry:button.PublishPaste"
            round={true}
        >
            <iframe
                name={"publish_frame"}
                style={{
                    display: "none",
                }}
                // @ts-ignore
                onload={
                    // use raw function data if rendered on client
                    globalThis.Bun === undefined
                        ? IframeLoadFunction
                        : `(${IframeLoadFunction.toString()})(event);`
                }
            ></iframe>

            {(props.EditingPaste === undefined && (
                <>
                    {/* create new paste */}
                    <form
                        action={props.Endpoints.new}
                        method={"POST"}
                        className="flex flex-column g-8"
                        target={"publish_frame"}
                    >
                        <input
                            type="hidden"
                            name="Content"
                            id={"contentInput"}
                            required
                        />

                        <label htmlFor="CustomURL">Custom URL</label>

                        <input
                            type="text"
                            name={"CustomURL"}
                            id={"CustomURL"}
                            minLength={2}
                            maxLength={500}
                            placeholder={"Custom URL"}
                            class={"round"}
                            autocomplete={"off"}
                            required
                        />

                        <label htmlFor="EditPassword">Edit Password</label>

                        <input
                            type="text"
                            name={"EditPassword"}
                            id={"EditPassword"}
                            minLength={2}
                            maxLength={500}
                            placeholder={"Custom edit password"}
                            class={"round"}
                            autocomplete={"off"}
                            required
                        />

                        <hr style={{ margin: "0" }} />

                        <button
                            className="green round"
                            style={{
                                width: "100%",
                            }}
                        >
                            Publish
                        </button>
                    </form>
                </>
            )) || (
                <>
                    {/* update existing */}
                    <form
                        action={props.Endpoints.edit}
                        method={"POST"}
                        className="flex flex-column g-8"
                        target={"publish_frame"}
                    >
                        <input
                            type="hidden"
                            name="Content"
                            id={"contentInput"}
                            required
                        />

                        <input
                            type="hidden"
                            name={"OldURL"}
                            value={props.EditingPaste}
                            required
                        />

                        <label htmlFor="EditPassword">Edit Password</label>

                        <input
                            type="text"
                            name={"EditPassword"}
                            id={"EditPassword"}
                            minLength={2}
                            maxLength={500}
                            placeholder={"Edit password"}
                            class={"round"}
                            autocomplete={"off"}
                            required
                        />

                        <details class={"round"}>
                            <summary>Change Values</summary>

                            <div className="details-flex-content-list-box">
                                <label htmlFor="NewCustomURL">
                                    Change Custom URL (optional)
                                </label>

                                <input
                                    type="text"
                                    name={"NewCustomURL"}
                                    id={"NewCustomURL"}
                                    minLength={2}
                                    maxLength={500}
                                    placeholder={"New Custom URL"}
                                    class={"round"}
                                    autocomplete={"off"}
                                />

                                <label htmlFor="NewEditPassword">
                                    Change Edit Password (optional)
                                </label>

                                <input
                                    type="text"
                                    name={"NewEditPassword"}
                                    id={"NewEditPassword"}
                                    minLength={2}
                                    maxLength={500}
                                    placeholder={"New custom edit password"}
                                    class={"round"}
                                    autocomplete={"off"}
                                />
                            </div>
                        </details>

                        <hr style={{ margin: "0" }} />

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <button
                                className="green round"
                                style={{
                                    width: "100%",
                                }}
                            >
                                Publish
                            </button>

                            <button
                                className="red round"
                                id={"entry:button.DeletePaste"}
                                style={{
                                    width: "100%",
                                }}
                            >
                                Delete Paste
                            </button>
                        </div>
                    </form>

                    {props.EditingPaste && (
                        <Modal
                            buttonid="entry:button.DeletePaste"
                            modalid="entry:modal.DeletePaste"
                            round={true}
                        >
                            <h4
                                style={{
                                    textAlign: "center",
                                    width: "100%",
                                }}
                            >
                                Confirm Deletion
                            </h4>

                            <hr />

                            <ul>
                                <li>
                                    If you delete your paste, it will be gone forever
                                </li>
                                <li>
                                    You cannot restore your paste and it will be
                                    removed from the server
                                </li>
                                <li>
                                    Your custom URL (
                                    <b>
                                        {
                                            // everything before @ so (if there is a server),
                                            // it isn't included here
                                            props.EditingPaste!.split(":")[0]
                                        }
                                    </b>
                                    ) will be available
                                </li>
                            </ul>

                            <hr />

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: "1rem",
                                }}
                            >
                                <form method="dialog" class={"mobile-max"}>
                                    <button class={"green round mobile-max"}>
                                        Cancel
                                    </button>

                                    <div style={{ margin: "0.25rem 0" }}>
                                        <hr class={"mobile-only"} />
                                    </div>
                                </form>

                                <form
                                    method="POST"
                                    action={props.Endpoints.delete}
                                    class={"mobile-max flex flex-wrap g-4"}
                                    style={{
                                        justifyContent: "right",
                                        maxWidth: "100%",
                                    }}
                                >
                                    <input
                                        type="text"
                                        required
                                        minLength={5}
                                        maxLength={256}
                                        placeholder={"Edit password"}
                                        id={"DEL_EditPassword"}
                                        name={"EditPassword"}
                                        autoComplete={"off"}
                                        class={"round mobile-max"}
                                    />

                                    <input
                                        type="hidden"
                                        required
                                        name={"CustomURL"}
                                        value={props.EditingPaste!}
                                    />

                                    <button class={"red round mobile-max"}>
                                        Delete
                                    </button>
                                </form>
                            </div>
                        </Modal>
                    )}
                </>
            )}

            <hr />

            <form method={"dialog"}>
                <button
                    className="red round"
                    style={{
                        width: "100%",
                    }}
                >
                    Cancel
                </button>
            </form>
        </Modal>
    );
}
