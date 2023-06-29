import { EditorState } from "@codemirror/state";
import {
    EditorView,
    keymap,
    // plugins
    highlightSpecialChars,
    drawSelection,
    rectangularSelection,
} from "@codemirror/view";

import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Tag, tags } from "@lezer/highlight";

import {
    markdown,
    markdownKeymap,
    markdownLanguage,
} from "@codemirror/lang-markdown";

import { ParseMarkdown, FixMarkdown } from "./Markdown";

// create theme
const hightlight = HighlightStyle.define([
    { tag: tags.heading1, fontWeight: "700" },
    {
        tag: tags.heading2,
        fontWeight: "700",
    },
    {
        tag: tags.heading3,
        fontWeight: "700",
    },
    {
        tag: tags.strong,
        fontWeight: "600",
    },
    {
        tag: tags.emphasis,
        fontStyle: "italic",
    },
    {
        tag: tags.link,
        textDecoration: "underline",
        color: "var(--blue2)",
    },
    {
        tag: tags.list,
        borderLeft: "solid 5px var(--green)",
        paddingLeft: "40px",
    },
]);

/**
 * @function CreateEditor
 *
 * @export
 * @param {string} ElementID
 */
export default function CreateEditor(ElementID: string, content: string) {
    const element = document.getElementById(ElementID)!;

    // create editor
    const startState = EditorState.create({
        doc:
            // display given content or the saved document if it is blank
            decodeURIComponent(content) ||
            window.sessionStorage.getItem("doc")!,
        extensions: [
            keymap.of(markdownKeymap),
            highlightSpecialChars(),
            drawSelection(),
            rectangularSelection(),
            EditorView.lineWrapping,
            EditorView.updateListener.of(async (update) => {
                if (update.docChanged) {
                    // basic session save
                    const content = update.state.doc.toString();
                    window.sessionStorage.setItem("doc", content);

                    const html = ParseMarkdown(content);
                    window.sessionStorage.setItem("gen", html);

                    // update the hidden contentInput element so we can save the paste
                    (
                        document.getElementById(
                            "contentInput"
                        ) as HTMLInputElement
                    ).value = encodeURIComponent(content); // encoded so we can send it through form
                }
            }),
            // markdown
            syntaxHighlighting(hightlight),
            markdown({
                base: markdownLanguage,
            }),
        ],
    });

    const view = new EditorView({
        state: startState,
        parent: element,
    });

    // add attributes
    const contentField = document.querySelector(
        "#editor-tab-text .cm-editor .cm-scroller .cm-content"
    )!;
    
    contentField.setAttribute("spellcheck", "true");
    contentField.setAttribute("aria-label", "Content Editor");
}

// handle tabs
function CloseAllTabs() {
    for (let element of document.getElementsByClassName(
        "editor-tab"
    ) as any as HTMLElement[]) {
        element.style.display = "none";

        const button = document.getElementById(
            `editor-open-${element.id.split("editor-")[1] || ""}`
        );

        if (button) button.classList.add("secondary");
    }
}

document
    .getElementById("editor-open-tab-text")!
    .addEventListener("click", () => {
        CloseAllTabs();

        document
            .getElementById("editor-open-tab-text")!
            .classList.remove("secondary");

        document.getElementById("editor-tab-text")!.style.display = "block";
    });

document
    .getElementById("editor-open-tab-preview")!
    .addEventListener("click", () => {
        CloseAllTabs();
        const tab = document.getElementById("editor-tab-preview")!;

        tab.innerHTML = window.sessionStorage.getItem("gen") || "";
        tab.style.display = "block";

        document
            .getElementById("editor-open-tab-preview")!
            .classList.remove("secondary");

        // fix markdown rendering
        FixMarkdown(tab);
    });

// handle paste delete modal
if (document.getElementById("editor-open-delete-modal"))
    document
        .getElementById("editor-open-delete-modal")!
        .addEventListener("click", () => {
            (
                document.getElementById(
                    "editor-modal-delete"
                ) as HTMLDialogElement
            ).showModal();
        });
