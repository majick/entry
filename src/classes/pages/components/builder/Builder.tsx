/**
 * @file Handle builder
 * @name Builder.tsx
 * @license MIT
 */

import schema, { BuilderDocument, Node } from "./schema";
import BaseParser from "../../../db/helpers/BaseParser";
import parser from "./parser";

import { render, hydrate } from "preact";

import Modal from "../site/modals/Modal";
import Sidebar from "./components/Sidebar";
import Toolbox from "./components/Toolbox";
import PublishModals from "../site/modals/PublishModals";
import Window from "./components/Window";

// render
export let Document: BuilderDocument;

export function AddComponent(Type: string) {
    // make sure we're in edit mode
    if (!EditMode) return;

    // add component
    if (Type === "Page") {
        Document.Pages.push({
            Type: "Page",
            ID: `page-${Document.Pages.length + 1}`,
            NotRemovable: false, // new pages can be removed
            StyleString: Document.Pages[0].StyleString || "",
            AlignX: "center",
            AlignY: "center",
            Children: [
                {
                    Type: "Card",
                    Children: [
                        {
                            Type: "Text",
                            Content: "nothing here yet! :)",
                        },
                    ],
                },
                {
                    // default star
                    ID: "PageStar",
                    Type: "StarInfo",
                    NotRemovable: true,
                    Source: "",
                },
            ],
        });

        RenderSidebar({ Page: "PagesView" }); // rerender sidebar with updated pages!
    } else if (Type === "Card")
        Document.Pages[CurrentPage].Children.push({
            Type: "Card",
            Children: [
                {
                    Type: "Text",
                    Content: "New Card",
                    Alignment: "center",
                },
            ],
        });
    else if (Type === "Text")
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
    else if (Type === "Embed")
        Document.Pages[CurrentPage].Children.push({
            Type: "Embed",
            Source: "about:blank",
            Alt: "blank embed",
            StyleString: "width: 100%; height: initial;",
        });
    else if (Type === "Source")
        Document.Pages[CurrentPage].Children.push({
            Type: "Source",
            Content: "<span>Hello, world!</span>",
            StyleString: "width: max-content; height: max-content;",
        });

    // update
    return (NeedsUpdate = true);
}

// state
export let SidebarOpen = false;
export let EditOrderMode: boolean = false;

export let Hovered: HTMLElement;
export let CurrentPage: number = 0;

export let Selected: Node;
export let SelectedParent: Node[];

let NeedsUpdate: boolean = false;
export let EditMode: boolean = true;
export let RenderCycles: number = 0;

// state functions
export function Select(node: Node, parent: Node[]) {
    Selected = node;
    SelectedParent = parent;

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
    parser.ResetNodes(); // reset all nodes so we don't have cross-page id conflicts
    Select(Document.Pages[CurrentPage], Document.Pages); // select page
    return Update();
}

export function EditOrder(state: boolean = false, dragging?: Node, doc?: Node[]) {
    EditOrderMode = state;
    if (dragging && doc) schema.SetDrag(dragging, doc);

    if (state) return RenderSidebar({ Page: "Move" });
    else return RenderSidebar();
}

export function Delete(node: Node) {
    node.ID = "node:removed";

    SidebarOpen = false;
    RenderSidebar();

    return Update();
}

// sidebar
export function RenderSidebar(props?: { Page: string }) {
    // make sure we're in edit mode
    if (!EditMode) return;

    // if page is component tree, reset all nodes (prevent duplicate entries)
    if (props && props.Page === "Tree") {
        parser.ResetNodes();
        parser.ParsePage(Document.Pages[CurrentPage], EditMode);
    }

    // render
    return render(
        <Sidebar Page={props !== undefined ? props.Page : undefined} />,
        document.getElementById("builder:sidebar")!
    );
}

