/**
 * @file Handle Admin endpoints
 * @name Admin.tsx
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import { VerifyContentType, db, DefaultHeaders, PageHeaders } from "./api/API";
import BaseParser from "../db/helpers/BaseParser";
import type { Paste } from "../db/objects/Paste";
import EntryDB from "../db/EntryDB";

import PasteList from "./components/site/PasteList";
import Footer from "./components/site/Footer";
import Pages from "./Pages";

import { plugins } from "../..";

import TopNav from "./components/site/TopNav";
import Checkbox from "./components/form/Checkbox";
import { ParseMarkdownSync } from "./components/Markdown";
import _404Page from "./components/404";

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

                <span>{EntryDB.config.name} Admin</span>
            </h1>

            <hr />

            <div
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.5rem",
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

                    <button class={props.active === "pastes" ? " active" : ""}>
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

                    <button class={props.active === "export" ? " active" : ""}>
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

                    <button class={props.active === "logs" ? " active" : ""}>
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

                <form action="/admin/plugins" method="POST">
                    <input
                        type="hidden"
                        required
                        name="AdminPassword"
                        value={props.pass}
                    />

                    <button class={props.active === "plugins" ? " active" : ""}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Plug Symbol"}
                        >
                            <path d="M4 8H2.5a1 1 0 0 0-1 1v5.25a.75.75 0 0 1-1.5 0V9a2.5 2.5 0 0 1 2.5-2.5H4V5.133a1.75 1.75 0 0 1 1.533-1.737l2.831-.353.76-.913c.332-.4.825-.63 1.344-.63h.782c.966 0 1.75.784 1.75 1.75V4h2.25a.75.75 0 0 1 0 1.5H13v4h2.25a.75.75 0 0 1 0 1.5H13v.75a1.75 1.75 0 0 1-1.75 1.75h-.782c-.519 0-1.012-.23-1.344-.63l-.761-.912-2.83-.354A1.75 1.75 0 0 1 4 9.867Zm6.276-4.91-.95 1.14a.753.753 0 0 1-.483.265l-3.124.39a.25.25 0 0 0-.219.248v4.734c0 .126.094.233.219.249l3.124.39a.752.752 0 0 1 .483.264l.95 1.14a.25.25 0 0 0 .192.09h.782a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-.782a.25.25 0 0 0-.192.09Z"></path>
                        </svg>{" "}
                        Plugins
                    </button>
                </form>

                <form action="/admin/metadata" method="POST">
                    <input
                        type="hidden"
                        required
                        name="AdminPassword"
                        value={props.pass}
                    />

                    <button class={props.active === "metadata" ? " active" : ""}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Cache Symbol"}
                        >
                            <path d="M2.5 5.724V8c0 .248.238.7 1.169 1.159.874.43 2.144.745 3.62.822a.75.75 0 1 1-.078 1.498c-1.622-.085-3.102-.432-4.204-.975a5.565 5.565 0 0 1-.507-.28V12.5c0 .133.058.318.282.551.227.237.591.483 1.101.707 1.015.447 2.47.742 4.117.742.406 0 .802-.018 1.183-.052a.751.751 0 1 1 .134 1.494C8.89 15.98 8.45 16 8 16c-1.805 0-3.475-.32-4.721-.869-.623-.274-1.173-.619-1.579-1.041-.408-.425-.7-.964-.7-1.59v-9c0-.626.292-1.165.7-1.591.406-.42.956-.766 1.579-1.04C4.525.32 6.195 0 8 0c1.806 0 3.476.32 4.721.869.623.274 1.173.619 1.579 1.041.408.425.7.964.7 1.59 0 .626-.292 1.165-.7 1.591-.406.42-.956.766-1.578 1.04C11.475 6.68 9.805 7 8 7c-1.805 0-3.475-.32-4.721-.869a6.15 6.15 0 0 1-.779-.407Zm0-2.224c0 .133.058.318.282.551.227.237.591.483 1.101.707C4.898 5.205 6.353 5.5 8 5.5c1.646 0 3.101-.295 4.118-.742.508-.224.873-.471 1.1-.708.224-.232.282-.417.282-.55 0-.133-.058-.318-.282-.551-.227-.237-.591-.483-1.101-.707C11.102 1.795 9.647 1.5 8 1.5c-1.646 0-3.101.295-4.118.742-.508.224-.873.471-1.1.708-.224.232-.282.417-.282.55Z"></path>
                            <path d="M14.49 7.582a.375.375 0 0 0-.66-.313l-3.625 4.625a.375.375 0 0 0 .295.606h2.127l-.619 2.922a.375.375 0 0 0 .666.304l3.125-4.125A.375.375 0 0 0 15.5 11h-1.778l.769-3.418Z"></path>
                        </svg>{" "}
                        Metadata Editor
                    </button>
                </form>

                {EntryDB.config.log &&
                    EntryDB.config.log.events.includes("report") && (
                        <form action="/admin/logs/reports" method="POST">
                            <input
                                type="hidden"
                                required
                                name="AdminPassword"
                                value={props.pass}
                            />

                            <button
                                class={props.active === "reports" ? " active" : ""}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                >
                                    <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                                </svg>{" "}
                                Reports
                            </button>
                        </form>
                    )}

                <a href="https://codeberg.org/hkau/entry" class={"button"}>
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
                    __html: "button.active { box-shadow: 0 0 1px var(--blue2); color: var(--blue2); }",
                }}
            />

            <hr />

            {/* performance display */}
            <p>
                Memory Usage: {Math.floor(process.memoryUsage().rss / 1000_000)} MB
            </p>

            <p>CPU Usage: {process.cpuUsage().system}</p>
            <p>Cached Pastes: {Object.keys(EntryDB.PasteCache).length || 0}</p>

            {/* cloud display */}
            {process.env.ENTRY_CLOUD_NAME && (
                <p>
                    <b>☁️ Cloud Instance</b> •{" "}
                    <a href={process.env.ENTRY_CLOUD_LOCATION}>Manage</a>
                </p>
            )}
        </>
    );
}

