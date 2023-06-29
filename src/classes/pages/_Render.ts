/**
 * @file Handle render
 * @name _Render.ts
 * @license MIT
 */

import { renderToString } from "preact-render-to-string";
import type { VNode } from "preact";

import "./assets/style.css";

export default class Renderer {
    public static Render(vnode: VNode, head_vnode?: VNode) {
        return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                ${head_vnode ? renderToString(head_vnode) : ""}

                <link href="/style.css" rel="stylesheet" />

                <style>
                    /* codemirror styles */
                    .cm-cursor {
                        border-color: currentColor !important;
                    }

                    .cm-selectionBackground {
                        background: var(--background-surface) !important;
                    }

                    .cm-editor.cm-focused {
                        outline: none;
                    }

                    .cm-line .ͼu.ͼt {
                        /* fix list links */
                        padding-left: inherit !important;
                        border-left: none !important;
                    }
                </style>
            </head>
            <body>${renderToString(vnode)}</body>
        </html>`;
    }
}
