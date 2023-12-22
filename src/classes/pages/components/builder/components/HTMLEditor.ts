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
} from "@codemirror/autocomplete";

import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from "@codemirror/commands";

import { html } from "@codemirror/lang-html";
import { tags } from "@lezer/highlight";

import { linter, Diagnostic, lintGutter } from "@codemirror/lint";

// prettier
// @ts-ignore
import * as prettier from "prettier/standalone.mjs";
import type { Options } from "prettier";

import EstreePlugin from "prettier/plugins/estree";
import BabelParser from "prettier/plugins/babel";
import CSSParser from "prettier/plugins/postcss";
import HTMLParser from "prettier/plugins/html";

// create editor theme
export const BundlesCodeHighlight = HighlightStyle.define([
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

// create lint
import { HTMLHint } from "htmlhint";

let LastLint = performance.now();
export const HTMLLint = linter((view) => {
    let diagnostics: Diagnostic[] = [];

    // get hints
    const hints = HTMLHint.verify(view.state.sliceDoc(0, view.state.doc.length), {
        "doctype-first": false,
        // attributes (https://htmlhint.com/docs/user-guide/list-rules#attributes)
        "attr-lowercase": true,
        "attr-value-not-empty": true,
        "attr-value-double-quotes": true,
        // tags (https://htmlhint.com/docs/user-guide/list-rules#tags)
        "tag-self-close": true,
        "tag-pair": true,
        // id (https://htmlhint.com/docs/user-guide/list-rules#id)
        "id-unique": true,
    });

    // turn hints into diagnostics
    if (hints.length > 0 && performance.now() - LastLint > 100) {
        LastLint = performance.now(); // can only run lint every 100ms

        // ...
        for (const hint of hints) {
            if (hint.line === view.state.doc.lines) hint.line = 1; // do not add an error to the last line (breaks editor)
            const line = view.state.doc.line(hint.line);

            diagnostics.push({
                from: line.from + hint.col - 1,
                to: line.from + hint.col + hint.raw.length - 1,
                severity: hint.type,
                message: `${hint.message} (${hint.line}:${hint.col})\n${hint.rule.id}: ${hint.rule.description}`,
            });
        }
    }

    // return
    return diagnostics;
});

// create editor function
export function CreateEditor(
    element: HTMLElement,
    mode: "html",
    UpdateNode: (content: string) => void
) {
    if (globalThis.Bun) return; // must be run from client

    const view = new EditorView({
        // @ts-ignore
        state: EditorState.create({
            doc: "",
            extensions: [
                placeholder(`${mode.toUpperCase()} Contents`),
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                syntaxHighlighting(BundlesCodeHighlight, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                crosshairCursor(),
                highlightActiveLine(),
                lintGutter(),
                EditorView.lineWrapping,
                EditorView.updateListener.of(async (update) => {
                    if (update.docChanged) {
                        const content = update.state.doc.toString();
                        if (content === "") return;

                        UpdateNode(content); // update node
                        (globalThis as any).HTMLEditor.Content = content;
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
                // language
                html({ autoCloseTags: true }),
                HTMLLint,
            ],
        }),
        parent: element,
    });

    // global functions
    (globalThis as any).HTMLEditor = {
        Content: "",
        Update: (content: string, clear: boolean = false) => {
            const transaction = view.state.update({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: content,
                },
                scrollIntoView: true,
            });

            if (transaction) {
                view.dispatch(transaction);
            }
        },
        Format: async () => {
            try {
                const formatted = await prettier.format(
                    (globalThis as any).HTMLEditor.Content,
                    {
                        parser: "html",
                        plugins: [EstreePlugin, BabelParser, HTMLParser, CSSParser],
                        htmlWhitespaceSensitivity: "ignore",
                        // all from the project's .prettierrc
                        useTabs: false,
                        singleQuote: false,
                        tabWidth: 4,
                        trailingComma: "es5",
                        printWidth: 85,
                        semi: true,
                    } as Options
                );

                (globalThis as any).HTMLEditor.Update(formatted);
            } catch (err) {
                alert(err);
            }
        },
    };

    // return
    return view;
}

// default export
export default {
    BundlesCodeHighlight,
    CreateEditor,
};
