/**
 * @file Handle Page endpoints
 * @name Pages.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";

// import components
import DecryptionForm from "./components/form/DecryptionForm";
import BuilderParser from "./components/builder/parser";
import TopNav from "./components/site/TopNav";
import Footer from "./components/site/Footer";
import _404Page from "./components/404";
import Home from "./Home";

// create database
import EntryDB, { Paste } from "../db/EntryDB";
import type { Log } from "../db/LogDB";
export const db = new EntryDB();

import API, {
    VerifyContentType,
    DecryptPaste,
    Session,
    DefaultHeaders,
    GetCookie,
    PageHeaders,
    GetAssociation,
} from "./api/API";

// ...
import { AuthModals } from "./components/site/modals/AuthModals";
import { ParseMarkdown } from "./components/Markdown";
import SearchForm from "./components/form/SearchForm";
import BaseParser from "../db/helpers/BaseParser";
import Modal from "./components/site/modals/Modal";

// ...

export function InformationPageNote() {
    return (
        <div
            class="mdnote note-info"
            style={{
                marginBottom: "0.5rem",
            }}
        >
            <b className="mdnote-title">Information Page</b>

            <p>
                This page will provide information about the server and current
                announcements. <b>It is maintained by server administrators.</b>
            </p>
        </div>
    );
}

/**
 * @export
 * @class GetPasteFromURL
 * @implements {Endpoint}
 */
