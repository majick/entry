/**
 * @file Handle builder
 * @name Builder.tsx
 * @license MIT
 */

import schema, { BuilderDocument, Node } from "./schema";
import parser from "./parser";

import { render } from "preact";

import type { Paste } from "../../../db/EntryDB";
import Sidebar from "./components/Sidebar";
import Modal from "../Modal";

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

    // update
    return (NeedsUpdate = true);
}

// state
export let SidebarOpen = false;
export let MoveMode: boolean = false;

export let Hovered: HTMLElement;
export let CurrentPage: number = 0;

export let Selected: Node;
export let SelectedParent: Node[];

let NeedsUpdate: boolean = false;
export let EditMode: boolean = true;

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
    return Update();
}

export function Move(state: boolean = false, dragging?: Node, doc?: Node[]) {
    MoveMode = state;
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

    // render
    return render(
        <>
            <Sidebar Page={props !== undefined ? props.Page : undefined} />
        </>,
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
                              const target: HTMLElement =
                                  event.target as HTMLElement;
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
                                  const _zones =
                                      schema.GetDropZoneFromElement(target);
                                  if (!_zones) return;

                                  const [PreviousDropElement, NextDropElement] =
                                      _zones;

                                  // get user input
                                  const before = confirm(
                                      "Move component before element? Cancel to move after element. Continue to move before element."
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
                                  return Move(false);
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
                                AddComponent("Card");
                            }}
                        >
                            Card
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

                    {(EditingPaste === null && (
                        <form
                            style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexDirection: "column",
                                width: "100%",
                            }}
                            onSubmit={async (event) => {
                                event.preventDefault();

                                // get target
                                const target = event.target as HTMLFormElement;

                                // disable EditMode
                                for (const node of parser.AllNodes)
                                    node.EditMode = undefined;

                                // build paste
                                const Paste: Paste = {
                                    CustomURL: target.CustomURL.value || "",
                                    Content: encodeURIComponent(
                                        `_builder:${btoa(JSON.stringify(Document))}`
                                    ),
                                    EditPassword: target.EditPassword.value || "",
                                    PubDate: new Date().getTime(),
                                    EditDate: new Date().getTime(),
                                    GroupName: "",
                                    GroupSubmitPassword: "",
                                };

                                // create formdata body
                                let body: string[] = [];

                                // ...fill formdata body
                                for (const [key, value] of Object.entries(Paste))
                                    body.push(`${key}=${value}`);

                                // send request
                                const res = await fetch("/api/new", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type":
                                            "application/x-www-form-urlencoded",
                                    },
                                    body: body.join("&"),
                                });

                                // check if there was an error
                                if (res.headers.get("X-Entry-Error"))
                                    return alert(res.headers.get("X-Entry-Error"));

                                // redirect to view
                                return (window.location.href = `/${Paste.CustomURL}`);
                            }}
                        >
                            <input
                                type="text"
                                placeholder={"Custom URL"}
                                maxLength={100}
                                minLength={2}
                                name={"CustomURL"}
                                id={"CustomURL"}
                                autoComplete={"off"}
                                required
                            />

                            <input
                                type="text"
                                placeholder={"Custom edit code"}
                                maxLength={256}
                                minLength={5}
                                name={"EditPassword"}
                                id={"EditPassword"}
                                autoComplete={"off"}
                                required
                            />

                            <button
                                style={{
                                    width: "100%",
                                }}
                            >
                                Publish
                            </button>
                        </form>
                    )) || (
                        <form
                            style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexDirection: "column",
                                width: "100%",
                            }}
                            onSubmit={async (event) => {
                                event.preventDefault();

                                // get target
                                const target = event.target as HTMLFormElement;

                                // disable EditMode
                                for (const node of parser.AllNodes)
                                    node.EditMode = undefined;

                                // build paste
                                const Paste = {
                                    OldURL: EditingPaste || "",
                                    OldEditPassword:
                                        target.OldEditPassword.value || "",
                                    NewContent: encodeURIComponent(
                                        `_builder:${btoa(JSON.stringify(Document))}`
                                    ),
                                };

                                // create formdata body
                                let body: string[] = [];

                                // ...fill formdata body
                                for (const [key, value] of Object.entries(Paste))
                                    body.push(`${key}=${value}`);

                                // send request
                                const res = await fetch("/api/edit", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type":
                                            "application/x-www-form-urlencoded",
                                    },
                                    body: body.join("&"),
                                });

                                // check if there was an error
                                if (res.headers.get("X-Entry-Error"))
                                    return alert(res.headers.get("X-Entry-Error"));

                                // redirect to view
                                return (window.location.href = `/${Paste.OldURL}`);
                            }}
                        >
                            <input
                                type="text"
                                placeholder={"Edit code"}
                                maxLength={256}
                                minLength={5}
                                name={"OldEditPassword"}
                                id={"OldEditPassword"}
                                autoComplete={"off"}
                                required
                            />

                            <button
                                style={{
                                    width: "100%",
                                }}
                            >
                                Publish Changes
                            </button>
                        </form>
                    )}

                    <hr />

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
                        <button className="red" id={"entry:button.DeletePaste"}>
                            Delete Paste
                        </button>
                    </div>

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

            {EditingPaste && (
                <Modal
                    buttonid="entry:button.DeletePaste"
                    modalid="entry:modal.DeletePaste"
                >
                    <h4 style={{ textAlign: "center", width: "100%" }}>
                        Confirm Deletion
                    </h4>

                    <hr />

                    <ul>
                        <li>If you delete your paste, it will be gone forever</li>
                        <li>
                            You cannot restore your paste and it will be removed from
                            the server
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
                        <form method="dialog" class={"mobile-max"}>
                            <button class={"green mobile-max"}>Cancel</button>

                            <div style={{ margin: "0.25rem 0" }}>
                                <hr class={"mobile-only"} />
                            </div>
                        </form>

                        <form
                            method="POST"
                            action={"/api/delete"}
                            class={"mobile-max"}
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "right",
                                maxWidth: "100%",
                                gap: "0.5rem",
                            }}
                        >
                            <input
                                type="text"
                                required
                                minLength={5}
                                maxLength={256}
                                placeholder={"Edit code"}
                                name={"EditPassword"}
                                autoComplete={"off"}
                                class={"mobile-max"}
                            />

                            <input
                                type="hidden"
                                required
                                name={"CustomURL"}
                                value={EditingPaste!}
                            />

                            <button class={"red mobile-max"}>Delete</button>
                        </form>
                    </div>
                </Modal>
            )}
        </>,
        document.getElementById("builder") as HTMLElement
    );
}

