/**
 * @file Handle Page endpoints
 * @name Pages.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import path from "node:path";
import fs from "node:fs";

import pack from "../../../package.json";

// import components
import DecryptionForm from "./components/form/DecryptionForm";
import _404Page, { _401PageEndpoint } from "./components/40x";
import TopNav from "./components/site/TopNav";
import Footer from "./components/site/Footer";
import Home from "./Home";

// create database
import BundlesDB from "../db/BundlesDB";
import type { Paste } from "../db/objects/Paste";

await BundlesDB.GetConfig();
export const db = new BundlesDB();

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
import {
    Card,
    Modal,
    StaticCode,
    Expandable,
    SidebarLayout,
    Button,
    CardWithHeader,
} from "fusion";
import { Node, PageNode, StarInfoNode } from "./components/builder/schema";
import { AuthModals } from "./components/site/modals/AuthModals";
import MessageDisplays from "./components/site/MessageDisplays";
import LoadingModal from "./components/site/modals/Loading";
import { ParseMarkdown } from "./components/Markdown";
import SearchForm from "./components/form/SearchForm";
import { ProfileView, ReposNav } from "./repos/Repos";
import BaseParser from "../db/helpers/BaseParser";

import { ServerConfig } from "../..";

// ...

/**
 * @function InformationPageNote
 *
 * @export
 * @return {*}
 */
