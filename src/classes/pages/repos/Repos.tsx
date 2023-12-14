/**
 * @file Handle Repos endpoints
 * @name Repos.ts
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import { CheckInstance, Curiosity, db, PasteOpenGraph } from "../Pages";
import BaseParser, { TOML } from "../../db/helpers/BaseParser";
import { GetAssociation, PageHeaders } from "../api/API";
import { Paste } from "../../db/objects/Paste";
import EntryDB from "../../db/EntryDB";

// import components
import NodeListing from "../components/builder/components/NodeListing";
import { BuilderDocument } from "../components/builder/schema";
import TopNav from "../components/site/TopNav";
import _404Page from "../components/404";

import { Button, Card, CardWithHeader, Expandable, StaticCode } from "fusion";

// ...
import { createTwoFilesPatch } from "diff";

// nav component
export function ReposNav(props: { name: string; current: string }) {
    return (
        <Card
            round={true}
            border={true}
            secondary={true}
            class="flex g-4 mobile\:flex-column"
            style={{ userSelect: "none" }}
        >
            <a
                href={`/r/${props.name}`}
                className={`${
                    props.current === "Home" ? "secondary " : ""
                }button round full`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"Repo Symbol"}
                    style={{ marginTop: "4px" }}
                >
                    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                </svg>
                Inspect
            </a>

            {EntryDB.config.app && EntryDB.config.app.enable_versioning && (
                <a
                    href={`/r/rev/${props.name}`}
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

            {EntryDB.config.app &&
                EntryDB.config.app.media &&
                EntryDB.config.app.media.enabled === true && (
                    <a
                        href={`/paste/media/${props.name}`}
                        className={`${
                            props.current === "Media" ? "secondary " : ""
                        }button round full`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            aria-label={"Picture Symbol"}
                        >
                            <path d="M21.75 21.5H2.25A1.75 1.75 0 0 1 .5 19.75V4.25c0-.966.784-1.75 1.75-1.75h19.5c.966 0 1.75.784 1.75 1.75v15.5a1.75 1.75 0 0 1-1.75 1.75ZM2.25 4a.25.25 0 0 0-.25.25v15.5c0 .138.112.25.25.25h3.178L14 10.977a1.749 1.749 0 0 1 2.506-.032L22 16.44V4.25a.25.25 0 0 0-.25-.25ZM22 19.75v-1.19l-6.555-6.554a.248.248 0 0 0-.18-.073.247.247 0 0 0-.178.077L7.497 20H21.75a.25.25 0 0 0 .25-.25ZM10.5 9.25a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Zm-1.5 0a1.75 1.75 0 1 0-3.501.001A1.75 1.75 0 0 0 9 9.25Z"></path>
                        </svg>
                        Media
                    </a>
                )}

            {(!EntryDB.config.app ||
                EntryDB.config.app.enable_paste_settings !== false) && (
                <a
                    href={`/s/${props.name}`}
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
        </Card>
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

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("r/")) name = name.split("r/")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result || result.HostServer) return new _404Page().request(request);

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
                    <TopNav margin={false} breadcrumbs={["r", name]} />

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

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Paste</b>}
                            >
                                <div className="flex justify-center align-center flex-wrap g-4">
                                    {result.Content.includes(
                                        "<% enable template %>"
                                    ) && (
                                        <a
                                            href={`/?Template=${result.CustomURL}`}
                                            class={"button round"}
                                        >
                                            Use Template
                                        </a>
                                    )}

                                    {result.GroupName && (
                                        <a
                                            class={"button round"}
                                            href={`/search?q=${
                                                result.GroupName
                                            }%2F&group=${result.GroupName}${
                                                // add host server (if it exists)
                                                result.HostServer
                                                    ? `:${result.HostServer}`
                                                    : ""
                                            }`}
                                        >
                                            View Group
                                        </a>
                                    )}

                                    {EntryDB.config.log &&
                                        EntryDB.config.log.events.includes(
                                            "report"
                                        ) &&
                                        !result.HostServer &&
                                        (!result.Metadata ||
                                            !result.Metadata.Comments ||
                                            result.Metadata.Comments
                                                .ReportsEnabled !== false) && (
                                            <a
                                                class={"button round"}
                                                href={`/?ReportOn=${result.CustomURL}`}
                                                title={"Report Paste"}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    width="16"
                                                    height="16"
                                                >
                                                    <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                                                </svg>

                                                <span>Report</span>
                                            </a>
                                        )}

                                    {EntryDB.config.app &&
                                        EntryDB.config.app.enable_builder !==
                                            false &&
                                        (!BuilderPaste ? (
                                            <a
                                                class={"button round"}
                                                href={`/paste/builder?edit=${result.CustomURL}`}
                                            >
                                                Open As Builder
                                            </a>
                                        ) : (
                                            <a
                                                class={"button round"}
                                                href={`/?mode=edit&OldURL=${result.CustomURL}`}
                                            >
                                                Open As Markdown
                                            </a>
                                        ))}

                                    {RevisionNumber !== 0 && (
                                        <a
                                            class={"button round"}
                                            href={`/r/diff/${result.CustomURL}?from=${RevisionNumber}&to=latest`}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Plus/Minus Symbol"}
                                            >
                                                <path d="M8.75 1.75V5H12a.75.75 0 0 1 0 1.5H8.75v3.25a.75.75 0 0 1-1.5 0V6.5H4A.75.75 0 0 1 4 5h3.25V1.75a.75.75 0 0 1 1.5 0ZM4 13h8a.75.75 0 0 1 0 1.5H4A.75.75 0 0 1 4 13Z"></path>
                                            </svg>
                                            Compare
                                        </a>
                                    )}
                                </div>
                            </CardWithHeader>

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Export</b>}
                            >
                                <div className="flex g-4 flex-wrap justify-center">
                                    <a
                                        class={"button round"}
                                        target={"_blank"}
                                        href={`/api/raw/${result.CustomURL}`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Markdown Symbol"}
                                        >
                                            <path d="M14.85 3c.63 0 1.15.52 1.14 1.15v7.7c0 .63-.51 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.84V4.15C0 3.52.52 3 1.15 3ZM9 11V5H7L5.5 7 4 5H2v6h2V8l1.5 1.92L7 8v3Zm2.99.5L14.5 8H13V5h-2v3H9.5Z"></path>
                                        </svg>
                                        Markdown
                                    </a>

                                    <a
                                        class={"button round"}
                                        href={`/api/html/${result.CustomURL}`}
                                        target={"_blank"}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Code Symbol"}
                                        >
                                            <path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"></path>
                                        </svg>
                                        HTML Render
                                    </a>

                                    <a
                                        class={"button round"}
                                        href={`/paste/doc/${result.CustomURL}`}
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
                                        Document
                                    </a>
                                </div>
                            </CardWithHeader>

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>File List</b>}
                            >
                                <div
                                    className="flex flex-column g-4"
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
                                        className="button round full justify-space-between"
                                        style={{
                                            overflow: "hidden",
                                            position: "relative",
                                        }}
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
                                                <NodeListing
                                                    Node={Page}
                                                    DisableBuilderFeatures={true}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            </CardWithHeader>

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Information</b>}
                            >
                                <ul style={{ margin: 0 }}>
                                    <li>
                                        <b>Owner</b>:{" "}
                                        <a href={`/~${result.Metadata!.Owner}`}>
                                            {result.Metadata!.Owner}
                                        </a>
                                    </li>

                                    <li>
                                        <b>Comments</b>:{" "}
                                        <a href={`/c/${name}`}>{result.Comments}</a>
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
                            </CardWithHeader>

                            {!BuilderPaste && (
                                <CardWithHeader
                                    round={true}
                                    border={true}
                                    header={<b>Rendered</b>}
                                >
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: await ParseMarkdown(
                                                result.Content
                                            ),
                                        }}
                                    />
                                </CardWithHeader>
                            )}

                            {EntryDB.config.app &&
                                EntryDB.config.app.enable_claim === true && (
                                    <CardWithHeader
                                        round={true}
                                        border={true}
                                        header={<b>Claim URL</b>}
                                    >
                                        <p>
                                            You can make a claim on this URL to
                                            repossess this custom URL if it meets the
                                            following requirements:
                                        </p>
                                        <ul>
                                            <li>
                                                URL hasn't been edited in over a
                                                month
                                            </li>
                                            <li>
                                                The paste content is less than 25
                                                characters long
                                            </li>
                                            <li>
                                                The paste has less than 500 views and
                                                less than 50 comments
                                            </li>
                                        </ul>

                                        <hr />

                                        <form action="/api/claim" method={"POST"}>
                                            <input
                                                type="hidden"
                                                name="CustomURL"
                                                value={result.CustomURL}
                                                required
                                            />

                                            <button className="round border red">
                                                Claim URL
                                            </button>
                                        </form>
                                    </CardWithHeader>
                                )}
                        </main>
                    </div>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <link rel="icon" href="/favicon" />

                    <PasteOpenGraph
                        paste={result}
                        url={url}
                        isBuilder={false}
                        title={`${result.CustomURL} (repository)`}
                        content="View detailed paste information"
                    />
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

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("r/rev/")) name = name.split("r/rev/")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result || result.HostServer) return new _404Page().request(request);

        // get revisions
        const revisions = await db.GetAllPasteRevisions(name);
        if (!revisions[0]) return new _404Page().request(request);
        if (!revisions[2]) revisions[2] = [];

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav margin={false} breadcrumbs={["r", "rev", name]} />

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

                            <CardWithHeader
                                round={true}
                                border={true}
                                header={<b>Revisions</b>}
                            >
                                <div
                                    className="flex flex-column g-4"
                                    style={{
                                        userSelect: "none",
                                    }}
                                >
                                    {revisions[2].map((r) => (
                                        <a
                                            href={`/r/${name}?r=${r.EditDate}`}
                                            className="button round full justify-start flex-wrap g-4"
                                            style={{
                                                height: "auto !important",
                                            }}
                                        >
                                            <span>
                                                Revision{" "}
                                                <span class={"utc-date-to-localize"}>
                                                    {new Date(
                                                        r.EditDate
                                                    ).toUTCString()}
                                                </span>
                                            </span>
                                            {r.Content.split("_metadata:")[0] ===
                                                result.Content && (
                                                // live tag
                                                <span className="chip badge green">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={
                                                            "Broadcast Symbol"
                                                        }
                                                    >
                                                        <path d="M8.75 8.582v5.668a.75.75 0 0 1-1.5 0V8.582a1.75 1.75 0 1 1 1.5 0Zm3.983-7.125a.75.75 0 0 1 1.06.026A7.976 7.976 0 0 1 16 7c0 2.139-.84 4.083-2.207 5.517a.75.75 0 1 1-1.086-1.034A6.474 6.474 0 0 0 14.5 7a6.474 6.474 0 0 0-1.793-4.483.75.75 0 0 1 .026-1.06Zm-9.466 0c.3.286.312.76.026 1.06A6.474 6.474 0 0 0 1.5 7a6.47 6.47 0 0 0 1.793 4.483.75.75 0 0 1-1.086 1.034A7.973 7.973 0 0 1 0 7c0-2.139.84-4.083 2.207-5.517a.75.75 0 0 1 1.06-.026Zm8.556 2.321A4.988 4.988 0 0 1 13 7a4.988 4.988 0 0 1-1.177 3.222.75.75 0 1 1-1.146-.967A3.487 3.487 0 0 0 11.5 7c0-.86-.309-1.645-.823-2.255a.75.75 0 0 1 1.146-.967Zm-6.492.958A3.48 3.48 0 0 0 4.5 7a3.48 3.48 0 0 0 .823 2.255.75.75 0 0 1-1.146.967A4.981 4.981 0 0 1 3 7a4.982 4.982 0 0 1 1.188-3.236.75.75 0 1 1 1.143.972Z"></path>
                                                    </svg>
                                                    live
                                                </span>
                                            )}
                                            {(revisions[2].indexOf(r) === 0 && (
                                                // latest tag
                                                <span className="chip badge mention">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={
                                                            "Bookmark Symbol"
                                                        }
                                                    >
                                                        <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0l3.023 2.49V2.75a.25.25 0 0 0-.25-.25Z"></path>
                                                    </svg>
                                                    latest
                                                </span>
                                            )) ||
                                                (revisions[2].indexOf(r) === 1 && (
                                                    // previous tag
                                                    <span className="chip badge">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 16 16"
                                                            width="16"
                                                            height="16"
                                                            aria-label={
                                                                "History Symbol"
                                                            }
                                                        >
                                                            <path d="m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z"></path>
                                                        </svg>
                                                        previous
                                                    </span>
                                                ))}
                                        </a>
                                    ))}
                                </div>
                            </CardWithHeader>
                        </main>
                    </div>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <link rel="icon" href="/favicon" />

                    <PasteOpenGraph
                        paste={result}
                        url={url}
                        isBuilder={false}
                        title={`${name} (revision)`}
                        content="View detailed paste information (historical)"
                    />
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

/*
 * @export
 * @class DiffView
 * @implements {Endpoint}
 */
