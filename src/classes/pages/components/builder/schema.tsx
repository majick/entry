/**
 * @file Builder schema
 * @name schema.ts
 * @license MIT
 */

import { ParseMarkdownSync } from "../Markdown";

// types
export type BaseNode = {
    Type: string;
    ID?: string;
    Children?: Node[];
    NotRemovable?: boolean;
};

export interface PageNode extends BaseNode {
    // display: flex; by default
    Type: "Page";
    AlignX?: string; // align-items (column layout)
    AlignY?: string; // justiy-content (column layout)
    Spacing?: number; // gap, px
    NotRemovable: true;
    Children: Node[];
}

export interface CardNode extends BaseNode {
    Type: "Card";
    Children: Node[];
    Padding?: string; // rem
}

export interface TextNode extends BaseNode {
    // does not support children property
    Type: "Text";
    Content: string;
    // Font: string;
    Size?: number; // px
    Weight?: number;
    LineSpacing?: number; // px
    LetterSpacng?: number; // px
    Margins?: number; // rem
    Alignment?: "left" | "right" | "center";
}

export interface ImageNode extends BaseNode {
    // does not support children property
    Type: "Image";
    Source: string;
    Alt: string;
}

// ...base type
export type Node = PageNode | CardNode | TextNode | ImageNode;

export type BuilderDocument = {
    Nodes: Node[];
};

// components

/**
 * @function PageNode
 *
 * @export
 * @param {{ node: PageNode; children: any }} props
 * @return {*}
 */
export function PageNode(props: { node: PageNode; children: any }): any {
    return (
        <div
            id={props.node.ID || crypto.randomUUID()}
            class={"component builder:page"}
            style={{
                "--AlignX": props.node.AlignX || "center",
                "--AlignY": props.node.AlignY || "center",
                "--Spacing": props.node.Spacing ? `${props.node.Spacing}px` : "",
            }}
            data-component={props.node.Type}
        >
            {props.children}
        </div>
    );
}

/**
 * @function CardNode
 *
 * @export
 * @param {{ node: CardNode; children: any }} props
 * @return {*}
 */
export function CardNode(props: { node: CardNode; children: any }): any {
    return (
        <div
            className="component builder:card"
            style={{
                "--Padding": props.node.Padding
                    ? `${props.node.Padding}rem`
                    : undefined,
            }}
            data-component={props.node.Type}
        >
            {props.children}
        </div>
    );
}

/**
 * @function TextNode
 *
 * @export
 * @param {{ node: TextNode; children: any }} props
 * @return {*}
 */
export function TextNode(props: { node: TextNode; children: any }): any {
    return (
        <p
            id={props.node.ID || crypto.randomUUID()}
            class={"component builder:text"}
            style={{
                "--Size": props.node.Size ? `${props.node.Size}px` : undefined,
                "--Weight": props.node.Weight || undefined,
                "--LineSpacing": props.node.LineSpacing || undefined,
                "--LetterSpacing": props.node.LetterSpacng || undefined,
                "--Margins": props.node.Margins
                    ? `${props.node.Margins}rem`
                    : undefined,
                "--Alignment": props.node.Alignment || undefined,
            }}
            dangerouslySetInnerHTML={{
                // set content, supports markdown!
                __html: ParseMarkdownSync(props.node.Content),
            }}
            data-component={props.node.Type}
        />
    );
}

/**
 * @function ImageNode
 *
 * @export
 * @param {{ node: ImageNode; children: any }} props
 * @return {*}
 */
export function ImageNode(props: { node: ImageNode; children: any }): any {
    return (
        <img
            id={props.node.ID || crypto.randomUUID()}
            class={"builder:image"}
            src={props.node.Source}
            alt={props.node.Alt}
            title={props.node.Alt}
        />
    );
}

// default export
export default {
    PageNode,
    CardNode,
    TextNode,
    ImageNode,
};
