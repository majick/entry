import { EditorState } from "@codemirror/state";

import {
    EditorView,
    keymap,
    // plugins
    highlightSpecialChars,
    drawSelection,
    rectangularSelection,
    lineNumbers,
} from "@codemirror/view";

import {
    syntaxHighlighting,
    indentOnInput,
    HighlightStyle,
    indentUnit,
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

import { history, indentWithTab } from "@codemirror/commands";
import { tags } from "@lezer/highlight";

import { HandleCustomElements } from "../assets/ClientFixMarkdown";
import { ParseMarkdown } from "./Markdown";

// create theme
const highlight = HighlightStyle.define([
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
                apply: "<% hsl hue {hue here} %>",
                detail: "Special Elements",
            },
            {
                label: "<sat>",
                type: "function",
                info: "Controls page saturation when your paste is viewed, percentage",
                apply: "<% hsl sat {sat here} %>",
                detail: "Special Elements",
            },
            {
                label: "<lit>",
                type: "function",
                info: "Controls page lightness when your paste is viewed, percentage",
                apply: "<% hsl lit {lightness here} %>",
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
                apply: "<% theme dark %>",
                detail: "Themes",
            },
            {
                label: "light theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to light",
                apply: "<% theme light %>",
                detail: "Themes",
            },
            {
                label: "purple theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to purple",
                apply: "<% theme purple %>",
                detail: "Themes",
            },
            {
                label: "blue theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to blue",
                apply: "<% theme blue %>",
                detail: "Themes",
            },
            {
                label: "pink theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to pink",
                apply: "<% theme pink %>",
                detail: "Themes",
            },
            {
                label: "green theme",
                type: "variable",
                info: "Sets the user's theme when viewing the paste to green",
                apply: "<% theme green %>",
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
                apply: `<% time ${new Date().toUTCString().replaceAll(" ", "_")} %>`,
                detail: "Extras",
            },
            {
                label: "table of contents",
                type: "function",
                info: "Add a table of contents to the paste",
                apply: "[TOC]",
                detail: "extras",
            },
            {
                label: "center",
                type: "function",
                info: "Center paste content",
                apply: "-> ...content here... <-",
                detail: "extras",
            },
            {
                label: "right",
                type: "function",
                info: "Align paste content to the right",
                apply: "-> ...content here... ->",
                detail: "extras",
            },
            {
                label: "enable template",
                type: "function",
                apply: `<% enable template %>`,
                detail: "Extras",
            },
            {
                label: "add class",
                type: "function",
                apply: `<% class class1 class2 %> content <% close class %>`,
                detail: "Extras",
            },
            {
                label: "add id",
                type: "function",
                apply: `<% id id1 %> content <% close id %>`,
                detail: "Extras",
            },
            // animations
            {
                label: "fade in animation",
                type: "function",
                apply: "<% animation FadeIn 1s %>\nContent goes here!\n\n<% close animation %>",
                detail: "Animations",
            },
            {
                label: "fade out animation",
                type: "function",
                apply: "<% animation FadeOut 1s %>\nContent goes here!\n\n<% close animation %>",
                detail: "Animations",
            },
            {
                label: "float animation",
                type: "function",
                apply: "<% animation Float 1s 0s infinite inline %>\nContent goes here!\n\n<% close animation %>",
                detail: "Animations",
            },
            {
                label: "grow/shrink animation",
                type: "function",
                apply: "<% animation GrowShrink 1s 0s infinite %>\nContent goes here!\n\n<% close animation %>",
                detail: "Animations",
            },
            {
                label: "blink animation",
                type: "function",
                apply: "<% animation Blink 1s 0s infinite inline %>\nContent goes here!\n\n<% close animation %>",
                detail: "Animations",
            },
            // align
            {
                label: "align center (row)",
                type: "function",
                apply: "-> align center <-",
                detail: "Alignments",
            },
            {
                label: "align right (row)",
                type: "function",
                apply: "-> align right ->",
                detail: "Alignments",
            },
            {
                label: "align center (row flex)",
                type: "function",
                apply: "->> align center <<-",
                detail: "Alignments",
            },
            {
                label: "align right (row flex)",
                type: "function",
                apply: "->> align right ->>",
                detail: "Alignments",
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

    // load extensions
    const ExtensionsList = [
        keymap.of(markdownKeymap),
        highlightSpecialChars(),
        drawSelection(),
        rectangularSelection(),
        EditorView.lineWrapping,
        closeBrackets(),
        history(),
        EditorView.updateListener.of(async (update) => {
            if (update.docChanged) {
                const content = update.state.doc.toString();
                if (content === "") return;

                // basic session save
                window.localStorage.setItem("doc", content);

                const html = await ParseMarkdown(content, false);
                window.localStorage.setItem("gen", html);

                (window as any).EditorContent = content;
            }
        }),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        indentUnit.of("    "),
        keymap.of([
            // we're creating this keymap because of a weird issue in firefox where
            // (if there is no text before or after), a new line is not created
            // ...we're basically just manually inserting the new line here
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
                        CurrentLine.text[CurrentLine.text.length - 1] === "{" ||
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
            {
                key: "<",
                run: (): boolean => {
                    // get current line
                    const CurrentLine = view.state.doc.lineAt(
                        view.state.selection.main.head
                    );

                    // start transaction
                    const cursor = view.state.selection.main.head;
                    const transaction = view.state.update({
                        changes: {
                            from: cursor,
                            insert: "<>",
                        },
                        selection: {
                            anchor: cursor + 1,
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
            indentWithTab,
        ]),
        // markdown
        syntaxHighlighting(highlight),
        markdown({
            base: markdownLanguage,
        }),
        autocompletion({
            override: [BasicCompletion],
            activateOnTyping:
                window.location.search.includes("hints=true") ||
                window.localStorage.getItem("entry:user.EditorHints") === "true",
        }),
    ];

    if (window.localStorage.getItem("entry:user.ShowLineNumbers") === "true")
        ExtensionsList.push(lineNumbers());

    // bad system for testing if we're editing something else
    // checks if first 10 characters are changed, clears doc if they are
    if (
        (window.localStorage.getItem("doc") &&
            !window.localStorage
                .getItem("doc")!
                .startsWith(decodeURIComponent(content).substring(0, 9))) ||
        window.location.search.includes("new-paste")
    )
        window.localStorage.removeItem("doc");

    // save/check LastEditURL
    if (window.localStorage.getItem("LastEditURL") !== window.location.href)
        window.localStorage.removeItem("doc");

    window.localStorage.setItem("LastEditURL", window.location.href);

    // create editor
    const view = new EditorView({
        // @ts-ignore
        state: EditorState.create({
            doc:
                // display the saved document or given content
                window.localStorage.getItem("doc")! ||
                decodeURIComponent(content) ||
                "",
            extensions: ExtensionsList,
        }),
        parent: element,
    });

    // prerender
    (async () => {
        window.localStorage.setItem(
            "gen",
            await ParseMarkdown(
                window.localStorage.getItem("doc")! ||
                    decodeURIComponent(content) ||
                    "",
                false
            )
        );

        (window as any).EditorContent = decodeURIComponent(content);
    })();

    // add attributes
    const contentField = document.querySelector(
        "#editor-tab-text .cm-editor .cm-scroller .cm-content"
    )!;

    contentField.setAttribute("spellcheck", "true");
    contentField.setAttribute("aria-label", "Content Editor");

    // set value of contentInput if we have window.sessionStorage.doc
    const doc = window.localStorage.getItem("doc");
    if (doc) (window as any).EditorContent = doc;
}

// handle tabs
function CloseAllTabs() {
    for (let element of document.getElementsByClassName(
        "editor-tab"
    ) as any as HTMLElement[]) {
        element.classList.remove("active");

        const button = document.getElementById(
            `editor-open-${element.id.split("editor-")[1] || ""}`
        );

        if (button) button.classList.add("secondary");
    }
}

document.getElementById("editor-open-tab-text")!.addEventListener("click", () => {
    CloseAllTabs();

    document.getElementById("editor-open-tab-text")!.classList.remove("secondary");
    document.getElementById("editor-tab-text")!.classList.add("active");

    document.getElementById("-editor")!.style.borderTopLeftRadius = "0";
});

document.getElementById("editor-open-tab-preview")!.addEventListener("click", () => {
    CloseAllTabs();
    const tab = document.getElementById("editor-tab-preview")!;

    tab.innerHTML = window.localStorage.getItem("gen") || "";
    tab.classList.add("active");

    document.getElementById("-editor")!.style.borderTopLeftRadius = "var(--u-04)";

    document
        .getElementById("editor-open-tab-preview")!
        .classList.remove("secondary");

    // fix markdown rendering
    HandleCustomElements();
});

document.querySelector(".tab-container")!.addEventListener("click", () => {
    if (document.getElementById("editor-open-tab-text")!.style.display === "none")
        return;

    (document.querySelector(".cm-content")! as HTMLElement).focus();
});

// check CustomURL
const CustomURLInput: HTMLInputElement | null = document.getElementById(
    "CustomURL"
) as any;

const GroupNameInput: HTMLInputElement | null = document.getElementById(
    "GroupName"
) as any;

let URLInputTimeout: any = undefined;

if (CustomURLInput)
    CustomURLInput.addEventListener("keyup", (event: any) => {
        let value = event.target.value.trim();

        // make sure value isn't too short
        if (value.length < 1) {
            CustomURLInput.classList.remove("invalid");
            return;
        }

        // add group name
        if (GroupNameInput && GroupNameInput.value.trim().length > 1)
            value = `${GroupNameInput.value.trim()}/${value}`;

        // create timeout
        if (URLInputTimeout) clearTimeout(URLInputTimeout);
        URLInputTimeout = setTimeout(async () => {
            // fetch url
            const exists =
                (await (await fetch(`/api/exists/${value}`)).text()) === "true";

            if (!exists) {
                // paste does not exist
                CustomURLInput.classList.remove("invalid");
                return;
            }

            // set input to invalid
            CustomURLInput.classList.add("invalid");
        }, 500);
    });

// details auto focus
for (let element of document.querySelectorAll(
    "details"
) as any as HTMLDetailsElement[]) {
    // check if element has an input
    const input = element.querySelector("input");
    if (!input) continue;

    // add event listener
    element.querySelector("summary")!.addEventListener("click", () => {
        if (element.getAttribute("open") !== null) return; // element must be open,
        //                                                    should not have attribute
        //                                                    already when event is fired

        // auto focus input
        setTimeout(() => {
            input.focus();
        }, 0);
    });
}

// clear stored content only if ref isn't the homepage (meaning the paste was created properly)
if (
    !document.referrer.endsWith(`${window.location.host}/`) && // homepage
    !document.referrer.endsWith("%20already%20exists!") && // already exists error (still homepage)
    !document.referrer.startsWith(
        // edit mode
        `${window.location.protocol}//${window.location.host}/?mode=edit`
    ) &&
    !document.referrer.startsWith(
        // edit error
        `${window.location.protocol}//${window.location.host}/?err=Invalid`
    )
) {
    window.sessionStorage.removeItem("doc");
    window.sessionStorage.removeItem("gen");
}
