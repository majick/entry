/**
 * @file Handle parsing
 * @name parser.tsx
 * @license MIT
 */

import schema, { Node, PageNode } from "./schema";
import { VNode } from "preact";

// ...
let AllNodes: Node[] = [];

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
                if (node.ID === "node:removed") {
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
                else if (node.Type === "Columns")
                    return (
                        <schema.ColumnNode node={node} document={nodes}>
                            {children}
                        </schema.ColumnNode>
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

// default export
export default {
    AllNodes,
    ParseNodes,
    ParsePage,
};