export class GetPasteFromURL implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // load doc view is specified
        if (search.get("view") && search.get("view") === "doc")
            return await new PasteDocView().request(request);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/dec/")) name = name.split("paste/dec/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // check if paste is editable
        const editable = await db.CheckPasteEditable(name);

        // decrypt (if we can)
        let ViewPassword = "";
        if (request.method === "POST" && result) {
            // verify content type
            const WrongType = VerifyContentType(
                request,
                "application/x-www-form-urlencoded"
            );

            if (WrongType) return WrongType;

            // get request body
            const body = Honeybee.FormDataToJSON(await request.formData()) as any;

            if (body.ViewPassword) {
                const decrypted = await new DecryptPaste().GetDecrypted({
                    // using result.CustomURL makes cross server decryption possible because
                    // when we get the result, we'll have already resolved the other server
                    // ...now GetDecrypted just has to implement it (TODO)
                    CustomURL: result.CustomURL,
                    ViewPassword: body.ViewPassword,
                });

                if (decrypted) {
                    result.Content = decrypted;
                    delete result.ViewPassword; // don't show decrypt form!

                    ViewPassword = body.ViewPassword;
                }
            }
        }

        // manage session
        const SessionCookie = await Session(request);

        // count view
        let Viewed = false;
        if (result && !result.HostServer && search.get("NoView") !== "true") {
            const SessionCookieValue = GetCookie(
                request.headers.get("Cookie") || "",
                "session-id"
            );

            if (
                SessionCookieValue &&
                EntryDB.config.log &&
                EntryDB.config.log.events.includes("view_paste") &&
                // make sure we haven't already added this view
                // (make sure length of query for log is 0)
                (
                    await EntryDB.Logs.QueryLogs(
                        `Content = "${result.CustomURL};${SessionCookieValue}"`
                    )
                )[2].length === 0 &&
                // make sure session id is valid
                !SessionCookie.startsWith("session-id=refresh;")
            )
                await EntryDB.Logs.CreateLog({
                    Type: "view_paste",
                    Content: `${result.CustomURL};${SessionCookieValue}`,
                });
            else Viewed = true;
        }

        // check if paste was created in the builder (starts with _builder:)
        if (
            result.Content.startsWith("_builder:") &&
            search.get("nobuilder") === null
        ) {
            // get parsed content
            const TrueContent = JSON.parse(
                decodeURIComponent(atob(result.Content.split("_builder:")[1]))
            );

            // get current page
            let Page = TrueContent.Pages[0];

            // return
            return new Response(
                Renderer.Render(
                    <>
                        <div id="_doc">
                            {/* initial render */}
                            {BuilderParser.ParsePage(Page, false, true)}
                        </div>

                        {/* fix mistakes on client */}
                        <script
                            type={"module"}
                            dangerouslySetInnerHTML={{
                                __html: `import Builder from "/Builder.js";
                                Builder("${BaseParser.stringify(
                                    TrueContent
                                )}", false);`,
                            }}
                        />

                        {/* toolbar */}
                        <div
                            className="builder\:toolbar always-absolute"
                            style={{
                                padding: "0",
                                top: "initial",
                                bottom: "0.5rem",
                            }}
                        >
                            <button
                                id={"entry:button.PasteOptions"}
                                title={"Paste Options"}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                    aria-label={"Sparkle Symbol"}
                                >
                                    <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z"></path>
                                </svg>
                            </button>
                        </div>

                        <Modal
                            buttonid="entry:button.PasteOptions"
                            modalid="entry:modal.PasteOptions"
                            round={true}
                        >
                            <div
                                style={{
                                    width: "25rem",
                                    maxWidth: "100%",
                                }}
                            >
                                <h4 style={{ textAlign: "center", width: "100%" }}>
                                    {result.CustomURL.split(":")[0]}
                                </h4>

                                <hr />

                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "0.5rem",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <a
                                        href={`/paste/builder?edit=${result.CustomURL}`}
                                        className="button round"
                                    >
                                        Edit
                                    </a>

                                    {(!EntryDB.config.app ||
                                        EntryDB.config.app.enable_paste_settings !==
                                            false) && (
                                        <a
                                            href={`/paste/settings/${result.CustomURL}`}
                                            className="button round"
                                        >
                                            Settings
                                        </a>
                                    )}

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "comment"
                                        ) &&
                                        (!result.Metadata ||
                                            !result.Metadata!.Comments ||
                                            result.Metadata!.Comments.Enabled !==
                                                false) && (
                                            <a
                                                href={`/paste/comments/${result.CustomURL}`}
                                                className="button round"
                                            >
                                                Comments ({result.Comments || 0})
                                            </a>
                                        )}

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "report"
                                        ) && (
                                            <a
                                                href={`/?ReportOn=${result.CustomURL}`}
                                                className="button round"
                                            >
                                                Report Paste
                                            </a>
                                        )}
                                </div>

                                <hr />

                                {EntryDB.config.log &&
                                    EntryDB.config.log.events.includes(
                                        "view_paste"
                                    ) &&
                                    (!result.Metadata ||
                                        result.Metadata.ShowViewCount !== false) && (
                                        <p>Views: {result.Views}</p>
                                    )}

                                <p>
                                    Publish:{" "}
                                    <span class={"utc-date-to-localize"}>
                                        {new Date(result.PubDate).toUTCString()}
                                    </span>
                                </p>

                                <p>
                                    Edit:{" "}
                                    <span class={"utc-date-to-localize"}>
                                        {new Date(result.EditDate).toUTCString()}
                                    </span>
                                </p>

                                <hr />

                                <form
                                    method={"dialog"}
                                    style={{
                                        width: "100%",
                                    }}
                                >
                                    <button
                                        className="green round"
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        Close
                                    </button>
                                </form>

                                <Footer />
                            </div>
                        </Modal>
                    </>,
                    <>
                        <meta name="description" content={result.CustomURL} />
                        <title>{result.CustomURL}</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        ...PageHeaders,
                        "Content-Type": "text/html",
                    },
                }
            );
        } else if (result.GroupName === "components")
            // component viewer
            return new Response(await ComponentView(request, result), {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                },
            });

        // ...otherwise

        // tag paste
        result.Content = `${result.Content}\n<% tag current_paste ${result.CustomURL} %>`;

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        {search.get("UnhashedEditPassword") &&
                            search.get("UnhashedEditPassword") !==
                                "paste is not editable!" && (
                                <>
                                    <div
                                        class="mdnote"
                                        style={{
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <b className="mdnote-title">
                                            Don't forget your edit password!
                                        </b>
                                        <p>
                                            You cannot edit or delete your paste if
                                            you don't have your edit password. Please
                                            save it somewhere safe:{" "}
                                            <code>
                                                {search.get("UnhashedEditPassword")}
                                            </code>
                                        </p>
                                    </div>

                                    <div
                                        class="mdnote note-warn"
                                        style={{
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <b className="mdnote-title">
                                            The web address you are currently on
                                            contains the edit password for your
                                            paste! Please remove it before sharing
                                            this current web address with anyone.
                                        </b>
                                        <p>
                                            You can click <a href="?">here</a> to
                                            remove it.
                                        </p>
                                    </div>
                                </>
                            )}

                        {result.ViewPassword && <DecryptionForm paste={result} />}

                        {EntryDB.config.app &&
                            EntryDB.config.app.info &&
                            EntryDB.config.app.info.split("?")[0] ===
                                result.CustomURL &&
                            InformationPageNote()}

                        <div
                            class={"tab-container"}
                            style={{
                                height: "max-content",
                                maxHeight: "initial",
                            }}
                        >
                            <div
                                id="editor-tab-preview"
                                class="editor-tab"
                                style={{
                                    height: "max-content",
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: await ParseMarkdown(result.Content),
                                }}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: "0.5rem",
                                display: "flex",
                                justifyContent: "space-between",
                            }}
                        >
                            <div
                                class={"mobile-block"}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: "0.5rem",
                                    width: "100%",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "0.5rem",
                                        flexWrap: "wrap",
                                        justifyContent: "center",
                                    }}
                                >
                                    {editable[2] === true && (
                                        <a
                                            class={"button"}
                                            href={`/?mode=edit&OldURL=${
                                                result.CustomURL.split(":")[0]
                                            }${
                                                // add host server (if it exists)
                                                result.HostServer
                                                    ? `&server=${result.HostServer}`
                                                    : ""
                                            }${
                                                // add view password (if it exists)
                                                // this is so content is automatically decrypted!
                                                ViewPassword !== ""
                                                    ? `&ViewPassword=${ViewPassword}`
                                                    : ""
                                            }`}
                                        >
                                            Edit
                                        </a>
                                    )}

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "comment"
                                        ) &&
                                        result.Comments !== undefined &&
                                        !result.Content.includes(
                                            "<% disable comments %>"
                                        ) &&
                                        (!result.Metadata ||
                                            !result.Metadata.Comments ||
                                            result.Metadata.Comments.Enabled !==
                                                false) && (
                                            <a
                                                class={"button"}
                                                href={`/paste/comments/${result.CustomURL}`}
                                                title={"View Comments"}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    width="16"
                                                    height="16"
                                                    aria-label={"Comments Symbol"}
                                                >
                                                    <path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.458 1.458 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z"></path>
                                                </svg>

                                                <span>{result.Comments}</span>
                                            </a>
                                        )}

                                    <a
                                        href={"javascript:"}
                                        id={"entry:button.PasteOptions"}
                                        title={"More Options"}
                                        class={"button"}
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
                                        More
                                    </a>

                                    <details
                                        class={"horizontal"}
                                        style={{
                                            width: "max-content",
                                        }}
                                    >
                                        <summary
                                            style={{
                                                fontWeight: "normal",
                                                width: "100px",
                                            }}
                                        >
                                            Export
                                        </summary>

                                        <div
                                            class={"details-content"}
                                            style={{
                                                minWidth: "calc(80px * 3)",
                                            }}
                                        >
                                            <a
                                                class={"button"}
                                                target={"_blank"}
                                                href={`/api/raw/${result.CustomURL}`}
                                                style={{
                                                    width: "80px",
                                                }}
                                            >
                                                Raw
                                            </a>

                                            <a
                                                class={"button"}
                                                href={`/api/html/${result.CustomURL}`}
                                                target={"_blank"}
                                                style={{
                                                    width: "100px",
                                                }}
                                            >
                                                HTML
                                            </a>

                                            <a
                                                class={"button"}
                                                href={`?view=doc`}
                                                style={{
                                                    width: "80px",
                                                }}
                                            >
                                                Doc
                                            </a>
                                        </div>
                                    </details>

                                    <Modal
                                        buttonid="entry:button.PasteOptions"
                                        modalid="entry:modal.PasteOptions"
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "0.5rem",
                                                justifyContent: "center",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            {result.Content.includes(
                                                "<% enable template %>"
                                            ) && (
                                                <a
                                                    href={`/?Template=${result.CustomURL}`}
                                                    class={"button"}
                                                >
                                                    Use Template
                                                </a>
                                            )}

                                            {result.GroupName && (
                                                <a
                                                    class={"button"}
                                                    href={`/search?q=${
                                                        result.GroupName
                                                    }%2F&group=${result.GroupName}${
                                                        // add host server (if it exists)
                                                        result.HostServer
                                                            ? `:${result.HostServer}`
                                                            : ""
                                                    }`}
                                                >
                                                    View Group
                                                </a>
                                            )}

                                            {EntryDB.config.log &&
                                                EntryDB.config.log.events.includes(
                                                    "report"
                                                ) &&
                                                !result.HostServer &&
                                                (!result.Metadata ||
                                                    !result.Metadata.Comments ||
                                                    result.Metadata.Comments
                                                        .ReportsEnabled !==
                                                        false) && (
                                                    <a
                                                        class={"button"}
                                                        href={`/?ReportOn=${result.CustomURL}`}
                                                        title={"Report Paste"}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 16 16"
                                                            width="16"
                                                            height="16"
                                                        >
                                                            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                                                        </svg>

                                                        <span>Report</span>
                                                    </a>
                                                )}

                                            {EntryDB.config.app &&
                                                EntryDB.config.app.enable_builder !==
                                                    false && (
                                                    <a
                                                        class={"button"}
                                                        href={`/paste/builder?edit=${result.CustomURL}`}
                                                    >
                                                        Edit in Builder
                                                    </a>
                                                )}
                                        </div>

                                        <hr />

                                        <form method="dialog" class={"mobile-max"}>
                                            <button
                                                class={"green"}
                                                style={{
                                                    width: "100%",
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </form>
                                    </Modal>
                                </div>

                                <div className="mobile-only">
                                    <hr />
                                </div>

                                <div
                                    class={"mobile-flex-center"}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "flex-end",
                                        color: "var(--text-color-faded)",
                                        textAlign: "right",
                                    }}
                                >
                                    {result.ExpireOn !== undefined && (
                                        <span>Expires: {result.ExpireOn}</span>
                                    )}

                                    <span
                                        title={new Date(
                                            result.PubDate
                                        ).toUTCString()}
                                    >
                                        Pub:{" "}
                                        <span className="utc-date-to-localize">
                                            {new Date(result.PubDate).toUTCString()}
                                        </span>
                                    </span>

                                    <span
                                        title={new Date(
                                            result.EditDate
                                        ).toUTCString()}
                                    >
                                        Edit:{" "}
                                        <span className="utc-date-to-localize">
                                            {new Date(result.EditDate).toUTCString()}
                                        </span>
                                    </span>

                                    {result.Metadata && (
                                        <>
                                            {result.Metadata.Owner &&
                                                !result.Content.includes(
                                                    "<% disable show_owner %>"
                                                ) &&
                                                result.Metadata.ShowOwnerEnabled !==
                                                    false && (
                                                    <span>
                                                        Owner:{" "}
                                                        <a
                                                            href={`/${result.Metadata.Owner}`}
                                                        >
                                                            {result.Metadata.Owner}
                                                        </a>
                                                    </span>
                                                )}
                                        </>
                                    )}

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "view_paste"
                                        ) &&
                                        (!result.Metadata ||
                                            result.Metadata.ShowViewCount !==
                                                false) && (
                                            <span
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "right",
                                                    alignItems: "center",
                                                    gap: "0.25rem",
                                                    width: "max-content",
                                                }}
                                                title={
                                                    Viewed === true
                                                        ? "Paste Viewed Before"
                                                        : "Pasted Viewed Just Now"
                                                }
                                            >
                                                {Viewed === true && (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={"Sparkle Symbol"}
                                                    >
                                                        <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z"></path>
                                                    </svg>
                                                )}
                                                Views: {result.Views}
                                            </span>
                                        )}
                                </div>
                            </div>
                        </div>

                        <Footer
                            ShowBottomRow={
                                (
                                    (
                                        EntryDB.config.app || {
                                            footer: {
                                                show_name_on_all_pages: false,
                                            },
                                        }
                                    ).footer || { show_name_on_all_pages: false }
                                ).show_name_on_all_pages === true
                            }
                        />
                    </main>

                    <script
                        // P.S. I hate this
                        type="module"
                        dangerouslySetInnerHTML={{
                            __html: `import fix from "/ClientFixMarkdown.js"; fix();`,
                        }}
                    />
                </>,
                <>
                    <meta
                        name="description"
                        content={
                            // if length of content is greater than 150, cut it at 150 characters and add "..."
                            // otherwise, we can just show the full content
                            result.Content.length > 150
                                ? `${result.Content.substring(0, 150)}...`
                                : result.Content
                        }
                    />

                    <title>{result.CustomURL}</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Set-Cookie": SessionCookie,
                },
            }
        );
    }
}

