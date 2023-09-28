/**
 * @file Handle Entry network functionality
 * @name Network.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";
import { EntryGlobal, DatabaseURL } from "..";

import PocketBase from "pocketbase";
import Auth from "./helpers/Auth";

/**
 * @function TopNav
 * @description Default Atlas top nav
 *
 * @export
 * @param {{
 *     breadcrumbs?: string[];
 *     token?: string;
 *     margin?: boolean;
 *     children?: any;
 *     border?: boolean;
 * }} props
 * @return {*}  {*}
 */
export function TopNav(props: {
    breadcrumbs?: string[];
    token?: string;
    margin?: boolean;
    children?: any;
    border?: boolean;
}): any {
    return (
        <EntryGlobal.TopNav
            breadcrumbs={props.breadcrumbs}
            margin={props.margin}
            border={props.border}
        >
            {
                // only show if token doesn't already exist (not already in account)
                (props.token === "" && (
                    <>
                        <a href="/app/login" className="button round border">
                            Login
                        </a>

                        <a href="/app/signup" className="button round border">
                            Sign Up
                        </a>
                    </>
                )) ||
                    props.children
            }
        </EntryGlobal.TopNav>
    );
}

/**
 * @export
 * @class Dashboard
 * @implements {Endpoint}
 */
export class Dashboard implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db, true);

        // get paste if we're editing
        let paste: any;

        const EditingPaste =
            url.searchParams.get("mode") === "edit" &&
            url.searchParams.get("OldURL");

        if (EditingPaste)
            paste = await db
                .collection("pastes")
                .getFirstListItem(`CustomURL="${url.searchParams.get("OldURL")}"`);

        // unauthenticated page
        if (!token) {
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["app"]} token={token} />

                        <main class={"flex flex-column g-4 small"}>
                            <div
                                className="card round secondary flex flex-column g-8 justify-center align-center"
                                style={{
                                    padding: "5rem",
                                }}
                            >
                                <h1 class={"no-margin"}>Entry Atlas</h1>

                                <div className="flex g-4">
                                    <a
                                        className="button round border"
                                        href={"/app/login"}
                                    >
                                        Login
                                    </a>

                                    <a
                                        className="button round border"
                                        href={"/app/signup"}
                                    >
                                        Sign Up
                                    </a>
                                </div>
                            </div>

                            <div className="card round border dashed flex flex-column g-8">
                                <b>Entry Atlas</b>
                                <span>
                                    Entry Atlas requires authentication to use. You
                                    can still use Entry normally without
                                    authentication <a href="/">here</a>! Entry Atlas
                                    provides high levels of customization and an
                                    easier and more familiar interface. Pastes can
                                    still be viewed without authentication.
                                </span>
                            </div>
                        </main>
                    </>
                ),
                {
                    headers: {
                        "Content-Type": "text/html",
                    },
                }
            );
        }

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav
                        breadcrumbs={["app"]}
                        token={token}
                        margin={false}
                        border={false}
                    >
                        <button
                            className="round green"
                            id={"entry:button.PublishPaste"}
                        >
                            Publish
                        </button>

                        <div className="hr-left" />

                        {db.authStore.model && (
                            <a
                                class={"chip solid"}
                                href={`/u/${db.authStore.model.username}`}
                            >
                                {db.authStore.model.username}
                            </a>
                        )}

                        <form action="/api/atlas/auth/logout" method={"POST"}>
                            <button class={"round invisible"} title={"Logout"}>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                    aria-label={"Sign Out Symbol"}
                                >
                                    <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H6.75a.75.75 0 0 1 0-1.5Z"></path>
                                </svg>
                            </button>
                        </form>
                    </TopNav>

                    {url.searchParams.get("err") && (
                        <div
                            class={"mdnote note-error"}
                            style={{
                                marginBottom: "0.5rem",
                            }}
                        >
                            {decodeURIComponent(url.searchParams.get("err")!)}
                        </div>
                    )}

                    <div
                        className="flex justify-space-between card"
                        style={{
                            width: "100%",
                            borderBottom: "none",
                            padding: "0 1rem",
                            height: "40px",
                        }}
                    >
                        <div className="flex g-4 flex-wrap">
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

                        {EntryGlobal.Config.app && EntryGlobal.Config.app.info && (
                            <a
                                href={`/${EntryGlobal.Config.app.info}`}
                                class={"button secondary"}
                                target={"_blank"}
                                title={"Server Info & Announcements"}
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
                                Info
                            </a>
                        )}
                    </div>

                    <div
                        className="flex tab-container"
                        style={{
                            height: "calc(100% - var(--nav-height) - 40px)",
                            marginBottom: "0",
                            maxHeight: "max-content",
                        }}
                    >
                        <div
                            id="editor-tab-text"
                            class="editor-tab"
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                        />

                        <main
                            id="editor-tab-preview"
                            class="editor-tab"
                            style={{
                                display: "none",
                            }}
                        />
                    </div>

                    <script
                        type="module"
                        dangerouslySetInnerHTML={{
                            __html: `import CreateEditor from "/Editor.js";
                            CreateEditor("editor-tab-text", \`${encodeURIComponent(
                                (paste || { Content: "" })!.Content!
                            )}\`);`,
                        }}
                    />

                    <EntryGlobal.Modal
                        modalid="entry:modal.PublishPaste"
                        buttonid="entry:button.PublishPaste"
                        round={true}
                    >
                        {(paste === undefined && (
                            <>
                                {/* create new paste */}
                                <form
                                    action="/api/atlas/pastes/new"
                                    method={"POST"}
                                    className="flex flex-column g-8"
                                >
                                    <input
                                        type="hidden"
                                        name="Content"
                                        id={"contentInput"}
                                        required
                                    />

                                    <label htmlFor="CustomURL">Custom URL</label>

                                    <input
                                        type="text"
                                        name={"CustomURL"}
                                        id={"CustomURL"}
                                        minLength={2}
                                        maxLength={500}
                                        placeholder={"Custom URL"}
                                        class={"round"}
                                        autocomplete={"off"}
                                        required
                                    />

                                    <label htmlFor="EditPassword">
                                        Edit Password
                                    </label>

                                    <input
                                        type="text"
                                        name={"EditPassword"}
                                        id={"EditPassword"}
                                        minLength={2}
                                        maxLength={500}
                                        placeholder={"Custom edit password"}
                                        class={"round"}
                                        autocomplete={"off"}
                                        required
                                    />

                                    <hr style={{ margin: "0" }} />

                                    <button
                                        className="green round"
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        Publish
                                    </button>
                                </form>
                            </>
                        )) || (
                            <>
                                {/* update existing */}
                                <form
                                    action="/api/atlas/pastes/edit"
                                    method={"POST"}
                                    className="flex flex-column g-8"
                                >
                                    <input
                                        type="hidden"
                                        name="Content"
                                        id={"contentInput"}
                                        required
                                    />

                                    <input
                                        type="hidden"
                                        name={"CustomURL"}
                                        value={paste.CustomURL}
                                        required
                                    />

                                    <label htmlFor="EditPassword">
                                        Edit Password
                                    </label>

                                    <input
                                        type="text"
                                        name={"EditPassword"}
                                        id={"EditPassword"}
                                        minLength={2}
                                        maxLength={500}
                                        placeholder={"Edit password"}
                                        class={"round"}
                                        autocomplete={"off"}
                                        required
                                    />

                                    <details class={"round"}>
                                        <summary>Change Values</summary>

                                        <div className="details-flex-content-list-box">
                                            <label htmlFor="NewCustomURL">
                                                Change Custom URL (optional)
                                            </label>

                                            <input
                                                type="text"
                                                name={"NewCustomURL"}
                                                id={"NewCustomURL"}
                                                minLength={2}
                                                maxLength={500}
                                                placeholder={"New Custom URL"}
                                                class={"round"}
                                                autocomplete={"off"}
                                            />

                                            <label htmlFor="NewEditPassword">
                                                Change Edit Password (optional)
                                            </label>

                                            <input
                                                type="text"
                                                name={"NewEditPassword"}
                                                id={"NewEditPassword"}
                                                minLength={2}
                                                maxLength={500}
                                                placeholder={
                                                    "New custom edit password"
                                                }
                                                class={"round"}
                                                autocomplete={"off"}
                                            />
                                        </div>
                                    </details>

                                    <hr style={{ margin: "0" }} />

                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <button
                                            className="green round"
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            Publish
                                        </button>

                                        <button
                                            className="red round"
                                            id={"entry:button.DeletePaste"}
                                            style={{
                                                width: "100%",
                                            }}
                                        >
                                            Delete Paste
                                        </button>
                                    </div>
                                </form>

                                {EditingPaste && (
                                    <EntryGlobal.Modal
                                        buttonid="entry:button.DeletePaste"
                                        modalid="entry:modal.DeletePaste"
                                        round={true}
                                    >
                                        <h4
                                            style={{
                                                textAlign: "center",
                                                width: "100%",
                                            }}
                                        >
                                            Confirm Deletion
                                        </h4>

                                        <hr />

                                        <ul>
                                            <li>
                                                If you delete your paste, it will be
                                                gone forever
                                            </li>
                                            <li>
                                                You cannot restore your paste and it
                                                will be removed from the server
                                            </li>
                                            <li>
                                                Your custom URL (
                                                <b>
                                                    {
                                                        // everything before @ so (if there is a server),
                                                        // it isn't included here
                                                        EditingPaste!.split(":")[0]
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
                                            <form
                                                method="dialog"
                                                class={"mobile-max"}
                                            >
                                                <button
                                                    class={"green round mobile-max"}
                                                >
                                                    Cancel
                                                </button>

                                                <div style={{ margin: "0.25rem 0" }}>
                                                    <hr class={"mobile-only"} />
                                                </div>
                                            </form>

                                            <form
                                                method="POST"
                                                action={"/api/atlas/pastes/delete"}
                                                class={
                                                    "mobile-max flex flex-wrap g-4"
                                                }
                                                style={{
                                                    justifyContent: "right",
                                                    maxWidth: "100%",
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
                                                    value={EditingPaste!}
                                                />

                                                <button
                                                    class={"red round mobile-max"}
                                                >
                                                    Delete
                                                </button>
                                            </form>
                                        </div>
                                    </EntryGlobal.Modal>
                                )}
                            </>
                        )}

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
                    </EntryGlobal.Modal>
                </>,
                <>
                    <title>Dashboard - Atlas - {EntryGlobal.Config.name}</title>
                    <link rel="icon" href="/favicon" />
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
 * @class PasteView
 * @implements {Endpoint}
 */
export class PasteView implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("a/")) name = name.split("a/")[1];

        // connect to db
        const db = new PocketBase(DatabaseURL);
        await Auth.LoginFromCookie(request, db, true);

        // get paste
        let Viewed = false;

        try {
            const result = await db
                .collection("pastes")
                .getFirstListItem(`CustomURL="${name}"`, {
                    expand: "Owner",
                });

            // check view
            if (db.authStore.model) {
                try {
                    await db
                        .collection("views")
                        .getFirstListItem(
                            `Viewer="${db.authStore.model.id}" && Paste="${result.id}"`
                        );

                    // ... view record already exists
                    Viewed = true;
                } catch {
                    // create view record! (since it doesn't exist)
                    await db.collection("views").create({
                        Viewer: db.authStore.model.id,
                        Paste: result.id,
                    });
                }
            }

            // get view count
            const ViewCount = (
                await db.collection("views").getFullList({
                    batch: 200000,
                    fields: "",
                    filter: `Paste="${result.id}"`,
                })
            ).length;

            // return
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
                                        __html: await EntryGlobal.ParseMarkdown(
                                            result.Content
                                        ),
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
                                            class={"button"}
                                            href={`/app?mode=edit&OldURL=${
                                                result.CustomURL.split(":")[0]
                                            }`}
                                        >
                                            Edit
                                        </a>

                                        <details
                                            class={"horizontal"}
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
                                                        width: "100px",
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
                                        {result.ExpireOn !== undefined && (
                                            <span>Expires: {result.ExpireOn}</span>
                                        )}

                                        <span
                                            title={new Date(
                                                result.created
                                            ).toUTCString()}
                                        >
                                            Pub:{" "}
                                            <span className="utc-date-to-localize">
                                                {new Date(
                                                    result.created
                                                ).toUTCString()}
                                            </span>
                                        </span>

                                        <span
                                            title={new Date(
                                                result.updated
                                            ).toUTCString()}
                                        >
                                            Edit:{" "}
                                            <span className="utc-date-to-localize">
                                                {new Date(
                                                    result.updated
                                                ).toUTCString()}
                                            </span>
                                        </span>

                                        {result.expand && result.expand.Owner && (
                                            <span>
                                                Owner:{" "}
                                                <a
                                                    href={`/u/${result.expand.Owner.username}`}
                                                >
                                                    {result.expand.Owner.username}
                                                </a>
                                            </span>
                                        )}

                                        <span class={"flex align-center g-4"}>
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
                                            Views: {ViewCount}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <EntryGlobal.Footer />
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
                        <title>{result.CustomURL}</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        "Content-Type": "text/html",
                    },
                }
            );
        } catch (err) {
            return new EntryGlobal._404Page().request(request);
        }
    }
}

