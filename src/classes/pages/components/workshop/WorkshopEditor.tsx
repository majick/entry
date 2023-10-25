import { render, hydrate } from "preact";

import Modal from "../site/modals/Modal";
import PublishModals from "../site/modals/PublishModals";

import Renderer2D from "./2d/Renderer2D";
import WorkshopLib from "./lib/WorkshopLib";

// ...
const ScriptDefault = `export default function main() {
    console.log("New Script");
}`;

// codemirror
import { EditorState } from "@codemirror/state";

import {
    EditorView,
    keymap,
    highlightSpecialChars,
    drawSelection,
    highlightActiveLine,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    lineNumbers,
    highlightActiveLineGutter,
    placeholder,
} from "@codemirror/view";

import {
    syntaxHighlighting,
    indentOnInput,
    bracketMatching,
    foldGutter,
    foldKeymap,
    HighlightStyle,
    indentUnit,
} from "@codemirror/language";

import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
    CompletionContext,
    CompletionResult,
} from "@codemirror/autocomplete";

import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from "@codemirror/commands";

import {
    javascript,
    javascriptLanguage,
    localCompletionSource,
    typescriptLanguage,
} from "@codemirror/lang-javascript";
import { tags } from "@lezer/highlight";

// create editor theme
export const WorkshopHighlight = HighlightStyle.define([
    {
        tag: tags.keyword,
        color: "var(--red3)",
        textShadow: "0 0 1px var(--red3)",
    },
    {
        tag: tags.variableName,
        color: "var(--blue2)",
    },
    {
        tag: tags.propertyName,
        color: "var(--red)",
    },
    {
        tag: tags.comment,
        color: "var(--text-color-faded)",
    },
    {
        tag: tags.number,
        color: "var(--yellow)",
    },
    {
        tag: tags.string,
        color: "var(--green)",
    },
    {
        tag: tags.operator,
        color: "var(--red3)",
    },
    {
        tag: tags.bool,
        color: "var(--blue2)",
    },
    {
        tag: tags.attributeName,
        color: "var(--blue2)",
    },
    {
        tag: tags.attributeValue,
        color: "var(--green)",
    },
]);

