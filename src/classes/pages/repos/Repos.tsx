/**
 * @file Handle Repos endpoints
 * @name Repos.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import BaseParser from "../../db/helpers/BaseParser";
import { Paste } from "../../db/objects/Paste";
import { CheckInstance, db } from "../Pages";
import EntryDB from "../../db/EntryDB";

// import components
import { BuilderDocument } from "../components/builder/schema";
import TopNav from "../components/site/TopNav";
import _404Page from "../components/404";
import { PageHeaders } from "../api/API";

// nav component
export function ReposNav(props: { name: string; current: string }) {
    return (
        <div
            class="card secondary border round flex g-4 mobile-flex-column"
            style={{ userSelect: "none" }}
        >
            <a
                href={`/paste/v/${props.name}`}
                className={`${
                    props.current === "Home" ? "secondary " : ""
                }button round full`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"House Symbol"}
                >
                    <path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Zm1.25 1.171a.25.25 0 0 0-.312 0l-5.25 4.2a.25.25 0 0 0-.094.196v7.019c0 .138.112.25.25.25H5.5V8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v5.25h2.75a.25.25 0 0 0 .25-.25V6.23a.25.25 0 0 0-.094-.195Z"></path>
                </svg>
                {props.name.length > 15
                    ? `${props.name.substring(0, 14)}...`
                    : props.name}
            </a>

            {EntryDB.config.app && EntryDB.config.app.enable_versioning && (
                <a
                    href={`/paste/v/r/${props.name}`}
                    className={`${
                        props.current === "Versions" ? "secondary " : ""
                    }button round full`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Versions Symbol"}
                    >
                        <path d="M7.75 14A1.75 1.75 0 0 1 6 12.25v-8.5C6 2.784 6.784 2 7.75 2h6.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14Zm-.25-1.75c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25ZM4.9 3.508a.75.75 0 0 1-.274 1.025.249.249 0 0 0-.126.217v6.5c0 .09.048.173.126.217a.75.75 0 0 1-.752 1.298A1.75 1.75 0 0 1 3 11.25v-6.5c0-.649.353-1.214.874-1.516a.75.75 0 0 1 1.025.274ZM1.625 5.533h.001a.249.249 0 0 0-.126.217v4.5c0 .09.048.173.126.217a.75.75 0 0 1-.752 1.298A1.748 1.748 0 0 1 0 10.25v-4.5a1.748 1.748 0 0 1 .873-1.516.75.75 0 1 1 .752 1.299Z"></path>
                    </svg>
                    Revisions
                </a>
            )}

            {(!EntryDB.config.app ||
                EntryDB.config.app.enable_paste_settings !== false) && (
                <a
                    href={`/paste/settings/${props.name}`}
                    className={`${
                        props.current === "Settings" ? "secondary " : ""
                    }button round full`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Gear Symbol"}
                    >
                        <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"></path>
                    </svg>
                    Settings
                </a>
            )}
        </div>
    );
}

// ...

/**
 * @export
 * @class RepoView
 * @implements {Endpoint}
 */
