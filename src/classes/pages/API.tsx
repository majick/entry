/**
 * @file Handle API endpoints
 * @name API.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";

// import components
import DecryptionForm from "./components/form/DecryptionForm";
import _404Page from "./components/404";
import Footer from "./components/Footer";
import Home from "./Home";

// create database
import { CreateHash, Decrypt } from "../db/Hash";
import EntryDB, { Paste } from "../db/EntryDB";
export const db = new EntryDB();

import pack from "../../../package.json";

import { Config } from "../..";
let config: Config;

// ...
import { ParseMarkdown } from "./components/Markdown";
import PasteList from "./components/PasteList";

// headers
export const DefaultHeaders = {
    "Cache-Control": "public, max-age=604800, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    Vary: "Accept-Encoding",
};

export const PageHeaders = {
    "Cache-Control": "private",
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
};

/**
 * @function VerifyContentType
 *
 * @export
 * @param {Request} request
 * @param {string} expected
 * @return {(Response | undefined)}
 */
export function VerifyContentType(
    request: Request,
    expected: string
): Response | undefined {
    // verify content type
    if (request.headers.get("Content-Type") !== expected)
        return new Response(`Expected ${expected}`, {
            status: 406,
            headers: {
                ...DefaultHeaders,
                Accept: expected,
            },
        });

    // return undefined if it is fine
    return undefined;
}

/**
 * @export
 * @class WellKnown
 * @implements {Endpoint}
 */
export class WellKnown implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        function ReturnJSON(json: { [key: string]: any }): Response {
            return new Response(JSON.stringify(json), {
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }

        // nodeinfo
        if (url.pathname === "/.well-known/nodeinfo")
            return ReturnJSON({
                links: [
                    {
                        rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
                        href: `${url.origin}/.well-known/nodeinfo/2.0`,
                    },
                ],
            });
        else if (url.pathname === "/.well-known/nodeinfo/2.0")
            return ReturnJSON({
                version: "2.0",
                software: {
                    name: "entry",
                    version: pack.version,
                },
                protocols: ["entry"],
                services: {
                    outbound: [],
                    inbound: [],
                },
                usage: {
                    users: {
                        // entry is completely anonymous, user count is forever 0
                        total: 0,
                        activeMonth: 0,
                        activeHalfyear: 0,
                    },
                    // this, however, we can supply
                    localPosts: (
                        await db.GetAllPastes(true, true, "CustomURL IS NOT NULL")
                    ).length,
                },
                openRegistrations: false, // there is no registration at all
                metadata: {},
            });

        // default
        return new _404Page().request(request);
    }
}

/**
 * @export
 * @class CreatePaste
 * @implements {Endpoint}
 */
export class CreatePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as Paste;
        body.Content = decodeURIComponent(body.Content);

        // create paste
        const result = await db.CreatePaste(body);

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          `/${result[2].CustomURL}?UnhashedEditPassword=${result[2].UnhashedEditPassword}`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}`,
            },
        });
    }
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

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length);
        if (name.startsWith("paste/dec/")) name = name.split("paste/dec/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request);

        // attempt to get paste
        const result = await db.GetPasteFromURL(name);

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
                                    <div class="mdnote">
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
                                                    result.CustomURL
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
                                                href={`/group/${result.GroupName}${
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
                        "Cache-Control": "private",
                        "X-Content-Type-Options": "nosniff",
                        Vary: "Accept-Encoding",
                        "Content-Type": "text/html",
                    },
                }
            );
    }
}

/**
 * @export
 * @class GetPasteRecord
 * @implements {Endpoint}
 */
export class GetPasteRecord implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get paste
        let paste = await db.GetPasteFromURL(
            url.pathname.slice("/api/get/".length, url.pathname.length)
        );

        if (paste) paste = db.CleanPaste(paste); // <- this is VERY important, we don't want to send passwords back!!!

        // return
        return new Response(JSON.stringify(paste || { Content: "404: Not Found" }), {
            status: paste ? 200 : 404,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class EditPaste
 * @implements {Endpoint}
 */
export class EditPaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        body.OldContent = decodeURIComponent(body.OldContent);
        body.NewContent = decodeURIComponent(body.NewContent);

        // get paste
        const paste = await db.GetPasteFromURL(body.OldURL);

        // edit paste
        const result = await db.EditPaste(
            {
                Content: body.OldContent,
                EditPassword: body.OldEditPassword,
                CustomURL: body.OldURL,
                PubDate: "",
                EditDate: "",
            },
            {
                Content: body.NewContent,
                EditPassword: body.NewEditPassword || body.OldEditPassword,
                CustomURL: body.NewURL || body.OldURL,
                PubDate: (paste || { PubDate: "" }).PubDate,
                EditDate: new Date().toUTCString(),
                ViewPassword: (paste || { ViewPassword: "" }).ViewPassword,
            }
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          `/${result[2].CustomURL}`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}&mode=edit&OldURL=${
                              result[2].CustomURL
                          }`,
            },
        });
    }
}

/**
 * @export
 * @class DeletePaste
 * @implements {Endpoint}
 */
export class DeletePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        // body.password is automatically hashed in db.DeletePaste

        // delete paste
        const result = await db.DeletePaste(
            {
                CustomURL: body.CustomURL,
            },
            body.password
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to home
                          `/?msg=${encodeURIComponent(result[1])}`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}&mode=edit&OldURL=${
                              result[2].CustomURL
                          }`,
            },
        });
    }
}

