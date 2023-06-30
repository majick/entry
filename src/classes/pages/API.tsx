/**
 * @file Handle API endpoints
 * @name API.ts
 * @license MIT
 */

import { FormDataToJSON } from "../Server";
import Endpoint from "./_Endpoint";
import Renderer from "./_Render";

// import components
import _404Page from "./components/404";
import Footer from "./components/Footer";

// create database
import EntryDB, { Paste } from "../db/EntryDB";
export const db = new EntryDB();

// ...
import { ParseMarkdown } from "./components/Markdown";
import "./assets/ClientFixMD";

/**
 * @export
 * @class CreatePaste
 * @implements {Endpoint}
 */
export class CreatePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // get request body
        const body = FormDataToJSON(await request.formData()) as Paste;
        body.Content = decodeURIComponent(body.Content);

        // create paste
        const result = await db.CreatePaste(body);

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          `/${result[2].CustomURL}`
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

        // get paste name
        const name = url.pathname.slice(1, url.pathname.length);

        // attempt to get paste
        const result = await db.GetPasteFromURL(name);

        // we could quickly implement private pastes right here, but I'm not going to yet (TODO)

        // return
        if (!result)
            // show 404 because paste does not exist
            return new _404Page().request(request);
        else
            return new Response(
                Renderer.Render(
                    <>
                        <main>
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
                                        __html: ParseMarkdown(result.Content),
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    marginTop: "0.5rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignContent: "center",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: "0.4rem",
                                        width: "100%",
                                    }}
                                >
                                    <a
                                        href={`/?mode=edit&OldURL=${
                                            result.CustomURL
                                        }${
                                            result.HostServer
                                                ? `&server=${result.HostServer}`
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

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            alignItems: "right",
                                            color: "var(--text-color-faded)",
                                        }}
                                    >
                                        <span>Pub: {result.PubDate}</span>
                                        <span>Edit: {result.EditDate}</span>
                                    </div>
                                </div>
                            </div>

                            <Footer />
                        </main>

                        <script
                            // P.S. I hate this
                            type="module"
                            dangerouslySetInnerHTML={{
                                __html: `import fix from "/ClientFixMD.js"; fix();`,
                            }}
                        />
                    </>,
                    <>
                        <meta
                            name="description"
                            content={
                                // if length of content is greater than 250, cut it at 250 characters and add "..."
                                // otherwise, we can just show the full content
                                result.CustomURL.length > 250
                                    ? `${result.CustomURL.substring(0, 250)}...`
                                    : result.CustomURL
                            }
                        />

                        <title>{result.CustomURL}</title>
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

/**
 * @export
 * @class GetPasteRecord
 * @implements {Endpoint}
 */
export class GetPasteRecord implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get paste
        const paste = await db.GetPasteFromURL(
            url.pathname.slice("/api/get/".length, url.pathname.length)
        );

        if (paste) paste.EditPassword = ""; // we don't want to send that back to the client! (it's hashed anyways, but good to be sure)

        // return
        return new Response(
            JSON.stringify(paste || { Content: "404: Not Found" }),
            {
                status: paste ? 200 : 404,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
}

/**
 * @export
 * @class EditPaste
 * @implements {Endpoint}
 */
export class EditPaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // get request body
        const body = FormDataToJSON(await request.formData()) as any;
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
            }
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          `/${result[2].CustomURL}`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(
                              result[1]
                          )}&mode=edit&OldURL=${result[2].CustomURL}`,
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
        // get request body
        const body = FormDataToJSON(await request.formData()) as any;
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
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to home
                          `/?msg=${encodeURIComponent(result[1])}`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(
                              result[1]
                          )}&mode=edit&OldURL=${result[2].CustomURL}`,
            },
        });
    }
}

// default export
export default {
    CreatePaste,
    GetPasteFromURL,
    GetPasteRecord,
    EditPaste,
    DeletePaste,
};
