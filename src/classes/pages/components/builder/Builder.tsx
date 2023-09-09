/**
 * @file Handle builder
 * @name Builder.tsx
 * @license MIT
 */

import { BuilderDocument, Node } from "./schema";
import parser from "./parser";

import { render } from "preact";
import Modal from "../Modal";

// render
const Document: BuilderDocument = {
    Pages: [
        {
            Type: "Page",
            NotRemovable: true,
            Theme: "dark",
            Children: [
                {
                    Type: "Card",
                    Children: [
                        {
                            Type: "Text",
                            Content: "# paste builder",
                        },
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

function AddComponent(Type: string) {
    // add component
    if (Type === "Text")
        Document.Pages[CurrentPage].Children.push({
            Type: "Text",
            Content: "Text",
        });
    else if (Type === "Image")
        Document.Pages[CurrentPage].Children.push({
            Type: "Image",
            Alt: "New Image",
            Source: "about:blank",
        });

    // update
    return (NeedsUpdate = true);
}

// state
let SidebarOpen = false;

let Hovered: HTMLElement;
let Selected: Node;
let CurrentPage: number = 0;

let NeedsUpdate: boolean = false;
let EditMode: boolean = true;

// state functions
export function Select(node: Node) {
    Selected = node;

    SidebarOpen = true; // so the sidebar opens automatically
    RenderSidebar(); // rerender sidebar
}

export function Update() {
    NeedsUpdate = true;
}

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
                Back
            </button>

            {Selected && (
                <>
                    {(Selected.Type === "Page" && (
                        <>
                            {/* page element controls */}
                            <div className="option">
                                <label htmlFor="Theme">
                                    <b>Theme</b>
                                </label>

                                <select
                                    name="Theme"
                                    id="Theme"
                                    class={"secondary"}
                                    style={{
                                        width: "100%",
                                    }}
                                    onChange={(event) => {
                                        if (Selected.Type !== "Page") return;

                                        const target =
                                            event.target as HTMLSelectElement;

                                        Selected.Theme = target.selectedOptions[0]
                                            .value as any;

                                        NeedsUpdate = true;
                                    }}
                                >
                                    <option
                                        value="light"
                                        selected={
                                            Document.Pages[CurrentPage].Theme ===
                                            "light"
                                        }
                                    >
                                        Light
                                    </option>

                                    <option
                                        value="dark"
                                        selected={
                                            Document.Pages[CurrentPage].Theme ===
                                            "dark"
                                        }
                                    >
                                        Dark
                                    </option>

                                    <option
                                        value="purple"
                                        selected={
                                            Document.Pages[CurrentPage].Theme ===
                                            "purple"
                                        }
                                    >
                                        Purple
                                    </option>

                                    <option
                                        value="pink"
                                        selected={
                                            Document.Pages[CurrentPage].Theme ===
                                            "pink"
                                        }
                                    >
                                        Pink
                                    </option>

                                    <option
                                        value="green"
                                        selected={
                                            Document.Pages[CurrentPage].Theme ===
                                            "green"
                                        }
                                    >
                                        Green
                                    </option>

                                    <option
                                        value="blue"
                                        selected={
                                            Document.Pages[CurrentPage].Theme ===
                                            "blue"
                                        }
                                    >
                                        Blue
                                    </option>
                                </select>
                            </div>

                            <div className="option">
                                <b>WORK IN PROGRESS!!!</b>
                                <pre>
                                    <code>
                                        {JSON.stringify(Document, undefined, 4)}
                                    </code>
                                </pre>
                            </div>
                        </>
                    )) ||
                        (Selected.Type === "Text" && (
                            <>
                                {/* text element controls */}
                                <div className="option">
                                    <label htmlFor="Content">
                                        <b>Content</b>
                                    </label>

                                    <textarea
                                        class={"secondary"}
                                        type="text"
                                        name={"Content"}
                                        id={"Content"}
                                        value={Selected.Content}
                                        onKeyUp={(event) => {
                                            if (Selected.Type !== "Text") return;

                                            Selected.Content = (
                                                event.target as HTMLInputElement
                                            ).value;

                                            NeedsUpdate = true;
                                        }}
                                        style={{
                                            minWidth: "100%",
                                        }}
                                    ></textarea>
                                </div>
                            </>
                        )) ||
                        (Selected.Type === "Image" && (
                            <>
                                {/* image element controls */}
                                <div className="option">
                                    <label htmlFor="Source">
                                        <b>Source</b>
                                    </label>

                                    <input
                                        class={"secondary"}
                                        type="url"
                                        name={"Source"}
                                        id={"Source"}
                                        value={Selected.Source}
                                        onKeyUp={(event) => {
                                            if (Selected.Type !== "Image") return;

                                            Selected.Source = (
                                                event.target as HTMLInputElement
                                            ).value;

                                            NeedsUpdate = true;
                                        }}
                                        style={{
                                            minWidth: "100%",
                                        }}
                                    />
                                </div>

                                <div className="option">
                                    <label htmlFor="Alt">
                                        <b>Alt Text</b>
                                    </label>

                                    <input
                                        class={"secondary"}
                                        type="text"
                                        name={"Alt"}
                                        id={"Alt"}
                                        value={Selected.Alt}
                                        onKeyUp={(event) => {
                                            if (Selected.Type !== "Image") return;

                                            Selected.Alt = (
                                                event.target as HTMLInputElement
                                            ).value;

                                            NeedsUpdate = true;
                                        }}
                                        style={{
                                            minWidth: "100%",
                                        }}
                                    />
                                </div>
                            </>
                        ))}
                </>
            )}
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
            onMouseOver={
                EditMode
                    ? (event) => {
                          const target: HTMLElement = event.target as HTMLElement;
                          if (!target.classList.contains("component")) return;

                          if (Hovered) Hovered.classList.remove("hover");
                          target.classList.add("hover");

                          Hovered = target;
                      }
                    : undefined
            }
            id={"_doc"}
        >
            {parser.ParsePage(Document.Pages[CurrentPage], EditMode)}
        </div>

        <div className="builder:toolbar">
            <button
                aria-label={"Add Element"}
                title={"Add Element"}
                id={"entry:button.AddComponent"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                >
                    <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
                </svg>
            </button>

            <button
                aria-label={"Page Style"}
                title={"Page Style"}
                onClick={() => {
                    Select(Document.Pages[0]);
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                >
                    <path d="M11.134 1.535c.7-.509 1.416-.942 2.076-1.155.649-.21 1.463-.267 2.069.34.603.601.568 1.411.368 2.07-.202.668-.624 1.39-1.125 2.096-1.011 1.424-2.496 2.987-3.775 4.249-1.098 1.084-2.132 1.839-3.04 2.3a3.744 3.744 0 0 1-1.055 3.217c-.431.431-1.065.691-1.657.861-.614.177-1.294.287-1.914.357A21.151 21.151 0 0 1 .797 16H.743l.007-.75H.749L.742 16a.75.75 0 0 1-.743-.742l.743-.008-.742.007v-.054a21.25 21.25 0 0 1 .13-2.284c.067-.647.187-1.287.358-1.914.17-.591.43-1.226.86-1.657a3.746 3.746 0 0 1 3.227-1.054c.466-.893 1.225-1.907 2.314-2.982 1.271-1.255 2.833-2.75 4.245-3.777ZM1.62 13.089c-.051.464-.086.929-.104 1.395.466-.018.932-.053 1.396-.104a10.511 10.511 0 0 0 1.668-.309c.526-.151.856-.325 1.011-.48a2.25 2.25 0 1 0-3.182-3.182c-.155.155-.329.485-.48 1.01a10.515 10.515 0 0 0-.309 1.67Zm10.396-10.34c-1.224.89-2.605 2.189-3.822 3.384l1.718 1.718c1.21-1.205 2.51-2.597 3.387-3.833.47-.662.78-1.227.912-1.662.134-.444.032-.551.009-.575h-.001V1.78c-.014-.014-.113-.113-.548.027-.432.14-.995.462-1.655.942Zm-4.832 7.266-.001.001a9.859 9.859 0 0 0 1.63-1.142L7.155 7.216a9.7 9.7 0 0 0-1.161 1.607c.482.302.889.71 1.19 1.192Z"></path>
                </svg>
            </button>

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

        {/* modals */}
        <Modal
            buttonid="entry:button.AddComponent"
            modalid="entry:modal.AddComponent"
        >
            <div
                style={{
                    width: "25rem",
                    maxWidth: "100%",
                }}
            >
                <b>Add Component</b>

                <hr />

                <form
                    method={"dialog"}
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <button
                        className="border"
                        onClick={() => {
                            AddComponent("Text");
                        }}
                    >
                        Text
                    </button>

                    <button
                        className="border"
                        onClick={() => {
                            AddComponent("Image");
                        }}
                    >
                        Image
                    </button>

                    <button
                        className="border"
                        onClick={() => {
                            AddComponent("Page");
                        }}
                    >
                        Page
                    </button>

                    <button
                        className="border"
                        onClick={() => {
                            AddComponent("Embed");
                        }}
                    >
                        Embed
                    </button>
                </form>

                <hr />

                <form
                    method="dialog"
                    style={{
                        width: "25rem",
                        maxWidth: "100%",
                    }}
                >
                    <button
                        className="green"
                        style={{
                            width: "100%",
                        }}
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </Modal>
    </>,
    document.getElementById("builder") as HTMLElement
);

// render every second
setInterval(() => {
    // check if we need to render
    if (NeedsUpdate !== true) return;
    NeedsUpdate = false;

    // render
    render(
        parser.ParsePage(Document.Pages[CurrentPage], EditMode),
        document.getElementById("_doc")!
    );
}, 1000);

// ...
RenderSidebar();