/**
 * @function DecryptPaste
 *
 * @export
 * @class DecryptPaste
 * @implements {Endpoint}
 */
export class DecryptPaste implements Endpoint {
    public async GetDecrypted(body: Partial<Paste>): Promise<string | undefined> {
        if (!body.CustomURL) return undefined;

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return undefined;

        // get encryption information
        const enc = await db.GetEncryptionInfo(
            CreateHash(body.ViewPassword || ""),
            body.CustomURL
        );

        if (!enc[0]) return undefined;

        // decrypt and return
        return Decrypt(paste.Content, enc[1].key, enc[1].iv, enc[1].auth);
    }

    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as Paste;

        // get decrypted
        const decrypted = await this.GetDecrypted(body);
        if (!decrypted)
            return new Response("Failed to decrypt", {
                status: 400,
            });

        // return
        return new Response(decrypted);
    }
}

/**
 * @export
 * @class GetAllPastes
 * @implements {Endpoint}
 */
export class GetAllPastes implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // get pastes
        const pastes = await db.GetAllPastes();

        // return
        return new Response(JSON.stringify(pastes), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class GetAllPastesInGroup
 * @implements {Endpoint}
 */
export class GetAllPastesInGroup implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get pastes
        const pastes = await db.GetAllPastesInGroup(
            // if no group is provided this will return all pastes with no group
            url.pathname.slice("/api/group/".length, url.pathname.length) || ""
        );

        // return
        return new Response(JSON.stringify(pastes), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class GetAllPastesInGroupPage
 * @implements {Endpoint}
 */
export class GetAllPastesInGroupPage implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const group = url.pathname.slice("/group/".length, url.pathname.length);

        if (!config) config = (await EntryDB.GetConfig()) as Config;

        // get pastes
        const pastes = await db.GetAllPastesInGroup(
            // if no group is provided this will return all pastes with no group
            group || ""
        );

        // return
        if (pastes.length === 0 || !pastes || !group)
            // show 404 because group does not exist
            return new _404Page().request(request);
        else
            return new Response(
                Renderer.Render(
                    <>
                        <main>
                            <div className="tab-container editor-tab">
                                <h1
                                    style={{
                                        display: "flex",
                                        gap: "1rem",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="48"
                                        height="48"
                                        aria-label={"Open Folder Filled Symbol"}
                                    >
                                        <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13a1 1 0 0 1 1 1v.5H2.75a.75.75 0 0 0 0 1.5h11.978a1 1 0 0 1 .994 1.117L15 13.25A1.75 1.75 0 0 1 13.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75c0-.464.184-.91.513-1.237Z"></path>
                                    </svg>

                                    <span>{group.split(":")[0]}</span>
                                </h1>

                                <PasteList Pastes={pastes} />
                            </div>

                            <Footer />
                        </main>

                        <style
                            dangerouslySetInnerHTML={{
                                __html: `form button { margin: auto; }`,
                            }}
                        />
                    </>,
                    <>
                        <meta
                            name="description"
                            content={`View pastes in groups/${group} on ${config.name} - A Markdown Pastebin`}
                        ></meta>

                        <title>Pastes in {group || "No Group"}</title>
                    </>
                ),
                {
                    headers: {
                        ...DefaultHeaders,
                        "Content-Type": "text/html",
                    },
                }
            );
    }
}

/**
 * @export
 * @class GetRawPaste
 * @implements {Endpoint}
 */
export class GetRawPaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // get paste name
        const name = url.pathname.slice("/api/raw/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste
        const result = await db.GetPasteFromURL(name);

        // return
        return new Response(result!.Content, {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }
}

/**
 * @export
 * @class RenderMarkdown
 * @implements {Endpoint}
 */
export class RenderMarkdown implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "text/markdown");

        if (WrongType) return WrongType;

        // get request body
        const body = await request.text();

        // render
        const rendered = await ParseMarkdown(body);

        // return
        return new Response(rendered, {
            status: 200,
            headers: {
                "Content-Type": "text/html",
            },
        });
    }
}

/**
 * @export
 * @class GetPasteHTML
 * @implements {Endpoint}
 */
export class GetPasteHTML implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get paste name
        const name = url.pathname.slice("/api/html/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste
        const result = await db.GetPasteFromURL(name);
        if (!result) return new _404Page().request(request);

        result.Content = `<comment>
            HTML export includes a reference to the Entry stylesheet for styles (/style.css)
            You can take that too by copying the contents of https://www.sentrytwo.com/style.css into
            a style tag in the head of this document, instead of the link to the stylesheet
        </comment>\n${result.Content}`;

        // render
        const rendered = Renderer.Render(
            <div
                dangerouslySetInnerHTML={{
                    __html: await ParseMarkdown(result.Content),
                }}
            />,
            <>
                <title>{result.CustomURL}</title>
            </>
        );

        // return
        return new Response(rendered, {
            status: 200,
            headers: {
                "Content-Type": "text/html",
            },
        });
    }
}

// default export
export default {
    DefaultHeaders,
    VerifyContentType,
    WellKnown,
    CreatePaste,
    GetPasteFromURL,
    GetPasteRecord, // json form of the page (previous)
    EditPaste,
    DeletePaste,
    DecryptPaste,
    GetAllPastes,
    GetAllPastesInGroup,
    GetAllPastesInGroupPage, // html form of the api (previous)
    GetRawPaste,
    RenderMarkdown,
    GetPasteHTML,
};
