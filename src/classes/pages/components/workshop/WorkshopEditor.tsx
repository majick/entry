import { render, hydrate } from "preact";

import Modal from "../site/modals/Modal";
import PublishModals from "../site/modals/PublishModals";

import Renderer2D from "./2d/2DRenderer";
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

// ...
export default function Render(element: HTMLElement) {
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
                            Renderer.AutoDraw = true;
                            Renderer.LastWorldName = ""; // reset last world (so scripts run again)
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
                    id="files"
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
                        __html: `.cm-editor { height: 100%; } 
                        .cm-line, .cm-line span { font-family: monospace !important; }`,
                    }}
                />
            </div>
        </div>,
        element
    );

    // create game renderer
    const Renderer = new Renderer2D(
        `<Workshop version="1.0">
            <World name="World"></World>
        </Workshop>`,
        document.getElementById("game_canvas") as HTMLCanvasElement
    );

    Renderer.AutoDraw = false; // scene is paused by default
    Renderer.BeginDrawing();

    // @ts-ignore set renderer global
    (globalThis as any).renderer = Renderer;
    // @ts-ignore
    window.library = WorkshopLib;

    // save current world so we can restore after game finishes
    let CurrentWorldStore: string = WorkshopLib.Instances.World.Get(
        Renderer.CurrentWorldName
    ).Element.outerHTML;

    // create editor theme
    const highlight = HighlightStyle.define([
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
                syntaxHighlighting(highlight, { fallback: true }),
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

    // render script browser
    let ActiveScriptBuffers = []; // hold currently open scripts
    let CurrentScriptNode: any;

    function RenderScripts() {
        const scripts = Renderer.scene!.querySelectorAll(
            "Script"
        ) as any as Element[];

        const ScriptButtons = [];

        for (const script of scripts) {
            const Node = new WorkshopLib.Instances.Script(
                WorkshopLib.Instances.World.Get(Renderer.CurrentWorldName),
                script.innerHTML,
                script.getAttribute("name") || "New Script",
                script
            );

            ScriptButtons.push(
                <button
                    class={"round"}
                    style={{
                        justifyContent: "space-between",
                        width: "100%",
                    }}
                    onClick={() => {
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
                    }}
                >
                    <span class={"flex g-4"}>
                        {Node.name}
                        <span
                            id={`${Node.id}-changed`}
                            class={"changed-notify align-center"}
                            style={{ display: "none", color: "var(--green3)" }}
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
                    </span>

                    <div className="flex g-4">
                        <button
                            className="round tertiary invisible"
                            title={"execute file as blob"}
                            onClick={() => Node.run()}
                        >
                            Run
                        </button>
                    </div>
                </button>
            );
        }

        // clear files
        document.getElementById("files")!.innerHTML = "";

        // render
        hydrate(
            <div class={"flex flex-column g-4"}>
                <button
                    class={"round"}
                    style={{
                        justifyContent: "flex-start",
                        width: "100%",
                    }}
                    onClick={() => {
                        new WorkshopLib.Instances.Script(
                            WorkshopLib.Instances.World.Get(
                                Renderer.CurrentWorldName
                            ),
                            encodeURIComponent(ScriptDefault),
                            "New Script"
                        );

                        RenderScripts();
                    }}
                >
                    Add Script
                </button>

                <hr />

                {ScriptButtons}
            </div>,
            document.getElementById("files")!
        );
    }

    RenderScripts();

    // add script save keybind...
    document.addEventListener("keydown", (event) => {
        if (!CurrentScriptNode) return;
        if (event.ctrlKey && event.key === "s") {
            event.preventDefault();

            // save buffer
            CurrentScriptNode.content = encodeURIComponent(CurrentContent);

            // hide unsaved changes notifier
            document.getElementById(
                `${CurrentScriptNode.id}-changed`
            )!.style.display = "none";
        }
    });
}