/**
 * @export
 * @class SignUp
 * @implements {Endpoint}
 */
export class SignUp implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["app", "signup"]} border={false} />

                    <main class={"flex flex-column align-center g-4"}>
                        <h2 class={"no-margin"}>sign up</h2>

                        {url.searchParams.get("err") && (
                            <div
                                class={"mdnote note-error"}
                                style={{
                                    marginBottom: "0.5rem",
                                    borderRadius: "0.4rem",
                                }}
                            >
                                {decodeURIComponent(url.searchParams.get("err")!)}
                            </div>
                        )}

                        <div
                            className="card round border"
                            style={{
                                width: "25rem",
                            }}
                        >
                            <form
                                action="/api/atlas/auth/signup"
                                method={"POST"}
                                class={"flex flex-column g-8"}
                            >
                                <label htmlFor="Username">Username</label>

                                <input
                                    type="text"
                                    id={"Username"}
                                    name={"Username"}
                                    placeholder={"Username"}
                                    minLength={4}
                                    maxLength={100}
                                    className="round"
                                    required
                                />

                                <label htmlFor="Username">Password</label>

                                <input
                                    type="password"
                                    id={"Password"}
                                    name={"Password"}
                                    placeholder={"Password"}
                                    minLength={8}
                                    maxLength={256}
                                    className="round"
                                    required
                                />

                                <hr style={{ margin: "0" }} />

                                <button
                                    className="green round"
                                    style={{
                                        width: "100%",
                                    }}
                                >
                                    Sign Up
                                </button>
                            </form>
                        </div>
                    </main>
                </>,
                <>
                    <title>Sign Up - Atlas - {EntryGlobal.Config.name}</title>
                    <link rel="icon" href="/favicon" />
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
 * @class Login
 * @implements {Endpoint}
 */
