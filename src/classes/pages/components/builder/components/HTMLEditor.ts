/**
 * @file Handle HTML editor
 * @name HTMLEditor.ts
 * @license MIT
 */

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
import { html } from "@codemirror/lang-html";
import { tags } from "@lezer/highlight";

// create editor theme
export const EntryCodeHighlight = HighlightStyle.define([
    {
        tag: tags.keyword,
        color: "var(--red3)",
    },
    {
        tag: tags.tagName,
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

// create editor function
export function CreateEditor(
    element: HTMLElement,
    UpdateNode: (content: string) => void
) {
    if (globalThis.Bun) return; // must be run from client

    const view = new EditorView({
        // @ts-ignore
        state: EditorState.create({
            doc: "",
            extensions: [
                placeholder("HTML Contents"),
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                syntaxHighlighting(EntryCodeHighlight, { fallback: true }),
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

                        UpdateNode(content); // update node
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
                                CurrentLine.text[CurrentLine.text.length - 1] ===
                                    "{" ||
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
                html({ autoCloseTags: true }),
            ],
        }),
        parent: element,
    });

    // return
    return view;
}

// default export
export default {
    EntryCodeHighlight,
    CreateEditor,
};
