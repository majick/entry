/**
 * @file Handle Admin endpoints
 * @name Admin.tsx
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";

import { VerifyContentType, db, DefaultHeaders, PageHeaders } from "./API";
import { Decrypt } from "../db/helpers/Hash";
import EntryDB from "../db/EntryDB";

import PasteList from "./components/PasteList";
import Footer from "./components/Footer";

import { Config } from "../..";
import Checkbox from "./components/form/Checkbox";
let config: Config;

/**
 * @function AdminNav
 *
 * @param {{ active: string }} props
 * @return {*}
 */
function AdminNav(props: { active: string; pass: string }): any {
    return (
        <>
            <h1
                style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                    width: "100%",
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="48"
                    height="48"
                    aria-label={"Server Symbol"}
                >
                    <path d="M10.75 6.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5ZM6 7.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 6 7.25Zm4 9a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Zm-3.25-.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z"></path>
                    <path d="M3.25 2h17.5c.966 0 1.75.784 1.75 1.75v7c0 .372-.116.716-.314 1 .198.284.314.628.314 1v7a1.75 1.75 0 0 1-1.75 1.75H3.25a1.75 1.75 0 0 1-1.75-1.75v-7c0-.358.109-.707.314-1a1.741 1.741 0 0 1-.314-1v-7C1.5 2.784 2.284 2 3.25 2Zm0 10.5a.25.25 0 0 0-.25.25v7c0 .138.112.25.25.25h17.5a.25.25 0 0 0 .25-.25v-7a.25.25 0 0 0-.25-.25Zm0-1.5h17.5a.25.25 0 0 0 .25-.25v-7a.25.25 0 0 0-.25-.25H3.25a.25.25 0 0 0-.25.25v7c0 .138.112.25.25.25Z"></path>
                </svg>

                <span>{config.name} Admin</span>
            </h1>

            <div
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.4rem",
                    flexWrap: "wrap",
                }}
            >
                <form action="/admin/manage-pastes" method="POST">
                    <input
                        type="hidden"
                        required
                        name="AdminPassword"
                        value={props.pass}
                    />

                    <button
                        class={`secondary${
                            props.active === "pastes" ? " active" : ""
                        }`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Database Symbol"}
                        >
                            <path d="M1 3.5c0-.626.292-1.165.7-1.59.406-.422.956-.767 1.579-1.041C4.525.32 6.195 0 8 0c1.805 0 3.475.32 4.722.869.622.274 1.172.62 1.578 1.04.408.426.7.965.7 1.591v9c0 .626-.292 1.165-.7 1.59-.406.422-.956.767-1.579 1.041C11.476 15.68 9.806 16 8 16c-1.805 0-3.475-.32-4.721-.869-.623-.274-1.173-.62-1.579-1.04-.408-.426-.7-.965-.7-1.591Zm1.5 0c0 .133.058.318.282.551.227.237.591.483 1.101.707C4.898 5.205 6.353 5.5 8 5.5c1.646 0 3.101-.295 4.118-.742.508-.224.873-.471 1.1-.708.224-.232.282-.417.282-.55 0-.133-.058-.318-.282-.551-.227-.237-.591-.483-1.101-.707C11.102 1.795 9.647 1.5 8 1.5c-1.646 0-3.101.295-4.118.742-.508.224-.873.471-1.1.708-.224.232-.282.417-.282.55Zm0 4.5c0 .133.058.318.282.551.227.237.591.483 1.101.707C4.898 9.705 6.353 10 8 10c1.646 0 3.101-.295 4.118-.742.508-.224.873-.471 1.1-.708.224-.232.282-.417.282-.55V5.724c-.241.15-.503.286-.778.407C11.475 6.68 9.805 7 8 7c-1.805 0-3.475-.32-4.721-.869a6.15 6.15 0 0 1-.779-.407Zm0 2.225V12.5c0 .133.058.318.282.55.227.237.592.484 1.1.708 1.016.447 2.471.742 4.118.742 1.647 0 3.102-.295 4.117-.742.51-.224.874-.47 1.101-.707.224-.233.282-.418.282-.551v-2.275c-.241.15-.503.285-.778.406-1.247.549-2.917.869-4.722.869-1.805 0-3.475-.32-4.721-.869a6.327 6.327 0 0 1-.779-.406Z"></path>
                        </svg>{" "}
                        Manage Pastes
                    </button>
                </form>

                <form action="/admin/export" method="POST">
                    <input
                        type="hidden"
                        required
                        name="AdminPassword"
                        value={props.pass}
                    />

                    <button
                        class={`secondary${
                            props.active === "export" ? " active" : ""
                        }`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Download Symbol"}
                        >
                            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path>
                        </svg>{" "}
                        Export/Import
                    </button>
                </form>

                <form action="/admin/logs" method="POST">
                    <input
                        type="hidden"
                        required
                        name="AdminPassword"
                        value={props.pass}
                    />

                    <button
                        class={`secondary${
                            props.active === "logs" ? " active" : ""
                        }`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Logs Symbol"}
                        >
                            <path d="M5 8.25a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 5 8.25ZM4 10.5A.75.75 0 0 0 4 12h4a.75.75 0 0 0 0-1.5H4Z"></path>
                            <path d="M13-.005c1.654 0 3 1.328 3 3 0 .982-.338 1.933-.783 2.818-.443.879-1.028 1.758-1.582 2.588l-.011.017c-.568.853-1.104 1.659-1.501 2.446-.398.789-.623 1.494-.623 2.136a1.5 1.5 0 1 0 2.333-1.248.75.75 0 0 1 .834-1.246A3 3 0 0 1 13 16H3a3 3 0 0 1-3-3c0-1.582.891-3.135 1.777-4.506.209-.322.418-.637.623-.946.473-.709.923-1.386 1.287-2.048H2.51c-.576 0-1.381-.133-1.907-.783A2.68 2.68 0 0 1 0 2.995a3 3 0 0 1 3-3Zm0 1.5a1.5 1.5 0 0 0-1.5 1.5c0 .476.223.834.667 1.132A.75.75 0 0 1 11.75 5.5H5.368c-.467 1.003-1.141 2.015-1.773 2.963-.192.289-.381.571-.558.845C2.13 10.711 1.5 11.916 1.5 13A1.5 1.5 0 0 0 3 14.5h7.401A2.989 2.989 0 0 1 10 13c0-.979.338-1.928.784-2.812.441-.874 1.023-1.748 1.575-2.576l.017-.026c.568-.853 1.103-1.658 1.501-2.448.398-.79.623-1.497.623-2.143 0-.838-.669-1.5-1.5-1.5Zm-10 0a1.5 1.5 0 0 0-1.5 1.5c0 .321.1.569.27.778.097.12.325.227.74.227h7.674A2.737 2.737 0 0 1 10 2.995c0-.546.146-1.059.401-1.5Z"></path>
                        </svg>{" "}
                        Logs
                    </button>
                </form>

                <a href="https://codeberg.org/hkau/entry" class={"button secondary"}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Code Symbol"}
                    >
                        <path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"></path>
                    </svg>{" "}
                    View Source
                </a>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: "button.active { box-shadow: 0 0 1px var(--blue2); }",
                }}
            />

            <hr />
        </>
    );
}

