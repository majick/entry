/**
 * @file Handle parsing
 * @name parser.tsx
 * @license MIT
 */

import schema, { Node, PageNode, SourceNode } from "./schema";
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
                if (node.ID === "node:removed") {
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

/**
 * @function ParseSourceNode
 *
 * @export
 * @param {{ node: SourceNode }} props
 * @return {Document}
 */
export function ParseSourceNode(props: {
    node: SourceNode;
}): [SourceNode, Document] {
    // build props.node.children
    const parsed = new DOMParser().parseFromString(
        `<body>${props.node.Content}</body>`,
        "text/html"
    );

    function ParseNodeContent(node: SourceNode, children: HTMLElement[]): void {
        node.Children = [];
        for (const element of children) {
            const element_id =
                element.id || `figurative-${props.node.ID}-${crypto.randomUUID()}`;

            element.id = element_id;

            element.classList.add("component");
            element.setAttribute(
                "data-component",
                `${element.nodeName.toLowerCase()} (figurative)` // we're playing loose with this attribute here
            );

            // ...parse attributes
            const Attributes: { [key: string]: string } = {};

            for (const attribute of Object.entries(element.attributes || {}))
                Attributes[attribute[1].nodeName] = attribute[1].textContent || "";

            // ...create node
            const _node = {
                NotRemovable: true,
                ID: element_id,
                Type: "Source",
                Nickname: element.getAttribute("data-component"),
                Content: element.innerHTML,
                Children: [],
                Attributes,
            } as SourceNode;

            // ...parse node
            ParseNodeContent(
                _node as SourceNode,
                Array.from(element.children) as HTMLElement[]
            );

            // ...add node
            node.Children.push(_node);
        }
    }

    ParseNodeContent(props.node, Array.from(parsed.body.children) as HTMLElement[]);

    // return
    return [props.node, parsed];
}

// default export
export default {
    AllNodes,
    ResetNodes,
    GetNodes,
    ParseNodes,
    ParsePage,
    ParseStyleString,
    ParseSourceNode,
};
