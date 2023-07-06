/**
 * @file Handle Admin endpoints
 * @name Admin.tsx
 * @license MIT
 */

import { FormDataToJSON } from "../Server";
import Endpoint from "./_Endpoint";
import Renderer from "./_Render";

import EntryDB from "../db/EntryDB";
import { db } from "./API";

import Footer from "./components/Footer";

const config = await EntryDB.GetConfig();

/**
 * @function AdminNav
 *
 * @param {{ active: string }} props
 * @return {*}
 */
function AdminNav(props: { active: string; pass: string }) {
    return (
        <>
            <h1
                style={{
                    width: "100%",
                }}
            >
                Entry Admin
            </h1>

            <div
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.4rem",
                }}
            >
                <form action="/admin/manage-pastes" method="POST">
                    <input
                        type="hidden"
                        required
                        name="AdminPassword"
                        value={props.pass}
                    />

                    <button class={props.active === "pastes" ? "active" : ""}>
                        Manage Pastes
                    </button>
                </form>

                <a href="https://codeberg.org/hkau/entry">
                    <button>View Source</button>
                </a>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `button { background: var(--background-surface); }
                    button.active { box-shadow: 0 0 1px var(--blue2); }`,
                }}
            />

            <hr />
        </>
    );
}

export class Login implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // we aren't actually using a login system, it's just a form for the configured
        // server admin password

        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <form
                            action="/admin/manage-pastes"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                            method={"POST"}
                        >
                            <button>Go</button>

                            <input
                                type="password"
                                name={"AdminPassword"}
                                required
                                placeholder={"Password"}
                            />
                        </form>

                        <Footer />
                    </main>
                </>,
                <>
                    <title>Entry Admin</title>
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
 * @class ManagePastes
 * @implements {Endpoint}
 */
export class ManagePastes implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // get request body
        const body = FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // fetch all pastes
        const pastes = await db.GetAllPastes(true); // include encrypted pastes

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <div className="tab-container editor-tab">
                            <AdminNav
                                active="pastes"
                                pass={body.AdminPassword}
                            />

                            <table
                                style={{
                                    width: "100%",
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>Custom URL</th>
                                        <th>Publish Date</th>
                                        <th>Edit Date</th>
                                        <th>Private</th>
                                        <th>Open</th>
                                        <th>Delete</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pastes.map((paste) => {
                                        return (
                                            <tr>
                                                <td
                                                    style={{
                                                        maxWidth: "5rem",
                                                        textOverflow:
                                                            "ellipsis",
                                                        overflow: "hidden",
                                                        overflowWrap: "normal",
                                                        wordBreak: "normal",
                                                    }}
                                                >
                                                    {paste.CustomURL}
                                                </td>

                                                <td>{paste.PubDate}</td>
                                                <td>{paste.EditDate}</td>
                                                <td>
                                                    {paste.ViewPassword ===
                                                    "exists"
                                                        ? "yes"
                                                        : "no"}
                                                </td>

                                                <td>
                                                    <a
                                                        href={`/${paste.CustomURL}`}
                                                        target="_blank"
                                                    >
                                                        View Paste
                                                    </a>
                                                </td>

                                                <td>
                                                    <form
                                                        action="/admin/api/delete"
                                                        method={"POST"}
                                                    >
                                                        <input
                                                            type="hidden"
                                                            required
                                                            name="AdminPassword"
                                                            value={
                                                                body.AdminPassword
                                                            }
                                                        />

                                                        <input
                                                            type="hidden"
                                                            required
                                                            name={"CustomURL"}
                                                            value={
                                                                paste.CustomURL
                                                            }
                                                        />

                                                        <button>
                                                            Delete Paste
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <Footer />
                    </main>

                    <style
                        dangerouslySetInnerHTML={{
                            __html: `tr { text-align: center; }
                            th { min-width: max-content; }
                            form button { margin: auto; }`,
                        }}
                    />
                </>,
                <>
                    <title>Entry Admin</title>
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
 * @class APIDeletePaste
 * @implements {Endpoint}
 */
export class APIDeletePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // this is the same code as API.DeletePaste, but it requires body.AdminPassword
        // NOTE: API.DeletePaste CAN take the admin password in the normal "password" field,
        //       and it will still work the same!!!
        // this endpoint is just use to redirect to /admin/login instead of /

        // get request body
        const body = FormDataToJSON(await request.formData()) as any;

        // delete paste
        const result = await db.DeletePaste(
            {
                CustomURL: body.CustomURL,
            },
            body.AdminPassword
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to home
                          `/admin/login`
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
    Login,
    ManagePastes,
    APIDeletePaste,
};