/**
 * @export
 * @class PasteDocView
 * @implements {Endpoint}
 */
export class PasteDocView implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/doc/")) name = name.split("paste/doc/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // render paste
        const Rendered = await API.RenderMarkdown.Render(result.Content);

        // get paste toc
        const TableOfContents = await API.RenderMarkdown.Render(
            result.Content,
            true
        );

        // manage session
        const SessionCookie = await Session(request);

        // count view
        if (result && !result.HostServer && search.get("NoView") !== "true") {
            const SessionCookieValue = GetCookie(
                request.headers.get("Cookie") || "",
                "session-id"
            );

            if (
                SessionCookieValue &&
                EntryDB.config.log &&
                EntryDB.config.log.events.includes("view_paste") &&
                // make sure we haven't already added this view
                // (make sure length of query for log is 0)
                (
                    await EntryDB.Logs.QueryLogs(
                        `Content = "${result.CustomURL};${SessionCookieValue}"`
                    )
                )[2].length === 0 &&
                // make sure session id is valid
                !SessionCookie.startsWith("session-id=refresh;")
            )
                await EntryDB.Logs.CreateLog({
                    Type: "view_paste",
                    Content: `${result.CustomURL};${SessionCookieValue}`,
                });
        }

        // return
        if (!result)
            // show 404 because paste does not exist
            return new _404Page().request(request);
        else
            return new Response(
                Renderer.Render(
                    <>
                        <div class={"sidebar-layout-wrapper"}>
                            <div class={"sidebar"}>
                                <div>
                                    {EntryDB.config.app &&
                                        EntryDB.config.app.info &&
                                        EntryDB.config.app.info.split("?")[0] ===
                                            result.CustomURL &&
                                        InformationPageNote()}

                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: TableOfContents,
                                        }}
                                    />
                                </div>

                                <Footer
                                    ShowBottomRow={
                                        (
                                            (
                                                EntryDB.config.app || {
                                                    footer: {
                                                        show_name_on_all_pages:
                                                            false,
                                                    },
                                                }
                                            ).footer || {
                                                show_name_on_all_pages: false,
                                            }
                                        ).show_name_on_all_pages === true
                                    }
                                />
                            </div>

                            <details className="sidebar-mobile">
                                <summary>Document</summary>

                                {EntryDB.config.app &&
                                    EntryDB.config.app.info &&
                                    EntryDB.config.app.info.split("?")[0] ===
                                        result.CustomURL &&
                                    InformationPageNote()}

                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: TableOfContents,
                                    }}
                                />
                            </details>

                            <div class={"tab-container editor-tab page-content"}>
                                <div
                                    id="editor-tab-preview"
                                    class="editor-tab"
                                    style={{
                                        height: "max-content",
                                        paddingBottom: "1rem",
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: Rendered,
                                    }}
                                />

                                <hr />

                                <ul
                                    class={"__footernav"}
                                    style={{
                                        justifyContent: "center",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        padding: "0",
                                    }}
                                >
                                    <li>
                                        <a href={`/${name}`}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                            >
                                                <path d="M11.134 1.535c.7-.509 1.416-.942 2.076-1.155.649-.21 1.463-.267 2.069.34.603.601.568 1.411.368 2.07-.202.668-.624 1.39-1.125 2.096-1.011 1.424-2.496 2.987-3.775 4.249-1.098 1.084-2.132 1.839-3.04 2.3a3.744 3.744 0 0 1-1.055 3.217c-.431.431-1.065.691-1.657.861-.614.177-1.294.287-1.914.357A21.151 21.151 0 0 1 .797 16H.743l.007-.75H.749L.742 16a.75.75 0 0 1-.743-.742l.743-.008-.742.007v-.054a21.25 21.25 0 0 1 .13-2.284c.067-.647.187-1.287.358-1.914.17-.591.43-1.226.86-1.657a3.746 3.746 0 0 1 3.227-1.054c.466-.893 1.225-1.907 2.314-2.982 1.271-1.255 2.833-2.75 4.245-3.777ZM1.62 13.089c-.051.464-.086.929-.104 1.395.466-.018.932-.053 1.396-.104a10.511 10.511 0 0 0 1.668-.309c.526-.151.856-.325 1.011-.48a2.25 2.25 0 1 0-3.182-3.182c-.155.155-.329.485-.48 1.01a10.515 10.515 0 0 0-.309 1.67Zm10.396-10.34c-1.224.89-2.605 2.189-3.822 3.384l1.718 1.718c1.21-1.205 2.51-2.597 3.387-3.833.47-.662.78-1.227.912-1.662.134-.444.032-.551.009-.575h-.001V1.78c-.014-.014-.113-.113-.548.027-.432.14-.995.462-1.655.942Zm-4.832 7.266-.001.001a9.859 9.859 0 0 0 1.63-1.142L7.155 7.216a9.7 9.7 0 0 0-1.161 1.607c.482.302.889.71 1.19 1.192Z"></path>
                                            </svg>{" "}
                                            normal view
                                        </a>
                                    </li>

                                    <li>
                                        <a
                                            href={`/?mode=edit&OldURL=${
                                                result.CustomURL.split(":")[0]
                                            }${
                                                // add host server (if it exists)
                                                result.HostServer
                                                    ? `&server=${result.HostServer}`
                                                    : ""
                                            }`}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                            >
                                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                            </svg>{" "}
                                            edit
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <script
                            type="module"
                            dangerouslySetInnerHTML={{
                                __html: `import fix from "/ClientFixMarkdown.js"; fix();`,
                            }}
                        />
                    </>,
                    <>
                        <meta
                            name="description"
                            content={
                                // if length of content is greater than 150, cut it at 150 characters and add "..."
                                // otherwise, we can just show the full content
                                result.Content.length > 150
                                    ? `${result.Content.substring(0, 150)}...`
                                    : result.Content
                            }
                        />

                        <title>{result.CustomURL}</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        ...PageHeaders,
                        "Content-Type": "text/html",
                        "Set-Cookie": SessionCookie,
                    },
                }
            );
    }
}

