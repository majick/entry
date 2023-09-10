/**
 * @file Handle builder
 * @name Builder.tsx
 * @license MIT
 */

import schema, { BuilderDocument, Node } from "./schema";
import parser from "./parser";

import { render } from "preact";
import Modal from "../Modal";
import Sidebar from "./components/Sidebar";

// render
export const Document: BuilderDocument = {
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
                            Alignment: "center",
                        },
                        {
                            Type: "Text",
                            Content: "nothing here yet! :)",
                            Alignment: "center",
                        },
                        {
                            Type: "Text",
                            Content: "supports [markdown](/)!!",
                            Alignment: "center",
                        },
                    ],
                },
            ],
        },
    ],
};

export function AddComponent(Type: string) {
    // add component
    if (Type === "Page") {
        Document.Pages.push({
            Type: "Page",
            NotRemovable: true,
            Children: [
                {
                    Type: "Card",
                    Children: [
                        {
                            Type: "Text",
                            Content: "nothing here yet :)",
                        },
                    ],
                },
            ],
        });

        RenderSidebar({ Page: "PagesView" }); // rerender sidebar with updated pages!
    } else if (Type === "Text")
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
export let SidebarOpen = false;
export let MoveMode: boolean = false;

export let Hovered: HTMLElement;
export let Selected: Node;
export let CurrentPage: number = 0;

let NeedsUpdate: boolean = false;
export let EditMode: boolean = true;

// state functions
export function Select(node: Node) {
    Selected = node;

    SidebarOpen = true; // so the sidebar opens automatically
    RenderSidebar(); // rerender sidebar
}

export function Update() {
    NeedsUpdate = true;
}

export function SetSidebar(state: boolean = false) {
    SidebarOpen = state;
    return RenderSidebar();
}

export function SetPage(page: number = 0) {
    CurrentPage = page;
    return Update();
}

export function Move(state: boolean = false) {
    MoveMode = state;
    SidebarOpen = false;
    return RenderSidebar();
}

// sidebar
export function RenderSidebar(props?: { Page: "PagesView" }) {
    render(
        <>
            <Sidebar Page={props !== undefined ? props.Page : undefined} />
        </>,
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
            onClick={
                EditMode
                    ? (event) => {
                          // get target
                          let target = event.target as HTMLElement;

                          // move mode
                          if (MoveMode && EditMode) {
                              const OriginTarget = document.getElementById(
                                  Selected.ID!
                              )!;

                              (OriginTarget.getAttribute("data-component")
                                  ? OriginTarget
                                  : OriginTarget.parentElement!
                              ).dispatchEvent(new Event("dragstart"));

                              // get zones
                              // get drop zones
                              const _zones = schema.GetDropZoneFromElement(target);
                              if (!_zones) return;

                              const [PreviousDropElement, NextDropElement] = _zones;

                              // get user input
                              const before = confirm(
                                  "Move component before element? Cancel to move after element. Continue to move before element."
                              );

                              // move
                              if (before)
                                  PreviousDropElement.dispatchEvent(
                                      new Event("drop")
                                  );
                              else NextDropElement.dispatchEvent(new Event("drop"));

                              // return
                              return Move(false);
                          }

                          // ...

                          if (!target.getAttribute("data-component"))
                              target = target.parentElement!;

                          // get node
                          const node = parser.AllNodes.find(
                              (n) => n.ID === target.id
                          ) as Node;

                          if (!node) return;

                          // select
                          Select(node);
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
                aria-label={"Current Page"}
                title={"Current Page"}
                onClick={() => {
                    Select(Document.Pages[CurrentPage]);
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
            </button>

            <button
                aria-label={"View Pages"}
                title={"View Pages"}
                onClick={() => {
                    SidebarOpen = true;
                    RenderSidebar({
                        Page: "PagesView",
                    });
                }}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"Stack Symbol"}
                >
                    <path d="M7.122.392a1.75 1.75 0 0 1 1.756 0l5.003 2.902c.83.481.83 1.68 0 2.162L8.878 8.358a1.75 1.75 0 0 1-1.756 0L2.119 5.456a1.251 1.251 0 0 1 0-2.162ZM8.125 1.69a.248.248 0 0 0-.25 0l-4.63 2.685 4.63 2.685a.248.248 0 0 0 .25 0l4.63-2.685ZM1.601 7.789a.75.75 0 0 1 1.025-.273l5.249 3.044a.248.248 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0L1.874 8.814A.75.75 0 0 1 1.6 7.789Zm0 3.5a.75.75 0 0 1 1.025-.273l5.249 3.044a.248.248 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0l-5.248-3.044a.75.75 0 0 1-.273-1.025Z"></path>
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

            <button id={"entry:button.Publish"}>Publish</button>
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

        <Modal buttonid="entry:button.Publish" modalid="entry:modal.Publish">
            <div
                style={{
                    width: "25rem",
                    maxWidth: "100%",
                }}
            >
                <b>Publish</b>

                <hr />

                <p>wip</p>

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
