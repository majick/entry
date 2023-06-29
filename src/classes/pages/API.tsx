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
                                        gap: "0.4rem",
                                    }}
                                >
                                    <button>
                                        <a
                                            href={`/?mode=edit&OldURL=${result.CustomURL}`}
                                        >
                                            Edit
                                        </a>
                                    </button>
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
                            content={`${result.CustomURL} on Entry - Markdown Pastebin`}
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
 * @class EditPaste
 * @implements {Endpoint}
 */
export class EditPaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // get request body
        const body = FormDataToJSON(await request.formData()) as any;
        body.OldContent = decodeURIComponent(body.OldContent);
        body.NewContent = decodeURIComponent(body.NewContent);

        // edit paste
        const result = await db.EditPaste(
            {
                Content: body.OldContent,
                EditPassword: body.OldEditPassword,
                CustomURL: body.OldURL,
            },
            {
                Content: body.NewContent,
                EditPassword: body.NewEditPassword || body.OldEditPassword,
                CustomURL: body.NewURL || body.OldURL,
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
                // these fields aren't actually needed (below), as they aren't used
                // by the function. password is supplied in the second parameter
                Content: "",
                EditPassword: "",
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
    EditPaste,
    DeletePaste,
};