export function InformationPageNote(): any {
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
 * @function Curiosity
 *
 * @export
 * @param {{ Association: [boolean, string] }} props
 * @return {*}
 */
export function Curiosity(props: { Association: [boolean, string] }): any {
    return (
        <>
            {BundlesDB.config.app &&
                BundlesDB.config.app.curiosity &&
                props.Association[0] &&
                props.Association[1] && (
                    <>
                        <script
                            src={`${BundlesDB.config.app.curiosity.host}/drone.js`}
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

/**
 * @function OpenGraph
 *
 * @export
 * @param {{
 *     url?: string;
 *     description?: string;
 *     title?: string;
 *     icon?: string;
 *     color?: string;
 *     largeimage?: string;
 *     time?: {
 *         publish: string;
 *         edit: string;
 *     };
 *     author?: string;
 * }} props
 * @return {*}
 */
export function OpenGraph(props: {
    url?: string;
    description?: string;
    title?: string;
    icon?: string;
    color?: string;
    largeimage?: string;
    time?: {
        publish: string;
        edit: string;
    };
    author?: string;
}): any {
    return (
        <>
            <meta name={"theme-color"} value={props.color || "#55a4e0"} />
            <meta property={"og:type"} value={"website"} />
            <meta property={"og:site_name"} value={BundlesDB.config.name} />

            {props.url && (
                <>
                    <meta property={"og:url"} value={props.url} />
                    <link rel="canonical" href={props.url} />
                </>
            )}

            {props.description && (
                <meta property={"og:description"} value={props.description} />
            )}

            {props.title && <meta property={"og:title"} value={props.title} />}

            {props.icon && !props.largeimage && (
                <meta property={"og:image"} value={props.icon} />
            )}

            {props.largeimage && (
                <meta property={"og:image"} value={props.largeimage} />
            )}

            {props.time && (
                <>
                    <meta
                        property={"article:published_time"}
                        value={props.time.publish}
                    />

                    <meta
                        property={"article:modified_time"}
                        value={props.time.edit}
                    />
                </>
            )}

            {props.author && <meta name={"article:author"} value={props.author} />}
        </>
    );
}

/**
 * @function PasteOpenGraph
 *
 * @export
 * @param {{
 *     paste: Paste;
 *     url: URL;
 *     isBuilder: boolean;
 *     title?: string;
 *     content?: string;
 * }} props
 * @return {*}
 */
export function PasteOpenGraph(props: {
    paste: Paste;
    url: URL;
    isBuilder: boolean;
    title?: string;
    content?: string;
}): any {
    const { paste, url, isBuilder } = props;

    const description =
        props.content === undefined
            ? paste.Metadata && paste.Metadata.Description
                ? paste.Metadata.Description
                : isBuilder === true
                  ? paste.CustomURL // if length of content is greater than 150, cut it at 150 characters and add "..."
                  : // otherwise, we can just show the full content result.Content.length > 150
                    paste.Content.length > 150
                    ? `${paste.Content.substring(0, 149)}...`
                    : paste.Content
            : props.content;

    // return
    return (
        <>
            <title>
                {props.title === undefined
                    ? paste.Metadata && paste.Metadata.Title
                        ? paste.Metadata.Title
                        : paste.CustomURL
                    : props.title}
            </title>

            <meta name="description" content={description} />

            <OpenGraph
                url={url.href}
                description={description}
                title={
                    props.title === undefined
                        ? paste.Metadata && paste.Metadata.Title
                            ? paste.Metadata.Title
                            : paste.CustomURL
                        : props.title
                }
                icon={
                    paste.Metadata && paste.Metadata.EmbedImage
                        ? paste.Metadata.Favicon
                        : undefined
                }
                color={
                    paste.Metadata && paste.Metadata.EmbedColor
                        ? paste.Metadata.EmbedColor
                        : undefined
                }
                largeimage={
                    paste.Metadata && paste.Metadata.EmbedImage
                        ? paste.Metadata.EmbedImage
                        : undefined
                }
                time={{
                    publish: new Date(paste.PubDate).toISOString(),
                    edit: new Date(paste.EditDate).toISOString(),
                }}
                author={paste.Metadata?.Owner}
            />
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
    if (!BundlesDB.config.app || !BundlesDB.config.app.hostname) return undefined;

    // get url and check if it's an instance
    const url = new URL(request.url);

    // get subdomain
    const subdomain = url.hostname.split(`.${BundlesDB.config.app.hostname}`)[0];

    // handle cloud pages
    if (subdomain.startsWith("ins-") && ServerConfig.Pages["._serve_cloud_instance"])
        // forward to correct page
        return new ServerConfig.Pages["._serve_cloud_instance"].Page().request(
            request,
            server
        );

    // ...check against custom domain
    const CustomDomainLog = (
        await BundlesDB.Logs.QueryLogs(
            `"Type" = \'custom_domain\' AND \"Content\" LIKE \'%;${url.hostname}\'`
        )
    )[2][0];

    if (CustomDomainLog && CustomDomainLog.Content.startsWith("ins://")) {
        // ...create new request
        const req = new Request(
            `${url.protocol}//ins-${CustomDomainLog.Content.split(";")[0]
                .replaceAll("/", ".")
                .replaceAll("ins://", "")}.${BundlesDB.config.app.hostname}${
                url.pathname
            }${url.search}${url.hash}`,
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

        // handle executable package
        if (path.basename(process.execPath).startsWith("bundles")) {
            const FilePath = path.resolve(
                process.env.IMPORT_DIR!,
                url.pathname.slice(1)
            );

            const ContentType = contentType(path.extname(FilePath));

            if (fs.existsSync(FilePath) && ContentType)
                return new Response(await Bun.file(FilePath).arrayBuffer(), {
                    headers: {
                        "Content-Type": ContentType,
                    },
                });
        }

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // check if this is from a wildcard match
        const IsFromWildcard = search.get("_priv_isFromWildcard") === "true";
        const HostnameURL =
            (BundlesDB.config &&
                BundlesDB.config.app &&
                BundlesDB.config.app.hostname &&
                `https://${BundlesDB.config.app.hostname}/`) ||
            "/";

        // load doc view if specified
        if (search.get("view") && search.get("view") === "doc")
            return await new PasteDocView().request(request, server);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/dec/")) name = name.split("paste/dec/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request, server);

        // if name is referencing a profile, forward to ProfileView
        if (name.startsWith("~")) return new ProfileView().request(request, server);

        // attempt to get paste
        const _fetchStart = performance.now();

        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // ...get revision
        let RevisionNumber = 0;
        if (search.get("r")) {
            const revision = await db.GetRevision(
                name,
                parseFloat(search.get("r")!)
            );

            // ...return 404 if revision doesn't exist
            if (!revision[0] || !revision[2]) return new _404Page().request(request);

            // ...update result
            result.Content = revision[2].Content.split("_metadata:")[0];
            result.EditDate = revision[2].EditDate;
            RevisionNumber = revision[2].EditDate;
        }

        // ...end performance timer
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
                BundlesDB.config.log &&
                BundlesDB.config.log.events.includes("view_paste") &&
                // make sure we haven't already added this view
                // (make sure length of query for log is 0)
                (
                    await BundlesDB.Logs.QueryLogs(
                        `"Content" = '${result.CustomURL};${SessionCookieValue}'`
                    )
                )[2].length === 0 &&
                // make sure session id is valid
                !SessionCookie.startsWith("session-id=refresh;")
            )
                await BundlesDB.Logs.CreateLog({
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
            result.Metadata &&
            result.Metadata.PasteType === "builder" &&
            search.get("nobuilder") === null
        ) {
            // get parsed content
            const TrueContent = BaseParser.parse(
                result.Content.split("_builder:")[1]
            );

            // get current page
            let Page: PageNode = TrueContent.Pages.find(
                (n: Node) => n.Type === "Page"
            );

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
                                    ad-blocker. Bundles collects no
                                    personally-identifiable information by default,
                                    and actively works to ensure your privacy and
                                    safety. Bundles is entirely open-source, you can
                                    view the source{" "}
                                    <a href="https://codeberg.org/sentrytwo/bundles">
                                        here
                                    </a>
                                    .
                                </p>

                                <p>
                                    Builder pastes are rendered on the client using
                                    Preact, a very small (&lt;3kb) React renderer.
                                    Bundles loads very few assets to display this
                                    page, so there should not be a bandwidth concern
                                    when viewing this page.
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
                                )}\`, false); window.Debug = Debug; window.Metadata = ${JSON.stringify(
                                    result.Metadata
                                )}`,
                            }}
                        />

                        {/* curiosity */}
                        <Curiosity Association={Association} />

                        {/* toolbar */}
                        <Modal
                            buttonid="bundles:button.PasteOptions"
                            modalid="bundles:modal.PasteOptions"
                            noIdMatch={true} // use `window.modals["bundles:modal.PasteOptions"](true)` instead
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
                                        href={`${HostnameURL}paste/builder?edit=${
                                            result.CustomURL
                                        }${
                                            RevisionNumber !== 0
                                                ? `&r=${RevisionNumber}`
                                                : ""
                                        }`}
                                        className="button round"
                                        disabled={HideSource}
                                    >
                                        Edit
                                    </a>

                                    <a
                                        href={`${HostnameURL}r/${result.CustomURL}`}
                                        class={"button round"}
                                        title={"Inspect Paste"}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            style={{
                                                marginTop: "2px",
                                            }}
                                            aria-label={"Repo Symbol"}
                                        >
                                            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                                        </svg>
                                        More
                                    </a>

                                    {BundlesDB.config.app &&
                                        BundlesDB.config.app.enable_comments ===
                                            true &&
                                        (!result.Metadata ||
                                            !result.Metadata!.Comments ||
                                            result.Metadata!.Comments.Enabled !==
                                                false) && (
                                            <a
                                                href={`${HostnameURL}c/${result.CustomURL}`}
                                                className="button round"
                                            >
                                                Comments ({result.Comments || 0})
                                            </a>
                                        )}
                                </div>

                                <hr />

                                {BundlesDB.config.log &&
                                    BundlesDB.config.log.events.includes(
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
                                                false &&
                                            result.Metadata.Owner !==
                                                result.CustomURL &&
                                            result.Metadata.Owner !==
                                                "Sessions are disabled" && (
                                                <p>
                                                    Owner:{" "}
                                                    <a
                                                        href={`${HostnameURL}~${result.Metadata.Owner}`}
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
                        <link rel="icon" href={Star ? Star.Source : "/favicon"} />
                        <PasteOpenGraph paste={result} url={url} isBuilder={true} />
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
                    <main class={"flex flex-column g-4"}>
                        {search.get("UnhashedEditPassword") && (
                            <div>
                                <Expandable title={"Looking for your edit code?"}>
                                    <StaticCode margin={false}>
                                        {`Edit code for ${
                                            result.CustomURL
                                        }:\n@@ ${"=".repeat(
                                            search.get("UnhashedEditPassword")!
                                                .length
                                        )} @@\n   ${search.get(
                                            "UnhashedEditPassword"
                                        )}\n@@ ${"=".repeat(
                                            search.get("UnhashedEditPassword")!
                                                .length
                                        )} @@\nDO NOT LOSE IT! (${new Date().getTime()})`}
                                    </StaticCode>
                                </Expandable>

                                <script
                                    dangerouslySetInnerHTML={{
                                        __html: `window.addEventListener("blur", () => {
                                            window.location.href = "?";
                                        });`,
                                    }}
                                />
                            </div>
                        )}

                        {RevisionNumber !== 0 && (
                            <div class={"mdnote note-info"}>
                                <b class={"mdnote-title"}>Viewing Revision</b>
                                <p>
                                    This may not be the live content of this paste.{" "}
                                    <a href={`/r/rev/${name}`}>All Versions</a>
                                </p>
                            </div>
                        )}

                        <MessageDisplays search={search} />

                        {result.ViewPassword && <DecryptionForm paste={result} />}

                        {BundlesDB.config.app &&
                            BundlesDB.config.app.footer &&
                            BundlesDB.config.app.footer.info &&
                            BundlesDB.config.app.footer.info.split("?")[0] ===
                                result.CustomURL &&
                            InformationPageNote()}

                        <Card
                            round={true}
                            border={true}
                            secondary={true}
                            class={"tab-container secondary round"}
                            style={{
                                height: "max-content",
                                maxHeight: "initial",
                                marginBottom: 0,
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
                        </Card>

                        <div
                            class={
                                "flex mobile:flex-column justify-space-between g-4 full"
                            }
                        >
                            <div
                                class={
                                    "mobile:center flex flex-wrap justify-center g-4"
                                }
                                style={{
                                    width: "max-content",
                                    height: "max-content",
                                }}
                            >
                                <a
                                    class={`button border round${
                                        HideSource !== true ? " green-cta" : " red"
                                    }`}
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
                                    }${
                                        RevisionNumber !== 0
                                            ? `&r=${RevisionNumber}`
                                            : ""
                                    }`}
                                >
                                    {(HideSource && (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Lock Symbol"}
                                        >
                                            <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 6V4a2.5 2.5 0 1 0-5 0v2Z"></path>
                                        </svg>
                                    )) || (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Pencil Symbol"}
                                        >
                                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                        </svg>
                                    )}
                                    Edit
                                </a>

                                {BundlesDB.config.app &&
                                    BundlesDB.config.app.enable_comments === true &&
                                    (!result.Metadata ||
                                        !result.Metadata.Comments ||
                                        result.Metadata.Comments.Enabled !==
                                            false) && (
                                        <a
                                            class={"button border round"}
                                            href={`${HostnameURL}c/${result.CustomURL}`}
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
                                    href={`${HostnameURL}r/${result.CustomURL}`}
                                    class={"button border round"}
                                    title={"Inspect Paste"}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        style={{
                                            marginTop: "2px",
                                        }}
                                        aria-label={"Repo Symbol"}
                                    >
                                        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                                    </svg>
                                    More
                                </a>
                            </div>

                            <div
                                class={"mobile:justify-center text-right"}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "flex-end",
                                    color: "var(--text-color-faded)",
                                }}
                            >
                                {result.Metadata &&
                                    result.Metadata.Badges &&
                                    result.Metadata.Badges.split(",").length > 0 && (
                                        <div class={"flex flex-wrap g-4"}>
                                            {result.Metadata.Badges.split(",").map(
                                                (badge) => (
                                                    <span class={"chip badge"}>
                                                        {badge}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}

                                {result.ExpireOn !== undefined && (
                                    <span>Expires: {result.ExpireOn}</span>
                                )}

                                <span
                                    class={"flex align-center g-4"}
                                    title={new Date(result.PubDate).toUTCString()}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Calendar Symbol"}
                                    >
                                        <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"></path>
                                    </svg>
                                    <span>
                                        Pub:{" "}
                                        <span className="utc-date-to-localize">
                                            {new Date(result.PubDate).toUTCString()}
                                        </span>
                                    </span>
                                </span>

                                <span
                                    class={"flex align-center g-4"}
                                    title={new Date(result.EditDate).toUTCString()}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Calendar Symbol"}
                                    >
                                        <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"></path>
                                    </svg>
                                    <span>
                                        Edit:{" "}
                                        <span className="utc-date-to-localize">
                                            {new Date(result.EditDate).toUTCString()}
                                        </span>
                                    </span>
                                </span>

                                {result.Metadata && (
                                    <>
                                        {result.Metadata.Owner &&
                                            !result.Content.includes(
                                                "<% disable show_owner %>"
                                            ) &&
                                            result.Metadata.ShowOwnerEnabled !==
                                                false &&
                                            result.Metadata.Owner !==
                                                result.CustomURL &&
                                            result.Metadata.Owner !==
                                                "Sessions are disabled" && (
                                                <span
                                                    class={"flex align-center g-4"}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={
                                                            "Shield Lock Symbol"
                                                        }
                                                    >
                                                        <path d="m8.533.133 5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667l5.25-1.68a1.748 1.748 0 0 1 1.066 0Zm-.61 1.429.001.001-5.25 1.68a.251.251 0 0 0-.174.237V7c0 1.36.275 2.666 1.057 3.859.784 1.194 2.121 2.342 4.366 3.298a.196.196 0 0 0 .154 0c2.245-.957 3.582-2.103 4.366-3.297C13.225 9.666 13.5 8.358 13.5 7V3.48a.25.25 0 0 0-.174-.238l-5.25-1.68a.25.25 0 0 0-.153 0ZM9.5 6.5c0 .536-.286 1.032-.75 1.3v2.45a.75.75 0 0 1-1.5 0V7.8A1.5 1.5 0 1 1 9.5 6.5Z"></path>
                                                    </svg>
                                                    <span>
                                                        Owner:{" "}
                                                        <a
                                                            href={`${HostnameURL}~${result.Metadata.Owner}`}
                                                        >
                                                            {result.Metadata.Owner
                                                                .length > 25
                                                                ? `${result.Metadata.Owner}...`
                                                                : result.Metadata
                                                                      .Owner}
                                                        </a>
                                                    </span>
                                                </span>
                                            )}
                                    </>
                                )}

                                {BundlesDB.config.log &&
                                    BundlesDB.config.log.events.includes(
                                        "view_paste"
                                    ) &&
                                    (!result.Metadata ||
                                        result.Metadata.ShowViewCount !== false) && (
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

                        {!IsFromWildcard && (
                            <Footer
                                ShowBottomRow={
                                    (
                                        (
                                            BundlesDB.config.app || {
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
                            __html: `import fix from "/ClientFixMarkdown.js"; fix();
                            window.Metadata = ${JSON.stringify(result.Metadata)}`,
                        }}
                    />
                </>,
                <>
                    <link
                        rel="icon"
                        href={
                            result.Metadata && result.Metadata.Favicon
                                ? result.Metadata.Favicon
                                : "/favicon"
                        }
                    />

                    <PasteOpenGraph paste={result} url={url} isBuilder={false} />
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
        if (name.startsWith("d/")) name = name.slice(2);

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
                BundlesDB.config.log &&
                BundlesDB.config.log.events.includes("view_paste") &&
                // make sure we haven't already added this view
                // (make sure length of query for log is 0)
                (
                    await BundlesDB.Logs.QueryLogs(
                        `"Content" = '${result.CustomURL};${SessionCookieValue}'`
                    )
                )[2].length === 0 &&
                // make sure session id is valid
                !SessionCookie.startsWith("session-id=refresh;")
            )
                await BundlesDB.Logs.CreateLog({
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
                        <SidebarLayout
                            nav={
                                <TopNav breadcrumbs={[result.CustomURL]}>
                                    <Button
                                        type="border"
                                        round={true}
                                        href={`/paste/writer?edit=${name}`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Pencil Symbol"}
                                        >
                                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                        </svg>
                                        Edit
                                    </Button>
                                </TopNav>
                            }
                            sidebar={
                                <>
                                    {BundlesDB.config.app &&
                                        BundlesDB.config.app.footer &&
                                        BundlesDB.config.app.footer.info &&
                                        BundlesDB.config.app.footer.info.split(
                                            "?"
                                        )[0] === result.CustomURL &&
                                        InformationPageNote()}

                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: TableOfContents,
                                        }}
                                    />
                                </>
                            }
                        >
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

                            <div style={{ opacity: "75%" }}>
                                <ul>
                                    <li>
                                        Published:{" "}
                                        <span class={"utc-date-to-localize"}>
                                            {new Date(result.PubDate).toUTCString()}
                                        </span>
                                    </li>
                                    <li>
                                        Updated:{" "}
                                        <span class={"utc-date-to-localize"}>
                                            {new Date(result.EditDate).toUTCString()}
                                        </span>
                                    </li>
                                    <li>
                                        <a href={`/r/${result.CustomURL}`}>
                                            More Info
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </SidebarLayout>

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
            let Query = search.get("q");
            const SearchBy = search.get("by") || "CustomURL";
            const Offset = parseInt(search.get("offset") || "0");

            // build query
            let query = `\"${SearchBy}\" LIKE \'%${(Query || "")
                .toLowerCase()
                .replaceAll(
                    '"',
                    '\\"'
                )}%' AND "Metadata" NOT LIKE '%"IncludeInSearch":false%' ORDER BY "CustomURL" ASC LIMIT 100 OFFSET ${Offset}`;

            // if q does not exist (or is "explore"), set explore mode
            let ExploreMode = false;
            if (!Query || Query === "explore") {
                query = `"CustomURL" IS NOT NULL ORDER BY cast(\"EditDate\" as float) DESC LIMIT 100`;

                search.set("q", "explore");
                Query = "explore";

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
                BundlesDB.config.app &&
                BundlesDB.config.app.enable_search === false &&
                search.get("group") === null
            )
                return new _404Page().request(request);

            // return
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["search"]}>
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

                        <main class={"small flex flex-column g-8"}>
                            <div class="flex full justify-space-between align-center flex-wrap mobile:justify-center">
                                <SearchForm query={Query} by={SearchBy} />

                                <span>
                                    <b>{pastes.length + Offset}</b> result
                                    {pastes.length > 1 || pastes.length === 0
                                        ? "s"
                                        : ""}{" "}
                                    indexed
                                </span>
                            </div>

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Results</b>}
                            >
                                <div className="flex flex-column g-4">
                                    {pastes.map((paste) => (
                                        <Card
                                            round={true}
                                            border={true}
                                            secondary={true}
                                        >
                                            <a href={`/r/${paste.CustomURL}`}>
                                                {paste.CustomURL}
                                            </a>
                                        </Card>
                                    ))}
                                </div>
                            </CardWithHeader>

                            <div class="flex full justify-center flex-wrap g-4">
                                {Offset > 0 && (
                                    <Button
                                        round={true}
                                        href={`?q=${Query}&by=${SearchBy}&offset=${
                                            Offset - 100
                                        }`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Chevron Left"}
                                        >
                                            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z"></path>
                                        </svg>
                                        Previous Page
                                    </Button>
                                )}

                                {pastes.length >= 100 && (
                                    <Button
                                        round={true}
                                        href={`?q=${Query}&by=${SearchBy}&offset=${
                                            Offset + pastes.length
                                        }`}
                                    >
                                        Next Page
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Chevron Right"}
                                        >
                                            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
                                        </svg>
                                    </Button>
                                )}
                            </div>
                        </main>
                    </>,
                    <>
                        <title>Results for "{Query}"</title>
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
            if (BundlesDB.config.app && BundlesDB.config.app.enable_search === false)
                return new _404Page().request(request);

            // show search home
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav />

                        <main class={"small flex g-4 flex-column"}>
                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Search by URL</b>}
                            >
                                <SearchForm alwaysCenter={true} />
                            </CardWithHeader>

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Search by Content</b>}
                            >
                                <SearchForm by="Content" alwaysCenter={true} />
                            </CardWithHeader>

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Search by Group</b>}
                            >
                                <SearchForm by="GroupName" alwaysCenter={true} />
                            </CardWithHeader>
                        </main>
                    </>,
                    <>
                        <meta
                            name="description"
                            content={`Search Pastes on ${BundlesDB.config.name}`}
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
            (BundlesDB.config &&
                BundlesDB.config.app &&
                BundlesDB.config.app.hostname &&
                `https://${BundlesDB.config.app.hostname}/`) ||
            "/";

        // return 404 if comments are disabled
        if (!BundlesDB.config.app || BundlesDB.config.app.enable_comments !== true)
            return new _404Page().request(request);

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("c/")) name = name.split("c/")[1];

        // return home if name === ""
        if (name === "") return new Home().request(request, server);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result || result.HostServer) return new _404Page().request(request);

        // return 404 if page does not allow comments
        if (
            result.Metadata &&
            result.Metadata.Comments &&
            result.Metadata.Comments.Enabled === false
        )
            return new _404Page().request(request);

        // get associated paste
        let PostingAs: string | undefined = undefined;

        const _ip = API.GetRemoteIP(request, server);
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
                <>
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

                    <div className="flex flex-column g-8">
                        <div
                            className="card secondary flex justify-center"
                            style={{
                                padding: "calc(var(--u-12) * 4) var(--u-12)",
                            }}
                        >
                            <h1 class={"no-margin"}>{name}</h1>
                        </div>

                        <main class={"small flex flex-column g-4"}>
                            <ReposNav name={name} current="Home" />

                            <div
                                class={
                                    "card round border secondary flex mobile:flex-column g-4"
                                }
                            >
                                <a
                                    href={`${HostnameURL}?CommentOn=${result.CustomURL}`}
                                    className="button full round border"
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
                                                className="button full round border"
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
                                                            "button full round border modal:bundles:button.logout"
                                                        }
                                                    >
                                                        Manage Comments
                                                    </button>
                                                )) || (
                                                <a
                                                    // show edit button if we're associated with this paste
                                                    class={
                                                        "button full round border"
                                                    }
                                                    href={"?edit=true"}
                                                >
                                                    Manage Comments
                                                </a>
                                            )
                                        ) : (
                                            <button
                                                // show login button if we're not already associated with a paste
                                                class={
                                                    "button full round border modal:bundles:button.login"
                                                }
                                            >
                                                Manage Comments
                                            </button>
                                        )}
                                    </>
                                )) || (
                                    <a
                                        href={"?edit=false"}
                                        className="button full round border"
                                    >
                                        Stop Editing
                                    </a>
                                )}
                            </div>

                            <div class={"card border secondary round NoPadding"}>
                                <div className="card round header">
                                    <b>Thread</b>
                                </div>

                                <div className="card round secondary has-header flex mobile\:justify-center align-center justify-space-between g-4 flex-wrap">
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
                                                    href="#bundles:logout"
                                                    class={
                                                        "modal:bundles:button.logout"
                                                    }
                                                >
                                                    logout
                                                </a>
                                                )
                                            </>
                                        )) || (
                                            <>
                                                <b>anonymous</b> (
                                                <a
                                                    href="#bundles:login"
                                                    class={
                                                        "modal:bundles:button.login"
                                                    }
                                                >
                                                    login
                                                </a>
                                                )
                                            </>
                                        )}
                                    </span>

                                    {PreviousInThread && (
                                        <a
                                            href={`/c/${PreviousInThread}`}
                                            class={"button secondary round"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Undo Symbol"}
                                                style={{ userSelect: "none" }}
                                            >
                                                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>
                                            </svg>
                                            up thread
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div class={"flex flex-column g-4"}>
                                <MessageDisplays search={search} />

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
                                        <div class={"comment"}>
                                            {/* main stuff */}
                                            <div
                                                class={
                                                    "card border round NoPadding flex flex-column justify-space-between"
                                                }
                                                style={{
                                                    width: "100%",
                                                }}
                                            >
                                                {/* stuff */}
                                                <div>
                                                    <div class={"card round header"}>
                                                        <ul
                                                            className="__footernav"
                                                            style={{
                                                                paddingLeft: 0,
                                                                margin: 0,
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

                                                            {comment.Associated &&
                                                                comment.Associated !==
                                                                    comment.CustomURL && (
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

                                                            {comment.IsPM ===
                                                                "true" && (
                                                                <li
                                                                    title={
                                                                        "This is a private comment, but it can still be seen by people with a direct link."
                                                                    }
                                                                >
                                                                    <span
                                                                        class={
                                                                            "chip"
                                                                        }
                                                                        style={{
                                                                            color: "var(--text-color-faded)",
                                                                        }}
                                                                    >
                                                                        🔒 private
                                                                    </span>
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>

                                                    <div
                                                        className="card NoPadding flex flex-wrap"
                                                        style={{
                                                            borderBottom:
                                                                "solid 1px var(--background-surface2a)",
                                                        }}
                                                    >
                                                        {/* social */}
                                                        {CommentOwner &&
                                                            CommentOwner.Metadata &&
                                                            CommentOwner.Metadata
                                                                .SocialIcon && (
                                                                <div
                                                                    style={{
                                                                        width: "20%",
                                                                        padding:
                                                                            "var(--u-10)",
                                                                        borderRight:
                                                                            "solid 1px var(--background-surface2a)",
                                                                    }}
                                                                >
                                                                    <img
                                                                        title={
                                                                            CommentOwner
                                                                                .Metadata
                                                                                .Owner
                                                                        }
                                                                        class={
                                                                            "card border round NoPadding"
                                                                        }
                                                                        src={
                                                                            CommentOwner
                                                                                .Metadata
                                                                                .SocialIcon
                                                                        }
                                                                        alt={
                                                                            CommentOwner
                                                                                .Metadata
                                                                                .Owner
                                                                        }
                                                                    />
                                                                </div>
                                                            )}

                                                        {/* content */}
                                                        <div
                                                            style={{
                                                                maxHeight: "50rem",
                                                                overflow: "auto",
                                                                width:
                                                                    CommentOwner &&
                                                                    CommentOwner.Metadata &&
                                                                    CommentOwner
                                                                        .Metadata
                                                                        .SocialIcon
                                                                        ? "80%"
                                                                        : "100%",
                                                                padding:
                                                                    "var(--u-10)",
                                                                background:
                                                                    "var(--background-surface1)",
                                                            }}
                                                            dangerouslySetInnerHTML={{
                                                                __html: comment.Content!,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* actions bar */}
                                                <div
                                                    class={
                                                        "card round has-header flex align-center justify-space-between flex-wrap g-4"
                                                    }
                                                >
                                                    <div className="flex g-4">
                                                        <a
                                                            class={
                                                                "button round border"
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
                                                                "button round border"
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
                                                                        "button border red round"
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

                                                    <a
                                                        href={`/c/${comment.CustomURL}`}
                                                    >
                                                        View{" "}
                                                        <b>{comment.Comments}</b>{" "}
                                                        repl
                                                        {comment.Comments! > 1
                                                            ? "ies"
                                                            : comment.Comments === 1
                                                              ? "y"
                                                              : "ies"}
                                                    </a>
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
                </>,
                <>
                    <link rel="icon" href="/favicon" />

                    <PasteOpenGraph
                        paste={result}
                        url={url}
                        isBuilder={false}
                        title={`${result.CustomURL} (comments)`}
                        content={`View paste comments (${result.Comments || 0})`}
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
        let name = url.pathname.toLowerCase();

        if (name.startsWith("/s/")) name = name.split("/s/")[1];
        else if (name.startsWith("/paste/settings/"))
            name = name.split("/paste/settings/")[1];

        if (!url.pathname.startsWith("/s/") && name !== "/s")
            return await new GetPasteFromURL().request(request, server);

        // get association
        const _ip = API.GetRemoteIP(request, server);
        const Association = await GetAssociation(request, _ip);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // if no paste is provided, show global settings
        if (name === "/s") {
            // render
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav breadcrumbs={["s"]} />

                        <main class={"small flex flex-column align-center g-4"}>
                            <h4 style={{ marginTop: 0 }}>User Settings</h4>

                            <Card round={true} border={true}>
                                <CardWithHeader
                                    round={true}
                                    border={true}
                                    secondary={true}
                                    header={<b>User Account</b>}
                                >
                                    <div class="flex justify-space-between align-center full flex-wrap">
                                        <span>
                                            <b>Associated With:</b>{" "}
                                            {Association[0] === true
                                                ? Association[1]
                                                : "anonymous"}{" "}
                                        </span>

                                        <div className="flex g-4 flex-wrap">
                                            {Association[0] === true && (
                                                <Button
                                                    type="secondary"
                                                    round={true}
                                                    href={`/s/${Association[1]}`}
                                                >
                                                    Account Settings
                                                </Button>
                                            )}

                                            {Association[0] === true ? (
                                                <Button
                                                    type="border"
                                                    round={true}
                                                    href={"javascript:"}
                                                    class={
                                                        "modal:bundles:button.logout"
                                                    }
                                                >
                                                    Logout
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="border"
                                                    round={true}
                                                    href={"javascript:"}
                                                    class={
                                                        "modal:bundles:button.login"
                                                    }
                                                >
                                                    Login
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardWithHeader>

                                <AuthModals
                                    use={
                                        Association[0] === true ? "logout" : "login"
                                    }
                                />

                                <hr />

                                <div id="_doc" class={"flex flex-column g-4"}>
                                    <noscript>
                                        Unable to render user settings options
                                        without JavaScript enabled! The user settings
                                        are rendered client-side using Preact, and
                                        saved to the browser's localStorage.
                                    </noscript>
                                </div>
                            </Card>

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
                        <title>User Settings - {BundlesDB.config.name}</title>
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
                !BundlesDB.config.app ||
                BundlesDB.config.app.enable_paste_settings === false
            )
                return new _404Page().request(request);

            // get paste
            const result = await db.GetPasteFromURL(name);
            if (!result || result.HostServer) return new _404Page().request(request);

            // try to fetch custom domain log
            const CustomDomainLog = (
                await BundlesDB.Logs.QueryLogs(
                    `"Type" = \'custom_domain\' AND \"Content\" LIKE \'${result.CustomURL};%\'`
                )
            )[2][0];

            // render
            return new Response(
                Renderer.Render(
                    <>
                        <TopNav
                            breadcrumbs={["s", name]}
                            margin={false}
                            IncludeLoading={false}
                        />

                        <LoadingModal />

                        <div className="flex flex-column g-8">
                            <div
                                className="card secondary flex justify-center"
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
                                        class={"mobile:justify-center"}
                                        style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            margin: "1rem 0 1rem 0",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <h4 class={"no-margin text-center"}>
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
                                                style={{ userSelect: "none" }}
                                            >
                                                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>
                                            </svg>
                                            Back
                                        </a>
                                    </div>

                                    <p>
                                        Paste settings require the paste edit code to
                                        save. If you want to change how this paste
                                        looks for you, view{" "}
                                        <a href={"/s"}>User Settings</a>
                                    </p>

                                    <hr />

                                    <div
                                        class={
                                            "mobile:justify-center flex justify-center align-center flex-wrap"
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

                                            <div className="tooltip-wrapper mobile\:max flex justify-center">
                                                <input
                                                    style={{
                                                        width: "100%",
                                                    }}
                                                    class={"round"}
                                                    type="text"
                                                    placeholder={"Edit code"}
                                                    maxLength={
                                                        BundlesDB.MaxPasswordLength
                                                    }
                                                    minLength={
                                                        BundlesDB.MinPasswordLength
                                                    }
                                                    name={"EditPassword"}
                                                    disabled={
                                                        Association[0] &&
                                                        Association[1] ===
                                                            result.Metadata!.Owner
                                                    }
                                                    required
                                                />

                                                {Association[0] &&
                                                    Association[1] ===
                                                        result.Metadata!.Owner && (
                                                        <div className="card secondary round border tooltip top">
                                                            You don't need a
                                                            password, you own this!
                                                        </div>
                                                    )}
                                            </div>

                                            <input
                                                type="hidden"
                                                required
                                                name="Metadata"
                                                id={"Metadata"}
                                                value={""}
                                            />

                                            <button
                                                class={
                                                    "round green mobile:max modal:bundles:button.Loading"
                                                }
                                            >
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

                                    {BundlesDB.config.log &&
                                        BundlesDB.config.log.events.includes(
                                            "custom_domain"
                                        ) && (
                                            <>
                                                <hr id={"CustomDomain"} />
                                                <h4>Custom Domain</h4>

                                                <Card
                                                    round={true}
                                                    border={true}
                                                    secondary={true}
                                                    class="flex justify-space-between flex-wrap g-4"
                                                >
                                                    <div
                                                        class={"mobile:max"}
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
                                                        className="flex flex-column g-8 flex-wrap mobile\:max"
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
                                                                "round mobile:max secondary"
                                                            }
                                                            type="text"
                                                            placeholder={"Edit code"}
                                                            maxLength={
                                                                BundlesDB.MaxPasswordLength
                                                            }
                                                            minLength={
                                                                BundlesDB.MinPasswordLength
                                                            }
                                                            name={"EditPassword"}
                                                            required
                                                        />

                                                        <input
                                                            class={
                                                                "round mobile:max secondary"
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
                                                            className="secondary green round modal:bundles:button.Loading"
                                                            style={{ width: "100%" }}
                                                        >
                                                            Save
                                                        </button>
                                                    </form>
                                                </Card>
                                            </>
                                        )}
                                </div>

                                <script
                                    type={"module"}
                                    dangerouslySetInnerHTML={{
                                        __html: `import _e from "/MetadataEditor.js";

                                        window.ENTRYDB_CONFIG_ENABLE_COMMENTS = ${
                                            BundlesDB.config.app &&
                                            BundlesDB.config.app.enable_comments ===
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
                        <title>Paste Settings - {BundlesDB.config.name}</title>
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
            !BundlesDB.config.log ||
            !BundlesDB.config.log.events.includes("notification")
        )
            return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        if (!Association[0]) return new _401PageEndpoint().request(request);

        // get notifications
        const Notifications = (
            await BundlesDB.Logs.QueryLogs(
                `"Type" = \'notification\' AND \"Content\" LIKE \'%${Association[1]}\'`
            )
        )[2];

        // clear notifications
        for (const Notification of Notifications)
            await BundlesDB.Logs.DeleteLog(Notification.ID);

        // render
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["paste", "notifications"]} />

                    <main class={"small flex flex-column g-4"}>
                        <Card
                            round={true}
                            border={true}
                            class="flex justify-space-between g-4 flex-wrap"
                        >
                            <span>
                                {Notifications.length} notification
                                {Notifications.length > 1 ||
                                Notifications.length === 0
                                    ? "s"
                                    : ""}
                            </span>
                        </Card>

                        {Notifications.map((Notification) => (
                            <Card
                                round={true}
                                border={true}
                                secondary={true}
                                class={
                                    "flex justify-space-between align-center flex-wrap g-4 mobile:justify-center"
                                }
                            >
                                <ul
                                    class="__footernav flex-wrap mobile\:justify-center"
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
                                            )[0].startsWith("c/")
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
                            </Card>
                        ))}
                    </main>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>Notifications - {BundlesDB.config.name}</title>
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
 * @class Writer
 * @implements {Endpoint}
 */
export class Writer implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.searchParams);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        if (!Association[0]) return new _401PageEndpoint().request(request);

        // get paste if search.edit is not null
        let paste: Partial<Paste> | undefined;
        let RevisionNumber = 0;

        if (search.get("edit")) {
            paste = await db.GetPasteFromURL(search.get("edit")!);

            // get revision
            if (search.get("r") && paste) {
                const revision = await db.GetRevision(
                    search.get("edit")!,
                    parseFloat(search.get("r")!)
                );

                if (!revision[0] || !revision[2])
                    return new _404Page().request(request);

                // ...update result
                paste.Content = revision[2].Content.split("_metadata:")[0];
                paste.EditDate = revision[2].EditDate;
                RevisionNumber = revision[2].EditDate;
            }
        }

        // check PrivateSource value
        if (
            paste &&
            paste.Metadata &&
            paste.Metadata.PrivateSource === true &&
            paste.Metadata.Owner &&
            paste.Metadata.Owner !== Association[1]
        )
            return new _401PageEndpoint().request(request);

        // get all pastes by current user
        const AllPastes =
            Association[0] === true
                ? (await db.GetAllPastesOwnedByPaste(Association[1])).sort(
                      (a, b) => b.EditDate - a.EditDate
                  )
                : undefined;

        // render
        return new Response(
            Renderer.Render(
                <>
                    <SidebarLayout
                        sidebar={
                            <>
                                <TopNav
                                    breadcrumbs={["paste", "writer"]}
                                    margin={false}
                                >
                                    <Button
                                        round={true}
                                        class="modal:bundles\:button.PublishPaste green-cta"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Check Mark Symbol"}
                                        >
                                            <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-.018-1.042.751.751 0 0 0-1.042-.018L6.75 9.19 5.28 7.72a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2 2a.75.75 0 0 0 1.06 0Z"></path>
                                        </svg>
                                        Save
                                    </Button>
                                </TopNav>

                                <div class="content flex flex-column g-4">
                                    {AllPastes &&
                                        AllPastes.map((_paste) => (
                                            <Button
                                                href={
                                                    !_paste.Content.startsWith(
                                                        "_builder:"
                                                    )
                                                        ? `/paste/writer?edit=${_paste.CustomURL}`
                                                        : `/paste/builder?edit=${_paste.CustomURL}`
                                                }
                                                round={true}
                                                class={`full justify-start${
                                                    paste &&
                                                    _paste.CustomURL ===
                                                        paste.CustomURL
                                                        ? " active"
                                                        : ""
                                                }`}
                                            >
                                                {(!_paste.Content.startsWith(
                                                    "_builder:"
                                                ) && (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={
                                                            "Markdown Symbol"
                                                        }
                                                    >
                                                        <path d="M14.85 3c.63 0 1.15.52 1.14 1.15v7.7c0 .63-.51 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.84V4.15C0 3.52.52 3 1.15 3ZM9 11V5H7L5.5 7 4 5H2v6h2V8l1.5 1.92L7 8v3Zm2.99.5L14.5 8H13V5h-2v3H9.5Z"></path>
                                                    </svg>
                                                )) || (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={
                                                            "Binary File Symbol"
                                                        }
                                                    >
                                                        <path d="M4 1.75C4 .784 4.784 0 5.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 15h-9a.75.75 0 0 1 0-1.5h9a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5H5.75a.25.25 0 0 0-.25.25v2a.75.75 0 0 1-1.5 0Zm-4 6C0 6.784.784 6 1.75 6h1.5C4.216 6 5 6.784 5 7.75v2.5A1.75 1.75 0 0 1 3.25 12h-1.5A1.75 1.75 0 0 1 0 10.25ZM6.75 6h1.5a.75.75 0 0 1 .75.75v3.75h.75a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h.75v-3h-.75a.75.75 0 0 1 0-1.5Zm-5 1.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25Zm9.75-5.938V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                                                    </svg>
                                                )}

                                                {_paste.CustomURL}
                                            </Button>
                                        ))}
                                </div>
                            </>
                        }
                    >
                        <div
                            class={"tabbar flex g-4 card border"}
                            style={{
                                width: "calc(100% + 1.5rem * 2)",
                                margin: "-1.5rem 0 1rem -1.5rem", // offset the padding of .tab-container
                                background: "var(--background-surface0-5)",
                                border: "none",
                                borderBottom:
                                    "solid 1px var(--background-surface2a)",
                            }}
                        >
                            <button
                                id={"editor-open-tab-text"}
                                style={{
                                    borderRadius: "var(--u-04)",
                                }}
                            >
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
                                class={"secondary"}
                                id={"editor-open-tab-preview"}
                                style={{
                                    borderRadius: "var(--u-04)",
                                }}
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

                        <div id={"-editor"}>
                            <div
                                id={"editor-tab-text"}
                                class={"active editor-tab -editor"}
                            />

                            <div
                                id={"editor-tab-preview"}
                                class={"editor-tab -editor"}
                            />
                        </div>

                        <script
                            type="module"
                            dangerouslySetInnerHTML={{
                                __html: `import CreateEditor from "/Editor.js?v=${
                                    pack.version
                                }";
                                CreateEditor("editor-tab-text", \`${encodeURIComponent(
                                    (paste || { Content: "" })!.Content!
                                )}\`);`,
                            }}
                        />
                    </SidebarLayout>

                    <PublishModals
                        MatchID={false}
                        EditingPaste={paste ? paste.CustomURL : undefined}
                        DisablePassword={
                            paste &&
                            paste.Metadata &&
                            paste.Metadata.Owner === Association[1]
                        }
                        EnableDrafts={
                            BundlesDB.config.app &&
                            BundlesDB.config.app.enable_versioning === true
                        }
                        EnablePrivate={
                            BundlesDB.config.app &&
                            BundlesDB.config.app.enable_private_pastes !== false
                        }
                        EnableGroups={
                            BundlesDB.config.app &&
                            BundlesDB.config.app.enable_groups !== false
                        }
                        EnableExpiry={
                            BundlesDB.config.app &&
                            BundlesDB.config.app.enable_expiry !== false
                        }
                        ViewingRevision={RevisionNumber !== 0}
                        Endpoints={{
                            new: "/api/new",
                            edit: "/api/edit",
                            delete: "/api/delete",
                        }}
                    />

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>Writer - {BundlesDB.config.name}</title>
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

// ...
import { ViewPasteMedia, InspectMedia } from "./repos/Media";
import { contentType } from "mime-types";
import PublishModals from "./components/site/modals/PublishModals";

// default export
export default {
    Curiosity,
    CheckInstance,
    OpenGraph,
    PasteOpenGraph,
    // pages
    GetPasteFromURL,
    PasteDocView,
    PastesSearch,
    PasteCommentsPage,
    UserSettings,
    ViewPasteMedia,
    InspectMedia,
    Notifications,
    Writer,
};