// render
function RenderPage() {
    // make sure we're in edit mode
    if (!EditMode) return;

    // check if we're editing an existing paste
    const search = new URLSearchParams(window.location.search);
    const EditingPaste = search.get("edit");

    // render
    return render(
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
                              let target: HTMLElement = event.target as HTMLElement;

                              if (!target.classList.contains("component"))
                                  if (
                                      target.parentElement &&
                                      target.parentElement.classList.contains(
                                          "component"
                                      )
                                  )
                                      target = target.parentElement;
                                  else return;

                              if (Hovered) Hovered.classList.remove("hover");
                              target.classList.add("hover");

                              Hovered = target;
                          }
                        : (event) => {
                              let target: HTMLElement = event.target as HTMLElement;

                              if (!target.classList.contains("component"))
                                  if (
                                      target.parentElement &&
                                      target.parentElement.classList.contains(
                                          "component"
                                      )
                                  )
                                      target = target.parentElement;
                                  else return;

                              Hovered = target;
                          }
                }
                onClick={
                    EditMode
                        ? (event) => {
                              // get target
                              let target = event.target as HTMLElement;

                              // move mode
                              if (EditOrderMode && EditMode) {
                                  const OriginTarget = document.getElementById(
                                      Selected.ID!
                                  )!;

                                  (OriginTarget.getAttribute("data-component")
                                      ? OriginTarget
                                      : OriginTarget.parentElement!
                                  ).dispatchEvent(new Event("dragstart"));

                                  // get zones
                                  // get drop zones
                                  const _zones =
                                      schema.GetDropZoneFromElement(target);
                                  if (!_zones) return;

                                  const [PreviousDropElement, NextDropElement] =
                                      _zones;

                                  // get user input
                                  const before = confirm(
                                      "Move component before element? Cancel to move after element. Continue to move before element." +
                                          "\n\nIf you're moving into an element with no children, the element you're dragging will go inside the element" +
                                          " for both options."
                                  );

                                  // move
                                  if (before)
                                      PreviousDropElement.dispatchEvent(
                                          new Event("drop")
                                      );
                                  else
                                      NextDropElement.dispatchEvent(
                                          new Event("drop")
                                      );

                                  // return
                                  return EditOrder(false);
                              }

                              // ...

                              if (!target.getAttribute("data-component"))
                                  target = target.parentElement!;

                              // get node
                              const AllNodes = parser.GetNodes();
                              const node = AllNodes.find(
                                  (n) => n.ID === target.id
                              ) as Node;

                              if (!node) return;

                              // get parent
                              const parent =
                                  (
                                      AllNodes.find(
                                          (n) =>
                                              n.Children && n.Children.includes(node)
                                      ) || Document.Pages[CurrentPage]
                                  ).Children || [];

                              // select
                              Select(node, parent);
                          }
                        : undefined
                }
                onDragStart={
                    EditMode
                        ? (event) => {
                              // get target
                              let target = event.target as HTMLElement;

                              if (!target) return;
                              if (!target.getAttribute("data-component"))
                                  target = target.parentElement!;

                              // get node
                              const AllNodes = parser.GetNodes();
                              const node = AllNodes.find(
                                  (node) => node.ID === target.id
                              );

                              if (!node) return;

                              // get parent
                              let parent = AllNodes.find((ParentNode) =>
                                  (ParentNode.Children || []).includes(node)
                              );

                              if (!parent) {
                                  // try to get parent from page root
                                  parent = Document.Pages[
                                      CurrentPage
                                  ].Children.includes(node)
                                      ? Document.Pages[CurrentPage]
                                      : undefined;

                                  if (!parent) return;
                              }

                              // set dragging
                              return schema.SetDrag(node, parent.Children as Node[]);
                          }
                        : undefined
                }
                id={"_doc"}
            />

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
                        Select(Document.Pages[CurrentPage], Document.Pages);
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
                    aria-label={"Library"}
                    title={"Library"}
                    id={"entry:button.Toolbox"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Package Symbol"}
                    >
                        <path d="m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z"></path>
                    </svg>
                </button>

                <button
                    id={"entry:button.PublishPaste"}
                    onClick={() => {
                        (
                            document.getElementById(
                                "contentInput"
                            ) as HTMLInputElement
                        ).value = encodeURIComponent(
                            `_builder:${BaseParser.stringify(Document)}`
                        );
                    }}
                >
                    Publish
                </button>
            </div>

            <div id="builder:sidebar" />

            {/* modals */}
            <Modal
                buttonid="entry:button.AddComponent"
                modalid="entry:modal.AddComponent"
                round={true}
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
                            className="border round"
                            onClick={() => {
                                AddComponent("Text");
                            }}
                        >
                            Text
                        </button>

                        <button
                            className="border round"
                            onClick={() => {
                                AddComponent("Image");
                            }}
                        >
                            Image
                        </button>

                        <button
                            className="border round"
                            onClick={() => {
                                AddComponent("Card");
                            }}
                        >
                            Card
                        </button>

                        <button
                            className="border round"
                            onClick={() => {
                                AddComponent("Embed");
                            }}
                        >
                            Embed
                        </button>

                        <button
                            className="border round"
                            onClick={() => {
                                AddComponent("Source");
                            }}
                        >
                            Source
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
                            className="green round"
                            style={{
                                width: "100%",
                            }}
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            </Modal>

            <PublishModals
                EditingPaste={EditingPaste || undefined}
                Endpoints={{
                    new: "/api/new",
                    edit: "/api/edit",
                    delete: "/api/delete",
                }}
            />

            <Toolbox.SaveModal />

            <Modal
                buttonid="entry:button.Toolbox"
                modalid="entry:modal.Toolbox"
                round={true}
            >
                <div
                    style={{
                        width: "40rem",
                        maxWidth: "100%",
                    }}
                >
                    <Toolbox.Browser />

                    <hr />

                    <form
                        method={"dialog"}
                        className="full mobile-flex-center"
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <button className="green round">Close</button>
                    </form>
                </div>
            </Modal>

            <Modal
                buttonid="entry:button.PasteOptions"
                modalid="entry:modal.PasteOptions"
                noIdMatch={true} // use `window.modals["entry:modal.PasteOptions"](true)` instead
                round={true}
            >
                <div
                    style={{
                        width: "25rem",
                        maxWidth: "100%",
                    }}
                >
                    <h4 style={{ textAlign: "center", width: "100%" }}>
                        Paste Options
                    </h4>

                    <hr />

                    <p>Information about your paste will be shown here!</p>
                    <button
                        class={"round"}
                        style={{
                            width: "100%",
                        }}
                        onClick={() => {
                            // get node
                            const AllNodes = parser.GetNodes();
                            const node = AllNodes.find(
                                (n) => n.ID === "PageStar"
                            ) as Node;

                            if (!node) return;

                            // get parent
                            const parent =
                                (
                                    AllNodes.find(
                                        (n) =>
                                            n.Children && n.Children.includes(node)
                                    ) || Document.Pages[CurrentPage]
                                ).Children || [];

                            // select
                            return Select(node, parent);
                        }}
                    >
                        Configure Element
                    </button>

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
                </div>
            </Modal>
        </>,
        document.getElementById("builder") as HTMLElement
    );
}

