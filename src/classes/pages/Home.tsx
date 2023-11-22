import { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import DecryptionForm from "./components/form/DecryptionForm";
import Footer from "./components/site/Footer";
import Modal from "./components/site/modals/Modal";

import { DecryptPaste, db, PageHeaders, Session, GetAssociation } from "./api/API";
import type { Paste } from "../db/objects/Paste";
import EntryDB from "../db/EntryDB";

import Pages, { OpenGraph } from "./Pages";
import type { Log } from "../db/LogDB";

import { AuthModals } from "./components/site/modals/AuthModals";
import DateOptions from "./components/form/DateOptions";
import _404Page from "./components/404";

/**
 * @export
 * @class Home
 * @implements {Endpoint}
 */
export default class Home implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // try to get subdomain, redirect to paste view page if we have one
        // must be enabled in EntryDB.config!!
        if (
            EntryDB.config.app &&
            EntryDB.config.app.wildcard &&
            EntryDB.config.app.hostname
        ) {
            const subdomain = url.hostname.split(
                `.${EntryDB.config.app.hostname}`
            )[0];

            // handle cloud pages
            const IncorrectInstance = await Pages.CheckInstance(request, server);
            if (IncorrectInstance) return IncorrectInstance;

            // ...
            if (
                subdomain &&
                subdomain !== EntryDB.config.app.hostname &&
                subdomain !== "www" &&
                url.hostname.includes(EntryDB.config.app.hostname) // make sure hostname is actually in the url
            ) {
                // forward to paste view
                // ...create new request
                const req = new Request(
                    `${url.protocol}//${EntryDB.config.app.hostname}/${subdomain}?_priv_isFromWildcard=true`
                );

                // ...return
                return new Pages.GetPasteFromURL().request(req, server);
            }

            // if custom domains are enabled, try to match that
            else if (
                EntryDB.config.log &&
                EntryDB.config.log.events.includes("custom_domain")
            ) {
                // try to fetch log based off hostname
                const CustomDomainLog = (
                    await EntryDB.Logs.QueryLogs(
                        `"Type" = \'custom_domain\' AND \"Content\" LIKE \'%;${url.hostname}\'`
                    )
                )[2][0];

                // if log exists, forward to paste view
                if (CustomDomainLog) {
                    // ...create new request
                    const req = new Request(
                        `${url.protocol}//${EntryDB.config.app.hostname}/${
                            CustomDomainLog.Content.split(";")[0]
                        }?_priv_isFromWildcard=true`
                    );

                    // ...return
                    return new Pages.GetPasteFromURL().request(req, server);
                }
            }

            // check allow domains
            if (EntryDB.config.allow_access_from) {
                let AccessingFrom = "";

                for (const host of EntryDB.config.allow_access_from)
                    if (url.hostname.includes(host)) {
                        AccessingFrom = host;
                        break;
                    } else continue;

                if (!AccessingFrom)
                    return new Response("You're not supposed to be here", {
                        status: 410,
                    });
            }
        }

        // if search.server, add server to paste.CustomURL
        if (search.get("server"))
            search.set("OldURL", `${search.get("OldURL")}:${search.get("server")}`);

        // get paste if search.mode === "edit"
        let paste: Partial<Paste> | undefined;
        let RevisionNumber = 0;

        if (search.get("mode") === "edit" && search.get("OldURL")) {
            paste = await db.GetPasteFromURL(search.get("OldURL")!);
            if (!paste) search.set("mode", "new");

            // get revision
            if (search.get("r") && paste) {
                const revision = await db.GetRevision(
                    search.get("OldURL")!,
                    parseFloat(search.get("r")!)
                );

                if (!revision[0] || !revision[2])
                    return new _404Page().request(request);

                // ...update result
                paste.Content = revision[2].Content.split("_metadata:")[0];
                paste.EditDate = revision[2].EditDate;
                RevisionNumber = revision[2].EditDate;
            }
        } else if (search.get("Template")) {
            paste = await db.GetPasteFromURL(search.get("Template")!);

            if (paste)
                if (!paste!.Content!.includes("<% enable template %>"))
                    // make sure paste is a template
                    paste = undefined;
                // remove template string from content if it is
                else
                    paste!.Content = paste!.Content!.replaceAll(
                        "<% enable template %>",
                        ""
                    );
        }

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

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // ...get notifications
        let Notifications: Log[] = [];

        if (
            EntryDB.config.log &&
            EntryDB.config.log.events.includes("notification") &&
            Association[0]
        )
            Notifications = (
                await EntryDB.Logs.QueryLogs(
                    `"Type" = \'notification\' AND \"Content\" LIKE \'%${Association[1]}\'`
                )
            )[2];

        // check PrivateSource value
        if (
            paste &&
            paste.Metadata &&
            paste.Metadata.PrivateSource === true &&
            paste.Metadata.Owner &&
            paste.Metadata.Owner !== Association[1]
        )
            return new _404Page().request(request);

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
                <div class="builder:page">
                    <main
                        style={{
                            height: "calc(100% - 1rem)",
                        }}
                    >
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
                                <p
                                    style={{
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    You're{" "}
                                    {search.get("pm") === "true" && <b>privately</b>}{" "}
                                    commenting on a paste, write something short and
                                    simple!
                                </p>
                                <p>
                                    Not what you want?{" "}
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

                        {RevisionNumber !== 0 && (
                            <div
                                class={"mdnote note-info"}
                                style={{
                                    marginBottom: "0.5rem",
                                }}
                            >
                                <b class={"mdnote-title"}>Viewing Revision</b>
                                <p>
                                    Pressing save will restore the content of the
                                    paste from the revision!{" "}
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
                                maxWidth: "100%",
                                overflow: "visible",
                            }}
                        >
                            <div class={"flex"}>
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

                            <div class={"flex"}>
                                {EntryDB.config.app && EntryDB.config.app.how && (
                                    <a
                                        href={EntryDB.config.app.how}
                                        class={
                                            "button secondary normal tooltip-wrapper"
                                        }
                                        target={"_blank"}
                                        title={"How"}
                                        style={{ padding: "0.75rem" }}
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

                                        <div className="card secondary round border tooltip bottom">
                                            How
                                        </div>
                                    </a>
                                )}

                                {EntryDB.config.log &&
                                    EntryDB.config.log.events.includes(
                                        "notification"
                                    ) &&
                                    Association[0] && (
                                        <a
                                            href="/paste/notifications"
                                            className="button secondary normal tooltip-wrapper"
                                            style={{
                                                color:
                                                    Notifications.length > 0
                                                        ? "var(--red3)"
                                                        : "",
                                                padding: "0.75rem",
                                            }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Bell Symbol"}
                                            >
                                                <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Zm5-3.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.017.017 0 0 0-.003.01l.001.006c0 .002.002.004.004.006l.006.004.007.001h10.964l.007-.001.006-.004.004-.006.001-.007a.017.017 0 0 0-.003-.01l-1.703-2.554a1.745 1.745 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5Z"></path>
                                            </svg>

                                            <div className="card secondary round border tooltip bottom">
                                                View {Notifications.length}{" "}
                                                notification
                                                {Notifications.length > 1 ||
                                                Notifications.length === 0
                                                    ? "s"
                                                    : ""}
                                            </div>
                                        </a>
                                    )}

                                {(!Association[0] && (
                                    <button
                                        title="Associate Paste"
                                        style={{ padding: "0.75rem" }}
                                        class={
                                            "modal:entry:button.login tooltip-wrapper"
                                        }
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Sign In Symbol"}
                                        >
                                            <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm6.56 4.5h5.69a.75.75 0 0 1 0 1.5H8.56l1.97 1.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L6.22 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734Z"></path>
                                        </svg>

                                        <div className="card secondary round border tooltip bottom">
                                            Associate Paste
                                        </div>
                                    </button>
                                )) || (
                                    <button
                                        title="Disassociate Paste"
                                        style={{ padding: "0.75rem" }}
                                        class={
                                            "modal:entry:button.logout tooltip-wrapper"
                                        }
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Sign Out Symbol"}
                                        >
                                            <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H6.75a.75.75 0 0 1 0-1.5Z"></path>
                                        </svg>

                                        <div className="card secondary round border tooltip bottom">
                                            Disassociate Paste
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div
                            class={"tab-container card secondary round"}
                            id={"-editor"}
                            style={{
                                borderTopLeftRadius: 0,
                                borderTopRightRadius: 0,
                            }}
                        >
                            <div
                                id="editor-tab-text"
                                class="editor-tab -editor active"
                                style={{
                                    height: "100%",
                                }}
                            />

                            <div
                                id="editor-tab-preview"
                                class="editor-tab -editor"
                            />
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

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "0.5rem",
                                                justifyContent: "flex-start",
                                            }}
                                            class={"mobile-flex-center mobile-max"}
                                        >
                                            <button
                                                class={"round green-cta"}
                                                id={"entry:button.Submit"}
                                                style={{ fontWeight: "500" }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    width="18"
                                                    height="18"
                                                    aria-label={"Check Mark Symbol"}
                                                >
                                                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                                                </svg>
                                                Save
                                            </button>

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
                                                                .enable_groups ===
                                                                false &&
                                                            EntryDB.config.app
                                                                .enable_expiry ===
                                                                false
                                                        ) &&
                                                        // don't show on comment or report!
                                                        search.get("CommentOn") ===
                                                            null &&
                                                        search.get("ReportOn") ===
                                                            null)) && (
                                                    <>
                                                        <a
                                                            href={"javascript:"}
                                                            id={
                                                                "entry:button.PasteExtras"
                                                            }
                                                            title={"More Options"}
                                                            class={
                                                                "button tertiary round"
                                                            }
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 16 16"
                                                                width="16"
                                                                height="16"
                                                                aria-label={
                                                                    "Ellipsis Symbol"
                                                                }
                                                            >
                                                                <path d="M0 5.75C0 4.784.784 4 1.75 4h12.5c.966 0 1.75.784 1.75 1.75v4.5A1.75 1.75 0 0 1 14.25 12H1.75A1.75 1.75 0 0 1 0 10.25ZM12 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM7 8a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM4 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"></path>
                                                            </svg>
                                                            More
                                                        </a>
                                                    </>
                                                )
                                            }
                                        </div>

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
                                                    class={"round"}
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
                                                    <input
                                                        class={"round"}
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

                                    {/* hidden */}

                                    <input
                                        type="hidden"
                                        name="CommentOn"
                                        id={"CommentOn"}
                                        value={search.get("CommentOn") || ""}
                                    />

                                    {search.get("pm") === "true" && (
                                        <input
                                            type="hidden"
                                            name="IsPM"
                                            id={"IsPM"}
                                            value={"true"}
                                        />
                                    )}

                                    <input
                                        type="hidden"
                                        name="ReportOn"
                                        id={"ReportOn"}
                                        value={search.get("ReportOn") || ""}
                                    />

                                    {/* ... */}
                                    <Modal
                                        buttonid="entry:button.PasteExtras"
                                        modalid="entry:modal.PasteExtras"
                                        round={true}
                                    >
                                        <div
                                            style={{
                                                maxWidth: "50rem",
                                            }}
                                        >
                                            <h4
                                                style={{
                                                    textAlign: "center",
                                                    width: "100%",
                                                }}
                                            >
                                                Extra Paste Options
                                            </h4>

                                            <hr />

                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    flexWrap: "wrap",
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
                                                    {(!EntryDB.config.app ||
                                                        EntryDB.config.app
                                                            .enable_private_pastes !==
                                                            false) && (
                                                        <details
                                                            class={
                                                                "details-confined round"
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
                                                                    Private Pastes
                                                                </h4>

                                                                <p>
                                                                    Providing a view
                                                                    code makes your
                                                                    paste private.
                                                                    The view code is
                                                                    used to decrypt
                                                                    your paste for
                                                                    viewing.
                                                                </p>

                                                                <input
                                                                    class={
                                                                        "round full"
                                                                    }
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
                                                                "details-confined round"
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
                                                                    Groups cannot be
                                                                    made private. The
                                                                    group post code
                                                                    is only required
                                                                    when submitting
                                                                    to an existing
                                                                    group or creating
                                                                    a new group.
                                                                </p>

                                                                <input
                                                                    class={
                                                                        "round full"
                                                                    }
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
                                                                    id={"GroupName"}
                                                                    name={
                                                                        "GroupName"
                                                                    }
                                                                />

                                                                <input
                                                                    class={
                                                                        "round full"
                                                                    }
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
                                                                "details-confined round"
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
                                                                    Delete Paste On
                                                                </label>

                                                                <input
                                                                    class={
                                                                        "round full"
                                                                    }
                                                                    type={
                                                                        "datetime-local"
                                                                    }
                                                                    name={"ExpireOn"}
                                                                    id={"ExpireOn"}
                                                                />

                                                                <DateOptions />
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <hr />

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <a
                                                className="button green round"
                                                href={
                                                    "javascript:modals['entry:modal.PasteExtras']();"
                                                }
                                            >
                                                Close
                                            </a>
                                        </div>
                                    </Modal>
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
                                                    name={"Content"}
                                                    id={"contentInput"}
                                                    required
                                                />

                                                <div className="tooltip-wrapper mobile-max flex justify-center">
                                                    <input
                                                        style={{
                                                            width: "100%",
                                                        }}
                                                        class={"round"}
                                                        type="text"
                                                        placeholder={"Edit code"}
                                                        maxLength={
                                                            EntryDB.MaxPasswordLength
                                                        }
                                                        minLength={
                                                            EntryDB.MinPasswordLength
                                                        }
                                                        name={"EditPassword"}
                                                        disabled={
                                                            Association[0] &&
                                                            Association[1] ===
                                                                paste.Metadata!.Owner
                                                        }
                                                        required
                                                    />

                                                    {Association[0] &&
                                                        Association[1] ===
                                                            paste.Metadata!
                                                                .Owner && (
                                                            <div className="card secondary round border tooltip top">
                                                                You don't need a
                                                                password, you own
                                                                this!
                                                            </div>
                                                        )}
                                                </div>

                                                {
                                                    // we're going to provide the old Custom URL as well because the server expects it
                                                    // if we don't provide a new Custom URL, this will be used instead so we don't give up our url
                                                }
                                                <input
                                                    class={"round mobile-max"}
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
                                                    class={"round mobile-max"}
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
                                                class={
                                                    "g-4 full justify-space-between flex"
                                                }
                                            >
                                                <div class={"flex g-4"}>
                                                    <button
                                                        class={"round green-cta"}
                                                        id={"entry:button.Submit"}
                                                        style={{ fontWeight: "500" }}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 16 16"
                                                            width="18"
                                                            height="18"
                                                            aria-label={
                                                                "Check Mark Symbol"
                                                            }
                                                        >
                                                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                                                        </svg>
                                                        Save
                                                    </button>

                                                    <a
                                                        href={`/r/${paste.CustomURL}`}
                                                        class={
                                                            "button tertiary round"
                                                        }
                                                        title={"Inspect Paste"}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 16 16"
                                                            width="16"
                                                            height="16"
                                                            style={{
                                                                marginTop: "2px",
                                                            }}
                                                            aria-label={
                                                                "Repo Symbol"
                                                            }
                                                        >
                                                            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                                                        </svg>
                                                        More
                                                    </a>
                                                </div>

                                                <div className="flex g-4">
                                                    <a
                                                        id={
                                                            "editor-open-delete-modal"
                                                        }
                                                        class={
                                                            "button tertiary red round"
                                                        }
                                                        href={"javascript:"}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 16 16"
                                                            width="16"
                                                            height="16"
                                                            aria-label={
                                                                "Trash Symbol"
                                                            }
                                                        >
                                                            <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                                                        </svg>
                                                        Delete
                                                    </a>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                ))}
                        </div>

                        <Footer
                            ShowBottomRow={
                                search.get("mode") !== "edit" ||
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

                    {paste && (
                        <Modal
                            buttonid="editor-open-delete-modal"
                            modalid="editor-modal-delete"
                            round={true}
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
                                    <button class={"green mobile-max round"}>
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
                                        value={paste!.CustomURL}
                                    />

                                    <button class={"red round mobile-max"}>
                                        Delete
                                    </button>
                                </form>
                            </div>
                        </Modal>
                    )}

                    <script
                        type="module"
                        dangerouslySetInnerHTML={{
                            __html: `import CreateEditor from "/Editor.js";
                            CreateEditor("editor-tab-text", \`${encodeURIComponent(
                                (paste || { Content: "" })!.Content!
                            )}\`);`,
                        }}
                    />

                    <Modal
                        buttonid="entry:button.Submit"
                        modalid="entry:modal.Submit"
                        round={true}
                    >
                        <div className="flex flex-column g-10">
                            <span>Loading...</span>

                            <div className="flex g-4">
                                <a
                                    href="javascript:window.location.reload()"
                                    class={"button red round"}
                                >
                                    Refresh
                                </a>

                                <a
                                    href="javascript:window.modals['entry:modal.Submit'](false)"
                                    class={"button red round"}
                                >
                                    Close
                                </a>
                            </div>
                        </div>
                    </Modal>

                    {/* auth flow modals */}
                    <AuthModals use={Association[0] ? "logout" : "login"} />

                    {/* curiosity */}
                    <Pages.Curiosity Association={Association} />
                </div>,
                <>
                    {
                        // this is the head vnode, it goes into the HTML head instead of body
                    }
                    <meta
                        name="description"
                        content="Entry - A Markdown Pastebin"
                    ></meta>

                    <title>{EntryDB.config.name} - A Markdown Pastebin</title>
                    <link rel="icon" href="/favicon" />

                    <OpenGraph
                        title={
                            paste === undefined
                                ? "Create a new paste..."
                                : `Edit ${paste.CustomURL}...`
                        }
                    />
                </>
            ),
            {
                status: search.get("err") === null ? 200 : 400,
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Set-Cookie": SessionCookie,
                    "set-cookie": Association[1],
                    "X-Entry-Error": search.get("err") || "",
                },
            }
        );
    }
}