export class DiffView implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("r/diff/")) name = name.split("r/diff/")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result || result.HostServer) return new _404Page().request(request);

        // check metadata, if paste metadata has PrivateSource set to true AND we're
        // not the paste owner, return 404 page!
        if (
            result.Metadata &&
            result.Metadata.Owner &&
            result.Metadata.PrivateSource === true &&
            Association[1] !== result.Metadata.Owner
        )
            return new _404Page().request(request);

        // attempt to get revision(s)
        const RevisionNumber = search.get("to");
        const RevisionNumber2 = search.get("from");
        if (!RevisionNumber) return new _404Page().request(request); // atleast one is required!

        const revision = await db.GetRevision(name, parseFloat(search.get("to")!));
        if (!revision[0] || !revision[2]) return new _404Page().request(request);

        if (RevisionNumber2) {
            const revision_2 = await db.GetRevision(
                name,
                parseFloat(search.get("from")!)
            );

            if (!revision_2[0] || !revision_2[2])
                return new _404Page().request(request);

            // set result content to first revision
            result.Content = revision[2].Content;

            // set revision content to revision_2 content
            revision[2].Content = revision_2[2].Content;
        }

        // detect if paste is a builder paste
        const BuilderPaste = result.Content.startsWith("_builder:");

        const BuilderDocument1: BuilderDocument = BuilderPaste
            ? BaseParser.parse(
                  revision[2].Content.split("_builder:")[1].split("_metadata:")[0]
              )
            : ({} as any);

        const BuilderDocument2: BuilderDocument = BuilderPaste
            ? BaseParser.parse(
                  result.Content.split("_builder:")[1].split("_metadata:")[0]
              )
            : ({} as any);

        // generate diff
        if (RevisionNumber2) result.CustomURL += `@${RevisionNumber2}`;

        let diff = BuilderPaste
            ? createTwoFilesPatch(
                  result.CustomURL,
                  `${name}@${RevisionNumber}`,
                  TOML.stringify(BuilderDocument1),
                  TOML.stringify(BuilderDocument2)
              )
            : createTwoFilesPatch(
                  result.CustomURL,
                  `${name}@${RevisionNumber}`,
                  revision[2].Content.split("_metadata:")[0],
                  result.Content.split("_metadata:")[0]
              );

        // ...remove some extra things
        diff = diff.replaceAll("\\ No newline at end of file\n", "");

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav margin={false} breadcrumbs={["r", "diff", name]} />

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

                            <div className="card border round">
                                <p>
                                    Comparing{" "}
                                    <a
                                        href={`/r/${result.CustomURL}${
                                            RevisionNumber2
                                                ? `?r=${RevisionNumber2}`
                                                : ""
                                        }`}
                                    >
                                        {RevisionNumber2 || "latest"}
                                    </a>{" "}
                                    to{" "}
                                    <a
                                        href={`/r/${result.CustomURL}?r=${RevisionNumber}`}
                                    >
                                        {RevisionNumber || "latest"}
                                    </a>
                                </p>

                                <hr />

                                <StaticCode block={2} margin={false}>
                                    {diff}
                                </StaticCode>
                            </div>
                        </main>
                    </div>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <link rel="icon" href="/favicon" />

                    <PasteOpenGraph
                        paste={result}
                        url={url}
                        isBuilder={false}
                        title={`${result.CustomURL} (revision diff)`}
                        content="View detailed paste information (historical)"
                    />
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
 * @class ProfileView
 * @implements {Endpoint}
 */