// ...
export default function Render(element: HTMLElement, UseDoc: string) {
    function ToggleTab() {
        document.getElementById("tab_game")!.classList.toggle("active");
        document.getElementById("tab_code")!.classList.toggle("active");

        document.getElementById("tab_button_game")!.classList.toggle("secondary");
        document.getElementById("tab_button_code")!.classList.toggle("secondary");
    }

    // render
    render(
        <div
            class={"flex flex-column"}
            style={{
                height: "100%",
                overflowY: "hidden",
            }}
        >
            {/* topbar - tabs */}
            <div
                className="card flex justify-space-between"
                style={{
                    borderBottom: "solid 1px var(--background-surface2a)",
                    height: "76.2px",
                }}
            >
                <div class={"tabbar"}>
                    <button onClick={ToggleTab} id={"tab_button_game"}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Pencil Symbol"}
                        >
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                        </svg>
                        Game
                    </button>

                    <button
                        class={"secondary"}
                        onClick={ToggleTab}
                        id={"tab_button_code"}
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

                <div className="flex g-4">
                    <button
                        className="green round"
                        title={"Start Game"}
                        id={"action:start-game"}
                        onClick={(event) => {
                            // disable button
                            document
                                .getElementById("action:start-game")!
                                .setAttribute("disabled", "true");

                            document
                                .getElementById("action:stop-game")!
                                .removeAttribute("disabled");

                            // save current world state
                            CurrentWorldStore = WorkshopLib.Instances.World.Get(
                                Renderer.CurrentWorldName
                            ).Element.outerHTML;

                            // enable autodraw (start scene)
                            Renderer.ParseWorld(Renderer.CurrentWorldName, true);
                            Renderer.LastWorldName = ""; // reset last world (so scripts run again)
                            Renderer.AutoDraw = true;
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Play Symbol"}
                        >
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"></path>
                        </svg>
                    </button>

                    <button
                        className="red round"
                        title={"Stop Game"}
                        disabled={true}
                        id={"action:stop-game"}
                        onClick={(event) => {
                            // disable button
                            document
                                .getElementById("action:stop-game")!
                                .setAttribute("disabled", "true");

                            document
                                .getElementById("action:start-game")!
                                .removeAttribute("disabled");

                            // disable autodraw (stop scene)
                            Renderer.AutoDraw = false;
                            Renderer.ClearCanvas();

                            // abort all scripts
                            WorkshopLib.AbortScripts.abort("Game Stopped");
                            WorkshopLib.AbortScripts = new AbortController();

                            // clear all script-created event listeners
                            WorkshopLib.Events.ClearSignals();

                            // restore world state from CurrentWorldStore
                            WorkshopLib.Instances.World.Get(
                                Renderer.CurrentWorldName
                            ).Element.outerHTML = CurrentWorldStore;

                            // ...
                            RenderExplorer();
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"X Symbol"}
                        >
                            <path d="M2.344 2.343h-.001a8 8 0 0 1 11.314 11.314A8.002 8.002 0 0 1 .234 10.089a8 8 0 0 1 2.11-7.746Zm1.06 10.253a6.5 6.5 0 1 0 9.108-9.275 6.5 6.5 0 0 0-9.108 9.275ZM6.03 4.97 8 6.94l1.97-1.97a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l1.97 1.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-1.97 1.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L6.94 8 4.97 6.03a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018Z"></path>
                        </svg>
                    </button>

                    <div className="hr-left" />

                    <button
                        className="round invisible"
                        title={"Menu"}
                        // @ts-ignore
                        onClick={() => window.modals["entry:modal.PageMenu"](true)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Three Bar Menu Symbol"}
                        >
                            <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            {/* view panels */}
            <div
                id="tab_game"
                class={"editor-tab -editor active"}
                style={{
                    height: "calc(100% - 76.2px)",
                }}
            >
                <div
                    class={"flex justify-center align-center"}
                    style={{
                        height: "100%",
                    }}
                >
                    <canvas
                        id={"game_canvas"}
                        width={"1024"}
                        height={"512"}
                        style={{
                            background: "white",
                            height: "100%",
                            width: "100%",
                        }}
                    />
                </div>
            </div>

            <div
                id="tab_code"
                class={"editor-tab -editor sidebar-layout-wrapper"}
                style={{
                    height: "92%",
                }}
            >
                <div
                    id="explorer"
                    class={"sidebar"}
                    style={{
                        height: "100%",
                        width: "20%",
                    }}
                />

                <div
                    id="editor"
                    class={"page-content"}
                    style={{
                        overflowY: "auto",
                        maxHeight: "100%",
                        height: "100%",
                        fontFamily: "monospace",
                        paddingBottom: "0",
                    }}
                />

                <style
                    dangerouslySetInnerHTML={{
                        __html: `.cm-line, .cm-line span { font-family: monospace !important; }`,
                    }}
                />
            </div>

            <div id="context-menu-zone" />

            {/* modals */}
            <Modal
                modalid="entry:modal.AddElement"
                buttonid="entry:button.AddElement"
                noIdMatch={true}
                round={true}
            >
                <div
                    style={{
                        width: "25rem",
                        maxWidth: "100%",
                    }}
                >
                    <b>Add Element</b>

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
                        {["Shape", "Script", "Folder"].map((type: any) => (
                            <button
                                className="border round"
                                onClick={() => {
                                    // get parent
                                    const parent =
                                        ExplorerFocus.nodeName === "World"
                                            ? WorkshopLib.Instances.World.Get(
                                                  ExplorerFocus.getAttribute("name")!
                                              )
                                            : new WorkshopLib.Instances.Instance(
                                                  WorkshopLib.Instances.World.Get(
                                                      Renderer.CurrentWorldName
                                                  ),
                                                  "actor",
                                                  `New ${type}`,
                                                  ExplorerFocus,
                                                  true
                                              );

                                    // create new instance
                                    WorkshopLib.Instances.CreateInstance(
                                        parent,
                                        type,
                                        type === "Script"
                                            ? ScriptDefault
                                            : undefined,
                                        `New ${type}`
                                    );

                                    // render explorer
                                    RenderExplorer();
                                }}
                            >
                                {type}
                            </button>
                        ))}
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
        </div>,
        element
    );

    // create game renderer
    const Renderer = new Renderer2D(
        UseDoc ||
            `<Workshop version="1.0">
            <World name="World"></World>
        </Workshop>`,
        document.getElementById("game_canvas") as HTMLCanvasElement
    );

    Renderer.AutoDraw = false; // scene is paused by default
    Renderer.BeginDrawing();

    (globalThis as any).renderer = Renderer;
    (globalThis as any).library = WorkshopLib;

    // save current world so we can restore after game finishes
    let CurrentWorldStore: string = WorkshopLib.Instances.World.Get(
        Renderer.CurrentWorldName
    ).Element.outerHTML;

    // create code editor
    let CurrentContent: string = "";

    const view = new EditorView({
        // @ts-ignore
        state: EditorState.create({
            doc:
                // display the saved document or given content
                "// Hello, world!",
            extensions: [
                placeholder("New Script"),
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                syntaxHighlighting(WorkshopHighlight, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                crosshairCursor(),
                highlightActiveLine(),
                EditorView.updateListener.of(async (update) => {
                    if (update.docChanged) {
                        const content = update.state.doc.toString();
                        if (content === "") return;

                        CurrentContent = content;

                        // show unsaved changes notifier
                        if (
                            CurrentScriptNode &&
                            content !== CurrentScriptNode.content // content has actually changed
                        )
                            document.getElementById(
                                `${CurrentScriptNode.id}-changed`
                            )!.style.display = "flex";
                    }
                }),
                // keymaps
                indentOnInput(),
                indentUnit.of("    "),
                keymap.of({
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    ...indentWithTab,
                }),
                keymap.of([
                    // ...new line fix
                    {
                        key: "Enter",
                        run: (): boolean => {
                            // get current line
                            const CurrentLine = view.state.doc.lineAt(
                                view.state.selection.main.head
                            );

                            // get indentation string (for automatic indent)
                            let IndentationString =
                                // gets everything before the first non-whitespace character
                                CurrentLine.text.split(/[^\s]/)[0];

                            let ExtraCharacters = "";

                            // if last character of the line is }, add an indentation
                            // } because it's automatically added after opened braces!
                            if (
                                CurrentLine.text[CurrentLine.text.length - 1] === "}"
                            ) {
                                IndentationString += "    ";
                                ExtraCharacters = "\n"; // auto insert line break after
                            }

                            // start transaction
                            const cursor = view.state.selection.main.head;
                            const transaction = view.state.update({
                                changes: {
                                    from: cursor,
                                    insert: `\n${IndentationString}${ExtraCharacters}`,
                                },
                                selection: {
                                    anchor: cursor + 1 + IndentationString.length,
                                },
                                scrollIntoView: true,
                            });

                            if (transaction) {
                                view.dispatch(transaction);
                            }

                            // return
                            return true;
                        },
                    },
                ]),
                // javascript
                javascript({ typescript: true }),
                javascriptLanguage.data.of({
                    autocomplete: (
                        context: CompletionContext
                    ): CompletionResult | null => {
                        return localCompletionSource(context);
                    },
                }),
            ],
        }),
        parent: document.getElementById("editor")!,
    });

    // context menu
    function ContextMenu(
        x: number,
        y: number,
        entries: { label: string; action: () => void }[]
    ) {
        // clear current menu
        document.getElementById("context-menu-zone")!.innerHTML = "";

        // render
        hydrate(
            <div
                class={"card round border secondary flex flex-column g-4"}
                style={{
                    width: "max-content",
                    position: "absolute",
                    left: x,
                    top: y,
                    padding: "var(--u-04)",
                }}
            >
                {entries.map((e) => (
                    <button
                        onClick={e.action}
                        class={"full round flex justify-start"}
                    >
                        {e.label}
                    </button>
                ))}
            </div>,
            document.getElementById("context-menu-zone")!
        );
    }

    document.addEventListener(
        "click",
        () => (document.getElementById("context-menu-zone")!.innerHTML = "")
    );

    window.addEventListener(
        "keypress",
        () => (document.getElementById("context-menu-zone")!.innerHTML = "")
    );

    // render node explorer
    let ExplorerFocus: Element;
    let CurrentScriptNode: any;
    let MoveMode: boolean = false;

    function RenderExplorer() {
        // ...
        function RenderExplorerEntry(input: Element) {
            // show properties if we have a previous focus
            if (ExplorerFocus) RenderProperties(ExplorerFocus);

            // build context menu entires
            const ContextMenuEntries: { label: string; action: () => void }[] = [
                {
                    label: "Inspect",
                    action() {
                        RenderProperties(ExplorerFocus);
                    },
                },
                {
                    label: "Add Child",
                    action() {
                        if (ExplorerFocus.nodeName === "Script")
                            return alert(
                                "Script elements cannot have child elements!"
                            );

                        (window as any).modals["entry:modal.AddElement"](true);
                    },
                },
                {
                    label: "Move",
                    action() {
                        MoveMode = true;
                        alert("Select element to move into!");
                    },
                },
                {
                    label: "Delete",
                    action() {
                        ExplorerFocus.remove();
                        RenderExplorer();

                        // clear CurrentScriptNode (if it matches)
                        if (
                            CurrentScriptNode &&
                            CurrentScriptNode.Element === ExplorerFocus
                        )
                            CurrentScriptNode = undefined;
                    },
                },
            ];

            // build child entries
            const Entries: any[] = [];

            for (const child of input.children as any as Element[]) {
                if (child.children.length > 0)
                    // render full entry (with child nodes includes)
                    Entries.push(RenderExplorerEntry(child));
                // render small entry (just button)
                else if (child.nodeName !== "Script")
                    // normal entry
                    Entries.push(
                        <button
                            class={
                                "round full flex justify-space-between explorer:property"
                            }
                            onContextMenu={(event) => {
                                event.preventDefault();
                                ExplorerFocus = child; // so we manage the correct element!
                                ContextMenu(
                                    event.pageX,
                                    event.pageY,
                                    ContextMenuEntries
                                );
                            }}
                            onClick={(event) => {
                                // handle move
                                if (MoveMode && ExplorerFocus) {
                                    MoveMode = false;
                                    ExplorerFocus.remove();
                                    child.appendChild(ExplorerFocus);
                                    RenderExplorer();
                                }

                                // ...
                                ExplorerFocus = child;
                                RenderProperties(child);

                                view.dispatch(
                                    view.state.update({
                                        changes: {
                                            from: 0,
                                            to: view.state.doc.length,
                                            insert: "",
                                        },
                                    })
                                );

                                // remove active state from other elements
                                for (const element of document.querySelectorAll(
                                    ".explorer\\:property"
                                ) as any as HTMLElement[])
                                    element.classList.remove("active");

                                // add active state
                                (event.target as any).classList.add("active");
                            }}
                        >
                            <span>
                                {child.getAttribute("name") ||
                                    child.id ||
                                    child.nodeName}
                            </span>
                        </button>
                    );
                else {
                    // script entry

                    // get node
                    const Node = new WorkshopLib.Instances.Script(
                        WorkshopLib.Instances.World.Get(Renderer.CurrentWorldName),
                        child.innerHTML,
                        child.getAttribute("name") || "New Script",
                        child
                    );

                    // add button
                    Entries.push(
                        <button
                            class={
                                "round full flex justify-space-between explorer:property"
                            }
                            style={{
                                justifyContent: "space-between",
                                width: "100%",
                                boxShadow:
                                    // show current script highlight
                                    CurrentScriptNode === Node
                                        ? "inset 0 0 0 2px var(--blue)"
                                        : "unset",
                            }}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                ExplorerFocus = child; // so we manage the correct element!
                                ContextMenu(
                                    event.pageX,
                                    event.pageY,
                                    ContextMenuEntries
                                );
                            }}
                            onClick={(event) => {
                                // if we made changes and didn't save, confirm buffer change
                                if (
                                    CurrentScriptNode &&
                                    document.getElementById(
                                        `${CurrentScriptNode.id}-changed`
                                    ) &&
                                    document.getElementById(
                                        `${CurrentScriptNode.id}-changed`
                                    )!.style.display === "flex"
                                )
                                    if (
                                        !confirm(
                                            "You have unsaved changes. Are you sure you would like to switch buffers?"
                                        )
                                    )
                                        return;

                                // set current script
                                CurrentScriptNode = Node;
                                ExplorerFocus = child;
                                RenderProperties(child);

                                // change editor content
                                view.dispatch(
                                    view.state.update({
                                        changes: {
                                            from: 0,
                                            to: view.state.doc.length,
                                            insert: decodeURIComponent(Node.content),
                                        },
                                    })
                                );

                                // hide changed notifications
                                for (const notification of document.querySelectorAll(
                                    ".changed-notify"
                                ) as any as HTMLElement[])
                                    notification.style.display = "none";

                                // remove active state from other elements
                                for (const element of document.querySelectorAll(
                                    ".explorer\\:property"
                                ) as any as HTMLElement[])
                                    element.classList.remove("active");

                                // add active state
                                (event.target as any).classList.add("active");
                            }}
                        >
                            {Node.name}
                            <span
                                id={`${Node.id}-changed`}
                                class={"changed-notify align-center"}
                                style={{
                                    display: "none",
                                    color: "var(--green3)",
                                }}
                                title={"Modified - Press Ctrl+S to save!"}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                    aria-label={"Modified Symbol"}
                                >
                                    <path d="M13.25 1c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1ZM2.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"></path>
                                </svg>
                            </span>
                        </button>
                    );
                }
            }

            // return entry
            return (
                <details
                    class={"round file-list-entry"}
                    onClick={(event) => {
                        // handle move
                        if (MoveMode && ExplorerFocus) {
                            MoveMode = false;
                            ExplorerFocus.remove();
                            input.appendChild(ExplorerFocus);
                            RenderExplorer();

                            event.preventDefault();
                        }
                    }}
                >
                    <summary
                        onContextMenu={(event) => {
                            event.preventDefault();
                            ExplorerFocus = input;
                            ContextMenu(
                                event.pageX,
                                event.pageY,
                                ContextMenuEntries
                            );
                        }}
                    >
                        {input.getAttribute("name") || input.id}
                    </summary>

                    <div class={"details-flex-content-list-box"}>{Entries}</div>
                </details>
            );
        }

        // render
        hydrate(
            <div
                class={"flex flex-column justify-space-between"}
                style={{
                    height: "100%",
                }}
            >
                {/* explorer */}
                <div
                    class={"flex flex-column g-4"}
                    style={{
                        minHeight: "25%",
                        maxHeight: "70%",
                        overflowY: "auto",
                    }}
                >
                    {RenderExplorerEntry(
                        WorkshopLib.Instances.World.Get(Renderer.CurrentWorldName)
                            .Element
                    )}
                </div>

                {/* properties window */}
                <div
                    id="properties_window"
                    style={{
                        minHeight: "25%",
                        maxHeight: "20%",
                        overflowY: "auto",
                    }}
                />
            </div>,
            document.getElementById("explorer")!
        );
    }

    RenderExplorer();

    // ...
    function PropertiesInput(ExplorerFocus: Element, name: string, value: string) {
        return (
            <input
                class={"round"}
                type={"text"}
                name={name}
                id={name.replaceAll(" ", "_")}
                placeholder={name}
                value={value}
                onBlur={(event) => {
                    if ((event.target as HTMLInputElement).value === "\n") return;

                    ExplorerFocus.setAttribute(
                        name.toLowerCase(),
                        (event.target as HTMLInputElement).value
                    );

                    RenderExplorer();
                    RenderProperties(ExplorerFocus);
                }}
                style={{
                    minWidth: "100%",
                }}
                autocomplete={"off"}
            />
        );
    }

    // properties window
    function RenderProperties(ExplorerFocus: Element) {
        document.getElementById("properties_window")!.innerHTML = "";

        hydrate(
            <div className="flex flex-column g-4">
                <hr />

                {((ExplorerFocus.nodeName === "Script" ||
                    ExplorerFocus.nodeName === "Shape" ||
                    ExplorerFocus.nodeName === "Instance") && (
                    <>
                        {/* normal options */}
                        {PropertiesInput(
                            ExplorerFocus,
                            "Name",
                            ExplorerFocus.getAttribute("name") || ""
                        )}
                    </>
                )) ||
                    ((ExplorerFocus.nodeName === "Position" ||
                        ExplorerFocus.nodeName === "Size") && (
                        <>
                            {/* vector options */}
                            {PropertiesInput(
                                ExplorerFocus,
                                "x",
                                ExplorerFocus.getAttribute("x") || ""
                            )}

                            {PropertiesInput(
                                ExplorerFocus,
                                "y",
                                ExplorerFocus.getAttribute("y") || ""
                            )}
                        </>
                    )) ||
                    (ExplorerFocus.nodeName === "Color" && (
                        <>
                            {/* color options */}
                            {PropertiesInput(
                                ExplorerFocus,
                                "r",
                                ExplorerFocus.getAttribute("r") || ""
                            )}

                            {PropertiesInput(
                                ExplorerFocus,
                                "g",
                                ExplorerFocus.getAttribute("g") || ""
                            )}

                            {PropertiesInput(
                                ExplorerFocus,
                                "b",
                                ExplorerFocus.getAttribute("b") || ""
                            )}
                        </>
                    ))}
            </div>,
            document.getElementById("properties_window")!
        );
    }

    // add script save keybind...
    document.addEventListener("keydown", (event) => {
        if (!CurrentScriptNode) return;
        if (event.ctrlKey && event.key === "s") {
            if (!Renderer.scene) return;
            event.preventDefault();

            // save buffer
            CurrentScriptNode.content = encodeURIComponent(CurrentContent);

            // update node from id
            if (ExplorerFocus !== CurrentScriptNode.Element) return;
            ExplorerFocus!.innerHTML = CurrentScriptNode.content;

            // hide unsaved changes notifier
            document.getElementById(
                `${CurrentScriptNode.id}-changed`
            )!.style.display = "none";

            // update CurrentWorldState
            CurrentWorldStore = WorkshopLib.Instances.World.Get(
                Renderer.CurrentWorldName
            ).Element.outerHTML;
        }
    });
}
