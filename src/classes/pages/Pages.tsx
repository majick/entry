/**
 * @file Handle Page endpoints
 * @name Pages.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

// import components
import DecryptionForm from "./components/form/DecryptionForm";
import TopNav from "./components/site/TopNav";
import Footer from "./components/site/Footer";
import _404Page from "./components/404";
import Home from "./Home";

// create database
import EntryDB from "../db/EntryDB";
import type { Paste } from "../db/objects/Paste";

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
import { PageNode, StarInfoNode } from "./components/builder/schema";
import { AuthModals } from "./components/site/modals/AuthModals";
import { ParseMarkdown } from "./components/Markdown";
import SearchForm from "./components/form/SearchForm";
import BaseParser from "../db/helpers/BaseParser";
import Modal from "./components/site/modals/Modal";
import { ServerConfig } from "../..";
import { ReposNav } from "./repos/Repos";

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

export function Curiosity(props: { Association: [boolean, string] }) {
    return (
        <>
            {EntryDB.config.app &&
                EntryDB.config.app.curiosity &&
                props.Association[0] &&
                props.Association[1] && (
                    <>
                        <script
                            src={`${EntryDB.config.app.curiosity.host}/drone.js`}
                        />

                        <script
                            dangerouslySetInnerHTML={{
                                __html: `window.StartCuriosity("${props.Association[1]}");`,
                            }}
                        />
                    </>
                )}
        </>
    );
}

export function OpenGraph(props: {
    url?: string;
    description?: string;
    title?: string;
    icon?: string;
}) {
    return (
        <>
            <meta name={"theme-color"} value={"#55a4e0"} />
            <meta name={"og:type"} value={"website"} />
            <meta name={"og:site_name"} value={EntryDB.config.name} />
            {props.url && <meta name={"og:url"} value={props.url} />}

            {props.description && (
                <meta name={"og:description"} value={props.description} />
            )}

            {props.title && <meta name={"og:title"} value={props.title} />}
            {props.icon && <meta name={"og:image"} value={props.icon} />}
        </>
    );
}

/**
 * @function CheckInstance
 *
 * @export
 * @param {Request} request
 * @param {Server} server
 * @return {(Promise<Response | undefined>)}
 */
export async function CheckInstance(
    request: Request,
    server: Server
): Promise<Response | undefined> {
    if (!EntryDB.config.app || !EntryDB.config.app.hostname) return undefined;

    // get url and check if it's an instance
    const url = new URL(request.url);

    // get subdomain
    const subdomain = url.hostname.split(`.${EntryDB.config.app.hostname}`)[0];

    // handle cloud pages
    if (subdomain.startsWith("ins-") && ServerConfig.Pages["._serve_cloud_instance"])
        // forward to correct page
        return new ServerConfig.Pages["._serve_cloud_instance"].Page().request(
            request,
            server
        );

    // ...check against custom domain
    const CustomDomainLog = (
        await EntryDB.Logs.QueryLogs(
            `Type = "custom_domain" AND Content LIKE "%;${url.hostname}"`
        )
    )[2][0];

    if (CustomDomainLog) {
        // ...create new request
        const req = new Request(
            `${url.protocol}//ins-${CustomDomainLog.Content.split(";")[0].replaceAll(
                "/",
                "."
            )}.${EntryDB.config.app.hostname}${url.pathname}${url.search}${
                url.hash
            }`,
            {
                method: request.method,
                headers: request.headers,
                body: request.body,
            }
        );

        // ...return
        return new ServerConfig.Pages["._serve_cloud_instance"].Page().request(
            req,
            server
        );
    }

    // default return
    return undefined;
}

/**
 * @export
 * @class GetPasteFromURL
 * @implements {Endpoint}
 */