// ...
export function RenderDocument(_doc: string, _EditMode: boolean = true) {
    const doc = BaseParser.parse(_doc) as BuilderDocument;

    // keybinds listener
    document.addEventListener("keyup", (event) => {
        if (event.ctrlKey && event.key === ":")
            if (document.getElementById("debug_panel"))
                // show old
                document.getElementById("debug_panel")!.style.display = "block";
            // create new
            else return Debug(document.getElementById("debug")!);
        else return;
    });

    // update document
    Document = doc;
    CurrentPage = 0;
    EditMode = _EditMode;

    // ...
    function RenderCurrentPage(element: HTMLElement | ShadowRoot) {
        RenderCycles++;

        // check for star
        const Star = doc.Pages[CurrentPage].Children.find(
            (n) => n.Type === "StarInfo"
        );

        if (!Star)
            // add star if it doesn't exist
            doc.Pages[CurrentPage].Children.push({
                // default star
                ID: "PageStar",
                Type: "StarInfo",
                NotRemovable: true,
                Source: "",
            });

        // ...
        return render(parser.ParsePage(doc.Pages[CurrentPage], _EditMode), element);
    }

    // ...(not) edit mode stuff
    if (!_EditMode) {
        // fix mistakes from server render (by removing whole page and redrawing)
        for (const DragElement of document.querySelectorAll(
            ".builder\\:drag-element"
        ) as any as HTMLElement[])
            DragElement.remove();

        for (const Component of document.querySelectorAll(
            ".component"
        ) as any as HTMLElement[])
            Component.remove();

        // ...
        let _page: HTMLElement | ShadowRoot = document.getElementById("_doc")!;

        // ...handle view mode select (for debug)
        _page.addEventListener("click", (event) => {
            // get target
            let target = event.target as HTMLElement;

            if (!target.getAttribute("data-component"))
                target = target.parentElement!;

            // get node
            const AllNodes = parser.GetNodes();
            const node = AllNodes.find((n) => n.ID === target.id) as Node;

            if (!node) return;

            // get parent
            const parent =
                (
                    AllNodes.find((n) => n.Children && n.Children.includes(node)) ||
                    Document.Pages[CurrentPage]
                ).Children || [];

            // select
            Select(node, parent);
        });

        // handle pages
        function CheckHash(FromChange: boolean = false) {
            if (window.location.hash && window.location.hash.startsWith("#/")) {
                const PageID = window.location.hash.split("#/")[1];

                // get page
                const Page = doc.Pages.find((page) => page.ID === PageID);

                // set CurrentPage
                if (Page) {
                    CurrentPage = doc.Pages.indexOf(Page);
                    RenderCurrentPage(_page); // render
                }
            }
        }

        window.addEventListener("hashchange", () => CheckHash(true)); // every change
        CheckHash(); // initial run

        // initial page render
        RenderCurrentPage(_page);
    }

    // edit mode stuff
    if (_EditMode) {
        RenderPage(); // render full editor
        const _page = document.getElementById("_doc")!;

        // initial page render
        RenderCurrentPage(_page);

        // render sidebar
        SidebarOpen = false;
        RenderSidebar();

        // render every second
        setInterval(() => {
            // check if we need to render
            if (NeedsUpdate !== true) return;
            NeedsUpdate = false;
            RenderCycles++;

            // render
            render(parser.ParsePage(doc.Pages[CurrentPage], EditMode), _page);
        }, 1000);
    }

    // expose baseparser
    if (!globalThis.Bun) (globalThis as any).BaseParser = BaseParser;
}

