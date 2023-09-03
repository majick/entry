import { Endpoint, Renderer } from "honeybee";

import DecryptionForm from "./components/form/DecryptionForm";
import Footer from "./components/Footer";
import Modal from "./components/Modal";

import { DecryptPaste, db, PageHeaders, Session } from "./api/API";
import EntryDB, { Paste } from "../db/EntryDB";

import pack from "../../../package.json";

import { Config } from "../..";
import DateOptions from "./components/form/DateOptions";
import Checkbox from "./components/form/Checkbox";
let config: Config;

/**
 * @export
 * @class Home
 * @implements {Endpoint}
 */
export default class Home implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);
        if (!config) config = (await EntryDB.GetConfig()) as Config;

        // if search.server, add server to paste.CustomURL
        if (search.get("server"))
            search.set("OldURL", `${search.get("OldURL")}:${search.get("server")}`);

        // get paste if search.mode === "edit"
        let paste: Partial<Paste> | undefined;

        if (search.get("mode") === "edit" && search.get("OldURL"))
            paste = await db.GetPasteFromURL(search.get("OldURL")!);

        // decrypt (if we can)
        if (search.get("ViewPassword") && paste) {
            const decrypted = await new DecryptPaste().GetDecrypted({
                // using result.CustomURL makes cross server decryption possible because
                // when we get the result, we'll have already resolved the other server
                // ...now GetDecrypted just has to implement it (TODO)
                CustomURL: paste.CustomURL,
                ViewPassword: search.get("ViewPassword") as string,
            });

            if (decrypted) {
                paste.Content = decrypted;
                delete paste.ViewPassword; // don't show decrypt form!
            }
        }

        // manage session
        const SessionCookie = await Session(request);

        // if commenton or reporton is blank, remove it (we can't comment on nothing!!)
        if (search.get("CommentOn") === "" || search.get("ReportOn") === "") {
            search.delete("CommentOn");
            search.delete("ReportOn");
        }

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        {(search.get("err") && (
                            <div
                                class={"mdnote note-error"}
                                style={{
                                    marginBottom: "0.5rem",
                                }}
                            >
                                <b class={"mdnote-title"}>Application Error</b>
                                <p>{decodeURIComponent(search.get("err")!)}</p>
                            </div>
                        )) ||
                            (search.get("msg") && (
                                <div
                                    class={"mdnote note-note"}
                                    style={{
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <b class={"mdnote-title"}>Application Message</b>
                                    <p>{decodeURIComponent(search.get("msg")!)}</p>
                                </div>
                            ))}

                        {paste && paste.ViewPassword && (
                            <DecryptionForm
                                paste={paste as Paste}
                                urlName="OldURL"
                                isEdit={true}
                            />
                        )}

                        {search.get("CommentOn") && (
                            <div
                                class={"mdnote note-info"}
                                style={{
                                    marginBottom: "0.5rem",
                                }}
                            >
                                <b class={"mdnote-title"}>Just so you know!</b>
                                <p>
                                    You're commenting on a paste, write something
                                    short and simple! Not what you want?{" "}
                                    <a href="javascript:history.back()">Go Back</a>
                                </p>
                            </div>
                        )}

                        {search.get("ReportOn") && (
                            <div
                                class={"mdnote note-info"}
                                style={{
                                    marginBottom: "0.5rem",
                                }}
                            >
                                <b class={"mdnote-title"}>Just so you know!</b>
                                <p>
                                    You're <b>reporting a paste</b>! Please explain
                                    the reason you are reporting this paste and what
                                    rules it broke. Not what you want?{" "}
                                    <a href="javascript:history.back()">Go Back</a>
                                </p>
                            </div>
                        )}

                        <noscript>
                            <div
                                class={"mdnote note-error"}
                                style={{
                                    marginBottom: "0.5rem",
                                }}
                            >
                                <b class={"mdnote-title"}>JavaScript Disabled</b>
                                <p>
                                    Without JavaScript enabled, the paste editor will
                                    not work. This means you cannot create pastes.
                                    JavaScript access is not required to view pastes,
                                    and you can still copy the raw/rendered verison
                                    of the paste without JavaScript access.
                                </p>
                            </div>
                        </noscript>

                        <div
                            className="tabbar"
                            style={{
                                justifyContent: "space-between",
                            }}
                        >
                            <div class={"tabbar"}>
                                <button id={"editor-open-tab-text"}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Pencil Symbol"}
                                    >
                                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                    </svg>
                                    Text
                                </button>

                                <button
                                    id={"editor-open-tab-preview"}
                                    class={"secondary"}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"File Symbol"}
                                    >
                                        <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                                    </svg>
                                    Preview
                                </button>
                            </div>

                            {config.app && config.app.info && (
                                <a
                                    href={`/${config.app.info}`}
                                    class={"button secondary"}
                                    target={"_blank"}
                                    title={"Server Info & Announcements"}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Info Symbol"}
                                    >
                                        <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                                    </svg>
                                    Info
                                </a>
                            )}
                        </div>

                        <div class={"tab-container"}>
                            <div id="editor-tab-text" class="editor-tab"></div>

                            <div
                                id="editor-tab-preview"
                                class="editor-tab"
                                style={{ display: "none" }}
                            ></div>
                        </div>

                        <div>
                            {(!search.get("mode") && (
                                // if no mode is provided, show the create new paste form
                                <form
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        // gap: "0.5rem",
                                        flexDirection: "column",
                                    }}
                                    method={"POST"}
                                    action={"/api/new"}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            flexDirection: "row",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        {/* top row */}

                                        <button
                                            style={{ minWidth: "5rem" }}
                                            class={"mobile-center"}
                                        >
                                            Go
                                        </button>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "0.5rem",
                                                flexWrap: "wrap",
                                                alignItems: "flex-start",
                                                justifyContent: "center",
                                                maxWidth: "100%",
                                            }}
                                        >
                                            <div
                                                class={"PrimaryOptions"}
                                                style={{
                                                    display: "flex",
                                                    gap: "0.5rem",
                                                    alignItems: "center",
                                                    flexWrap: "wrap",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <style
                                                    dangerouslySetInnerHTML={{
                                                        __html: `.PrimaryOptions input:not([type="checkbox"]) {
                                                            width: 18rem;
                                                        }`,
                                                    }}
                                                />

                                                <input
                                                    type="hidden"
                                                    name={"Content"}
                                                    id={"contentInput"}
                                                    required
                                                />

                                                <input
                                                    type="text"
                                                    placeholder={"Custom URL"}
                                                    maxLength={
                                                        EntryDB.MaxCustomURLLength
                                                    }
                                                    minLength={
                                                        EntryDB.MinCustomURLLength
                                                    }
                                                    name={"CustomURL"}
                                                    id={"CustomURL"}
                                                    autoComplete={"off"}
                                                    disabled={
                                                        // cannot be changed if we're creating a comment
                                                        search.get("CommentOn") !==
                                                            null ||
                                                        // or a report...
                                                        search.get("ReportOn") !==
                                                            null
                                                    }
                                                    value={
                                                        // random value if we're creating a comment
                                                        search.get("CommentOn") ===
                                                            null &&
                                                        search.get("ReportOn") ===
                                                            null
                                                            ? ""
                                                            : "url will be randomly assigned"
                                                    }
                                                />

                                                <div
                                                    className="flex"
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "flex-start",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {!EntryDB.config.app ||
                                                        (EntryDB.config.app
                                                            .enable_not_editable_pastes !==
                                                            false && (
                                                            <Checkbox
                                                                name="IsEditable"
                                                                title="Toggle Editable"
                                                                checked={true}
                                                            />
                                                        ))}

                                                    <input
                                                        type="text"
                                                        placeholder={
                                                            "Custom edit code"
                                                        }
                                                        maxLength={
                                                            EntryDB.MaxPasswordLength
                                                        }
                                                        minLength={
                                                            EntryDB.MinPasswordLength
                                                        }
                                                        name={"EditPassword"}
                                                        id={"EditPassword"}
                                                        autoComplete={"off"}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {
                                        // show optional section if config doesn't have
                                        // an "app" entry, or all optional features are enabled
                                        (!EntryDB.config.app ||
                                            (EntryDB.config.app &&
                                                !(
                                                    EntryDB.config.app
                                                        .enable_private_pastes ===
                                                        false &&
                                                    EntryDB.config.app
                                                        .enable_groups === false &&
                                                    EntryDB.config.app
                                                        .enable_expiry === false
                                                ) &&
                                                // don't show on comment or report!
                                                search.get("CommentOn") === null &&
                                                search.get("ReportOn") ===
                                                    null)) && (
                                            <>
                                                <div style={{ margin: "0.25rem 0" }}>
                                                    <hr class={"mobile-only"} />
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "flex-end",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    {/* bottom row */}

                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: "0.5rem",
                                                            flexWrap: "wrap",
                                                            justifyContent: "center",
                                                        }}
                                                    >
                                                        {(!EntryDB.config.app ||
                                                            EntryDB.config.app
                                                                .enable_private_pastes !==
                                                                false) && (
                                                            <details
                                                                class={
                                                                    "details-confined"
                                                                }
                                                            >
                                                                <summary>
                                                                    Private Pastes
                                                                </summary>

                                                                <div className="details-flex-content-list-box ">
                                                                    <h4
                                                                        style={{
                                                                            margin: "0",
                                                                        }}
                                                                    >
                                                                        Private
                                                                        Pastes
                                                                    </h4>

                                                                    <p>
                                                                        Providing a
                                                                        view code
                                                                        makes your
                                                                        paste
                                                                        private. The
                                                                        view code is
                                                                        used to
                                                                        decrypt your
                                                                        paste for
                                                                        viewing.
                                                                    </p>

                                                                    <input
                                                                        type="text"
                                                                        placeholder={
                                                                            "View code - optional"
                                                                        }
                                                                        minLength={
                                                                            EntryDB.MinPasswordLength
                                                                        }
                                                                        maxLength={
                                                                            EntryDB.MaxPasswordLength
                                                                        }
                                                                        name={
                                                                            "ViewPassword"
                                                                        }
                                                                        autoComplete={
                                                                            "off"
                                                                        }
                                                                    />
                                                                </div>
                                                            </details>
                                                        )}

                                                        {(!EntryDB.config.app ||
                                                            EntryDB.config.app
                                                                .enable_groups !==
                                                                false) && (
                                                            <details
                                                                class={
                                                                    "details-confined"
                                                                }
                                                            >
                                                                <summary>
                                                                    Group Pastes
                                                                </summary>

                                                                <div className="details-flex-content-list-box ">
                                                                    <h4
                                                                        style={{
                                                                            margin: "0",
                                                                        }}
                                                                    >
                                                                        Group Pastes
                                                                    </h4>

                                                                    <p>
                                                                        Groups cannot
                                                                        be made
                                                                        private. The
                                                                        group post
                                                                        code is only
                                                                        required when
                                                                        submitting to
                                                                        an existing
                                                                        group or
                                                                        creating a
                                                                        new group.
                                                                    </p>

                                                                    <input
                                                                        type="text"
                                                                        placeholder={
                                                                            "Group name - optional"
                                                                        }
                                                                        minLength={
                                                                            EntryDB.MinCustomURLLength
                                                                        }
                                                                        maxLength={
                                                                            EntryDB.MaxCustomURLLength
                                                                        }
                                                                        name={
                                                                            "GroupName"
                                                                        }
                                                                    />

                                                                    <input
                                                                        type="text"
                                                                        placeholder={
                                                                            "Group post code - optional"
                                                                        }
                                                                        minLength={
                                                                            EntryDB.MinPasswordLength
                                                                        }
                                                                        maxLength={
                                                                            EntryDB.MaxPasswordLength
                                                                        }
                                                                        name={
                                                                            "GroupSubmitPassword"
                                                                        }
                                                                        autoComplete={
                                                                            "off"
                                                                        }
                                                                    />
                                                                </div>
                                                            </details>
                                                        )}

                                                        {(!EntryDB.config.app ||
                                                            EntryDB.config.app
                                                                .enable_expiry !==
                                                                false) && (
                                                            <details
                                                                class={
                                                                    "details-confined"
                                                                }
                                                            >
                                                                <summary>
                                                                    Paste Expiry
                                                                </summary>

                                                                <div
                                                                    class={
                                                                        "details-flex-content-list-box"
                                                                    }
                                                                >
                                                                    <h4
                                                                        style={{
                                                                            margin: "0",
                                                                        }}
                                                                    >
                                                                        Paste Expiry
                                                                    </h4>

                                                                    <label htmlFor="ExpireOn">
                                                                        Delete Paste
                                                                        On
                                                                    </label>

                                                                    <input
                                                                        type={
                                                                            "datetime-local"
                                                                        }
                                                                        name={
                                                                            "ExpireOn"
                                                                        }
                                                                        id={
                                                                            "ExpireOn"
                                                                        }
                                                                    />

                                                                    <hr />
                                                                    <DateOptions />
                                                                </div>
                                                            </details>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    }

                                    {/* hidden */}
                                    <input
                                        type="hidden"
                                        name="CommentOn"
                                        id={"CommentOn"}
                                        value={search.get("CommentOn") || ""}
                                    />

                                    <input
                                        type="hidden"
                                        name="ReportOn"
                                        id={"ReportOn"}
                                        value={search.get("ReportOn") || ""}
                                    />

                                    {/* ... */}

                                    {(!EntryDB.config.app ||
                                        EntryDB.config.app
                                            .enable_not_editable_pastes !==
                                            false) && (
                                        <script
                                            dangerouslySetInnerHTML={{
                                                __html: `document.getElementById("IsEditable").addEventListener("change", (e) => {
                                                    document.getElementById("EditPassword").toggleAttribute("disabled");
                                                });`,
                                            }}
                                        />
                                    )}
                                </form>
                            )) ||
                                (paste && search.get("mode") === "edit" && (
                                    // if mode is edit, show the paste edit form
                                    <div>
                                        <form
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                flexWrap: "wrap",
                                                gap: "0.5rem",
                                            }}
                                            method={"POST"}
                                            action={"/api/edit"}
                                        >
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gap: "0.5rem",
                                                    flexWrap: "wrap",
                                                    width: "100%",
                                                    justifyContent: "center",
                                                    maxWidth: "100vw",
                                                    gridTemplateColumns:
                                                        "repeat(3, 1fr)",
                                                }}
                                                class={"mobile-flex"}
                                            >
                                                <input
                                                    type="hidden"
                                                    name={"OldURL"}
                                                    value={paste.CustomURL}
                                                    required
                                                />

                                                <input
                                                    type="hidden"
                                                    name={"NewContent"}
                                                    id={"contentInput"}
                                                    required
                                                />

                                                <input
                                                    type="text"
                                                    placeholder={"Edit code"}
                                                    maxLength={
                                                        EntryDB.MaxPasswordLength
                                                    }
                                                    minLength={
                                                        EntryDB.MinPasswordLength
                                                    }
                                                    name={"OldEditPassword"}
                                                    required
                                                />

                                                {
                                                    // we're going to provide the old Custom URL as well because the server expects it
                                                    // if we don't provide a new Custom URL, this will be used instead so we don't give up our url
                                                }
                                                <input
                                                    type="text"
                                                    placeholder={
                                                        "Change edit code - optional"
                                                    }
                                                    maxLength={
                                                        EntryDB.MaxPasswordLength
                                                    }
                                                    minLength={
                                                        EntryDB.MinPasswordLength
                                                    }
                                                    name={"NewEditPassword"}
                                                    autoComplete={"off"}
                                                />

                                                <input
                                                    type="text"
                                                    placeholder={
                                                        "Change Custom URL - optional"
                                                    }
                                                    maxLength={
                                                        EntryDB.MaxCustomURLLength
                                                    }
                                                    minLength={
                                                        EntryDB.MinCustomURLLength
                                                    }
                                                    disabled={
                                                        // cannot be changed if we're editing a comment
                                                        search.get("CommentOn") !==
                                                            null ||
                                                        // or a report...
                                                        search.get("ReportOn") !==
                                                            null
                                                    }
                                                    name={"NewURL"}
                                                    autoComplete={"off"}
                                                />
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    flexWrap: "wrap",
                                                    width: "100%",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "0.5rem",
                                                    }}
                                                >
                                                    <button class={"green"}>
                                                        Save
                                                    </button>

                                                    <a
                                                        href={
                                                            "javascript:history.back()"
                                                        }
                                                        class={"button"}
                                                    >
                                                        Back
                                                    </a>
                                                </div>

                                                <a
                                                    id={"editor-open-delete-modal"}
                                                    class={"button red"}
                                                    href={"javascript:"}
                                                >
                                                    Delete
                                                </a>
                                            </div>
                                        </form>
                                    </div>
                                ))}
                        </div>

                        <Footer />
                    </main>

                    {paste && (
                        <Modal
                            buttonid="editor-open-delete-modal"
                            modalid="editor-modal-delete"
                        >
                            <h4 style={{ textAlign: "center", width: "100%" }}>
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
                                            paste!.CustomURL!.split(":")[0]
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
                                    <button class={"green mobile-max"}>
                                        Cancel
                                    </button>

                                    <div style={{ margin: "0.25rem 0" }}>
                                        <hr class={"mobile-only"} />
                                    </div>
                                </form>

                                <form
                                    method="POST"
                                    action={"/api/delete"}
                                    class={"mobile-max"}
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        justifyContent: "right",
                                        maxWidth: "100%",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <input
                                        type="text"
                                        required
                                        minLength={EntryDB.MinPasswordLength}
                                        maxLength={EntryDB.MaxPasswordLength}
                                        placeholder={"Edit code"}
                                        name={"EditPassword"}
                                        autoComplete={"off"}
                                        class={"mobile-max"}
                                    />

                                    <input
                                        type="hidden"
                                        required
                                        name={"CustomURL"}
                                        value={paste!.CustomURL}
                                    />

                                    <button class={"red mobile-max"}>Delete</button>
                                </form>
                            </div>
                        </Modal>
                    )}

                    <script
                        type="module"
                        dangerouslySetInnerHTML={{
                            __html: `import CreateEditor from "/Editor.js?v=${
                                pack.version
                            }";
                            CreateEditor("editor-tab-text", \`${encodeURIComponent(
                                (paste || { Content: "" })!.Content!
                            )}\`);`,
                        }}
                    />
                </>,
                <>
                    {
                        // this is the head vnode, it goes into the HTML head instead of body
                    }
                    <meta
                        name="description"
                        content="Entry - A Markdown Pastebin"
                    ></meta>

                    <title>{config.name} - A Markdown Pastebin</title>
                </>
            ),
            {
                status: search.get("err") === null ? 200 : 400,
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Set-Cookie": SessionCookie,
                    "X-Entry-Error": search.get("err") || "",
                },
            }
        );
    }
}
