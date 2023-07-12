import Endpoint from "./_Endpoint";
import Renderer from "./_Render";

import DecryptionForm from "./components/DecryptionForm";
import Footer from "./components/Footer";

import { DecryptPaste, db, PageHeaders } from "./API";
import EntryDB, { Paste } from "../db/EntryDB";

import { Config } from "../..";
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

        // get paste if search.mode === "edit"
        let paste: Paste | undefined;

        if (search.get("mode") === "edit" && search.get("OldURL"))
            paste = await db.GetPasteFromURL(search.get("OldURL")!);

        // if search.server, add server to paste.CustomURL
        if (search.get("server") && paste)
            paste.CustomURL = `${paste.CustomURL}@${search.get("server")}`;

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

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        {(search.get("err") && (
                            <div class={"mdnote note-error"}>
                                <b class={"mdnote-title"}>Application Error</b>
                                <p>{decodeURIComponent(search.get("err")!)}</p>
                            </div>
                        )) ||
                            (search.get("msg") && (
                                <div class={"mdnote note-note"}>
                                    <b class={"mdnote-title"}>Application Message</b>
                                    <p>{decodeURIComponent(search.get("msg")!)}</p>
                                </div>
                            ))}

                        {paste && paste.ViewPassword && (
                            <DecryptionForm
                                paste={paste}
                                urlName="OldURL"
                                isEdit={true}
                            />
                        )}

                        <noscript>
                            <div class={"mdnote note-error"}>
                                <b class={"mdnote-title"}>JavaScript Disabled</b>
                                <p>
                                    Without JavaScript enabled, the paste editor will
                                    not work. This means you cannot create pastes
                                    without JavaScript. Every other feature of Entry
                                    will still function without JavaScript. This
                                    includes the admin panel, paste viewing, paste
                                    decryption and group viewing. Special Markdown
                                    will not work with JavaScript disabled.
                                </p>
                            </div>
                        </noscript>

                        <div className="tabbar">
                            <button id={"editor-open-tab-text"}>Text</button>
                            <button
                                id={"editor-open-tab-preview"}
                                class={"secondary"}
                            >
                                Preview
                            </button>
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
                                        gap: "0.5rem",
                                    }}
                                    method={"POST"}
                                    action={"/api/new"}
                                >
                                    <button
                                        style={{ minWidth: "max-content" }}
                                        id={"CreateFormSubmit"}
                                    >
                                        Go
                                    </button>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            flexWrap: "wrap",
                                            justifyContent: "center", // aha! this is for mobile :)
                                        }}
                                    >
                                        <input
                                            type="hidden"
                                            name={"Content"}
                                            id={"contentInput"}
                                            required
                                        />

                                        <details
                                            id={"CreateFormRequired"}
                                            style={{
                                                width: "20rem",
                                            }}
                                        >
                                            <summary>
                                                Paste Information{" "}
                                                <span
                                                    style={{
                                                        color: "var(--red3)",
                                                    }}
                                                >
                                                    (required)
                                                </span>
                                            </summary>

                                            <div
                                                class={
                                                    "details-flex-content-list-box"
                                                }
                                            >
                                                <input
                                                    type="text"
                                                    placeholder={"Custom url"}
                                                    maxLength={
                                                        EntryDB.MaxCustomURLLength
                                                    }
                                                    minLength={
                                                        EntryDB.MinCustomURLLength
                                                    }
                                                    name={"CustomURL"}
                                                    autoComplete={"off"}
                                                    required
                                                />

                                                <input
                                                    type="text"
                                                    placeholder={"Custom edit code"}
                                                    maxLength={
                                                        EntryDB.MaxPasswordLength
                                                    }
                                                    minLength={
                                                        EntryDB.MinPasswordLength
                                                    }
                                                    name={"EditPassword"}
                                                    autoComplete={"off"}
                                                    required
                                                />
                                            </div>
                                        </details>

                                        <details
                                            style={{
                                                width: "20rem",
                                            }}
                                        >
                                            <summary>
                                                More Options (optional)
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
                                                    Private Pastes
                                                </h4>

                                                <p>
                                                    Providing a view code makes your
                                                    paste private. The view code is
                                                    used to decrypt your paste for
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
                                                    name={"ViewPassword"}
                                                    autoComplete={"off"}
                                                />

                                                <hr />
                                                <h4
                                                    style={{
                                                        margin: "0",
                                                    }}
                                                >
                                                    Group Pastes
                                                </h4>

                                                <p>
                                                    Groups cannot be made private.
                                                    The code is only required when
                                                    submitting to an existing group.
                                                    If you provide a group name, the
                                                    group post code{" "}
                                                    <b>is required</b>! Adding a
                                                    group name will append the group
                                                    name to the beginning of your set
                                                    custom URL. This means the custom
                                                    URL "example" with the group
                                                    "example-group" would look like
                                                    "example-group/example" instead
                                                    of just the custom URL.
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
                                                    name={"GroupName"}
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
                                                    name={"GroupSubmitPassword"}
                                                    autoComplete={"off"}
                                                />
                                            </div>
                                        </details>
                                    </div>

                                    <script
                                        dangerouslySetInnerHTML={{
                                            __html: `// open CreateFormRequired on submit
                                            const CreateFormRequired = document.getElementById("CreateFormRequired");
                                            const CreateFormSubmit = document.getElementById("CreateFormSubmit");
                                            
                                            if (CreateFormSubmit && CreateFormRequired)
                                                CreateFormSubmit.addEventListener("click", (e) => {
                                                    CreateFormRequired.toggleAttribute("open", true);
                                                });`,
                                        }}
                                    />
                                </form>
                            )) ||
                                (paste && search.get("mode") === "edit" && (
                                    // if mode is provided and it is "edit" show the paste edit form
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
                                            <button
                                                style={{
                                                    minWidth: "max-content",
                                                }}
                                            >
                                                Save
                                            </button>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "0.5rem",
                                                    flexWrap: "wrap",
                                                    justifyContent: "right",
                                                }}
                                            >
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
                                                    // we're going to provide the old custom URL as well because the server expects it
                                                    // if we don't provide a new custom url, this will be used instead so we don't give up our url
                                                }
                                                <input
                                                    type="hidden"
                                                    name={"OldURL"}
                                                    value={paste!.CustomURL}
                                                    required
                                                />

                                                <details
                                                    style={{
                                                        width: "20rem",
                                                    }}
                                                >
                                                    <summary>
                                                        Change Settings (optional)
                                                    </summary>

                                                    <div
                                                        class={
                                                            "details-flex-content-list-box"
                                                        }
                                                    >
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
                                                                "Change custom url - optional"
                                                            }
                                                            maxLength={
                                                                EntryDB.MaxCustomURLLength
                                                            }
                                                            minLength={
                                                                EntryDB.MinCustomURLLength
                                                            }
                                                            name={"NewURL"}
                                                            autoComplete={"off"}
                                                        />
                                                    </div>
                                                </details>
                                            </div>
                                        </form>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "0.4rem",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                marginTop: "1rem",
                                            }}
                                        >
                                            <a
                                                href={`/${
                                                    search.get("OldURL") || ""
                                                }`}
                                            >
                                                <button>Back</button>
                                            </a>

                                            <button id={"editor-open-delete-modal"}>
                                                Delete Paste
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <Footer />
                    </main>

                    {paste && (
                        <dialog id="editor-modal-delete">
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
                                            paste!.CustomURL.split("@")[0]
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
                                    paddingTop: "1rem",
                                }}
                            >
                                <form method="dialog">
                                    <button
                                        style={{
                                            boxShadow: "0 0 4px var(--green)",
                                            color: "var(--green)",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </form>

                                <form
                                    method="POST"
                                    action={"/api/delete"}
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        justifyContent: "right",
                                    }}
                                >
                                    <input
                                        type="text"
                                        required
                                        minLength={EntryDB.MinPasswordLength}
                                        maxLength={EntryDB.MaxPasswordLength}
                                        placeholder={"Edit code"}
                                        name={"password"}
                                        autoComplete={"off"}
                                    />

                                    <input
                                        type="hidden"
                                        required
                                        name={"CustomURL"}
                                        value={paste!.CustomURL}
                                    />

                                    <button
                                        style={{
                                            boxShadow: "0 0 4px var(--red3)",
                                            color: "var(--red3)",
                                        }}
                                    >
                                        Delete
                                    </button>
                                </form>
                            </div>
                        </dialog>
                    )}

                    <script
                        type="module"
                        dangerouslySetInnerHTML={{
                            __html: `import CreateEditor from "/Editor.js";
                            CreateEditor("editor-tab-text", \`${encodeURIComponent(
                                (paste || { Content: "" })!.Content
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
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                },
            }
        );
    }
}