// debug
export function Debug(Element: HTMLElement) {
    // render
    render(
        <>
            <Window title="Debug" id="debug_panel">
                <div className="block-list">
                    <div
                        className="option flex align-center justify-space-between"
                        onClick={() => Debug(Element)}
                    >
                        <span>Debug Stats</span>
                        <button>Refresh</button>
                    </div>

                    <div className="option">Pages: {Document.Pages.length}</div>
                    <div className="option">CurrentPage: {CurrentPage + 1}</div>

                    {Selected && (
                        <div className="option flex align-center justify-space-between">
                            <span>
                                {Selected.Type}#{Selected.ID}
                            </span>
                            <button
                                onClick={() => {
                                    // remove old inspector
                                    if (document.getElementById("debug_inspect"))
                                        document
                                            .getElementById("debug_inspect")!
                                            .remove();

                                    // create new inspector
                                    DebugInspect(
                                        Selected,
                                        document.getElementById(
                                            "debug_inspect_zone"
                                        )!
                                    );
                                }}
                            >
                                Inspect
                            </button>
                        </div>
                    )}

                    {Hovered && <div className="option">Hovered: {Hovered.id}</div>}

                    <div className="option">
                        IsEditing: {EditMode === true ? "true" : "false"}
                    </div>

                    <div className="option">
                        NeedsUpdate: {NeedsUpdate === true ? "true" : "false"}
                    </div>

                    <div className="option">RenderCycles: {RenderCycles}</div>
                    <div className="option">Renderer: DOM</div>

                    <div className="option">
                        SidebarOpen: {SidebarOpen === true ? "true" : "false"}
                    </div>

                    <div className="option">
                        Events: {(window.performance.eventCounts as any).size}
                    </div>

                    {navigator.hardwareConcurrency && (
                        <div class="option">
                            Logical Cores: {navigator.hardwareConcurrency}
                        </div>
                    )}

                    <div class="option">UA: {navigator.userAgent}</div>
                </div>
            </Window>

            {/* debug inspector */}
            <div id={"debug_inspect_zone"} />
            <div id={"debug_inspect_zone_1"} />
        </>,
        Element
    );
}

export function DebugInspect(Node: Node, Element: HTMLElement) {
    // render
    hydrate(
        <Window title="Debug Inspector" id="debug_inspect" fullClose={true}>
            <div className="block-list">
                <div className="option">{JSON.stringify(Node)}</div>
                <div className="option flex justify-center">
                    <button
                        onClick={() => {
                            if (document.getElementById("debug_node_list"))
                                document.getElementById(
                                    "debug_node_list"
                                )!.style.display = "block";
                            else
                                DebugNodeList(
                                    Selected,
                                    document.getElementById("debug_inspect_zone_1")!
                                );
                        }}
                    >
                        Node List
                    </button>
                </div>
            </div>
        </Window>,
        Element
    );
}

export function DebugNodeList(Node: Node, Element: HTMLElement) {
    const nodes = parser.GetNodes();

    // build node list
    const NodeList = [];

    for (const node of nodes) {
        NodeList.push(
            <div class={"option flex justify-space-between align-center"}>
                <span>
                    {node.Type}#{node.ID}
                </span>{" "}
                <button
                    onClick={() => {
                        // remove old inspector
                        if (document.getElementById("debug_inspect"))
                            document.getElementById("debug_inspect")!.remove();

                        // create new inspector
                        DebugInspect(
                            node,
                            document.getElementById("debug_inspect_zone")!
                        );
                    }}
                >
                    Inspect
                </button>
            </div>
        );

        continue;
    }

    // render
    hydrate(
        <Window title="Debug Node List" id="debug_node_list" fullClose={true}>
            <div className="block-list">
                <div className="option">
                    Listing Parser Nodes ({NodeList.length})
                </div>
                {NodeList}
            </div>
        </Window>,
        Element
    );
}

// default export
export default RenderDocument;