// ...
export function RenderDocument(doc: BuilderDocument, _EditMode: boolean = true) {
    // update document
    Document = doc;
    CurrentPage = 0;
    EditMode = _EditMode;

    // ...
    function RenderCurrentPage() {
        return render(
            parser.ParsePage(doc.Pages[CurrentPage], _EditMode),
            document.getElementById("_doc")!
        );
    }

    // ...edit mode stuff
    if (!_EditMode) {
        // handle pages
        function CheckHash() {
            if (window.location.hash && window.location.hash.startsWith("#/")) {
                const PageID = window.location.hash.split("#/")[1];

                // get page
                const Page = doc.Pages.find((page) => page.ID === PageID);

                // set CurrentPage
                if (Page) {
                    CurrentPage = doc.Pages.indexOf(Page);
                    RenderCurrentPage(); // render
                }
            }
        }

        window.addEventListener("hashchange", CheckHash); // every change
        CheckHash(); // initial run

        // initial page render
        RenderCurrentPage();
    }

    // edit mode stuff
    if (_EditMode) {
        RenderPage(); // render full editor

        // initial page render
        RenderCurrentPage();

        // render sidebar
        SidebarOpen = false;
        RenderSidebar();

        // render every second
        setInterval(() => {
            // check if we need to render
            if (NeedsUpdate !== true) return;
            NeedsUpdate = false;

            // render
            render(
                parser.ParsePage(doc.Pages[CurrentPage], EditMode),
                document.getElementById("_doc")!
            );
        }, 1000);
    }
}

// default export
export default RenderDocument;