/**
 * @export
 * @class Login
 * @implements {Endpoint}
 */
export class Login implements Endpoint {
    public async request(request: Request): Promise<Response> {
        if (!config) config = (await EntryDB.GetConfig()) as Config;

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
                            <input
                                type="password"
                                name={"AdminPassword"}
                                required
                                placeholder={"Password"}
                            />

                            <button>Go</button>
                        </form>

                        <Footer />
                    </main>
                </>,
                <>
                    <title>{config.name} Admin</title>
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
 * @class ManagePastes
 * @implements {Endpoint}
 */
export class ManagePastes implements Endpoint {
    public async request(request: Request): Promise<Response> {
        if (!config) config = (await EntryDB.GetConfig()) as Config;

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // log event (only on first access)
        const RefURL = new URL(request.headers.get("Referer")!);

        if (
            (request.headers.get("Referer") && RefURL.pathname === "/admin") ||
            RefURL.pathname === "/admin/" ||
            RefURL.pathname === "/admin/login" ||
            RefURL.pathname === "/admin/login/"
        )
            await EntryDB.Logs.CreateLog({
                Content: request.headers.get("User-Agent") || "?",
                Type: "access_admin",
            });

        // fetch all pastes
        const pastes = await db.GetAllPastes(true, false, body.sql);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <div
                            className="tab-container editor-tab"
                            style={{
                                height: "min-content",
                                maxHeight: "85vh",
                            }}
                        >
                            <AdminNav active="pastes" pass={body.AdminPassword} />

                            <p>
                                <b>Direct SQL</b>
                            </p>

                            <div>
                                <form
                                    action="/admin/api/sql"
                                    method={"POST"}
                                    target={"_blank"}
                                    style={{
                                        display: "flex",
                                        gap: "0.5rem",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        required
                                        name="AdminPassword"
                                        value={body.AdminPassword}
                                    />

                                    <input
                                        type="text"
                                        name={"sql"}
                                        id={"sql"}
                                        placeholder={
                                            "SELECT * FROM Pastes LIMIT 100"
                                        }
                                        className="secondary"
                                        autoComplete={"off"}
                                        style={{
                                            width: "40rem",
                                        }}
                                    />

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            flexWrap: "wrap",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Checkbox
                                            name="get"
                                            title="get"
                                            label={true}
                                            secondary={true}
                                        />

                                        <Checkbox
                                            name="all"
                                            title="all"
                                            label={true}
                                            secondary={true}
                                        />

                                        <Checkbox
                                            name="cache"
                                            title="cache"
                                            label={true}
                                            secondary={true}
                                            disabled
                                        />

                                        <button class={"secondary"}>Query</button>
                                    </div>
                                </form>
                            </div>

                            <hr />

                            <p>
                                <b>Paste Search</b>
                            </p>

                            <PasteList
                                Pastes={pastes}
                                ShowDelete={true}
                                AdminPassword={body.AdminPassword}
                                Selector={
                                    body.sql || "CustomURL IS NOT NULL LIMIT 1000"
                                }
                            />
                        </div>

                        <Footer />
                    </main>
                </>,
                <>
                    <title>{config.name} Admin</title>
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
 * @class QueryPastesPage
 * @implements {Endpoint}
 */
export class QueryPastesPage implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin || !body.sql)
            return new Login().request(request);

        // get pastes
        const pastes = await db.GetAllPastes(true, false, body.sql);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <div
                            className="tab-container editor-tab"
                            style={{
                                height: "min-content",
                                maxHeight: "85vh",
                            }}
                        >
                            <AdminNav active="pastes" pass={body.AdminPassword} />

                            <PasteList
                                Pastes={pastes}
                                ShowDelete={true}
                                AdminPassword={body.AdminPassword}
                            />
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
                    <title>{config.name} Admin</title>
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
 * @class APIDeletePaste
 * @implements {Endpoint}
 */
export class APIDeletePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // this is the same code as API.DeletePaste, but it requires body.AdminPassword
        // NOTE: API.DeletePaste CAN take the admin password in the normal "password" field,
        //       and it will still work the same!!!
        // this endpoint is just use to redirect to /admin/login instead of /

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

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
                ...DefaultHeaders,
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to home
                          `/admin/login`
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
 * @class ExportPastesPage
 * @implements {Endpoint}
 */
export class ExportPastesPage implements Endpoint {
    public async request(request: Request): Promise<Response> {
        if (!config) config = (await EntryDB.GetConfig()) as Config;

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <div className="tab-container editor-tab">
                            <AdminNav active="export" pass={body.AdminPassword} />

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "0.5rem",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <form action="/admin/api/export" method="POST">
                                        <input
                                            type="hidden"
                                            required
                                            name="AdminPassword"
                                            value={body.AdminPassword}
                                        />

                                        <button class={"secondary"}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Export Symbol"}
                                            >
                                                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                                                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path>
                                            </svg>{" "}
                                            Export Pastes
                                        </button>
                                    </form>

                                    <form
                                        action="/admin/api/logs/export"
                                        method="POST"
                                    >
                                        <input
                                            type="hidden"
                                            required
                                            name="AdminPassword"
                                            value={body.AdminPassword}
                                        />

                                        <button class={"secondary"}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Export Symbol"}
                                            >
                                                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                                                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path>
                                            </svg>{" "}
                                            Export Logs
                                        </button>
                                    </form>

                                    <form
                                        action="/admin/api/config.json"
                                        method="POST"
                                    >
                                        <input
                                            type="hidden"
                                            required
                                            name="AdminPassword"
                                            value={body.AdminPassword}
                                        />

                                        <button class={"secondary"}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Export Symbol"}
                                            >
                                                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                                                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path>
                                            </svg>{" "}
                                            Export Config
                                        </button>
                                    </form>
                                </div>

                                <hr style={{ width: "100%" }} />

                                <form
                                    action="/admin/api/import"
                                    encType={"multipart/form-data"}
                                    method="POST"
                                    style={{
                                        display: "flex",
                                        gap: "0.4rem",
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        required
                                        name="AdminPassword"
                                        value={body.AdminPassword}
                                    />

                                    <input
                                        type="file"
                                        name={"pastes"}
                                        required
                                        placeholder={"Exported Pastes JSON"}
                                        minLength={2}
                                    />

                                    <button class={"secondary"}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Upload Symbol"}
                                        >
                                            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                                            <path d="M11.78 4.72a.749.749 0 1 1-1.06 1.06L8.75 3.811V9.5a.75.75 0 0 1-1.5 0V3.811L5.28 5.78a.749.749 0 1 1-1.06-1.06l3.25-3.25a.749.749 0 0 1 1.06 0l3.25 3.25Z"></path>
                                        </svg>{" "}
                                        Import Pastes
                                    </button>
                                </form>
                            </div>
                        </div>

                        <Footer />
                    </main>

                    <style
                        dangerouslySetInnerHTML={{
                            __html: `input { background: var(--background-surface); }`,
                        }}
                    />
                </>,
                <>
                    <title>{config.name} Admin</title>
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
 * @class APIExport
 * @implements {Endpoint}
 */
export class APIExport implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // get pastes
        const _export = await db.GetAllPastes(true, false, "CustomURL IS NOT NULL");

        // decrypt encrypted pastes
        // if paste is encrypted, decrypt
        // ...otherwise the created paste will decrypt to an encrypted value!!!
        for (let paste of _export)
            if (paste.ViewPassword) {
                // get encryption information
                const enc = await db.GetEncryptionInfo(
                    paste.ViewPassword,
                    paste.CustomURL
                );

                // decrypt
                paste.Content = Decrypt(
                    paste.Content,
                    enc[1].key,
                    enc[1].iv,
                    enc[1].auth
                )!;
            } else continue;

        // return
        return new Response(JSON.stringify(_export), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="entry-${new Date().toISOString()}.json"`,
            },
        });
    }
}

/**
 * @export
 * @class APIImport
 * @implements {Endpoint}
 */
export class APIImport implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "multipart/form-data");

        if (
            WrongType &&
            !(request.headers.get("content-type") || "").includes(
                "multipart/form-data"
            )
        )
            return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        body.pastes = await (body.pastes as Blob).text();

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // get pastes
        const output = await db.ImportPastes(JSON.parse(body.pastes) || []);

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIMassDelete
 * @implements {Endpoint}
 */
export class APIMassDelete implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // get pastes
        const output = await db.DeletePastes(
            JSON.parse(body.pastes),
            body.AdminPassword
        );

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APISQL
 * @implements {Endpoint}
 */
export class APISQL implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // run query
        const output = await db.DirectSQL(
            body.sql,
            body.get !== undefined,
            body.all !== undefined,
            body.AdminPassword
        );

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class LogsPage
 * @implements {Endpoint}
 */
export class LogsPage implements Endpoint {
    public async request(request: Request): Promise<Response> {
        if (!config) config = (await EntryDB.GetConfig()) as Config;

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // get logs
        const logs = await EntryDB.Logs.QueryLogs(
            body.filter_type !== undefined
                ? `Type = "${body.filter_type}" LIMIT 1000`
                : 'ID IS NOT NULL AND Type IS NOT "view_paste" AND Type IS NOT "session" LIMIT 500'
        );

        // return
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <div
                            className="tab-container editor-tab"
                            style={{
                                height: "min-content",
                                maxHeight: "85vh",
                            }}
                        >
                            <AdminNav active="logs" pass={body.AdminPassword} />

                            <div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "1rem",
                                        flexWrap: "wrap",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <>
                                        <form
                                            action="/admin/logs"
                                            method={"POST"}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <input
                                                type="hidden"
                                                required
                                                name="AdminPassword"
                                                value={body.AdminPassword}
                                            />

                                            <select
                                                name="filter_type"
                                                id="filter_type"
                                                class={"secondary"}
                                                required
                                            >
                                                <option value="">
                                                    Filter by type
                                                </option>

                                                {config.log &&
                                                    config.log.events.map(
                                                        (event) => (
                                                            <option
                                                                value={event}
                                                                selected={
                                                                    body.filter_type ===
                                                                    event
                                                                }
                                                            >
                                                                {event}
                                                            </option>
                                                        )
                                                    )}
                                            </select>

                                            <button class={"secondary"}>
                                                Query
                                            </button>
                                        </form>
                                    </>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "1rem",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <form
                                            action="/admin/api/logs/mass-delete"
                                            method={"POST"}
                                        >
                                            <input
                                                type="hidden"
                                                required
                                                name="AdminPassword"
                                                value={body.AdminPassword}
                                            />

                                            <input
                                                type="hidden"
                                                required
                                                name={"logs"}
                                                value={JSON.stringify(
                                                    logs[2].map((log) => log.ID)
                                                )}
                                            />

                                            <button class={"secondary"}>
                                                Delete Results
                                            </button>
                                        </form>

                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                            }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={
                                                    "Magnifying Glass Symbol"
                                                }
                                            >
                                                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
                                            </svg>

                                            <span>
                                                <b>{logs[2].length}</b> result
                                                {logs[2].length > 1 ||
                                                logs[2].length === 0
                                                    ? "s"
                                                    : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        maxWidth: "100vw",
                                        overflow: "auto",
                                    }}
                                >
                                    <table
                                        class={"force-full"}
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                <th>Content</th>
                                                <th>Timestamp</th>
                                                <th>Event Type</th>
                                                <th>ID</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {logs[2].map((log) => {
                                                return (
                                                    <tr>
                                                        <td
                                                            title={log.Content}
                                                            style={{
                                                                maxWidth: "5rem",
                                                            }}
                                                        >
                                                            {log.Content}
                                                        </td>

                                                        <td
                                                            class="utc-date-to-localize"
                                                            title={log.Timestamp}
                                                        >
                                                            {log.Timestamp}
                                                        </td>

                                                        <td>{log.Type}</td>
                                                        <td
                                                            title={log.ID}
                                                            style={{
                                                                maxWidth: "5rem",
                                                            }}
                                                        >
                                                            {log.ID}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <Footer />
                    </main>

                    <style
                        dangerouslySetInnerHTML={{
                            __html: `input { background: var(--background-surface); }`,
                        }}
                    />
                </>,
                <>
                    <title>{config.name} Admin</title>
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
 * @class APIExportLogs
 * @implements {Endpoint}
 */
export class APIExportLogs implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // get logs
        const _export = await EntryDB.Logs.QueryLogs("ID IS NOT NULL");

        // return
        return new Response(JSON.stringify(_export[2]), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="entry-logs-${new Date().toISOString()}.json"`,
            },
        });
    }
}

/**
 * @export
 * @class APIMassDeleteLogs
 * @implements {Endpoint}
 */
export class APIMassDeleteLogs implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // delete logs
        const outputs: any[] = [];

        // build outputs
        for (const id of JSON.parse(body.logs))
            outputs.push(await EntryDB.Logs.DeleteLog(id));

        // return
        return new Response(JSON.stringify(outputs), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIExportConfig
 * @implements {Endpoint}
 */
export class APIExportConfig implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== config!.admin)
            return new Login().request(request);

        // return
        return new Response(JSON.stringify(EntryDB.config), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="entry-config-${new Date().toISOString()}.json"`,
            },
        });
    }
}

// default export
export default {
    Login,
    ManagePastes,
    APIDeletePaste,
    ExportPastesPage,
    APIExport,
    APIImport,
    APIMassDelete,
    APISQL,
    LogsPage,
    APIExportLogs,
    APIMassDeleteLogs,
    APIExportConfig,
};