/**
 * @export
 * @class PastesSearch
 * @implements {Endpoint}
 */
export class PastesSearch implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        // manage session
        const SessionCookie = await Session(request);

        // ...
        if (search.get("q")) {
            // get pastes
            const query = `CustomURL LIKE "%${search
                .get("q")!
                .toLowerCase()
                .replaceAll('"', "'")}%" LIMIT 100`;

            const pastes =
                search.get("group") === null
                    ? // search all pastes
                      await db.GetAllPastes(false, true, query)
                    : // search within group
                      await db.GetAllPastesInGroup(search.get("group") as string);

            // if search is disabled, a value for "group" is required
            // ...if we don't have one, 404!
            if (
                EntryDB.config.app &&
                EntryDB.config.app.enable_search === false &&
                search.get("group") === null
            )
                return new _404Page().request(request);

            // return
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["search"]} />

                        <main>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {/* hide the search bar if search is disabled */}
                                {!EntryDB.config.app ||
                                    (EntryDB.config.app.enable_search !== false && (
                                        <SearchForm query={search.get("q") || ""} />
                                    ))}

                                <span class={"mobile-center"}>
                                    <b>{pastes.length}</b> result
                                    {pastes.length > 1 || pastes.length === 0
                                        ? "s"
                                        : ""}
                                </span>
                            </div>

                            <div
                                className="tab-container editor-tab"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                    maxHeight: "max-content",
                                    height: "max-content",
                                }}
                            >
                                {pastes.map((paste) => (
                                    <div class={"search-result card"}>
                                        <a
                                            href={`/${
                                                paste.CustomURL.startsWith("/")
                                                    ? paste.CustomURL.slice(1)
                                                    : paste.CustomURL
                                            }`}
                                        >
                                            {paste.CustomURL}
                                        </a>

                                        <p
                                            style={{
                                                marginBottom: 0,
                                                color: "var(--text-color-faded)",
                                            }}
                                        >
                                            Created:{" "}
                                            <span
                                                class={"utc-date-to-localize"}
                                                title={new Date(
                                                    paste.PubDate
                                                ).toUTCString()}
                                            >
                                                {new Date(
                                                    paste.PubDate
                                                ).toUTCString()}
                                            </span>{" "}
                                            · Content length: {paste.Content.length}{" "}
                                            Characters
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <style
                                dangerouslySetInnerHTML={{
                                    __html: `.search-result:hover {
                                        outline: 1px solid var(--text-color-faded);
                                    }`,
                                }}
                            />

                            <Footer />
                        </main>
                    </>,
                    <>
                        <title>Results for "{search.get("q")}"</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        ...DefaultHeaders,
                        "Content-Type": "text/html",
                        "Set-Cookie": SessionCookie,
                    },
                }
            );
        } else {
            // return 404 if search is disabled
            if (EntryDB.config.app && EntryDB.config.app.enable_search === false)
                return new _404Page().request(request);

            // show search home
            return new Response(
                Renderer.Render(
                    <>
                        <div
                            style={{
                                width: "100vw",
                                height: "100vh",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                flexDirection: "column",
                            }}
                        >
                            <main
                                style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <h1 class={"no-margin"}>Search</h1>
                                <SearchForm />
                            </main>

                            <Footer />
                        </div>
                    </>,
                    <>
                        <meta
                            name="description"
                            content={`Search Pastes on ${EntryDB.config.name} - A Markdown Pastebin`}
                        ></meta>

                        <title>Search Pastes</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        ...PageHeaders,
                        "Content-Type": "text/html",
                        "Set-Cookie": SessionCookie,
                    },
                }
            );
        }
    }
}

