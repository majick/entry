/**
 * @file Handle render
 * @name _Render.ts
 * @license MIT
 */

import { renderToString } from "preact-render-to-string";
import type { VNode } from "preact";

import pack from "../../../package.json";
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

                <link href="/style.css?v=${pack.version}" rel="stylesheet" />
            </head>
            <body>${renderToString(vnode)}</body>
        </html>`;
    }
}
