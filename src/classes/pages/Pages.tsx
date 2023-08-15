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

import { Config } from "../..";
let config: Config;

import {
    VerifyContentType,
    DecryptPaste,
    Session,
    DefaultHeaders,
    GetCookie,
    PageHeaders,
} from "./API";

// ...
import { ParseMarkdown } from "./components/Markdown";
import SearchForm from "./components/form/SearchForm";

// ...

/**
 * @export
 * @class GetPasteFromURL
 * @implements {Endpoint}
 */
export class GetPasteFromURL implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);
        config = (await EntryDB.GetConfig()) as Config;

        // force https
        if (
            EntryDB.config.force_https === true &&
            url.hostname !== "localhost" &&
            url.protocol === "http:"
        )
            return new Response("Please use HTTPS", {
                status: 301,
                headers: {
                    Location: url.href.replace("http:", "https:"),
                },
            });

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/dec/")) name = name.split("paste/dec/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;

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
        if (result && !result.HostServer) {
            const SessionCookieValue = GetCookie(
                request.headers.get("Cookie") || "",
                "session-id"
            );

            if (
                SessionCookieValue &&
                config.log &&
                config.log.events.includes("view_paste") &&
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
        if (!result || !editable[0])
            // show 404 because paste does not exist
            return new _404Page().request(request);
        else
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
                                            You cannot edit or delete your paste if
                                            you don't have your edit password. Please
                                            save it somewhere safe:{" "}
                                            <code>
                                                {search.get("UnhashedEditPassword")}
                                            </code>
                                        </p>
                                    </div>
                                )}

                            {result.ViewPassword && (
                                <DecryptionForm paste={result} />
                            )}

                            {config.app &&
                                config.app.info &&
                                config.app.info === result.CustomURL && (
                                    <div
                                        class="mdnote note-info"
                                        style={{
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <b className="mdnote-title">
                                            Information Page
                                        </b>

                                        <p>
                                            This page will provide information about
                                            the server and current announcements.{" "}
                                            <b>
                                                It is maintained by server
                                                administrators.
                                            </b>
                                        </p>
                                    </div>
                                )}

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
                                        }}
                                    >
                                        {editable[2] === true && (
                                            <a
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
                                                <button
                                                    style={{
                                                        height: "max-content",
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            </a>
                                        )}

                                        {result.GroupName && (
                                            <a
                                                href={`/search?q=${
                                                    result.GroupName
                                                }%2F&group=${result.GroupName}${
                                                    // add host server (if it exists)
                                                    result.HostServer
                                                        ? `:${result.HostServer}`
                                                        : ""
                                                }`}
                                            >
                                                <button
                                                    style={{
                                                        height: "max-content",
                                                    }}
                                                >
                                                    View Group
                                                </button>
                                            </a>
                                        )}

                                        <details>
                                            <summary
                                                style={{
                                                    fontWeight: "normal",
                                                }}
                                            >
                                                Export
                                            </summary>

                                            <div
                                                class={
                                                    "details-flex-content-list-box"
                                                }
                                            >
                                                <a
                                                    class={"button secondary"}
                                                    target={"_blank"}
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                    href={`/api/raw/${
                                                        result.CustomURL
                                                    }${
                                                        // add host server (if it exists)
                                                        result.HostServer
                                                            ? `:${result.HostServer}`
                                                            : ""
                                                    }`}
                                                >
                                                    Raw
                                                </a>

                                                <a
                                                    class={"button secondary"}
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                    href={`/api/html/${
                                                        result.CustomURL
                                                    }${
                                                        // add host server (if it exists)
                                                        result.HostServer
                                                            ? `:${result.HostServer}`
                                                            : ""
                                                    }`}
                                                    target={"_blank"}
                                                >
                                                    HTML
                                                </a>
                                            </div>
                                        </details>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "right",
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

                                        {config.log &&
                                            config.log.events.includes(
                                                "view_paste"
                                            ) && <span>Views: {result.Views}</span>}
                                    </div>
                                </div>
                            </div>

                            <Footer />
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
 * @class PastesSearch
 * @implements {Endpoint}
 */
export class PastesSearch implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        if (!config) config = (await EntryDB.GetConfig()) as Config;

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
                            content={`Search Pastes on ${config.name} - A Markdown Pastebin`}
                        ></meta>

                        <title>Search Pastes</title>
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
        }
    }
}

// default export
export default {
    GetPasteFromURL,
    PastesSearch,
};