export class ProfileView implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("~")) name = name.split("~")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // get pastes
        const Pastes = await db.GetAllPastesOwnedByPaste(name);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav margin={false} breadcrumbs={[`~${name}`]} />

                    <main className="flex justify-center mobile:flex-column g-8">
                        <div
                            className="flex flex-column g-4 align-center mobile:max"
                            style={{
                                width: "33.33%",
                            }}
                        >
                            <Card
                                round={true}
                                border={true}
                                secondary={true}
                                class="flex flex-column g-4 align-center"
                            >
                                {result.Metadata && result.Metadata.SocialIcon && (
                                    <img
                                        title={result.Metadata.Owner}
                                        class={"card border round NoPadding"}
                                        src={result.Metadata.SocialIcon}
                                        alt={result.Metadata.Owner}
                                    />
                                )}

                                <Card
                                    border={true}
                                    round={true}
                                    class="flex flex-column align-center g-4"
                                >
                                    <h2
                                        class={"no-margin"}
                                        style={{
                                            maxWidth: "100%",
                                        }}
                                    >
                                        {result.CustomURL}
                                    </h2>

                                    <Button
                                        round={true}
                                        class="full"
                                        href={`/${result.CustomURL}`}
                                    >
                                        View Paste
                                    </Button>
                                </Card>
                            </Card>

                            <Expandable title="Details">
                                <div class={"flex flex-column g-4"}>
                                    <div>
                                        <b>Joined</b>:{" "}
                                        <span className="utc-date-to-localize">
                                            {new Date(result.PubDate).toUTCString()}
                                        </span>
                                    </div>

                                    <div>
                                        <b>Updated</b>:{" "}
                                        <span className="utc-date-to-localize">
                                            {new Date(result.EditDate).toUTCString()}
                                        </span>
                                    </div>

                                    <div>
                                        <b>Views</b>: {result.Views}
                                    </div>
                                </div>
                            </Expandable>
                        </div>

                        <div className="device:mobile">
                            <hr />
                        </div>

                        <div class={"flex flex-column g-4 full"}>
                            <ReposNav name={name} current="Home" />

                            {result.Metadata &&
                                result.Metadata.EnablePasteList !== false && (
                                    <CardWithHeader
                                        border={true}
                                        round={true}
                                        header={<b>Pastes</b>}
                                    >
                                        <div class="flex flex-column g-4">
                                            {Pastes.map((paste) => (
                                                <Card
                                                    round={true}
                                                    border={true}
                                                    secondary={true}
                                                    class="flex justify-space-between flex-wrap"
                                                >
                                                    <a
                                                        href={`/r/${paste.CustomURL}`}
                                                    >
                                                        {paste.CustomURL}
                                                    </a>

                                                    <span>
                                                        {paste.Content.length}{" "}
                                                        characters
                                                    </span>
                                                </Card>
                                            ))}
                                        </div>
                                    </CardWithHeader>
                                )}
                        </div>
                    </main>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <PasteOpenGraph
                        paste={result}
                        url={url}
                        isBuilder={false}
                        content="View detailed user profile"
                    />

                    <link rel="icon" href="/favicon" />
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
    DiffView,
    ProfileView,
};