function AdminLayout(props: { children: any; body: any; page: string }) {
    return (
        <div class="sidebar-layout-wrapper">
            <div className="sidebar">
                <div>
                    <AdminNav active={props.page} pass={props.body.AdminPassword} />
                </div>

                <Footer />
            </div>

            <details className="sidebar-mobile">
                <summary>Menu</summary>
                <AdminNav active={props.page} pass={props.body.AdminPassword} />
            </details>

            <div className="tab-container editor-tab page-content">
                {props.children}
            </div>
        </div>
    );
}

/**
 * @export
 * @class Login
 * @implements {Endpoint}
 */
export class Login implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // we aren't actually using a login system, it's just a form for the configured
        // server admin password

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["admin"]} margin={false} />

                    <div
                        class={"flex justify-center align-center"}
                        style={{
                            height: "calc(100vh - var(--nav-height))",
                            width: "100vw",
                        }}
                    >
                        <form
                            action="/admin/manage-pastes"
                            class={
                                "flex flex-column g-4 align-center card border round"
                            }
                            method={"POST"}
                            style={{
                                width: "max-content",
                            }}
                        >
                            <h2>Admin Panel</h2>

                            <input
                                type="password"
                                name={"AdminPassword"}
                                required
                                placeholder={"Password"}
                                class={"round"}
                            />

                            <button
                                class={"green round"}
                                style={{
                                    width: "100%",
                                }}
                            >
                                Go
                            </button>
                        </form>
                    </div>
                </>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
                    <link rel="icon" href="/favicon" />
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
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // log event (only on first access)
        if (request.headers.get("Referer")! && EntryDB.Logs) {
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
        }

        // get limit
        const LIMIT = parseInt(body.limit || "500");

        // fetch all pastes
        const pastes = await db.GetAllPastes(
            true,
            false,
            body.query !== undefined
                ? `\"CustomURL\" LIKE "%${body.query}%" LIMIT ${LIMIT}`
                : `\"CustomURL\" IS NOT NULL LIMIT ${LIMIT}`
        );

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="pastes">
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
                                placeholder={'SELECT * FROM "Pastes" LIMIT 100'}
                                className="secondary"
                                required
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

                    <iframe
                        name={"association_frame"}
                        style={{
                            display: "none",
                        }}
                        // @ts-ignore
                        onload={`(${((event: any) => {
                            // check path
                            if (event.target.contentWindow.location.pathname !== "/")
                                return;

                            // alert
                            alert("Paste association changed!");
                        }).toString()})(event);`}
                    ></iframe>

                    <p>
                        <b>Set Association</b>
                    </p>

                    <form
                        action="/api/associate"
                        method={"POST"}
                        target={"association_frame"}
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
                            name="EditPassword"
                            value={body.AdminPassword}
                        />

                        <input
                            name={"CustomURL"}
                            placeholder={"Custom URL"}
                            class={"secondary"}
                            required
                            style={{
                                width: "20rem",
                            }}
                        />

                        <button class={"secondary"}>Login</button>
                    </form>

                    <hr />

                    <p>
                        <b>Paste Search</b>
                    </p>

                    <PasteList
                        Pastes={pastes}
                        ShowDelete={true}
                        AdminPassword={body.AdminPassword}
                        Query={body.query || ""}
                        Limit={LIMIT}
                    />
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
                    <link rel="icon" href="/favicon" />
                    <link rel="icon" href="/favicon" type={"image/png"} />
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
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (
            !body.AdminPassword ||
            body.AdminPassword !== EntryDB.config.admin ||
            !body.sql
        )
            return new Login().request(request, server);

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
                    <title>{EntryDB.config.name} Admin</title>
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
 * @class ExportPastesPage
 * @implements {Endpoint}
 */
