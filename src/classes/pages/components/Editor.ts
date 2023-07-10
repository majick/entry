import { EditorState } from "@codemirror/state";
import {
    EditorView,
    keymap,
    // plugins
    highlightSpecialChars,
    drawSelection,
    rectangularSelection,
} from "@codemirror/view";

import {
    HighlightStyle,
    syntaxHighlighting,
    syntaxTree,
} from "@codemirror/language";

import {
    CompletionContext,
    autocompletion,
    closeBrackets,
} from "@codemirror/autocomplete";

import {
    markdown,
    markdownKeymap,
    markdownLanguage,
} from "@codemirror/lang-markdown";
import { tags } from "@lezer/highlight";

import { HandleCustomElements } from "../assets/ClientFixMarkdown";
import { ParseMarkdown } from "./Markdown";

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
        tag: tags.heading4,
        fontWeight: "700",
    },
    {
        tag: tags.heading5,
        fontWeight: "700",
    },
    {
        tag: tags.heading6,
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
        tag: tags.tagName,
        color: "var(--red)",
        fontFamily: "monospace",
    },
    {
        tag: tags.monospace,
        fontFamily: "monospace",
        color: "var(--red3)",
    },
    {
        tag: tags.angleBracket,
        fontFamily: "monospace",
        color: "var(--blue2)",
    },
]);

// language features

/**
 * @function BasicCompletion
 *
 * @param {CompletionContext} context
 * @return {*}
 */
function BasicCompletion(context: CompletionContext): any {
    let word = context.matchBefore(/\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;

    return {
        from: word.from,
        options: [
            // html special elements
            {
                label: "<hue>",
                type: "function",
                info: "Controls page hue when your paste is viewed, integer",
                apply: "<hue></hue>",
                detail: "Special Elements",
            },
            {
                label: "<sat>",
                type: "function",
                info: "Controls page saturation when your paste is viewed, percentage",
                apply: "<sat></sat>",
                detail: "Special Elements",
            },
            {
                label: "<lit>",
                type: "function",
                info: "Controls page lightness when your paste is viewed, percentage",
                apply: "<lit></lit>",
                detail: "Special Elements",
            },
            {
                label: "comment",
                type: "keyword",
                info: "Invisible element",
                apply: "<comment></comment>",
                detail: "Special Elements",
            },
            // themes
            {
                label: "dark theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to dark",
                apply: "<theme>dark</theme>",
                detail: "Themes",
            },
            {
                label: "light theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to light",
                apply: "<theme>light</theme>",
                detail: "Themes",
            },
            {
                label: "purple theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to purple",
                apply: "<theme>purple</theme>",
                detail: "Themes",
            },
            {
                label: "blue theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to blue",
                apply: "<theme>blue</theme>",
                detail: "Themes",
            },
            // markdown
            {
                label: "h1",
                type: "keyword",
                apply: "# ",
                detail: "Headings",
            },
            {
                label: "h2",
                type: "keyword",
                apply: "## ",
                detail: "Headings",
            },
            {
                label: "h3",
                type: "keyword",
                apply: "### ",
                detail: "Headings",
            },
            {
                label: "h4",
                type: "keyword",
                apply: "#### ",
                detail: "Headings",
            },
            {
                label: "h5",
                type: "keyword",
                apply: "##### ",
                detail: "Headings",
            },
            {
                label: "h6",
                type: "keyword",
                apply: "###### ",
                detail: "Headings",
            },
            {
                label: "unordered list",
                type: "keyword",
                apply: "- ",
                detail: "Lists",
            },
            {
                label: "ordered list",
                type: "keyword",
                apply: "1. ",
                detail: "Lists",
            },
            {
                label: "note",
                type: "function",
                apply: "!!! note ",
                detail: "Notes",
            },
            {
                label: "danger",
                type: "function",
                apply: "!!! danger ",
                detail: "Notes",
            },
            {
                label: "warning",
                type: "function",
                apply: "!!! warn ",
                detail: "Notes",
            },
            // extras
            {
                label: "timestamp",
                type: "text",
                apply: new Date().toLocaleString(),
                detail: "Extras",
            },
            {
                label: "UTC timestamp",
                type: "text",
                apply: new Date().toUTCString(),
                detail: "Extras",
            },
        ],
    };
}

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
            window.sessionStorage.getItem("doc")! ||
            "",
        extensions: [
            keymap.of(markdownKeymap),
            highlightSpecialChars(),
            drawSelection(),
            rectangularSelection(),
            EditorView.lineWrapping,
            closeBrackets(),
            EditorView.updateListener.of(async (update) => {
                if (update.docChanged) {
                    // basic session save
                    const content = update.state.doc.toString();
                    window.sessionStorage.setItem("doc", content);

                    const html = await ParseMarkdown(content);
                    window.sessionStorage.setItem("gen", html);

                    // update the hidden contentInput element so we can save the paste
                    (
                        document.getElementById("contentInput") as HTMLInputElement
                    ).value = encodeURIComponent(content); // encoded so we can send it through form
                }
            }),
            keymap.of([
                // we're creating this keymap because of a weird issue in firefox where
                // (if there is no text before or after), a new line is not created
                // ...we're basically just manually inserting the new line here
                {
                    key: "Enter",
                    run: (): boolean => {
                        const cursor = view.state.selection.main.head;
                        const transaction = view.state.update({
                            changes: {
                                from: cursor,
                                insert: "\n",
                            },
                            selection: { anchor: cursor + 1 },
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
            // markdown
            syntaxHighlighting(hightlight),
            markdown({
                base: markdownLanguage,
            }),
            autocompletion({
                override: [BasicCompletion],
                activateOnTyping: window.location.search.includes("hints=true"),
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

    // set value of contentInput if we have window.sessionStorage.doc
    const doc = window.sessionStorage.getItem("doc");
    if (doc)
        (document.getElementById("contentInput") as HTMLInputElement).value =
            encodeURIComponent(doc);
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

document.getElementById("editor-open-tab-text")!.addEventListener("click", () => {
    CloseAllTabs();

    document.getElementById("editor-open-tab-text")!.classList.remove("secondary");

    document.getElementById("editor-tab-text")!.style.display = "block";
});

document.getElementById("editor-open-tab-preview")!.addEventListener("click", () => {
    CloseAllTabs();
    const tab = document.getElementById("editor-tab-preview")!;

    tab.innerHTML = window.sessionStorage.getItem("gen") || "";
    tab.style.display = "block";

    document
        .getElementById("editor-open-tab-preview")!
        .classList.remove("secondary");

    // fix markdown rendering
    HandleCustomElements();
});

// handle paste delete modal
if (document.getElementById("editor-open-delete-modal"))
    document
        .getElementById("editor-open-delete-modal")!
        .addEventListener("click", () => {
            (
                document.getElementById("editor-modal-delete") as HTMLDialogElement
            ).showModal();
        });
