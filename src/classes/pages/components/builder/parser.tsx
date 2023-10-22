/**
 * @file Handle parsing
 * @name parser.tsx
 * @license MIT
 */

import schema, { Node, PageNode } from "./schema";
import { VNode } from "preact";

// ...
let AllNodes: Node[] = [];

export function ResetNodes() {
    return (AllNodes = []);
}

export function GetNodes() {
    return AllNodes;
}

/**
 * @function ParseNodes
 *
 * @export
 * @param {Node[]} nodes
 * @param {boolean} [edit=false]
 * @return {VNode}
 */
export function ParseNodes(nodes: Node[], edit: boolean = false): VNode {
    return (
        <>
            {nodes.map((node) => {
                if (edit) node.EditMode = true;
                else delete node.EditMode;

                // delete node if it was removed
                if (node.ID === "state:removed") {
                    node.Children = [];
                    nodes.splice(nodes.indexOf(node));
                    return <></>;
                } else if (node.ID === "node:removed") {
                    // this is ONLY here because of compatibility for a previous bug that existed!
                    // adding this here ensures that pastes created with that bug don't render wrong
                    node.Children = [];
                    nodes.splice(nodes.indexOf(node), 0);
                    return <></>;
                }

                // render children
                let children: VNode = <></>;

                if (node.Children && node.Children.length > 0)
                    children = ParseNodes(node.Children, edit);

                // add to allnodes
                AllNodes.push(node);

                // render main
                // cannot parse pages! they have to be root level in a document!!
                if (node.Type === "Card")
                    return (
                        <schema.CardNode node={node} document={nodes}>
                            {children}
                        </schema.CardNode>
                    );
                else if (node.Type === "Text")
                    return (
                        <schema.TextNode node={node} document={nodes}>
                            {children}
                        </schema.TextNode>
                    );
                else if (node.Type === "Image")
                    return (
                        <schema.ImageNode node={node} document={nodes}>
                            {children}
                        </schema.ImageNode>
                    );
                else if (node.Type === "Embed")
                    return (
                        <schema.EmbedNode node={node} document={nodes}>
                            {children}
                        </schema.EmbedNode>
                    );
                else if (node.Type === "Source")
                    return (
                        <schema.SourceNode node={node} document={nodes}>
                            {children}
                        </schema.SourceNode>
                    );
                else if (node.Type === "StarInfo")
                    return (
                        <schema.StarInfoNode node={node} document={nodes}>
                            {children}
                        </schema.StarInfoNode>
                    );
            })}
        </>
    );
}

/**
 * @function ParsePage
 *
 * @export
 * @param {PageNode} page
 * @param {boolean} [edit=false]
 * @return {VNode}
 */
export function ParsePage(
    page: PageNode,
    edit: boolean = false,
    server: boolean = false
): VNode {
    // reset theme
    if (!server) document.documentElement.className = "";

    // set edit mode
    page.EditMode = edit;

    // render
    return (
        <schema.PageNode node={page} server={server}>
            {ParseNodes(page.Children, edit)}
        </schema.PageNode>
    );
}

/**
 * @function ParseStyleString
 *
 * @export
 * @param {string} style
 * @return {{ [key: string]: string }}
 */
export function ParseStyleString(style: string): { [key: string]: string } {
    let result: any = {};

    // split by lines (;)
    const lines = style.split(";");

    // get key and value from rule
    for (const rule of lines) {
        const [key, value] = rule.split(":");
        if (!key || !value) continue;

        result[key.trim()] = value.trim();
    }

    // return
    return result;
}

// default export
export default {
    AllNodes,
    ResetNodes,
    GetNodes,
    ParseNodes,
    ParsePage,
    ParseStyleString,
};