export class Login implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["app", "login"]} border={false} />

                    <main class={"flex flex-column align-center g-4"}>
                        <h2 class={"no-margin"}>login</h2>

                        {url.searchParams.get("err") && (
                            <div
                                class={"mdnote note-error"}
                                style={{
                                    marginBottom: "0.5rem",
                                    borderRadius: "0.4rem",
                                }}
                            >
                                {decodeURIComponent(url.searchParams.get("err")!)}
                            </div>
                        )}

                        <div
                            className="card round border"
                            style={{
                                width: "25rem",
                            }}
                        >
                            <form
                                action="/api/atlas/auth/login"
                                method={"POST"}
                                class={"flex flex-column g-8"}
                            >
                                <label htmlFor="Username">Username</label>

                                <input
                                    type="text"
                                    id={"Username"}
                                    name={"Username"}
                                    placeholder={"Username"}
                                    minLength={4}
                                    maxLength={100}
                                    className="round"
                                    required
                                />

                                <label htmlFor="Username">Password</label>

                                <input
                                    type="password"
                                    id={"Password"}
                                    name={"Password"}
                                    placeholder={"Password"}
                                    minLength={8}
                                    maxLength={256}
                                    className="round"
                                    required
                                />

                                <hr style={{ margin: "0" }} />

                                <button
                                    className="green round"
                                    style={{
                                        width: "100%",
                                    }}
                                >
                                    Login
                                </button>
                            </form>
                        </div>
                    </main>
                </>,
                <>
                    <title>Login - Atlas - {EntryGlobal.Config.name}</title>
                    <link rel="icon" href="/favicon" />
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
 * @class UserProfile
 * @implements {Endpoint}
 */