/**
 * @export
 * @class PasteCommentsPage
 * @implements {Endpoint}
 */
export class PasteCommentsPage implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        // return 404 if comments are disabled
        if (!EntryDB.config.log || !EntryDB.config.log.events.includes("comment"))
            return new _404Page().request(request);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/comments/"))
            name = name.split("paste/comments/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // return 404 if page does not allow comments
        if (
            result.Content.includes("<% disable comments %>") ||
            (result.Metadata &&
                result.Metadata.Comments &&
                result.Metadata.Comments.Enabled === false)
        )
            return new _404Page().request(request);

        // get associated paste
        let PostingAs: string | undefined = undefined;

        const _Association = await GetAssociation(request);
        if (
            _Association[1] &&
            !_Association[1].startsWith("associated") &&
            !_Association[1].startsWith("Session does not exist")
        )
            PostingAs = _Association[1];

        // get offset
        const OFFSET = parseInt(search.get("offset") || "0");

        // get comments
        const _result = await db.GetPasteComments(
            result.CustomURL,
            OFFSET,
            PostingAs
        );

        if (!_result[0]) return new _404Page().request(request);

        // ...
        const CommentPastes: Partial<Paste>[] = _result[2];

        // render all comment pastes
        for (const paste of CommentPastes)
            paste.Content = await ParseMarkdown(paste.Content || "");

        // check if paste is a comment on another paste
        const PreviousInThread = (
            (result.Metadata || { Comments: { IsCommentOn: "" } }).Comments || {
                Comments: { IsCommentOn: "" },
            }
        ).IsCommentOn;

        // make sure paste has an owner
        if (search.get("edit") === "true" && result.Metadata!.Owner === "")
            return new Response(
                "This paste does not have an owner, so we cannot verify if you have permission to manage its comments." +
                    "\nPlease associate with a paste and edit this paste to add ownership to it.",
                { status: 401 }
            );

        // if edit mode is enabled, but we aren't associated with this paste... return 404
        if (
            search.get("edit") === "true" &&
            result.Metadata &&
            result.Metadata.Comments &&
            PostingAs !== result.Metadata.Owner &&
            PostingAs !== result.Metadata.Comments.ParentCommentOn
        )
            return new _404Page().request(request);

        // ...
        function CommentsNav() {
            return (
                <>
                    <h1
                        style={{
                            width: "100%",
                        }}
                    >
                        {(result.GroupName === "comments" &&
                            result.Metadata &&
                            result.Metadata.Comments &&
                            result.Metadata.Comments.ParentCommentOn) ||
                            result.CustomURL}
                    </h1>

                    <hr />

                    <div class={"flex justify-center align-center g-4"}>
                        <a href={`/${result.CustomURL}`} class={"button"}>
                            View Paste
                        </a>

                        {PreviousInThread && (
                            <a
                                class={"button"}
                                href={`/paste/comments/${PreviousInThread}`}
                            >
                                Back
                            </a>
                        )}
                    </div>

                    <hr />

                    <div class={"flex justify-center align-center g-4"}>
                        {OFFSET !== 0 && (
                            <>
                                {/* only shown if we're not at the first page */}
                                <a href={`?offset=${OFFSET - 100}`} class={"button"}>
                                    Previous Page
                                </a>
                            </>
                        )}

                        {OFFSET / 100 < (result.Comments || 0) / 100 - 1 &&
                            (result.Comments || 0) > 100 && (
                                <>
                                    {/* only shown if we're not at the last page (100 per page) */}
                                    <a
                                        href={`?offset=${OFFSET + 100}`}
                                        class={"button"}
                                    >
                                        Next Page
                                    </a>
                                </>
                            )}
                    </div>
                </>
            );
        }

        // return
        return new Response(
            Renderer.Render(
                <div
                    class="sidebar-layout-wrapper builder:page"
                    style={{
                        flexDirection: "row",
                        gap: 0,
                    }}
                >
                    <div className="sidebar">
                        <div>
                            <CommentsNav />
                        </div>

                        <Footer />
                    </div>

                    <details className="sidebar-mobile">
                        <summary>Menu</summary>

                        <div>
                            <CommentsNav />
                        </div>
                    </details>

                    <div
                        className="tab-container editor-tab page-content"
                        style={{
                            marginBottom: "0",
                        }}
                    >
                        <div
                            class={
                                "flex flex-wrap justify-space-between align-center g-4"
                            }
                        >
                            <span>
                                <b>{result.Comments}</b> comment
                                {(result.Comments || 0) > 1
                                    ? "s"
                                    : (result.Comments || 0) === 1
                                    ? ""
                                    : "s"}
                                , posting as{" "}
                                {(PostingAs && (
                                    <>
                                        <b>{PostingAs}</b> (
                                        <a
                                            href="#entry:logout"
                                            class={"modal:entry:button.logout"}
                                        >
                                            logout
                                        </a>
                                        )
                                    </>
                                )) || (
                                    <>
                                        <b>anonymous</b> (
                                        <a
                                            href="#entry:login"
                                            class={"modal:entry:button.login"}
                                        >
                                            login
                                        </a>
                                        )
                                    </>
                                )}
                            </span>

                            <div class={"mobile-flex-center flex flex-wrap g-4"}>
                                <a
                                    href={`/?CommentOn=${result.CustomURL}`}
                                    className="button secondary round"
                                >
                                    Add Comment
                                </a>

                                {
                                    // private comments cannot be privately commented on
                                    // ...because then the original paste owner wouldn't
                                    // be able to see the comments deeper in the thread!
                                    // cannot post private comments if you're not associated with a paste!
                                    (!result.Metadata ||
                                        !result.Metadata.Comments ||
                                        !result.Metadata.Comments
                                            .IsPrivateMessage) &&
                                        PostingAs !== undefined && (
                                            <a
                                                href={`/?CommentOn=${result.CustomURL}&pm=true`}
                                                className="button secondary round"
                                            >
                                                Private Comment
                                            </a>
                                        )
                                }

                                {(search.get("edit") !== "true" && (
                                    <>
                                        {PostingAs !== undefined ? (
                                            (result.Metadata &&
                                                result.Metadata.Comments &&
                                                PostingAs !==
                                                    result.Metadata.Owner &&
                                                PostingAs !==
                                                    // if we're posting as the paste that
                                                    // this comment (or its parent) is in reply to,
                                                    // allow manage access
                                                    result.Metadata.Comments
                                                        .ParentCommentOn && (
                                                    <button
                                                        // show logout button if we're already associated with a paste
                                                        class={
                                                            "tertiary round modal:entry:button.logout"
                                                        }
                                                    >
                                                        Manage
                                                    </button>
                                                )) || (
                                                <a
                                                    // show edit button if we're associated with this paste
                                                    class={"button round tertiary"}
                                                    href={"?edit=true"}
                                                >
                                                    Manage
                                                </a>
                                            )
                                        ) : (
                                            <button
                                                // show login button if we're not already associated with a paste
                                                class={
                                                    "tertiary round modal:entry:button.login"
                                                }
                                            >
                                                Manage
                                            </button>
                                        )}
                                    </>
                                )) || (
                                    <a
                                        href={"?edit=false"}
                                        className="button round tertiary"
                                    >
                                        Stop Editing
                                    </a>
                                )}
                            </div>
                        </div>

                        <hr />

                        {PreviousInThread && (
                            <>
                                <a
                                    href={`/paste/comments/${PreviousInThread}`}
                                    class={"button secondary round"}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Undo Symbol"}
                                    >
                                        <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>
                                    </svg>
                                    up thread
                                </a>

                                <hr />
                            </>
                        )}

                        <div class={"flex flex-column g-4"}>
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
                                        <b class={"mdnote-title"}>
                                            Application Message
                                        </b>
                                        <p>
                                            {decodeURIComponent(search.get("msg")!)}
                                        </p>
                                    </div>
                                ))}

                            {result.Comments === 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <span>
                                        No comments yet!{" "}
                                        <a href={`/?CommentOn=${result.CustomURL}`}>
                                            Add Comment
                                        </a>
                                    </span>
                                </div>
                            )}

                            {CommentPastes.map((comment) => (
                                <div
                                    class={"card"}
                                    style={{
                                        borderRadius: "0.4rem",
                                    }}
                                >
                                    <ul
                                        className="__footernav"
                                        style={{
                                            paddingLeft: 0,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <li>
                                            <b class={"utc-date-to-localize"}>
                                                {new Date(
                                                    comment.PubDate || 0
                                                ).toUTCString()}
                                            </b>
                                        </li>

                                        {comment.Associated && (
                                            <li
                                                style={{
                                                    color: "var(--text-color-faded)",
                                                }}
                                            >
                                                posted by{" "}
                                                <a
                                                    class={"chip solid"}
                                                    href={`/${comment.Associated}`}
                                                    style={{
                                                        color:
                                                            // if comment poster is the paste owner, make color yellow
                                                            // otherwise if comment poster is current user, make color green
                                                            comment.Metadata!
                                                                .Owner ===
                                                            result.CustomURL
                                                                ? "var(--yellow)"
                                                                : PostingAs ===
                                                                  comment.Associated
                                                                ? "var(--green)"
                                                                : "inherit",
                                                    }}
                                                    title={
                                                        PostingAs ===
                                                        comment.Associated
                                                            ? "You"
                                                            : ""
                                                    }
                                                >
                                                    {comment.Associated}
                                                </a>
                                            </li>
                                        )}

                                        {comment.IsPM === "true" && (
                                            <li
                                                title={
                                                    "This is a private comment, but it can still be seen by people with a direct link."
                                                }
                                            >
                                                <span
                                                    class={"chip"}
                                                    style={{
                                                        color: "var(--text-color-faded)",
                                                    }}
                                                >
                                                    🔒 private
                                                </span>
                                            </li>
                                        )}
                                    </ul>

                                    <div
                                        style={{
                                            maxHeight: "50rem",
                                            overflow: "auto",
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: comment.Content!,
                                        }}
                                    />

                                    {comment.Comments !== 0 && (
                                        <div>
                                            <hr />

                                            <a
                                                href={`/paste/comments/${comment.CustomURL}`}
                                            >
                                                View <b>{comment.Comments}</b> repl
                                                {comment.Comments! > 1
                                                    ? "ies"
                                                    : comment.Comments === 1
                                                    ? "y"
                                                    : "ies"}
                                            </a>
                                        </div>
                                    )}

                                    <hr />

                                    <div class={"flex g-4"}>
                                        <a
                                            class={"chip button secondary"}
                                            href={`/?CommentOn=${comment.CustomURL}`}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Reply Symbol"}
                                            >
                                                <path d="M6.78 1.97a.75.75 0 0 1 0 1.06L3.81 6h6.44A4.75 4.75 0 0 1 15 10.75v2.5a.75.75 0 0 1-1.5 0v-2.5a3.25 3.25 0 0 0-3.25-3.25H3.81l2.97 2.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L1.47 7.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"></path>
                                            </svg>
                                            reply
                                        </a>

                                        <a
                                            class={"chip button secondary"}
                                            href={`/${comment.CustomURL}`}
                                            target={"_blank"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"External Link Symbol"}
                                            >
                                                <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"></path>
                                            </svg>
                                            open
                                        </a>

                                        {search.get("edit") === "true" && (
                                            <form
                                                action="/api/comments/delete"
                                                method={"POST"}
                                            >
                                                <input
                                                    type="hidden"
                                                    name="CustomURL"
                                                    value={result.CustomURL}
                                                    required
                                                />

                                                <input
                                                    type="hidden"
                                                    name="CommentURL"
                                                    value={comment.CustomURL}
                                                    required
                                                />

                                                <button
                                                    class={
                                                        "chip solid button secondary"
                                                    }
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={"Trash Symbol"}
                                                    >
                                                        <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                                                    </svg>
                                                    delete
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* auth flow modals */}
                    <AuthModals use={PostingAs !== undefined ? "logout" : "login"} />
                </div>,
                <>
                    <title>Comments on {result.CustomURL}</title>
                    <link rel="icon" href="/favicon" />

                    <meta
                        name="description"
                        content={`View comments on ${result.CustomURL}, on ${EntryDB.config.name}`}
                    />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Set-Cookie": _Association[1].startsWith("associated")
                        ? _Association[1]
                        : "",
                },
            }
        );
    }
}

/**
 * @function ComponentView
 *
 * @export
 * @param {Request} request
 * @param {Paste} paste
 * @return {Promise<string>}
 */
export async function ComponentView(
    request: Request,
    paste: Paste
): Promise<string> {
    // get component information
    const Body = JSON.parse(paste.Content.split("_builder.component:")[1]);

    const Component = {
        Name: Body.Name,
        Node: BaseParser.parse(Body.Component),
    };

    // return
    return Renderer.Render(
        <>
            <main>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                    }}
                >
                    <div
                        className="builder:card full mobile-flex-center"
                        style={{
                            "--Display": "flex",
                            "--JustifyContent": "space-between",
                            gap: "0.5rem",
                        }}
                    >
                        <h4 class={"no-margin"}>{Component.Name}</h4>

                        <button
                            class={"border"}
                            id={"librarybutton"}
                            style={{
                                borderRadius: "0.4rem",
                            }}
                            // @ts-ignore
                            onclick={`// check if library exists
                                const library =
                                    window.localStorage.getItem("entry:library");

                                // create library if it doesn't
                                if (!library)
                                    window.localStorage.setItem("entry:library", JSON.stringify([[
                                        "${Component.Name}",
                                        "${paste.CustomURL}"
                                    ]]));
                                // push to library if it does
                                else {
                                    const ParsedLibrary = JSON.parse(library);
                                    const ExistingRecord = ParsedLibrary.find((r) => 
                                        r !== null && r[0] === "${Component.Name}"
                                    );

                                    // check if library includes component
                                    if (ExistingRecord)
                                        // remove from library
                                        ParsedLibrary[ParsedLibrary.indexOf(ExistingRecord)] = undefined;
                                    // push to library if it doesn't
                                    else ParsedLibrary.push([
                                        "${Component.Name}",
                                        "${paste.CustomURL}"
                                    ]);

                                    // update
                                    window.localStorage.setItem("entry:library", JSON.stringify(ParsedLibrary));
                                }

                                // reload
                                window.location.reload();`}
                        >
                            Save to Library
                        </button>
                    </div>

                    <div
                        className="builder:card full mobile-flex-center"
                        style={{
                            "--Display": "flex",
                            "--Direction": "column",
                            gap: "0.5rem",
                        }}
                    >
                        <h5 class={"no-margin"}>Builder Preview</h5>

                        <div
                            className="builder:card builder:page full"
                            style={{
                                "--Display": "flex",
                                "--JustifyContent": "center",
                                "--AlignItems": "center",
                                borderRadius: "0.4rem",
                                border: "dashed 1px var(--background-surface2)",
                                background: "var(--background-surface)",
                            }}
                        >
                            {BuilderParser.ParseNodes([Component.Node as any])}
                        </div>
                    </div>

                    <div
                        className="builder:card full"
                        style={{
                            "--Display": "flex",
                            "--Direction": "column",
                            gap: "0.5rem",
                        }}
                    >
                        <h5 class={"no-margin"}>General Information</h5>

                        <ul>
                            <li>
                                Type: <code>{(Component.Node as any).Type}</code>
                            </li>

                            <li>Views: {paste.Views}</li>

                            {EntryDB.config.log &&
                                EntryDB.config.log.events.includes("comment") && (
                                    <li>
                                        Comments:{" "}
                                        <a
                                            href={`/paste/comments/${paste.CustomURL}`}
                                        >
                                            {paste.Comments}
                                        </a>
                                    </li>
                                )}

                            <li>
                                Published:{" "}
                                <span class={"utc-date-to-localize"}>
                                    {new Date(paste.PubDate).toUTCString()}
                                </span>
                            </li>

                            <li>
                                Edited:{" "}
                                <span class={"utc-date-to-localize"}>
                                    {new Date(paste.EditDate).toUTCString()}
                                </span>
                            </li>

                            <li>
                                <a
                                    href={`/paste/builder?edit=${paste.CustomURL}&component=${Component.Name}`}
                                >
                                    Edit
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <Footer />
            </main>

            <script
                dangerouslySetInnerHTML={{
                    __html: `// check if library exists
                    const library =
                        window.localStorage.getItem("entry:library");
                    
                    if (library) {
                        const ParsedLibrary = JSON.parse(library);
                        const ExistingRecord = ParsedLibrary.find((r) => 
                            r !== null && r[0] === "${Component.Name}"
                        );
                        
                        // check if library includes component
                        if (ExistingRecord)
                            document.getElementById("librarybutton").innerText = "Remove From Library"
                    }`,
                }}
            />
        </>,
        <>
            <meta name="description" content="View component details" />

            <title>
                {Component.Name} - {EntryDB.config.name} Components
            </title>
            <link rel="icon" href="/favicon" />
        </>
    );
}

