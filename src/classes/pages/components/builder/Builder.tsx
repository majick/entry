/**
 * @file Handle builder
 * @name Builder.tsx
 * @license MIT
 */

import schema, { BuilderDocument } from "./schema";
import { render, VNode } from "preact";

export function ParseDocument(doc: BuilderDocument): VNode {
    return (
        <>
            {doc.Nodes.map((node) => {
                // render children
                let children: VNode = <></>;

                if (node.Children && node.Children.length > 0)
                    children = ParseDocument({
                        Nodes: node.Children,
                    });

                // render main
                if (node.Type === "Page")
                    return <schema.PageNode node={node}>{children}</schema.PageNode>;
                else if (node.Type === "Card")
                    return <schema.CardNode node={node}>{children}</schema.CardNode>;
                else if (node.Type === "Text")
                    return <schema.TextNode node={node}>{children}</schema.TextNode>;
                else if (node.Type === "Image")
                    return (
                        <schema.ImageNode node={node}>{children}</schema.ImageNode>
                    );
            })}
        </>
    );
}

// render
const Document: BuilderDocument = {
    Nodes: [
        {
            Type: "Page",
            NotRemovable: true,
            Children: [
                {
                    Type: "Card",
                    Children: [
                        {
                            Type: "Text",
                            Content: "nothing here yet! :)",
                        },
                        {
                            Type: "Text",
                            Content: "supports [markdown](/)!!",
                        },
                    ],
                },
            ],
        },
    ],
};

// state
let SidebarOpen = false;
let Hovered: HTMLElement;

// sidebar
function RenderSidebar() {
    render(
        <div
            className="builder:sidebar"
            style={{
                display: SidebarOpen ? "flex" : "none",
            }}
        >
            <button
                class={"mobile-only"}
                onClick={() => {
                    SidebarOpen = !SidebarOpen;
                    RenderSidebar();
                }}
            >
                Close Sidebar
            </button>

            <div className="option">
                <p>THIS IS TEMPORARY!!!!</p>
                <pre>{JSON.stringify(Document, undefined, 4)}</pre>
            </div>
        </div>,
        document.getElementById("builder:sidebar")!
    );
}

// render
render(
    <>
        <div
            style={{
                display: "contents",
                position: "relative",
                userSelect: "none",
            }}
            onMouseOver={(event) => {
                const target: HTMLElement = event.target as HTMLElement;
                if (!target.classList.contains("component")) return;

                if (Hovered) Hovered.classList.remove("hover");
                target.classList.add("hover");

                Hovered = target;
            }}
        >
            {ParseDocument(Document)}
        </div>

        <div className="builder:toolbar">
            <button
                aria-label={"Toggle Sidebar"}
                title={"Toggle Sidebar"}
                onClick={() => {
                    SidebarOpen = !SidebarOpen;
                    RenderSidebar();
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"Menu Symbol"}
                >
                    <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path>
                </svg>
            </button>
        </div>

        <div id="builder:sidebar" />
    </>,
    document.getElementById("builder") as HTMLElement
);

// ...
RenderSidebar();