export class UserProfile implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db, true);

        // get name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("u/")) name = name.split("u/")[1];

        try {
            // get paste if we're editing
            const user = await db
                .collection("users")
                .getFirstListItem(`username="${name}"`);

            // get user pastes
            const pastes = await db.collection("pastes").getList(1, 100, {
                filter: `Owner="${user.id}"`,
                sort: "-created",
            });

            // return
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav
                            breadcrumbs={["u", name]}
                            token={token}
                            margin={false}
                            border={false}
                        >
                            <a href="/app" class={"button border round"}>
                                Home
                            </a>

                            <form action="/api/atlas/auth/logout" method={"POST"}>
                                <button class={"round invisible"} title={"Logout"}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Sign Out Symbol"}
                                    >
                                        <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H6.75a.75.75 0 0 1 0-1.5Z"></path>
                                    </svg>
                                </button>
                            </form>
                        </TopNav>

                        <main className="small card">
                            <div
                                className="card round secondary flex flex-wrap g-8 justify-center align-center"
                                style={{
                                    padding: "5rem",
                                }}
                            >
                                {user.avatar && (
                                    <img
                                        src={`${DatabaseURL}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`}
                                        alt={`${user.username}'s profile picture`}
                                        style={{
                                            borderRadius: "360rem",
                                            width: "5rem",
                                        }}
                                    />
                                )}

                                <h1 class={"no-margin"}>{user.username}</h1>
                            </div>

                            <hr />

                            <div
                                class={"card"}
                                dangerouslySetInnerHTML={{
                                    __html: await EntryGlobal.ParseMarkdown(
                                        user.about
                                    ),
                                }}
                            />

                            <hr />

                            <div className="flex flex-column g-4 card border round">
                                {pastes.items.map((paste) => (
                                    <div className="flex justify-space-between align-center card border dashed round">
                                        <div class={"flex flex-column g-4"}>
                                            <b>{paste.CustomURL}</b>
                                            <span>
                                                {paste.Content.length} characters
                                            </span>
                                        </div>

                                        <a
                                            href={`/a/${paste.CustomURL}`}
                                            className="button round"
                                        >
                                            View
                                        </a>
                                    </div>
                                ))}
                            </div>

                            <hr />

                            <div className="card flex flex-column g-4">
                                <span>
                                    Joined:{" "}
                                    <span className="utc-date-to-localize">
                                        {new Date(user.created).toUTCString()}
                                    </span>
                                </span>
                            </div>
                        </main>
                    </>,
                    <>
                        <title>Dashboard - Atlas - {EntryGlobal.Config.name}</title>
                        <link rel="icon" href="/favicon" />
                    </>
                ),
                {
                    headers: {
                        "Content-Type": "text/html",
                    },
                }
            );
        } catch {
            return new EntryGlobal._404Page().request(request);
        }
    }
}

// default export
export default {
    Dashboard,
    PasteView,
    SignUp,
    Login,
    UserProfile,
};