export class ExportPastesPage implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="export">
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

                            <form action="/admin/api/logs/export" method="POST">
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

                            <form action="/admin/api/config.json" method="POST">
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

                            <form action="/admin/api/logs/users" method="POST">
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
                                    Export User List
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
                                class={"secondary"}
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
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
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
 * @class LogsPage
 * @implements {Endpoint}
 */
export class LogsPage implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get limit
        const LIMIT = parseInt(body.limit || "500");

        // get logs
        const logs = await EntryDB.Logs.QueryLogs(
            body.filter_type !== undefined
                ? `Type = "${body.filter_type}" ORDER BY cast(Timestamp as float) DESC LIMIT ${LIMIT}`
                : `ID IS NOT NULL AND ${[
                      // these log types should probably never be cleared
                      'Type IS NOT "view_paste"',
                      'Type IS NOT "session"',
                      'Type IS NOT "report"',
                      'Type IS NOT "custom_domain"',
                      'Type IS NOT "notification"',
                  ].join(
                      " AND "
                  )} ORDER BY cast(Timestamp as float) DESC LIMIT ${LIMIT}`
        );

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="logs">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }}
                    >
                        <a
                            href="/paste/doc/what:sentrytwo.com#logs"
                            class={"button secondary"}
                        >
                            Help
                        </a>

                        <a
                            href="https://codeberg.org/hkau/entry/issues/new/choose"
                            class={"button secondary"}
                        >
                            Issues
                        </a>
                    </div>

                    <hr />

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
                                style={{
                                    width: "10rem",
                                }}
                            >
                                <option value="">Filter by type</option>

                                {EntryDB.config.log &&
                                    EntryDB.config.log.events.map((event) => (
                                        <option
                                            value={event}
                                            selected={body.filter_type === event}
                                        >
                                            {event}
                                        </option>
                                    ))}
                            </select>

                            <input
                                type="number"
                                value={LIMIT}
                                placeholder={"Limit"}
                                minLength={1}
                                maxLength={10000}
                                name={"limit"}
                                id={"limit"}
                                class={"secondary"}
                                required
                                style={{
                                    width: "10rem",
                                }}
                            />

                            <button class={"secondary"}>Query</button>
                        </form>

                        <div
                            style={{
                                display: "flex",
                                gap: "1rem",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {body.filter_type !== "report" && (
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
                            )}

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
                                    aria-label={"Magnifying Glass Symbol"}
                                >
                                    <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
                                </svg>

                                <span>
                                    <b>{logs[2].length}</b> result
                                    {logs[2].length > 1 || logs[2].length === 0
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
                                    <th>Delete</th>
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
                                                title={new Date(
                                                    log.Timestamp || 0
                                                ).toUTCString()}
                                            >
                                                {new Date(
                                                    log.Timestamp || 0
                                                ).toUTCString()}
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

                                            <td>
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
                                                        value={JSON.stringify([
                                                            log.ID,
                                                        ])}
                                                    />

                                                    <button
                                                        class={"secondary"}
                                                        title={"Delete Log"}
                                                        style={{
                                                            margin: "auto",
                                                        }}
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
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
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
 * @class PluginsPage
 * @implements {Endpoint}
 */
export class PluginsPage implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="plugins">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }}
                    >
                        <a
                            href="/paste/doc/what:sentrytwo.com#plugins"
                            class={"button secondary"}
                        >
                            Help
                        </a>

                        <a
                            href="https://codeberg.org/hkau/entry/issues/new/choose"
                            class={"button secondary"}
                        >
                            Issues
                        </a>
                    </div>

                    <hr />

                    <h6>Plugin Pages</h6>

                    <div
                        style={{
                            maxWidth: "100vw",
                            overflow: "auto",
                        }}
                    >
                        <table class={"force-full"}>
                            <thead>
                                <tr>
                                    <th>Path</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                </tr>
                            </thead>

                            <tbody>
                                {Object.entries(plugins).map((page) => (
                                    <tr>
                                        <td>
                                            <a href={page[0]}>{page[0]}</a>
                                        </td>

                                        <td>{page[1].Type || "matches"}</td>
                                        <td>{page[1].Method || "GET"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
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
 * @class ManageReports
 * @implements {Endpoint}
 */
export class ManageReports implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get limit
        const LIMIT = parseInt(body.limit || "500");

        // set query customurl
        if (body.paste_customurl) body.paste_customurl += ";";
        else body.paste_customurl = "";

        // fetch all reports
        const reports = await EntryDB.Logs.QueryLogs(
            `Type = "report" AND \"Content\" LIKE "create;${body.paste_customurl}%" ORDER BY cast(Timestamp as float) DESC LIMIT ${LIMIT}`
        );

        // get report logs
        const ReportPastes: Array<[boolean, any]> = []; // [archived, report paste, report log]
        for (const report of reports[2]) {
            // check if report is archived
            const ArchivalLog = await EntryDB.Logs.QueryLogs(
                `Type = "report" AND Content = "archive;${
                    report.Content.split(";")[2]
                }"`
            );

            // add to reportpastes
            ReportPastes.push([ArchivalLog[2].length === 1, report]);
        }

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="reports">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }}
                    >
                        <a
                            href="/paste/doc/what:sentrytwo.com#logs"
                            class={"button secondary"}
                        >
                            Help
                        </a>

                        <a
                            href="https://codeberg.org/hkau/entry/issues/new/choose"
                            class={"button secondary"}
                        >
                            Issues
                        </a>
                    </div>

                    <hr />

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
                        <form
                            action="/admin/logs/reports"
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

                            <input
                                name={"paste_customurl"}
                                placeholder={"Custom URL"}
                                value={body.paste_customurl}
                                class={"secondary"}
                                style={{
                                    width: "20rem",
                                }}
                            />

                            <input
                                type="number"
                                value={LIMIT}
                                placeholder={"Limit"}
                                minLength={1}
                                maxLength={10000}
                                name={"limit"}
                                id={"limit"}
                                class={"secondary"}
                                required
                                style={{
                                    width: "10rem",
                                }}
                            />

                            <button class={"secondary"}>Query</button>
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
                                aria-label={"Magnifying Glass Symbol"}
                            >
                                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
                            </svg>

                            <span>
                                <b>{reports[2].length}</b> result
                                {reports[2].length > 1 || reports[2].length === 0
                                    ? "s"
                                    : ""}
                            </span>
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
                                    <th>Reporting</th>
                                    <th>Timestamp</th>
                                    <th>Archived</th>
                                    <th>View Report</th>
                                </tr>
                            </thead>

                            <tbody>
                                {ReportPastes.map((report) => (
                                    <tr
                                        style={{
                                            opacity:
                                                report[0] === true
                                                    ? "75%"
                                                    : "inherit",
                                        }}
                                    >
                                        {/* https://sentrytwo.com/paste/doc/what#logs */}
                                        <td
                                            style={{ maxWidth: "10rem" }}
                                            title={report[1].Content.split(";")[1]}
                                        >
                                            {report[1].Content.split(";")[1]}
                                        </td>

                                        <td class={"utc-date-to-localize"}>
                                            {new Date(
                                                report[1].Timestamp || 0
                                            ).toUTCString()}
                                        </td>

                                        <td>{report[0] === true ? "yes" : "no"}</td>

                                        <td>
                                            <form
                                                action={`/admin/logs/report/${report[1].ID}`}
                                                method={"POST"}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <input
                                                    type="hidden"
                                                    required
                                                    name="AdminPassword"
                                                    value={body.AdminPassword}
                                                />

                                                <button class={"secondary"}>
                                                    View Report
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
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
 * @class ViewReport
 * @implements {Endpoint}
 */
export class ViewReport implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get log id
        let LogID = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (LogID.startsWith("admin/logs/report/"))
            LogID = LogID.split("admin/logs/report/")[1];

        // return manage reports if LogID === ""
        if (LogID === "") return new _404Page().request(request);

        // get log
        const ReportLog = await EntryDB.Logs.GetLog(LogID);
        if (!ReportLog[0] || !ReportLog[2]) return new _404Page().request(request);

        // archive log if body.archive = "true"
        if (body.archive === "true")
            await EntryDB.Logs.CreateLog({
                Content: `archive;${ReportLog[2].Content.split(";")[2]}`,
                Type: "report",
            });

        // check if report is archived!
        const ArchivalLog = await EntryDB.Logs.QueryLogs(
            `Type = "report" AND Content = "archive;${
                ReportLog[2].Content.split(";")[2]
            }"`
        );

        // attempt to get report
        const report = (await db.GetPasteFromURL(
            ReportLog[2].Content.split(";")[2]
        )) as Paste;

        if (!report) return new _404Page().request(request);

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="reports">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }}
                    >
                        <a
                            href="/paste/doc/what:sentrytwo.com#logs"
                            class={"button secondary"}
                        >
                            Help
                        </a>

                        <a
                            href="https://codeberg.org/hkau/entry/issues/new/choose"
                            class={"button secondary"}
                        >
                            Issues
                        </a>
                    </div>

                    <hr />

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                        }}
                    >
                        <a
                            href="javascript:history.back()"
                            className="button secondary"
                        >
                            Back
                        </a>

                        <div
                            style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                            }}
                        >
                            {ArchivalLog[2].length !== 1 && (
                                <form action={url.pathname} method={"POST"}>
                                    <input
                                        type="hidden"
                                        required
                                        name="AdminPassword"
                                        value={body.AdminPassword}
                                    />

                                    <input
                                        type="hidden"
                                        required
                                        name={"archive"}
                                        value={"true"}
                                    />

                                    <button
                                        class={"secondary"}
                                        style={{
                                            margin: "auto",
                                        }}
                                    >
                                        Archive
                                    </button>
                                </form>
                            )}

                            <form action="/admin/api/delete" method={"POST"}>
                                <input
                                    type="hidden"
                                    required
                                    name="AdminPassword"
                                    value={body.AdminPassword}
                                />

                                <input
                                    type="hidden"
                                    required
                                    name={"CustomURL"}
                                    value={report.CustomURL}
                                />

                                <button
                                    class={"secondary"}
                                    style={{
                                        margin: "auto",
                                    }}
                                >
                                    Delete
                                </button>
                            </form>
                        </div>
                    </div>

                    <hr />

                    <p>
                        Report ID: <b>{ReportLog[2].ID}</b>, Archived:{" "}
                        <b>{ArchivalLog[2].length === 1 ? "yes" : "no"}</b>
                    </p>

                    <p>
                        Pub:{" "}
                        <b class={"utc-date-to-localize"}>
                            {new Date(report.PubDate || 0).toUTCString()}
                        </b>
                        , Edit:{" "}
                        <b class={"utc-date-to-localize"}>
                            {new Date(report.PubDate || 0).toUTCString()}
                        </b>
                        , Comments: <b>{report.Comments}</b>
                    </p>

                    <p>
                        Reporting paste:{" "}
                        <a
                            href={`/${ReportLog[2].Content.split(";")[1]}`}
                            target={"_blank"}
                        >
                            <b>{ReportLog[2].Content.split(";")[1]}</b>
                        </a>
                    </p>

                    {report.Metadata && report.Metadata.Owner && (
                        <p>
                            Owner:{" "}
                            <a href={`/${report.Metadata.Owner}`}>
                                {report.Metadata.Owner}
                            </a>
                        </p>
                    )}

                    <hr />

                    <div
                        class={"card"}
                        style={{
                            maxHeight: "20rem",
                            overflow: "auto",
                        }}
                        dangerouslySetInnerHTML={{
                            __html: ParseMarkdownSync(report.Content!),
                        }}
                    />

                    <hr />

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <a href={`/paste/comments/${report.CustomURL}`}>
                            View Report Comments
                        </a>
                    </div>
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
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
 * @class MetadataEditor
 * @implements {Endpoint}
 */