/**
 * @export
 * @class UserSettings
 * @implements {Endpoint}
 */
export class UserSettings implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/settings/"))
            name = name.split("paste/settings/")[1];

        // if no paste is provided, show global settings
        if (name === "paste/settings") {
            // get association
            const Association = await GetAssociation(request);
            if (Association[1].startsWith("associated=")) Association[0] = false;

            // if user have an association, get all comments they have posted
            let Comments: Log[] = [];

            if (
                Association[0] &&
                EntryDB.config.log &&
                EntryDB.config.log.events.includes("comment")
            )
                Comments = (
                    await EntryDB.Logs.QueryLogs(
                        `Type = "comment" AND Content LIKE "%;%;${Association[1]}" ORDER BY cast(Timestamp as float) DESC`
                    )
                )[2];

            // render
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["paste", "settings"]} />

                        <main>
                            <div
                                style={{
                                    padding: "0.5rem",
                                }}
                            >
                                <div
                                    className="builder\:card"
                                    style={{
                                        width: "100%",
                                        borderRadius: "0.4rem",
                                    }}
                                >
                                    <div
                                        class={
                                            "flex g-4 align-center justify-space-between"
                                        }
                                        style={{
                                            margin: "2rem 0 1rem 0",
                                        }}
                                    >
                                        <h4 class={"no-margin"}>User Settings</h4>
                                        <a
                                            href={"javascript:window.history.back()"}
                                            class={"button secondary round"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Undo Symbol"}
                                            >
                                                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>
                                            </svg>
                                            back
                                        </a>
                                    </div>

                                    <hr />

                                    <p>
                                        <b>Associated With:</b>{" "}
                                        {Association[0] === true
                                            ? Association[1]
                                            : "anonymous"}{" "}
                                        (
                                        {Association[0] === true ? (
                                            <a
                                                href={"javascript:"}
                                                class={"modal:entry:button.logout"}
                                            >
                                                logout
                                            </a>
                                        ) : (
                                            <a
                                                href={"javascript:"}
                                                class={"modal:entry:button.login"}
                                            >
                                                login
                                            </a>
                                        )}
                                        )
                                    </p>

                                    <AuthModals
                                        use={
                                            Association[0] === true
                                                ? "logout"
                                                : "login"
                                        }
                                    />

                                    <hr />

                                    <div id="_doc" class={"flex flex-column g-4"}>
                                        <noscript>
                                            Unable to render user settings options
                                            without JavaScript enabled! The user
                                            settings are rendered client-side using
                                            Preact, and saved to the browser's
                                            localStorage.
                                        </noscript>
                                    </div>

                                    {Comments.length > 0 && (
                                        <>
                                            <hr />

                                            <details class={"secondary"}>
                                                <summary>Comment History</summary>

                                                <div
                                                    style={{
                                                        display: "block",
                                                        padding: "0.75rem",
                                                    }}
                                                    class={
                                                        "details-flex-content-list-box"
                                                    }
                                                >
                                                    {Comments.map((Comment) => (
                                                        <span>
                                                            <a
                                                                class={
                                                                    "utc-date-to-localize"
                                                                }
                                                                href={`/${
                                                                    Comment.Content.split(
                                                                        ";"
                                                                    )[1].split(
                                                                        ";"
                                                                    )[0]
                                                                }`}
                                                            >
                                                                {new Date(
                                                                    Comment.Timestamp
                                                                ).toUTCString()}
                                                            </a>
                                                            ,{" "}
                                                        </span>
                                                    ))}
                                                </div>
                                            </details>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Footer />

                            <script
                                type={"module"}
                                dangerouslySetInnerHTML={{
                                    __html: `import UserSettings from "/UserSettings.js";
                                    UserSettings("_doc");`,
                                }}
                            />
                        </main>
                    </>,
                    <>
                        <title>User Settings - {EntryDB.config.name}</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        ...PageHeaders,
                        "Content-Type": "text/html",
                    },
                }
            );
        } else {
            // show paste settings

            // if paste settings page is disabled, return 404
            if (
                !EntryDB.config.app ||
                EntryDB.config.app.enable_paste_settings === false
            )
                return new _404Page().request(request);

            // get paste
            const result = await db.GetPasteFromURL(name);
            if (!result) return new _404Page().request(request);

            // paste cannot be from another server (for now)
            if (result.HostServer) return new _404Page().request(request);

            // render
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["paste", "settings", name]} />

                        <main>
                            <div
                                style={{
                                    padding: "0.5rem",
                                }}
                            >
                                <div
                                    className="builder\:card"
                                    style={{
                                        width: "100%",
                                        borderRadius: "0.4rem",
                                    }}
                                >
                                    <div
                                        class={"mobile-flex-center"}
                                        style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            margin: "2rem 0 1rem 0",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <h4
                                            class={"no-margin"}
                                            style={{
                                                textAlign: "center",
                                            }}
                                        >
                                            Paste Settings ({name})
                                        </h4>

                                        <a
                                            href={"javascript:window.history.back()"}
                                            class={"button secondary round"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Undo Symbol"}
                                            >
                                                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>
                                            </svg>
                                            back
                                        </a>
                                    </div>

                                    <p>
                                        Paste settings require the paste edit code to
                                        save. If you want to change how this paste
                                        looks for you, view{" "}
                                        <a href={"/paste/settings"}>User Settings</a>
                                    </p>

                                    <hr />

                                    <div
                                        class={
                                            "mobile-flex-center flex justify-center align-center flex-wrap"
                                        }
                                        style={{
                                            marginBottom: "1rem",
                                        }}
                                    >
                                        <form
                                            action="/api/metadata"
                                            method={"POST"}
                                            style={{
                                                display: "flex",
                                                gap: "0.5rem",
                                                flexWrap: "wrap",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <input
                                                type={"hidden"}
                                                name={"CustomURL"}
                                                value={result.CustomURL}
                                                class={"secondary"}
                                                required
                                            />

                                            <input
                                                class={"secondary"}
                                                type="text"
                                                placeholder={"Edit code"}
                                                maxLength={EntryDB.MaxPasswordLength}
                                                minLength={EntryDB.MinPasswordLength}
                                                name={"EditPassword"}
                                                id={"EditPassword"}
                                                required
                                                style={{
                                                    borderRadius:
                                                        "0.4rem !important",
                                                }}
                                            />

                                            <input
                                                type="hidden"
                                                required
                                                name="Metadata"
                                                id={"Metadata"}
                                                value={""}
                                            />

                                            <button class={"secondary round green"}>
                                                Save
                                            </button>
                                        </form>
                                    </div>

                                    <hr />

                                    <div
                                        id="_doc"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <noscript>
                                            Unable to render paste settings options
                                            without JavaScript enabled! The paste
                                            settings are rendered client-side using
                                            Preact.
                                        </noscript>
                                    </div>
                                </div>
                            </div>

                            <Footer />

                            <script
                                type={"module"}
                                dangerouslySetInnerHTML={{
                                    __html: `import _e from "/MetadataEditor.js";

                                    window.ENTRYDB_CONFIG_ENABLE_COMMENTS = ${
                                        EntryDB.config.log &&
                                        EntryDB.config.log.events.includes("comment")
                                    }

                                    _e.ClientEditor(\`${JSON.stringify(
                                        result.Metadata
                                    )}\`, "_doc");`,
                                }}
                            />
                        </main>
                    </>,
                    <>
                        <title>Paste Settings - {EntryDB.config.name}</title>
                        <link rel="icon" href="/favicon" />
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
}

export class Dashboard implements Endpoint {
    public async request(request: Request): Promise<Response> {
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["paste", "dashboard"]} />
                </>,
                <>
                    <title>Dashboard</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                },
            }
        );
    }
}

// default export
export default {
    GetPasteFromURL,
    PasteDocView,
    PastesSearch,
    PasteCommentsPage,
    ComponentView,
    UserSettings,
    Dashboard,
};
