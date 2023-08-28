/**
 * @file Handle Page endpoints
 * @name Pages.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";

// import components
import DecryptionForm from "./components/form/DecryptionForm";
import _404Page from "./components/404";
import Footer from "./components/Footer";
import Home from "./Home";

// create database
import EntryDB, { Paste } from "../db/EntryDB";
export const db = new EntryDB();

import pack from "../../../package.json";

import API, {
    VerifyContentType,
    DecryptPaste,
    Session,
    DefaultHeaders,
    GetCookie,
    PageHeaders,
} from "./API";

// ...
import { ParseMarkdown, ParseMarkdownSync } from "./components/Markdown";
import SearchForm from "./components/form/SearchForm";

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

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        {search.get("UnhashedEditPassword") &&
                            search.get("UnhashedEditPassword") !==
                                "paste is not editable!" && (
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
                                        maxWidth: "50%",
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

                                    {EntryDB.config.app &&
                                        EntryDB.config.app.enable_comments ===
                                            true &&
                                        result.Comments !== undefined && (
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

                                    <details
                                        class={"horizontal"}
                                        style={{
                                            width: "calc(80px * 3)",
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

                                        <div class={"details-content"}>
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
                                                    width: "80px",
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
                                </div>

                                <div
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

                                    <span title={result.PubDate}>
                                        Pub:{" "}
                                        <span className="utc-date-to-localize">
                                            {result.PubDate}
                                        </span>
                                    </span>

                                    <span title={result.EditDate}>
                                        Edit:{" "}
                                        <span className="utc-date-to-localize">
                                            {result.EditDate}
                                        </span>
                                    </span>

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "view_paste"
                                        ) && (
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

                        <Footer ShowBottomRow={false} />
                    </main>

                    <script
                        // P.S. I hate this
                        type="module"
                        dangerouslySetInnerHTML={{
                            __html: `import fix from "/ClientFixMarkdown.js?v=${pack.version}"; fix();`,
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

                                <Footer ShowBottomRow={false} />
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
                                __html: `import fix from "/ClientFixMarkdown.js?v=${pack.version}"; fix();`,
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
                                    <div
                                        class={"search-result"}
                                        style={{
                                            background: "var(--background-surface)",
                                            padding: "1rem",
                                        }}
                                    >
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
                                                title={paste.PubDate}
                                            >
                                                {paste.PubDate}
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
    async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        // return 404 if comments are disabled
        if (EntryDB.config.app && EntryDB.config.app.enable_comments !== true)
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

        // no cross-server commenting (for now)
        if (result.HostServer) return new _404Page().request(request);

        // get comments
        const comments = await EntryDB.Logs.QueryLogs(
            `Type = "comment" AND Content LIKE "${result.CustomURL};%" LIMIT 100`
        );

        const CommentPastes: Partial<Paste>[] = [];

        for (const comment of comments[2]) {
            // get paste
            const paste = await db.GetPasteFromURL(comment.Content.split(";")[1]);

            // make sure comment paste exists
            if (!paste) {
                // deleted comment
                CommentPastes.push({
                    CustomURL: "",
                    PubDate: new Date().toUTCString(),
                    Content: "[comment deleted]",
                    Views: -1,
                });

                continue;
            }

            // push comment
            CommentPastes.push(paste);
        }

        // ...
        function CommentsNav() {
            return (
                <>
                    <h1
                        style={{
                            width: "100%",
                        }}
                    >
                        {result.CustomURL}
                    </h1>

                    <hr />

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
                        <a href={`/${result.CustomURL}`} class={"button"}>
                            View Paste
                        </a>

                        <a href={"javascript:history.back()"} class={"button"}>
                            Back
                        </a>
                    </div>

                    <hr />

                    <div
                        class={"mdnote note-warn"}
                        style={{
                            marginBottom: "0.5rem",
                        }}
                    >
                        <b class={"mdnote-title"}>This is a beta feature!</b>
                        <p>
                            Things might change quickly or comments may be deleted!
                            If you find any bugs, please report them{" "}
                            <a href="https://codeberg.org/hkau/entry/issues">here</a>
                            !
                        </p>
                    </div>

                    <div
                        class={"mdnote note-warn"}
                        style={{
                            marginBottom: "0.5rem",
                        }}
                    >
                        <b class={"mdnote-title"}>
                            At this time, this page only shows 100 comments.
                        </b>
                    </div>
                </>
            );
        }

        // return
        return new Response(
            Renderer.Render(
                <div class="sidebar-layout-wrapper">
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

                    <div className="tab-container editor-tab page-content">
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                            }}
                        >
                            <span>
                                <b>{CommentPastes.length}</b> comment
                                {CommentPastes.length > 1
                                    ? "s"
                                    : CommentPastes.length === 1
                                    ? ""
                                    : "s"}
                            </span>

                            <a
                                href={`/?CommentOn=${result.CustomURL}`}
                                className="button secondary"
                            >
                                Add Comment
                            </a>
                        </div>

                        <hr />

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                            }}
                        >
                            {search.get("msg") && (
                                <div
                                    class={"mdnote note-note"}
                                    style={{
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <b class={"mdnote-title"}>Application Message</b>
                                    <p>{decodeURIComponent(search.get("msg")!)}</p>
                                </div>
                            )}

                            {CommentPastes.map((comment) => (
                                <div
                                    style={{
                                        background: "var(--background-surface)",
                                        padding: "1rem",
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
                                                {comment.PubDate}
                                            </b>
                                        </li>

                                        <li
                                            style={{
                                                color: "var(--text-color-faded)",
                                            }}
                                        >
                                            {comment.Views} view
                                            {comment.Views! > 1
                                                ? "s"
                                                : comment.Views === 1
                                                ? ""
                                                : "s"}
                                        </li>

                                        <li>
                                            <a
                                                href={`/${comment.CustomURL}`}
                                                target={"_blank"}
                                            >
                                                open
                                            </a>
                                        </li>
                                    </ul>

                                    <div
                                        style={{
                                            maxHeight: "20rem",
                                            overflow: "auto",
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: ParseMarkdownSync(
                                                comment.Content!
                                            ),
                                        }}
                                    />

                                    {comment.Comments !== 0 && (
                                        <div>
                                            <hr />

                                            <a
                                                href={`/paste/comments/${comment.CustomURL}`}
                                            >
                                                View <b>{comment.Comments}</b>{" "}
                                                comment
                                                {comment.Comments! > 1
                                                    ? "s"
                                                    : comment.Comments === 1
                                                    ? ""
                                                    : "s"}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                <>
                    <title>Paste Comments</title>
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Cache-Control": "max-age=0, must-revalidate", // page might change too much for it to be cached!
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
};