export class MetadataEditor implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get paste
        const result = await db.GetPasteFromURL(
            (body.paste_customurl || "").toLowerCase()
        );

        if (!result && body.paste_customurl !== undefined)
            return new _404Page().request(request);

        // try to fetch paste associated session
        const session =
            body.paste_customurl !== undefined
                ? await EntryDB.Logs.QueryLogs(
                      `\"Content\" LIKE "%;_with;${result!.CustomURL}"`
                  )
                : ([false, "", []] as any[]);

        // return
        return new Response(
            Renderer.Render(
                <AdminLayout body={body} page="metadata">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }}
                    >
                        <a
                            href="/paste/doc/what:sentrytwo.com#metadata-editor"
                            class={"button secondary"}
                        >
                            Help
                        </a>

                        <a
                            href="https://codeberg.org/hkau/entry/issues/new/choose"
                            class={"button secondary"}
                        >
                            Issues
                        </a>
                    </div>

                    <hr />

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
                        <form
                            action="/admin/metadata"
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

                            <input
                                name={"paste_customurl"}
                                placeholder={"Custom URL"}
                                value={body.paste_customurl}
                                class={"secondary"}
                                required
                                style={{
                                    width: "20rem",
                                }}
                            />

                            <button class={"secondary"}>Select Paste</button>
                        </form>

                        <form action="/api/metadata" method={"POST"}>
                            <input
                                type={"hidden"}
                                name={"CustomURL"}
                                value={body.paste_customurl}
                                class={"secondary"}
                                required
                            />

                            <input
                                type="hidden"
                                required
                                name="EditPassword"
                                value={body.AdminPassword}
                            />

                            <input
                                type="hidden"
                                required
                                name="Metadata"
                                id={"Metadata"}
                                value={""}
                            />

                            <button class={"secondary green"}>Save</button>
                        </form>
                    </div>

                    <hr />

                    {session[2][0] !== undefined && (
                        <div className="flex flex-column g-4">
                            <div className="card flex justify-space-between align-center">
                                <b>User IP</b>
                                <code>
                                    {
                                        (
                                            session[2][0].Content.split(
                                                ";_ip;"
                                            )[1] || ""
                                        ).split(";")[0]
                                    }
                                </code>
                            </div>
                        </div>
                    )}

                    <hr />

                    <div id="_editor" />

                    {body.paste_customurl && result && (
                        <script
                            type={"module"}
                            dangerouslySetInnerHTML={{
                                __html: `import _e from "/MetadataEditor.js";
                                _e.Editor(\`${BaseParser.stringify(
                                    result.Metadata as any
                                )}\`, "_editor");`,
                            }}
                        />
                    )}
                </AdminLayout>,
                <>
                    <title>{EntryDB.config.name} Admin</title>
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
    Login,
    ManagePastes,
    ExportPastesPage,
    LogsPage,
    PluginsPage,
    ManageReports,
    ViewReport,
    MetadataEditor,
};
