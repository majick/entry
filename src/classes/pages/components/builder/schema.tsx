/**
 * @file Builder schema
 * @name schema.ts
 * @license MIT
 */

import { ParseMarkdownSync } from "../Markdown";
import { Update } from "./Builder";

// types
export type BaseNode = {
    Type: string;
    ID?: string;
    Children?: Node[];
    NotRemovable?: boolean;
    EditMode?: boolean;
};

export interface PageNode extends BaseNode {
    // display: flex; by default
    Type: "Page";
    AlignX?: string; // align-items (column layout)
    AlignY?: string; // justiy-content (column layout)
    Spacing?: number; // gap, px
    NotRemovable: true;
    Children: Node[];
    Theme?: "dark" | "light" | "purple" | "blue" | "green" | "pink";
}

export interface CardNode extends BaseNode {
    Type: "Card";
    Children: Node[];
    Padding?: string; // rem
    Width?: string; // px
    Background?: string;
}

export interface TextNode extends BaseNode {
    // does not support children property
    Type: "Text";
    Content: string;
    // Font: string;
    Size?: number; // px
    Weight?: number;
    LineSpacing?: number; // px
    LetterSpacing?: number; // px
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
    Pages: PageNode[];
};

// state
let dragging: Node;
let draggingDocument: Node[];

// components

/**
 * @function GetDropZoneFromElement
 *
 * @export
 * @param {HTMLElement} target
 * @return {(HTMLElement[] | undefined)}
 */
export function GetDropZoneFromElement(
    target: HTMLElement
): HTMLElement[] | undefined {
    if (!target.parentElement) return;

    // try to get previous and next siblings (drop elements)
    let PreviousDropElement = (
        target.previousElementSibling !== null
            ? target.previousElementSibling
            : target.parentElement!.previousElementSibling
    ) as HTMLElement;

    let NextDropElement = (
        target.nextElementSibling !== null
            ? target.nextElementSibling
            : target.parentElement!.nextElementSibling
    ) as HTMLElement;

    if (!PreviousDropElement || !NextDropElement) return;

    if (
        !PreviousDropElement.classList.contains("builder:drag-zone") ||
        !NextDropElement.classList.contains("builder:drag-zone")
    )
        return;

    // return
    return [PreviousDropElement, NextDropElement];
}

/**
 * @function DragZones
 * @description Place drop zones around text
 *
 * @param {{ visible?: boolean; fornode: Node; fordocument: Node[]; children: any }} props
 * @return {*}
 */
function DragZones(props: {
    visible?: boolean;
    fornode: Node;
    fordocument: Node[];
    children: any;
}): any {
    function Drag(direction: number) {
        if (dragging === props.fornode) return (props.visible = false);

        // get index of props.fornode, move dragging to that index
        const index = props.fordocument.indexOf(props.fornode) || 1;

        // move dragging
        draggingDocument.splice(draggingDocument.indexOf(dragging), 1);
        props.fordocument.splice(index + direction, 0, dragging);

        // update
        return Update();
    }

    function ShowDropZones(event: any, remove: boolean = false) {
        const target = event.target as HTMLElement;

        // get drop zones
        const _zones = GetDropZoneFromElement(target);
        if (!_zones) return;

        const [PreviousDropElement, NextDropElement] = _zones;

        // show drag elements
        if (!remove) {
            PreviousDropElement.classList.add("active");
            NextDropElement.classList.add("active");
        } else {
            setTimeout(() => {
                PreviousDropElement.classList.remove("active");
                NextDropElement.classList.remove("active");
            }, 1000);
        }
    }

    // return
    return props.visible ? (
        <div
            class="builder:drag-element"
            onDragOver={(event) => ShowDropZones(event, false)}
            onDragLeave={(event) => ShowDropZones(event, true)}
        >
            <div
                className="builder:drag-zone top"
                onDragEnter={(event) => {
                    event.preventDefault();
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                }}
                onDrop={() => Drag(-1)}
            />

            {props.children}

            <div
                className="builder:drag-zone bottom"
                onDragEnter={(event) => {
                    event.preventDefault();
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                }}
                onDrop={() => Drag(0)}
            />
        </div>
    ) : (
        props.children
    );
}

/**
 * @function PageNode
 *
 * @export
 * @param {{ node: PageNode; children: any }} props
 * @return {*}
 */
export function PageNode(props: { node: PageNode; children: any }): any {
    if (!props.node.ID) props.node.ID = crypto.randomUUID();

    // apply theme
    if (props.node.Theme)
        if (props.node.Theme === "blue" || props.node.Theme === "purple")
            document.documentElement.classList.add(
                `${props.node.Theme}-theme`,
                "dark-theme"
            );
        else document.documentElement.classList.add(`${props.node.Theme}-theme`);

    // return page
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
 * @param {{ node: CardNode; document: Node[]; children: any }} props
 * @return {*}
 */
export function CardNode(props: {
    node: CardNode;
    document: Node[];
    children: any;
}): any {
    if (!props.node.ID) props.node.ID = crypto.randomUUID();

    return (
        <div
            id={props.node.ID}
            className="component builder:card"
            style={{
                "--Background": props.node.Background,
                "--Width": props.node.Width ? `${props.node.Width}px` : undefined,
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
 * @param {{ node: TextNode; document: Node[]; children: any }} props
 * @return {*}
 */
export function TextNode(props: {
    node: TextNode;
    document: Node[];
    children: any;
}): any {
    if (!props.node.ID) props.node.ID = crypto.randomUUID();

    return (
        <DragZones
            visible={props.node.EditMode}
            fornode={props.node}
            fordocument={props.document}
        >
            <p
                id={props.node.ID}
                class={"component builder:text"}
                style={{
                    "--Size": props.node.Size ? `${props.node.Size}px` : undefined,
                    "--Weight": props.node.Weight || undefined,
                    "--LineSpacing": props.node.LineSpacing || undefined,
                    "--LetterSpacing": props.node.LetterSpacing || undefined,
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
                // drag
                draggable={props.node.EditMode}
                onDragStart={
                    props.node.EditMode
                        ? () => {
                              dragging = props.node;
                              draggingDocument = props.document;
                          }
                        : undefined
                }
            />
        </DragZones>
    );
}

/**
 * @function ImageNodeonDragStart
 *
 * @export
 * @param {{ node: ImageNode; document: Node[]; children: any }} props
 * @return {*}
 */
export function ImageNode(props: {
    node: ImageNode;
    document: Node[];
    children: any;
}): any {
    if (!props.node.ID) props.node.ID = crypto.randomUUID();

    return (
        <DragZones
            visible={props.node.EditMode}
            fornode={props.node}
            fordocument={props.document}
        >
            <img
                id={props.node.ID || crypto.randomUUID()}
                class={"builder:image"}
                src={props.node.Source}
                alt={props.node.Alt}
                title={props.node.Alt}
                // drag
                draggable={props.node.EditMode}
                onDragStart={
                    props.node.EditMode
                        ? () => {
                              dragging = props.node;
                              draggingDocument = props.document;
                          }
                        : undefined
                }
            />
        </DragZones>
    );
}

// default export
export default {
    GetDropZoneFromElement,
    PageNode,
    CardNode,
    TextNode,
    ImageNode,
};