export class RepoView implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/v/")) name = name.split("paste/v/")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // get revision
        let RevisionNumber = 0;
        if (search.get("r")) {
            const revision = await db.GetRevision(
                name,
                parseFloat(search.get("r")!)
            );
            if (!revision[0] || !revision[2]) return new _404Page().request(request);

            // ...update result
            result.Content = revision[2].Content.split("_metadata:")[0];
            result.EditDate = revision[2].EditDate;
            RevisionNumber = revision[2].EditDate;
        }

        // detect if paste is a builder paste
        const BuilderPaste = result.Content.startsWith("_builder:");
        const BuilderDocument: BuilderDocument = BuilderPaste
            ? BaseParser.parse(
                  result.Content.split("_builder:")[1].split("_metadata:")[0]
              )
            : ({} as any);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav margin={false} />

                    <div className="flex flex-column g-8">
                        <div
                            className="card secondary flex justify-center"
                            style={{
                                padding: "calc(var(--u-12) * 4) var(--u-12)",
                            }}
                        >
                            <h1 class={"no-margin"}>{name}</h1>
                        </div>

                        <main className="small flex flex-column g-4">
                            <ReposNav name={name} current="Home" />

                            <div className="card border round NoPadding">
                                <div className="card round header">
                                    <b>File List</b>
                                </div>

                                <div
                                    className="card round has-header flex flex-column g-4"
                                    style={{
                                        userSelect: "none",
                                    }}
                                >
                                    <a
                                        href={`/${name}${
                                            RevisionNumber !== 0
                                                ? `?r=${RevisionNumber}`
                                                : ""
                                        }`}
                                        target={"_blank"}
                                        className="button round full justify-space-between flex-wrap"
                                    >
                                        <div className="flex align-center g-4">
                                            {(!BuilderPaste && (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    width="16"
                                                    height="16"
                                                    aria-label={"Markdown Symbol"}
                                                >
                                                    <path d="M14.85 3c.63 0 1.15.52 1.14 1.15v7.7c0 .63-.51 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.84V4.15C0 3.52.52 3 1.15 3ZM9 11V5H7L5.5 7 4 5H2v6h2V8l1.5 1.92L7 8v3Zm2.99.5L14.5 8H13V5h-2v3H9.5Z"></path>
                                                </svg>
                                            )) || (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    width="16"
                                                    height="16"
                                                    aria-label={"Binary File Symbol"}
                                                >
                                                    <path d="M4 1.75C4 .784 4.784 0 5.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 15h-9a.75.75 0 0 1 0-1.5h9a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5H5.75a.25.25 0 0 0-.25.25v2a.75.75 0 0 1-1.5 0Zm-4 6C0 6.784.784 6 1.75 6h1.5C4.216 6 5 6.784 5 7.75v2.5A1.75 1.75 0 0 1 3.25 12h-1.5A1.75 1.75 0 0 1 0 10.25ZM6.75 6h1.5a.75.75 0 0 1 .75.75v3.75h.75a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h.75v-3h-.75a.75.75 0 0 1 0-1.5Zm-5 1.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h1.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25Zm9.75-5.938V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                                                </svg>
                                            )}
                                            {name}
                                            {RevisionNumber !== 0
                                                ? `-r${RevisionNumber}`
                                                : ""}
                                            .{BuilderPaste ? "bldr" : "md"}
                                        </div>

                                        <span>
                                            {result.Content.length} characters
                                        </span>
                                    </a>

                                    {BuilderPaste && (
                                        <>
                                            <hr style={{ margin: 0 }} />

                                            {BuilderDocument.Pages.map((Page) => (
                                                <a
                                                    href={`/${name}#/${Page.ID}`}
                                                    target={"_blank"}
                                                    className="button round full justify-space-between flex-wrap"
                                                >
                                                    <div className="flex align-center g-4">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 16 16"
                                                            width="16"
                                                            height="16"
                                                            aria-label={
                                                                "File Link Symbol"
                                                            }
                                                        >
                                                            <path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 12.25 15h-7a.75.75 0 0 1 0-1.5h7a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5H3.75a.25.25 0 0 0-.25.25V4.5a.75.75 0 0 1-1.5 0Zm-.5 10.487v1.013a.75.75 0 0 1-1.5 0v-1.012a3.748 3.748 0 0 1 3.77-3.749L4 8.49V6.573a.25.25 0 0 1 .42-.183l2.883 2.678a.25.25 0 0 1 0 .366L4.42 12.111a.25.25 0 0 1-.42-.183V9.99l-.238-.003a2.25 2.25 0 0 0-2.262 2.25Zm8-10.675V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                                                        </svg>
                                                        {Page.ID}
                                                    </div>

                                                    <span>
                                                        {Page.Children.length}{" "}
                                                        children
                                                    </span>
                                                </a>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div class={"card border round NoPadding"}>
                                <div className="card round header">
                                    <b>Information</b>
                                </div>

                                <div className="card round has-header">
                                    <ul style={{ margin: 0 }}>
                                        <li>
                                            <b>Owner</b>:{" "}
                                            <a
                                                href={`/paste/v/${
                                                    result.Metadata!.Owner
                                                }`}
                                            >
                                                {result.Metadata!.Owner}
                                            </a>
                                        </li>

                                        <li>
                                            <b>Comments</b>: {result.Comments}
                                        </li>

                                        <li>
                                            <b>Type</b>:{" "}
                                            {BuilderPaste ? "builder" : "markdown"}
                                        </li>

                                        {RevisionNumber !== 0 && (
                                            <li>
                                                <b>Revision</b>: {RevisionNumber}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {!BuilderPaste && (
                                <div className="card border round NoPadding">
                                    <div className="card round header">
                                        <b>Rendered</b>
                                    </div>

                                    <div
                                        className="card round has-header"
                                        dangerouslySetInnerHTML={{
                                            __html: await ParseMarkdown(
                                                result.Content
                                            ),
                                        }}
                                    />
                                </div>
                            )}
                        </main>
                    </div>
                </>,
                <>
                    <title>
                        {name} - {EntryDB.config.name}
                    </title>
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                    ...PageHeaders,
                },
            }
        );
    }
}

/**
 * @export
 * @class RevisionsList
 * @implements {Endpoint}
 */
export class RevisionsList implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/v/r/")) name = name.split("paste/v/r/")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // get revisions
        const revisions = await db.GetAllPasteRevisions(name);
        if (!revisions[0]) return new _404Page().request(request);
        if (!revisions[2]) revisions[2] = [];

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav margin={false} />

                    <div className="flex flex-column g-8">
                        <div
                            className="card secondary flex justify-center"
                            style={{
                                padding: "calc(var(--u-12) * 4) var(--u-12)",
                            }}
                        >
                            <h1 class={"no-margin"}>{name}</h1>
                        </div>

                        <main className="small flex flex-column g-4">
                            <ReposNav name={name} current="Versions" />

                            <div className="card border round NoPadding">
                                <div className="card round header">
                                    <b>Revisions</b>
                                </div>

                                <div
                                    className="card round has-header flex flex-column g-4"
                                    style={{
                                        userSelect: "none",
                                    }}
                                >
                                    {revisions[2].map((r) => (
                                        <a
                                            href={`/paste/v/${name}?r=${r.EditDate}`}
                                            className="button round full justify-start flex-wrap"
                                        >
                                            Revision{" "}
                                            <span class={"utc-date-to-localize"}>
                                                {new Date(r.EditDate).toUTCString()}
                                            </span>{" "}
                                            {(revisions[2].indexOf(r) === 0 && (
                                                // latest tag
                                                <span className="chip badge mention">
                                                    latest
                                                </span>
                                            )) ||
                                                (revisions[2].indexOf(r) === 1 && (
                                                    // previous tag
                                                    <span className="chip badge">
                                                        previous
                                                    </span>
                                                ))}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </main>
                    </div>
                </>,
                <>
                    <title>
                        {name} - {EntryDB.config.name}
                    </title>
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                    ...PageHeaders,
                },
            }
        );
    }
}

// default export
export default {
    RepoView,
    RevisionsList,
};
