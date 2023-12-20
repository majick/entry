import {
    Document,
    RenderCodeWorkspace,
    RenderSidebar,
    Select,
    Selected,
    SetPage,
    SetSidebar,
    Update,
} from "../Builder";

import { CardWithHeader } from "fusion";

/**
 * @function Toolbar
 *
 * @export
 * @param {({ current: "render" | "code"; static?: boolean })} props
 * @return {*}
 */
export function Toolbar(props: {
    current: "render" | "code";
    static?: boolean;
}): any {
    return (
        <div
            className="card round border secondary builder:toolbar workspace:toolbar"
            style={{
                left: 0,
                margin: "auto",
                width: props.static === true ? "100%" : "max-content",
                position: props.static !== true ? "absolute" : "static",
                height: "56px",
            }}
        >
            <button
                style={{ width: "8rem" }}
                class={`${props.current === "render" ? "border " : ""}round`}
                onClick={() => {
                    Update(); // render changes

                    SetSidebar(false);
                    document.getElementById(
                        "builder:code-workspace"
                    )!.style.display = "none";
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"Browser Symbol"}
                >
                    <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25ZM14.5 6h-13v7.25c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25Zm-6-3.5v2h6V2.75a.25.25 0 0 0-.25-.25ZM5 2.5v2h2v-2Zm-3.25 0a.25.25 0 0 0-.25.25V4.5h2v-2Z"></path>
                </svg>
                Render
            </button>

            <button
                style={{ width: "8rem" }}
                class={`${props.current === "code" ? "border " : ""}round`}
                onClick={() => {
                    SetSidebar(false);
                    document.getElementById(
                        "builder:code-workspace"
                    )!.style.display = "block";

                    if (
                        !(
                            document.getElementById("builder:code-workspace")!
                                .children.length > 0
                        )
                    )
                        RenderCodeWorkspace();
                }}
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
                Code
            </button>
        </div>
    );
}

/**
 * @function Workspace
 *
 * @export
 * @return {*}
 */
export function Workspace(): any {
    return (
        <>
            <Toolbar current="code" static={true} />

            <div
                class={"flex flex-column"}
                style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "calc(100dvh - 56px)",
                }}
            >
                <div
                    id="_editor"
                    class={"bg-1"}
                    style={{
                        width: "100%",
                        height: "100%",
                        maxHeight: Selected.Type === "Page" ? "75%" : "100%",
                    }}
                />

                {Selected.Type === "Page" && (
                    <div
                        id="_html_files"
                        class={"bg-1"}
                        style={{
                            width: "100%",
                            height: "100%",
                            maxHeight: "25%",
                        }}
                    >
                        <CardWithHeader
                            secondary={true}
                            border={true}
                            header={<b>Files</b>}
                        >
                            <div className="flex flex-wrap g-4">
                                {Document.Pages.map(
                                    (page) =>
                                        page.ID !== "node:removed" && (
                                            <button
                                                class={"round secondary"}
                                                disabled={page === Selected}
                                                onClick={() => {
                                                    SetPage(
                                                        Document.Pages.indexOf(page)
                                                    );
                                                    Select(page, Document.Pages);
                                                    SetSidebar(true);

                                                    return RenderSidebar();
                                                }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    width="16"
                                                    height="16"
                                                    aria-label={"Code File Symbol"}
                                                >
                                                    <path d="M4 1.75C4 .784 4.784 0 5.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 15h-9a.75.75 0 0 1 0-1.5h9a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5H5.75a.25.25 0 0 0-.25.25v2.5a.75.75 0 0 1-1.5 0Zm1.72 4.97a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.47-1.47-1.47-1.47a.75.75 0 0 1 0-1.06ZM3.28 7.78 1.81 9.25l1.47 1.47a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-2-2a.75.75 0 0 1 0-1.06l2-2a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Zm8.22-6.218V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                                                </svg>
                                                {page.Nickname || page.ID}
                                            </button>
                                        )
                                )}
                            </div>
                        </CardWithHeader>
                    </div>
                )}
            </div>

            <div
                className="card round builder:toolbar"
                style={{
                    right: 0,
                    top: 0,
                    left: "unset",
                    margin: "auto",
                    width: "max-content",
                    borderRadius: "var(--u-04)",
                    background: "transparent",
                }}
            >
                <button
                    class={"tooltip-wrapper visual-active round"}
                    onClick={() => {
                        (globalThis as any).HTMLEditor.Format();
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"List Symbol"}
                    >
                        <path d="M2 2h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm4.655 8.595a.75.75 0 0 1 0 1.06L4.03 14.28a.75.75 0 0 1-1.06 0l-1.5-1.5a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l.97.97 2.095-2.095a.75.75 0 0 1 1.06 0ZM9.75 2.5h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Zm0 5h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Zm0 5h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5Zm-7.25-9v3h3v-3Z"></path>
                    </svg>

                    <div className="card secondary round border tooltip left">
                        Format Code
                    </div>
                </button>

                <button
                    class={"tooltip-wrapper visual-active round"}
                    onClick={() => {
                        // show component tree
                        SetSidebar(true);
                        return RenderSidebar({ Page: "Tree" });
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Tree Symbol"}
                    >
                        <path d="M4.75 7a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM5 4.75A.75.75 0 0 1 5.75 4h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 5 4.75ZM6.75 10a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z"></path>
                        <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Z"></path>
                    </svg>

                    <div className="card secondary round border tooltip left">
                        Component Tree
                    </div>
                </button>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `.cm-line, .cm-line span { font-family: monospace !important; }`,
                }}
            />
        </>
    );
}

// default export
export default { Toolbar, Workspace };
