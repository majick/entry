import ExtraPasteOptions from "./ExtraPasteOptions";
import LoadingModal from "./Loading";
import { Modal } from "fusion";

/**
 * @function PublishModals
 *
 * @export
 * @param {{
 *     EditingPaste?: string;
 *     DisablePassword?: boolean;
 *     EnableDrafts?: boolean;
 *     ViewingRevision?: boolean;
 *     Endpoints: {
 *         new: string;
 *         edit: string;
 *         delete: string;
 *     };
 * }} props
 * @return {*}
 */
export default function PublishModals(props: {
    EditingPaste?: string;
    DisablePassword?: boolean;
    EnableDrafts?: boolean;
    ViewingRevision?: boolean;
    Endpoints: {
        new: string;
        edit: string;
        delete: string;
    };
}): any {
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

            <div style={{ width: "25rem", maxWidth: "100%" }}>
                {props.ViewingRevision === true && (
                    <div
                        class={"mdnote note-info"}
                        style={{
                            marginBottom: "0.5rem",
                        }}
                    >
                        <b class={"mdnote-title"}>Viewing Revision</b>
                        <p>
                            Pressing "Publish" will publish the content of the
                            revision to the live paste!{" "}
                        </p>
                    </div>
                )}

                {(props.EditingPaste === undefined && (
                    <>
                        {/* create new paste */}
                        <form
                            action={props.Endpoints.new}
                            method={"POST"}
                            className="flex flex-column g-8 full"
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
                                class={"round full"}
                                autocomplete={"off"}
                                required
                            />

                            <hr style={{ margin: "0" }} />

                            <ExtraPasteOptions
                                // configured for builder! idealy, PublishModals would accept these in props as well!
                                EnablePrivate={false}
                                EnableGroups={(window as any).EnableGroups}
                                EnableExpiry={(window as any).EnableExpiry}
                            />

                            <a
                                href={"javascript:"}
                                id={"entry:button.PasteExtras"}
                                title={"More Options"}
                                class={"button tertiary round full"}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                    aria-label={"Ellipsis Symbol"}
                                >
                                    <path d="M0 5.75C0 4.784.784 4 1.75 4h12.5c.966 0 1.75.784 1.75 1.75v4.5A1.75 1.75 0 0 1 14.25 12H1.75A1.75 1.75 0 0 1 0 10.25ZM12 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM7 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM4 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"></path>
                                </svg>
                                More Options
                            </a>

                            <button className="green-cta round modal:entry:button.Loading full">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="18"
                                    height="18"
                                    aria-label={"Check Mark Symbol"}
                                >
                                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                                </svg>
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
                            className="flex flex-column g-8 full"
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

                            <div className="tooltip-wrapper mobile\:max flex justify-center">
                                <input
                                    type="text"
                                    name={"EditPassword"}
                                    id={"EditPassword"}
                                    minLength={2}
                                    maxLength={500}
                                    placeholder={"Edit password"}
                                    class={"round full"}
                                    autocomplete={"off"}
                                    disabled={props.DisablePassword === true}
                                    required
                                />

                                {props.DisablePassword && (
                                    <div className="card secondary round border tooltip top">
                                        You don't need a password, you own this!
                                    </div>
                                )}
                            </div>

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
                                <button className="green-cta round modal:entry:button.Loading full">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="18"
                                        height="18"
                                        aria-label={"Check Mark Symbol"}
                                    >
                                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                                    </svg>
                                    Publish
                                </button>

                                {/* draft button */}
                                {props.EnableDrafts === true && (
                                    <button
                                        class={"round tertiary full"}
                                        id={"entry:button.Save"}
                                        formAction={"/api/edit?draft=true"}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Draft Icon"}
                                        >
                                            <path d="M14.307 11.655a.75.75 0 0 1 .165 1.048 8.05 8.05 0 0 1-1.769 1.77.75.75 0 0 1-.883-1.214 6.552 6.552 0 0 0 1.44-1.439.75.75 0 0 1 1.047-.165Zm-2.652-9.962a.75.75 0 0 1 1.048-.165 8.05 8.05 0 0 1 1.77 1.769.75.75 0 0 1-1.214.883 6.552 6.552 0 0 0-1.439-1.44.75.75 0 0 1-.165-1.047ZM6.749.097a8.074 8.074 0 0 1 2.502 0 .75.75 0 1 1-.233 1.482 6.558 6.558 0 0 0-2.036 0A.751.751 0 0 1 6.749.097ZM.955 6.125a.75.75 0 0 1 .624.857 6.558 6.558 0 0 0 0 2.036.75.75 0 1 1-1.482.233 8.074 8.074 0 0 1 0-2.502.75.75 0 0 1 .858-.624Zm14.09 0a.75.75 0 0 1 .858.624c.13.829.13 1.673 0 2.502a.75.75 0 1 1-1.482-.233 6.558 6.558 0 0 0 0-2.036.75.75 0 0 1 .624-.857Zm-8.92 8.92a.75.75 0 0 1 .857-.624 6.558 6.558 0 0 0 2.036 0 .75.75 0 1 1 .233 1.482c-.829.13-1.673.13-2.502 0a.75.75 0 0 1-.624-.858Zm-4.432-3.39a.75.75 0 0 1 1.048.165 6.552 6.552 0 0 0 1.439 1.44.751.751 0 0 1-.883 1.212 8.05 8.05 0 0 1-1.77-1.769.75.75 0 0 1 .166-1.048Zm2.652-9.962A.75.75 0 0 1 4.18 2.74a6.556 6.556 0 0 0-1.44 1.44.751.751 0 0 1-1.212-.883 8.05 8.05 0 0 1 1.769-1.77.75.75 0 0 1 1.048.166Z"></path>
                                        </svg>
                                        Save Draft
                                    </button>
                                )}
                            </div>

                            <a
                                className="button red round full"
                                id={"entry:button.DeletePaste"}
                                href={"#"}
                            >
                                Delete
                            </a>
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
                                        If you delete your paste, it will be gone
                                        forever
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
                                    <form method="dialog" class={"mobile:max"}>
                                        <button class={"green round mobile:max"}>
                                            Cancel
                                        </button>

                                        <div style={{ margin: "0.25rem 0" }}>
                                            <hr class={"device:mobile"} />
                                        </div>
                                    </form>

                                    <form
                                        method="POST"
                                        action={props.Endpoints.delete}
                                        class={"mobile:max flex flex-wrap g-4"}
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
                                            class={"round mobile:max"}
                                        />

                                        <input
                                            type="hidden"
                                            required
                                            name={"CustomURL"}
                                            value={props.EditingPaste!}
                                        />

                                        <button
                                            class={
                                                "red round mobile:max modal:entry:button.Loading"
                                            }
                                        >
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
            </div>

            <LoadingModal />
        </Modal>
    );
}