export class GetPasteFromURL implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // check if this is from a wildcard match
        const IsFromWildcard = search.get("_priv_isFromWildcard") === "true";
        const HostnameURL =
            (EntryDB.config &&
                EntryDB.config.app &&
                EntryDB.config.app.hostname &&
                `https://${EntryDB.config.app.hostname}/`) ||
            "/";

        // load doc view if specified
        if (search.get("view") && search.get("view") === "doc")
            return await new PasteDocView().request(request, server);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/dec/")) name = name.split("paste/dec/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request, server);

        // attempt to get paste
        const _fetchStart = performance.now();

        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        const _fetchEnd = performance.now();

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
        // cannot be from a wildcard domain if we're creating a new session!
        const SessionCookie = !IsFromWildcard ? await Session(request) : "";

        // count view
        let Viewed = false;
        if (
            result &&
            !result.HostServer &&
            search.get("NoView") !== "true" &&
            !IsFromWildcard // cannot view from wildcard domain!
        ) {
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

        // get association
        const Association = await GetAssociation(request, null);

        // check PrivateSource value
        let HideSource: boolean = false;

        if (
            result.Metadata &&
            result.Metadata.PrivateSource === true &&
            result.Metadata.Owner &&
            result.Metadata.Owner !== Association[1]
        )
            HideSource = true;

        // check if paste was created in the builder (starts with _builder:)
        if (
            result.Content.startsWith("_builder:") &&
            search.get("nobuilder") === null
        ) {
            // get parsed content
            const TrueContent = BaseParser.parse(
                result.Content.split("_builder:")[1]
            );

            // get current page
            let Page: PageNode = TrueContent.Pages[0];

            // get star for favicon
            const Star: StarInfoNode | undefined = Page.Children.find(
                (n) => n.Type === "StarInfo"
            ) as StarInfoNode | undefined;

            // return
            return new Response(
                Renderer.Render(
                    <>
                        <div id="_doc">
                            {/* initial render */}
                            <noscript>
                                <p>
                                    Builder pastes don't currently work without
                                    JavaScript access. If you're worried about
                                    privacy and security on this page, I suggest you
                                    look into the NoScript extension and a competent
                                    ad-blocker. Entry collects no
                                    personally-identifiable information by default,
                                    and actively works to ensure your privacy and
                                    safety. Entry is entirely open-source, you can
                                    view the source{" "}
                                    <a href="https://codeberg.org/hkau/entry">
                                        here
                                    </a>
                                    .
                                </p>

                                <p>
                                    Builder pastes are rendered on the client using
                                    Preact, a very small (&lt;3kb) React renderer.
                                    Entry loads very few assets to display this page,
                                    so there should not be a bandwidth concern when
                                    viewing this page.
                                </p>

                                <p>Please try again after enabling JavaScript.</p>
                            </noscript>
                        </div>

                        <div id="debug" />

                        {/* fix mistakes on client */}
                        <script
                            type={"module"}
                            dangerouslySetInnerHTML={{
                                __html: `import Builder, { Debug } from "/Builder.js";
                                Builder(\`${BaseParser.stringify(
                                    TrueContent
                                )}\`, false); window.Debug = Debug;`,
                            }}
                        />

                        {/* curiosity */}
                        <Curiosity Association={Association} />

                        {/* toolbar */}
                        <Modal
                            buttonid="entry:button.PasteOptions"
                            modalid="entry:modal.PasteOptions"
                            noIdMatch={true} // use `window.modals["entry:modal.PasteOptions"](true)` instead
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
                                        href={`${HostnameURL}paste/builder?edit=${result.CustomURL}`}
                                        className="button round"
                                        disabled={HideSource}
                                    >
                                        Edit
                                    </a>

                                    {(!EntryDB.config.app ||
                                        EntryDB.config.app.enable_paste_settings !==
                                            false) && (
                                        <a
                                            href={`${HostnameURL}paste/settings/${result.CustomURL}`}
                                            className="button round"
                                        >
                                            Settings
                                        </a>
                                    )}

                                    {EntryDB.config.app &&
                                        EntryDB.config.app.enable_comments ===
                                            true &&
                                        (!result.Metadata ||
                                            !result.Metadata!.Comments ||
                                            result.Metadata!.Comments.Enabled !==
                                                false) && (
                                            <a
                                                href={`${HostnameURL}paste/comments/${result.CustomURL}`}
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
                                                href={`${HostnameURL}?ReportOn=${result.CustomURL}`}
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

                                {result.Metadata && (
                                    <>
                                        {result.Metadata.Owner &&
                                            result.Metadata.ShowOwnerEnabled !==
                                                false && (
                                                <p>
                                                    Owner:{" "}
                                                    <a
                                                        href={`${HostnameURL}${result.Metadata.Owner}`}
                                                    >
                                                        {result.Metadata.Owner
                                                            .length > 25
                                                            ? `${result.Metadata.Owner}...`
                                                            : result.Metadata.Owner}
                                                    </a>
                                                </p>
                                            )}
                                    </>
                                )}

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

                        <title>
                            {result.Metadata && result.Metadata.Title
                                ? result.Metadata.Title
                                : result.CustomURL}
                        </title>

                        <link rel="icon" href={Star ? Star.Source : "/favicon"} />

                        <OpenGraph
                            title={
                                result.Metadata && result.Metadata.Title
                                    ? result.Metadata.Title
                                    : result.CustomURL
                            }
                            icon={
                                result.Metadata && result.Metadata.Favicon
                                    ? result.Metadata.Favicon
                                    : undefined
                            }
                        />
                    </>
                ),
                {
                    headers: {
                        ...PageHeaders,
                        "Content-Type": "text/html",
                    },
                }
            );
        } else if (result.Content.startsWith("_workshop:")) {
            // get parsed content
            const TrueContent = result.Content.split("_workshop:")[1].replaceAll(
                "`",
                "\\`"
            );

            // return
            return new Response(
                Renderer.Render(
                    <>
                        <canvas
                            id={"game_canvas"}
                            width={"1024"}
                            height={"512"}
                            style={{
                                background: "white",
                                height: "100%",
                                width: "100%",
                            }}
                        />

                        <script
                            type={"module"}
                            dangerouslySetInnerHTML={{
                                __html: `import Renderer2D from "/Renderer2D.js";
                                import WorkshopLib from "/WorkshopLib.js";

                                document.body.style.overflowY = "hidden";

                                // create renderer
                                const Renderer = new Renderer2D(
                                    \`${TrueContent}\`,
                                    document.getElementById("game_canvas")
                                );

                                window.renderer = Renderer;
                                window.library = WorkshopLib;
                                
                                // start scene
                                Renderer.BeginDrawing();`,
                            }}
                        />
                    </>,
                    <>
                        <title>
                            {result.Metadata && result.Metadata.Title
                                ? result.Metadata.Title
                                : result.CustomURL}
                        </title>

                        <OpenGraph
                            title={
                                result.Metadata && result.Metadata.Title
                                    ? result.Metadata.Title
                                    : result.CustomURL
                            }
                        />
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

        // ...otherwise

        // tag paste
        // result.Content = `${result.Content}\n<% tag current_paste ${result.CustomURL} %>`;

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        {search.get("UnhashedEditPassword") && (
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
                                        You cannot edit or delete your paste if you
                                        don't have your edit password. Please save it
                                        somewhere safe:{" "}
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
                                        The web address you are currently on contains
                                        the edit password for your paste! Please
                                        remove it before sharing this current web
                                        address with anyone.
                                    </b>
                                    <p>
                                        You can click <a href="?">here</a> to remove
                                        it.
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
                            class={"tab-container card secondary round"}
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
                                    <a
                                        class={"button round"}
                                        disabled={HideSource}
                                        href={`${HostnameURL}?mode=edit&OldURL=${
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

                                    {EntryDB.config.app &&
                                        EntryDB.config.app.enable_comments ===
                                            true &&
                                        result.Comments !== undefined &&
                                        !result.Content.includes(
                                            "<% disable comments %>"
                                        ) &&
                                        (!result.Metadata ||
                                            !result.Metadata.Comments ||
                                            result.Metadata.Comments.Enabled !==
                                                false) && (
                                            <a
                                                class={"button round"}
                                                href={`${HostnameURL}paste/comments/${result.CustomURL}`}
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
                                        class={"button round"}
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
                                        class={"horizontal round"}
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
                                                href={`${HostnameURL}api/raw/${result.CustomURL}`}
                                                style={{
                                                    width: "80px",
                                                }}
                                            >
                                                Raw
                                            </a>

                                            <a
                                                class={"button"}
                                                href={`${HostnameURL}api/html/${result.CustomURL}`}
                                                target={"_blank"}
                                                style={{
                                                    width: "100px",
                                                }}
                                            >
                                                HTML
                                            </a>

                                            <a
                                                class={"button"}
                                                href={`${HostnameURL}paste/doc/${result.CustomURL}`}
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
                                        round={true}
                                    >
                                        <div
                                            class={
                                                "flex justify-center flex-wrap g-4"
                                            }
                                            style={{
                                                width: "25rem",
                                                maxWidth: "100%",
                                            }}
                                        >
                                            {result.Content.includes(
                                                "<% enable template %>"
                                            ) && (
                                                <a
                                                    href={`${HostnameURL}?Template=${result.CustomURL}`}
                                                    class={"button round"}
                                                >
                                                    Use Template
                                                </a>
                                            )}

                                            {result.GroupName && (
                                                <a
                                                    class={"button round"}
                                                    href={`${HostnameURL}search?q=${
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

                                            {/* {(!EntryDB.config.app ||
                                                EntryDB.config.app.auto_tag !==
                                                    false) &&
                                                Association[0] &&
                                                result.CustomURL !==
                                                    Association[1] && (
                                                    <form
                                                        action={"/api/block"}
                                                        method={"POST"}
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="CustomURL"
                                                            value={result.CustomURL}
                                                            required
                                                        />

                                                        <button className="round">
                                                            Block
                                                        </button>
                                                    </form>
                                                    )} */}

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
                                                        class={"button round"}
                                                        href={`${HostnameURL}?ReportOn=${result.CustomURL}`}
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
                                                        class={"button round"}
                                                        href={`${HostnameURL}paste/builder?edit=${result.CustomURL}`}
                                                    >
                                                        Edit in Builder
                                                    </a>
                                                )}
                                        </div>

                                        <hr />

                                        <form method="dialog" class={"mobile-max"}>
                                            <button
                                                class={"green round"}
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
                                    {result.Metadata &&
                                        result.Metadata.Badges &&
                                        result.Metadata.Badges.split(",").length >
                                            0 && (
                                            <div class={"flex flex-wrap g-4"}>
                                                {result.Metadata.Badges.split(
                                                    ","
                                                ).map((badge) => (
                                                    <span class={"chip badge"}>
                                                        {badge}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

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
                                                            href={`${HostnameURL}${result.Metadata.Owner}`}
                                                        >
                                                            {result.Metadata.Owner
                                                                .length > 25
                                                                ? `${result.Metadata.Owner}...`
                                                                : result.Metadata
                                                                      .Owner}
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

                        {!IsFromWildcard && (
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
                        )}

                        {/* curiosity */}
                        <Curiosity Association={Association} />
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

                    <title>
                        {result.Metadata && result.Metadata.Title
                            ? result.Metadata.Title
                            : result.CustomURL}
                    </title>

                    <link
                        rel="icon"
                        href={
                            result.Metadata && result.Metadata.Favicon
                                ? result.Metadata.Favicon
                                : "/favicon"
                        }
                    />

                    <OpenGraph
                        title={
                            result.Metadata && result.Metadata.Title
                                ? result.Metadata.Title
                                : result.CustomURL
                        }
                        description={
                            // if length of content is greater than 150, cut it at 150 characters and add "..."
                            // otherwise, we can just show the full content
                            result.Content.length > 150
                                ? `${result.Content.substring(0, 150)}...`
                                : result.Content
                        }
                        icon={
                            result.Metadata && result.Metadata.Favicon
                                ? result.Metadata.Favicon
                                : undefined
                        }
                    />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Set-Cookie": SessionCookie,
                    "X-Data-Response-Time": `${
                        (_fetchEnd - _fetchStart) / 1000
                    } seconds`,
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
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/doc/")) name = name.split("paste/doc/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request, server);

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

                                <Footer />
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
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // manage session
        const SessionCookie = await Session(request);

        // ...
        if (search.get("q") || search.get("owner")) {
            // build query
            let query = `CustomURL LIKE "%${(search.get("q") || "")
                .toLowerCase()
                .replaceAll('"', "'")}%" LIMIT 100`;

            // if q does not exist (or is "explore"), set explore mode
            let ExploreMode = false;
            if (!search.get("q") || search.get("q") === "explore") {
                query = `CustomURL IS NOT NULL ORDER BY cast(EditDate as float) DESC LIMIT 100`;
                search.set("q", "explore");
                ExploreMode = true;
            }

            // get pastes
            const pastes =
                search.get("group") === null
                    ? // search all pastes
                      await db.GetAllPastes(false, true, query)
                    : // search within group
                      await db.GetAllPastesInGroup(search.get("group") as string);

            // if "owner" is set, filter out pastes not owned by value
            if (search.get("owner"))
                for (const paste of pastes)
                    if (
                        paste.Metadata &&
                        paste.Metadata!.Owner !== search.get("owner")
                    )
                        pastes.splice(pastes.indexOf(paste), 1);

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
                        <TopNav breadcrumbs={["search"]} border={false}>
                            {(!ExploreMode && (
                                <a href={"?q=explore"} class={"button round"}>
                                    Explore
                                </a>
                            )) || (
                                <a href={"/search"} class={"button round"}>
                                    Search
                                </a>
                            )}
                        </TopNav>

                        <main>
                            <div
                                class={
                                    "flex flex-wrap justify-space-between mobile-flex-center align-center card border round"
                                }
                                style={{
                                    marginBottom: "0.5rem",
                                }}
                            >
                                {/* hide the search bar if search is disabled */}
                                {(!ExploreMode &&
                                    (!EntryDB.config.app ||
                                        (EntryDB.config.app.enable_search !==
                                            false && (
                                            <SearchForm
                                                query={search.get("q") || ""}
                                            />
                                        )))) || (
                                    <div>
                                        Explore pastes{" "}
                                        {search.get("owner") &&
                                            `by ${search.get("owner")}`}
                                        , sorted by edit date
                                    </div>
                                )}

                                <span class={"mobile-center"}>
                                    <b>{pastes.length}</b> result
                                    {pastes.length > 1 || pastes.length === 0
                                        ? "s"
                                        : ""}
                                </span>
                            </div>

                            <div
                                className="card secondary round flex flex-column g-4"
                                style={{
                                    maxHeight: "max-content",
                                    height: "max-content",
                                }}
                            >
                                {pastes.map((paste) => (
                                    <div class={"search-result card round border"}>
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
                                            · Content length:{" "}
                                            {
                                                paste.Content.split("_metadata:")[0]
                                                    .length
                                            }{" "}
                                            Characters
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <style
                                dangerouslySetInnerHTML={{
                                    __html: `.search-result:hover {
                                        background: var(--background-surface1);
                                    }`,
                                }}
                            />
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
                                class={
                                    "small flex g-4 flex-column justify-center align-center"
                                }
                            >
                                <h1 class={"no-margin"}>Search</h1>
                                <SearchForm alwaysCenter={true} />
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
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // ...
        const HostnameURL =
            (EntryDB.config &&
                EntryDB.config.app &&
                EntryDB.config.app.hostname &&
                `https://${EntryDB.config.app.hostname}/`) ||
            "/";

        // return 404 if comments are disabled
        if (!EntryDB.config.app || EntryDB.config.app.enable_comments !== true)
            return new _404Page().request(request);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/comments/"))
            name = name.split("paste/comments/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request, server);

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

        const _ip = server !== undefined ? server.requestIP(request) : null;
        const _Association = await GetAssociation(request, _ip);

        if (
            _Association[1] &&
            !_Association[1].startsWith("associated") &&
            !_Association[1].startsWith("Session does not exist")
        )
            PostingAs = _Association[1];

        // get offset
        const OFFSET = parseInt(search.get("offset") || "0");
        const PER_PAGE = 50;

        // get comments
        const _result = await db.GetPasteComments(
            result.CustomURL,
            OFFSET,
            PostingAs
        );

        if (!_result[0]) return new _404Page().request(request);

        // ...
        const CommentPastes: Partial<Paste>[] = _result[2];
        const CommentOwners: { [key: string]: Paste } = {};

        // render all comment pastes
        for (const paste of CommentPastes) {
            // get owner
            if (paste.Metadata && paste.Metadata.Owner)
                CommentOwners[paste.CustomURL as any] = (await db.GetPasteFromURL(
                    paste.Metadata.Owner
                )) as Paste;

            // parse content
            paste.Content = await ParseMarkdown(paste.Content || "");
        }

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

        // return
        return new Response(
            Renderer.Render(
                <div
                    class="builder:page"
                    style={{
                        gap: "0",
                    }}
                >
                    <TopNav
                        breadcrumbs={[
                            "paste",
                            "comments",
                            (result.GroupName === "comments" &&
                                result.Metadata &&
                                result.Metadata.Comments &&
                                result.Metadata.Comments.ParentCommentOn) ||
                                result.CustomURL,
                        ]}
                        margin={false}
                    >
                        <div class={"flex justify-center align-center g-4"}>
                            {OFFSET !== 0 && (
                                <>
                                    {/* only shown if we're not at the first page */}
                                    <a
                                        href={`?offset=${OFFSET - PER_PAGE}`}
                                        class={"button round"}
                                        title={"Previous Page"}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Left Arrow"}
                                        >
                                            <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"></path>
                                        </svg>
                                    </a>
                                </>
                            )}

                            {OFFSET / PER_PAGE <
                                (result.Comments || 0) / PER_PAGE - 1 &&
                                (result.Comments || 0) > PER_PAGE && (
                                    <>
                                        {/* only shown if we're not at the last page (PER_PAGE) */}
                                        <a
                                            href={`?offset=${OFFSET + PER_PAGE}`}
                                            class={"button round"}
                                            title={"Next Page"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Right Arrow"}
                                            >
                                                <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z"></path>
                                            </svg>
                                        </a>
                                    </>
                                )}

                            {(OFFSET !== 0 || (result.Comments || 0) > PER_PAGE) && (
                                <div className="hr-left" />
                            )}
                        </div>

                        <a
                            href={`${HostnameURL}?CommentOn=${result.CustomURL}`}
                            className="button border round"
                            title={"Add Comments"}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-label={"Plus Symbol"}
                            >
                                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
                            </svg>
                        </a>
                    </TopNav>

                    <div
                        className="tab-container editor-tab page-content"
                        style={{
                            marginBottom: "0",
                        }}
                    >
                        <main
                            style={{
                                maxWidth: "100%",
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
                                        href={`${HostnameURL}?CommentOn=${result.CustomURL}`}
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
                                                    href={`${HostnameURL}?CommentOn=${result.CustomURL}&pm=true`}
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
                                                        class={
                                                            "button round tertiary"
                                                        }
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
                                        <b class={"mdnote-title"}>
                                            Application Error
                                        </b>
                                        <p>
                                            {decodeURIComponent(search.get("err")!)}
                                        </p>
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
                                                {decodeURIComponent(
                                                    search.get("msg")!
                                                )}
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
                                            <a
                                                href={`${HostnameURL}?CommentOn=${result.CustomURL}`}
                                            >
                                                Add Comment
                                            </a>
                                        </span>
                                    </div>
                                )}

                                {/* actual comment display! */}
                                {CommentPastes.map((comment) => {
                                    // get comment owner
                                    const CommentOwner =
                                        CommentOwners[comment.CustomURL as any];

                                    // return
                                    return (
                                        <div
                                            class={"card flex justify-center g-10"}
                                            style={{
                                                borderRadius: "0.4rem",
                                            }}
                                        >
                                            {/* social */}
                                            {CommentOwner &&
                                                CommentOwner.Metadata &&
                                                CommentOwner.Metadata.SocialIcon && (
                                                    <div
                                                        style={{
                                                            width: "20%",
                                                        }}
                                                    >
                                                        <img
                                                            title={
                                                                CommentOwner.Metadata
                                                                    .Owner
                                                            }
                                                            class={
                                                                "card border round NoPadding"
                                                            }
                                                            src={
                                                                CommentOwner.Metadata
                                                                    .SocialIcon
                                                            }
                                                            alt={
                                                                CommentOwner.Metadata
                                                                    .Owner
                                                            }
                                                        />
                                                    </div>
                                                )}

                                            {/* main stuff */}
                                            <div
                                                class={
                                                    "flex flex-column justify-space-between"
                                                }
                                                style={{
                                                    width: "100%",
                                                }}
                                            >
                                                {/* stuff */}
                                                <div>
                                                    <ul
                                                        className="__footernav"
                                                        style={{
                                                            paddingLeft: 0,
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        <li>
                                                            <b
                                                                class={
                                                                    "utc-date-to-localize"
                                                                }
                                                            >
                                                                {new Date(
                                                                    comment.PubDate ||
                                                                        0
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
                                                                    class={
                                                                        "chip solid"
                                                                    }
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
                                                                    {
                                                                        comment.Associated
                                                                    }
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
                                                                View{" "}
                                                                <b>
                                                                    {
                                                                        comment.Comments
                                                                    }
                                                                </b>{" "}
                                                                repl
                                                                {comment.Comments! >
                                                                1
                                                                    ? "ies"
                                                                    : comment.Comments ===
                                                                      1
                                                                    ? "y"
                                                                    : "ies"}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* actions bar */}
                                                <div>
                                                    <hr />

                                                    <div class={"flex g-4"}>
                                                        <a
                                                            class={
                                                                "chip button secondary"
                                                            }
                                                            href={`${HostnameURL}?CommentOn=${comment.CustomURL}`}
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 16 16"
                                                                width="16"
                                                                height="16"
                                                                aria-label={
                                                                    "Reply Symbol"
                                                                }
                                                            >
                                                                <path d="M6.78 1.97a.75.75 0 0 1 0 1.06L3.81 6h6.44A4.75 4.75 0 0 1 15 10.75v2.5a.75.75 0 0 1-1.5 0v-2.5a3.25 3.25 0 0 0-3.25-3.25H3.81l2.97 2.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L1.47 7.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"></path>
                                                            </svg>
                                                            reply
                                                        </a>

                                                        <a
                                                            class={
                                                                "chip button secondary"
                                                            }
                                                            href={`/${comment.CustomURL}`}
                                                            target={"_blank"}
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 16 16"
                                                                width="16"
                                                                height="16"
                                                                aria-label={
                                                                    "External Link Symbol"
                                                                }
                                                            >
                                                                <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"></path>
                                                            </svg>
                                                            open
                                                        </a>

                                                        {search.get("edit") ===
                                                            "true" && (
                                                            <form
                                                                action="/api/comments/delete"
                                                                method={"POST"}
                                                            >
                                                                <input
                                                                    type="hidden"
                                                                    name="CustomURL"
                                                                    value={
                                                                        result.CustomURL
                                                                    }
                                                                    required
                                                                />

                                                                <input
                                                                    type="hidden"
                                                                    name="CommentURL"
                                                                    value={
                                                                        comment.CustomURL
                                                                    }
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
                                                                        aria-label={
                                                                            "Trash Symbol"
                                                                        }
                                                                    >
                                                                        <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                                                                    </svg>
                                                                    delete
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </main>
                    </div>

                    {/* auth flow modals */}
                    <AuthModals use={PostingAs !== undefined ? "logout" : "login"} />

                    {/* curiosity */}
                    <Curiosity Association={_Association} />
                </div>,
                <>
                    <title>Comments on {result.CustomURL}</title>
                    <link rel="icon" href="/favicon" />

                    <meta
                        name="description"
                        content={`View comments on ${result.CustomURL}, on ${EntryDB.config.name}`}
                    />

                    <OpenGraph
                        title={`Comments on ${result.CustomURL}`}
                        description={`View ${CommentPastes.length} comment${
                            CommentPastes.length > 1 || CommentPastes.length === 0
                                ? "s"
                                : ""
                        } on /${result.CustomURL}`}
                        icon={
                            result.Metadata && result.Metadata.Favicon
                                ? result.Metadata.Favicon
                                : undefined
                        }
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
 * @export
 * @class UserSettings
 * @implements {Endpoint}
 */
export class UserSettings implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/settings/"))
            name = name.split("paste/settings/")[1];

        // if no paste is provided, show global settings
        if (name === "paste/settings") {
            // get association
            const _ip = server !== undefined ? server.requestIP(request) : null;
            const Association = await GetAssociation(request, _ip);
            if (Association[1].startsWith("associated=")) Association[0] = false;

            // render
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["paste", "settings"]} border={false} />

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
                                </div>
                            </div>

                            <script
                                type={"module"}
                                dangerouslySetInnerHTML={{
                                    __html: `import UserSettings from "/UserSettings.js";
                                    UserSettings("_doc");`,
                                }}
                            />

                            {/* curiosity */}
                            <Curiosity Association={Association} />
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

            // try to fetch custom domain log
            const CustomDomainLog = (
                await EntryDB.Logs.QueryLogs(
                    `Type = "custom_domain" AND Content LIKE "${result.CustomURL};%"`
                )
            )[2][0];

            // render
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav
                            breadcrumbs={["paste", "settings", name]}
                            border={false}
                            margin={false}
                        />

                        <div className="flex flex-column g-8">
                            <div
                                className="card secondary flex justify-space-between mobile-flex-center"
                                style={{
                                    padding: "calc(var(--u-12) * 4) var(--u-12)",
                                }}
                            >
                                <h1 class={"no-margin"}>{name}</h1>
                            </div>

                            <main class={"small flex flex-column g-4"}>
                                <ReposNav name={name} current="Settings" />

                                <div className="card round border">
                                    <div
                                        class={"mobile-flex-center"}
                                        style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            margin: "1rem 0 1rem 0",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <h4
                                            class={"no-margin"}
                                            style={{
                                                textAlign: "center",
                                            }}
                                        >
                                            Paste Settings
                                        </h4>

                                        <a
                                            href={"javascript:window.history.back()"}
                                            class={"button round"}
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
                                            class={
                                                "flex g-4 justify-center flex-wrap"
                                            }
                                        >
                                            <input
                                                type={"hidden"}
                                                name={"CustomURL"}
                                                value={result.CustomURL}
                                                class={"secondary"}
                                                required
                                            />

                                            <input
                                                class={"round mobile-max"}
                                                type="text"
                                                placeholder={"Edit code"}
                                                maxLength={EntryDB.MaxPasswordLength}
                                                minLength={EntryDB.MinPasswordLength}
                                                name={"EditPassword"}
                                                id={"EditPassword"}
                                                required
                                            />

                                            <input
                                                type="hidden"
                                                required
                                                name="Metadata"
                                                id={"Metadata"}
                                                value={""}
                                            />

                                            <button class={"round green mobile-max"}>
                                                Save
                                            </button>
                                        </form>
                                    </div>

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

                                    {EntryDB.config.app &&
                                        EntryDB.config.app.media &&
                                        EntryDB.config.app.media.enabled ===
                                            true && (
                                            <>
                                                <hr id={"PasteMedia"} />
                                                <h4>Paste Media</h4>

                                                <div class="card secondary border round flex justify-space-between align-center flex-wrap g-4">
                                                    <b>Paste Media Uploads</b>

                                                    <a
                                                        href={`/paste/media/${result.CustomURL}`}
                                                        className="secondary button round"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="16"
                                                            height="16"
                                                            aria-label={
                                                                "Picture Symbol"
                                                            }
                                                        >
                                                            <path d="M21.75 21.5H2.25A1.75 1.75 0 0 1 .5 19.75V4.25c0-.966.784-1.75 1.75-1.75h19.5c.966 0 1.75.784 1.75 1.75v15.5a1.75 1.75 0 0 1-1.75 1.75ZM2.25 4a.25.25 0 0 0-.25.25v15.5c0 .138.112.25.25.25h3.178L14 10.977a1.749 1.749 0 0 1 2.506-.032L22 16.44V4.25a.25.25 0 0 0-.25-.25ZM22 19.75v-1.19l-6.555-6.554a.248.248 0 0 0-.18-.073.247.247 0 0 0-.178.077L7.497 20H21.75a.25.25 0 0 0 .25-.25ZM10.5 9.25a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Zm-1.5 0a1.75 1.75 0 1 0-3.501.001A1.75 1.75 0 0 0 9 9.25Z"></path>
                                                        </svg>
                                                        View Media
                                                    </a>
                                                </div>
                                            </>
                                        )}

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "custom_domain"
                                        ) && (
                                            <>
                                                <hr id={"CustomDomain"} />
                                                <h4>Custom Domain</h4>

                                                <div class="card secondary border round flex justify-space-between flex-wrap g-4">
                                                    <div
                                                        class={"mobile-max"}
                                                        style={{
                                                            width: "45%",
                                                        }}
                                                    >
                                                        <b>Custom Domain</b>
                                                        <p>
                                                            Your domain must also be
                                                            connected via your DNS
                                                            using a CNAME record
                                                            pointing to{" "}
                                                            <code>
                                                                {url.hostname}
                                                            </code>
                                                        </p>
                                                    </div>

                                                    <form
                                                        action="/api/domain"
                                                        method={"POST"}
                                                        className="flex flex-column g-8 flex-wrap mobile-max"
                                                        style={{
                                                            width: "33.33%",
                                                        }}
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="CustomURL"
                                                            value={result.CustomURL}
                                                            required
                                                        />

                                                        <input
                                                            class={
                                                                "round mobile-max secondary"
                                                            }
                                                            type="text"
                                                            placeholder={"Edit code"}
                                                            maxLength={
                                                                EntryDB.MaxPasswordLength
                                                            }
                                                            minLength={
                                                                EntryDB.MinPasswordLength
                                                            }
                                                            name={"EditPassword"}
                                                            required
                                                        />

                                                        <input
                                                            class={
                                                                "round mobile-max secondary"
                                                            }
                                                            type="text"
                                                            name={"Domain"}
                                                            placeholder={
                                                                "example.com"
                                                            }
                                                            minLength={4}
                                                            maxLength={100}
                                                            autoComplete={"off"}
                                                            pattern={"^(.+).(.+)$"}
                                                            value={
                                                                CustomDomainLog
                                                                    ? CustomDomainLog.Content.split(
                                                                          ";"
                                                                      )[1]
                                                                    : ""
                                                            }
                                                            required
                                                        />

                                                        <button
                                                            className="secondary green round"
                                                            style={{ width: "100%" }}
                                                        >
                                                            Save
                                                        </button>
                                                    </form>
                                                </div>
                                            </>
                                        )}
                                </div>

                                <script
                                    type={"module"}
                                    dangerouslySetInnerHTML={{
                                        __html: `import _e from "/MetadataEditor.js";

                                        window.ENTRYDB_CONFIG_ENABLE_COMMENTS = ${
                                            EntryDB.config.app &&
                                            EntryDB.config.app.enable_comments ===
                                                true
                                        }

                                        _e.ClientEditor(\`${BaseParser.stringify(
                                            result.Metadata as any
                                        )}\`, "_doc");`,
                                    }}
                                />
                            </main>
                        </div>
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

/**
 * @export
 * @class ViewPasteMedia
 * @implements {Endpoint}
 */
export class ViewPasteMedia implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/media/")) name = name.split("paste/media/")[1];

        // get paste
        const paste = await db.GetPasteFromURL(name, true);
        if (!paste) return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        if (!Association[0]) return new _404Page().request(request);

        // ...
        const DeleteMode = url.searchParams.get("delete") === "true";

        // get media files
        const Files = await EntryDB.Media.GetMediaByOwner(paste.CustomURL as string);

        // render
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["paste", "media", name]} />

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
                                    <h4 class={"no-margin"}>Paste Media</h4>

                                    <div className="flex flex-wrap justify-right g-4">
                                        {!DeleteMode && (
                                            <>
                                                <button
                                                    id={"entry:button.UploadFile"}
                                                    className="secondary round"
                                                >
                                                    Upload File
                                                </button>

                                                <a
                                                    href={"?delete=true"}
                                                    className="button secondary round"
                                                >
                                                    Delete Files
                                                </a>
                                            </>
                                        )}

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
                                </div>

                                <hr />

                                <div className="flex g-4 justify-center align-center flex-wrap">
                                    {(DeleteMode === false &&
                                        Files[2] &&
                                        Files[2].map((file) => (
                                            <div
                                                className="card flex flex-column g-4 round border GrowHover"
                                                title={file}
                                                style={{
                                                    width: "10rem",
                                                }}
                                            >
                                                <img
                                                    class={
                                                        "card border round NoPadding"
                                                    }
                                                    src={`/api/media/file/${paste.CustomURL}/${file}`}
                                                    alt={file}
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                />

                                                <a
                                                    className="button round full"
                                                    href={`/api/media/file/${paste.CustomURL}/${file}`}
                                                >
                                                    {file.length > 8
                                                        ? `${file.substring(
                                                              0,
                                                              7
                                                          )}...`
                                                        : file}
                                                </a>
                                            </div>
                                        ))) ||
                                        (Files[2] &&
                                            ((url.searchParams.get(
                                                "EditPassword"
                                            ) && (
                                                // no edit password provided, show delete table
                                                <table
                                                    class={"force-full"}
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                >
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Delete File</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {Files[2].map((file) => (
                                                            <tr>
                                                                <td>
                                                                    <a
                                                                        href={`/api/media/file/${paste.CustomURL}/${file}`}
                                                                    >
                                                                        {file}
                                                                    </a>
                                                                </td>

                                                                <td
                                                                    class={
                                                                        "flex justify-center"
                                                                    }
                                                                    style={{
                                                                        width: "100%",
                                                                    }}
                                                                >
                                                                    <form
                                                                        action="/api/media/delete"
                                                                        encType={
                                                                            "multipart/form-data"
                                                                        }
                                                                        method={
                                                                            "POST"
                                                                        }
                                                                    >
                                                                        <input
                                                                            type="hidden"
                                                                            name="CustomURL"
                                                                            value={
                                                                                paste.CustomURL
                                                                            }
                                                                            required
                                                                        />

                                                                        <input
                                                                            type="hidden"
                                                                            name="EditPassword"
                                                                            value={
                                                                                url.searchParams.get(
                                                                                    "EditPassword"
                                                                                ) ||
                                                                                ""
                                                                            }
                                                                            required
                                                                        />

                                                                        <input
                                                                            type="hidden"
                                                                            name="File"
                                                                            value={
                                                                                file
                                                                            }
                                                                            required
                                                                        />

                                                                        <button className="round secondary red">
                                                                            Delete
                                                                        </button>
                                                                    </form>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )) || (
                                                // no edit password provided, ask for it
                                                <div className="flex justify-center">
                                                    <form
                                                        class={
                                                            "flex g-4 justify-center flex-wrap"
                                                        }
                                                    >
                                                        <input
                                                            class={
                                                                "secondary round mobile-max"
                                                            }
                                                            type="text"
                                                            placeholder={"Edit code"}
                                                            maxLength={
                                                                EntryDB.MaxPasswordLength
                                                            }
                                                            minLength={
                                                                EntryDB.MinPasswordLength
                                                            }
                                                            name={"EditPassword"}
                                                            id={"EditPassword"}
                                                            required
                                                        />

                                                        <input
                                                            type="hidden"
                                                            name="delete"
                                                            value={"true"}
                                                            required
                                                        />

                                                        <button
                                                            class={
                                                                "secondary round green mobile-max"
                                                            }
                                                        >
                                                            Continue
                                                        </button>
                                                    </form>
                                                </div>
                                            )))}
                                </div>
                            </div>
                        </div>

                        <Modal
                            modalid="entry:modal.UploadFile"
                            buttonid="entry:button.UploadFile"
                            round={true}
                        >
                            <h1
                                style={{
                                    width: "25rem",
                                    maxWidth: "100%",
                                }}
                            >
                                Upload File
                            </h1>

                            <hr />

                            <form
                                action="/api/media/upload"
                                encType={"multipart/form-data"}
                                method={"POST"}
                                class={"flex flex-column g-8"}
                            >
                                <input
                                    type="hidden"
                                    name="CustomURL"
                                    value={paste.CustomURL}
                                    required
                                />

                                <label htmlFor="EditPassword">
                                    <b>Paste Edit Code</b>
                                </label>

                                <input
                                    class={"round"}
                                    type="text"
                                    placeholder={"Edit code"}
                                    maxLength={EntryDB.MaxPasswordLength}
                                    minLength={EntryDB.MinPasswordLength}
                                    name={"EditPassword"}
                                    id={"EditPassword"}
                                    required
                                />

                                <label htmlFor="File">
                                    <b>File</b>
                                </label>

                                <input
                                    class={"round"}
                                    type="file"
                                    name="File"
                                    id={"File"}
                                    maxLength={
                                        EntryDB.config.app!.media!.max_size || 0
                                    }
                                    accept={"image/*"}
                                    required
                                />

                                <hr style={{ margin: 0 }} />

                                <button
                                    className="round green"
                                    style={{
                                        width: "100%",
                                    }}
                                >
                                    Upload File
                                </button>
                            </form>

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
                    </main>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>Media - {EntryDB.config.name}</title>
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

/**
 * @export
 * @class Notifications
 * @implements {Endpoint}
 */
export class Notifications implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        if (
            !EntryDB.config.log ||
            !EntryDB.config.log.events.includes("notification")
        )
            return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        if (!Association[0]) return new _404Page().request(request);

        // get notifications
        const Notifications = (
            await EntryDB.Logs.QueryLogs(
                `Type = "notification" AND Content LIKE "%${Association[1]}"`
            )
        )[2];

        // clear notifications
        for (const Notification of Notifications)
            await EntryDB.Logs.DeleteLog(Notification.ID);

        // render
        return new Response(
            Renderer.Render(
                <>
                    <TopNav
                        breadcrumbs={["paste", "notifications"]}
                        border={false}
                    />

                    <main class={"small flex flex-column g-4"}>
                        <div className="card round border flex justify-space-between g-4 flex-wrap">
                            <span>
                                {Notifications.length} notification
                                {Notifications.length > 1 ||
                                Notifications.length === 0
                                    ? "s"
                                    : ""}
                            </span>
                        </div>

                        {Notifications.map((Notification) => (
                            <div
                                class={
                                    "card round border secondary flex justify-space-between align-center flex-wrap g-4 mobile-flex-center"
                                }
                            >
                                <ul
                                    class="__footernav flex-wrap mobile-flex-center"
                                    style={{ margin: 0, padding: 0 }}
                                >
                                    <li style={{ marginTop: 0 }}>
                                        <a
                                            href={`/${
                                                Notification.Content.split(";")[0]
                                            }`}
                                            class={"chip solid"}
                                            target={"_blank"}
                                        >
                                            {Notification.Content.split(
                                                ";"
                                            )[0].startsWith("paste/comments/")
                                                ? "New Comment"
                                                : Notification.Content.split(";")[0]}
                                        </a>
                                    </li>

                                    <li style={{ marginTop: 0 }}>
                                        <span class={"utc-date-to-localize"}>
                                            {new Date(
                                                Notification.Timestamp
                                            ).toUTCString()}
                                        </span>
                                    </li>

                                    <li
                                        style={{
                                            color: "var(--text-color-faded)",
                                            marginTop: 0,
                                        }}
                                    >
                                        Read Now
                                    </li>
                                </ul>

                                <a
                                    class={"button round secondary"}
                                    href={`/${Notification.Content.split(";")[0]}`}
                                    target={"_blank"}
                                >
                                    View Notification
                                </a>
                            </div>
                        ))}
                    </main>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>Notifications - {EntryDB.config.name}</title>
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

// default export
export default {
    Curiosity,
    CheckInstance,
    // pages
    GetPasteFromURL,
    PasteDocView,
    PastesSearch,
    PasteCommentsPage,
    UserSettings,
    ViewPasteMedia,
    Notifications,
};
