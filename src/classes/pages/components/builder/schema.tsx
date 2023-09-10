/**
 * @file Builder schema
 * @name schema.ts
 * @license MIT
 */

import { ParseMarkdownSync } from "../Markdown";
import { Update } from "./Builder";
import parser from "./parser";

// types
export type BaseNode = {
    Type: string;
    ID?: string;
    Children?: Node[];
    NotRemovable?: boolean;
    EditMode?: boolean;
    StyleString?: string; // injected directly into the element style attribute
    ClassString?: string; // injected directly into the element class
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
    Padding?: number; // rem
    BorderRadius?: number; // px
    Background?: string;
    Alignment?: "left" | "right" | "center";
}

export interface ImageNode extends BaseNode {
    // does not support children property
    Type: "Image";
    Source: string;
    Alt: string;
}

export interface ColumnNode extends BaseNode {
    Type: "Columns";
    Children: CardNode[]; // children property must contain two cards!
}

export interface EmbedNode extends BaseNode {
    // does not support children property
    Type: "Embed";
    Source: string;
    Alt: string;
}

// ...base type
export type Node =
    | PageNode
    | CardNode
    | TextNode
    | ImageNode
    | ColumnNode
    | EmbedNode;

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
export function PageNode(props: {
    node: PageNode;
    children: any;
    server?: boolean;
}): any {
    if (!props.node.ID) props.node.ID = crypto.randomUUID();

    // apply theme
    if (props.node.Theme && props.server !== true) {
        if (props.node.Theme === "blue" || props.node.Theme === "purple")
            document.documentElement.classList.add(
                `${props.node.Theme}-theme`,
                "dark-theme"
            );
        else document.documentElement.classList.add(`${props.node.Theme}-theme`);

        // set global theme so user can't overwrite theme
        (window as any).PASTE_USES_CUSTOM_THEME = true;
    }

    // return page
    return (
        <div
            id={props.node.ID || crypto.randomUUID()}
            class={`component builder:page ${props.node.ClassString || ""}`}
            style={{
                "--AlignX": props.node.AlignX || "center",
                "--AlignY": props.node.AlignY || "center",
                "--Spacing": props.node.Spacing ? `${props.node.Spacing}px` : "",
            }}
            data-component={props.node.Type}
            data-edit={props.node.EditMode}
        >
            {props.children}

            <style
                // the StyleString on pages can change more than just the page element,
                // so it's within its own style element... instead of just the attribute!
                dangerouslySetInnerHTML={{ __html: props.node.StyleString || "" }}
            />
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
            className={`component builder:card ${props.node.ClassString || ""}`}
            style={{
                "--Background": props.node.Background,
                "--Width": props.node.Width ? `${props.node.Width}px` : undefined,
                "--Padding": props.node.Padding
                    ? `${props.node.Padding}rem`
                    : undefined,
                ...(props.node.StyleString
                    ? parser.ParseStyleString(props.node.StyleString)
                    : {}),
            }}
            data-component={props.node.Type}
            data-edit={props.node.EditMode}
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
                class={`component builder:text ${props.node.ClassString || ""}`}
                style={{
                    "--Size": props.node.Size ? `${props.node.Size}px` : undefined,
                    "--Weight": props.node.Weight || undefined,
                    "--LineSpacing": props.node.LineSpacing || undefined,
                    "--LetterSpacing": props.node.LetterSpacing
                        ? `${props.node.LetterSpacing}px`
                        : undefined,
                    "--Margins": props.node.Margins
                        ? `${props.node.Margins}rem`
                        : undefined,
                    "--Padding": props.node.Padding
                        ? `${props.node.Padding}rem`
                        : undefined,
                    "--BorderRadius": props.node.BorderRadius
                        ? `${props.node.BorderRadius}px`
                        : undefined,
                    "--Alignment": props.node.Alignment || undefined,
                    "--Background": props.node.Background || undefined,
                    ...(props.node.StyleString
                        ? parser.ParseStyleString(props.node.StyleString)
                        : {}),
                }}
                dangerouslySetInnerHTML={{
                    // set content, supports markdown!
                    __html: ParseMarkdownSync(props.node.Content),
                }}
                data-component={props.node.Type}
                data-edit={props.node.EditMode}
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
 * @function ImageNode
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
                class={`component builder:image ${props.node.ClassString || ""}`}
                src={props.node.Source}
                alt={props.node.Alt}
                title={props.node.Alt}
                data-component={props.node.Type}
                data-edit={props.node.EditMode}
                style={{
                    ...(props.node.StyleString
                        ? parser.ParseStyleString(props.node.StyleString)
                        : {}),
                }}
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
 * @function ColumnNode
 *
 * @export
 * @param {{ node: ColumnNode; document: Node[]; children: any }} props
 * @return {*}
 */
export function ColumnNode(props: {
    node: ColumnNode;
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
            <div
                class={`component builder:columns ${props.node.ClassString || ""}`}
                style={{
                    ...(props.node.StyleString
                        ? parser.ParseStyleString(props.node.StyleString)
                        : {}),
                }}
                data-component={props.node.Type}
                data-edit={props.node.EditMode}
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
            >
                {props.children}
            </div>
        </DragZones>
    );
}

/**
 * @function EmbedNode
 *
 * @export
 * @param {{ node: EmbedNode; document: Node[]; children: any }} props
 * @return {*}
 */
export function EmbedNode(props: {
    node: EmbedNode;
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
            <iframe
                id={props.node.ID}
                class={`component builder:embed ${props.node.ClassString || ""}`}
                src={props.node.Source}
                alt={props.node.Alt}
                title={props.node.Alt}
                style={props.node.StyleString}
                loading={"lazy"}
                data-component={props.node.Type}
                data-edit={props.node.EditMode}
                frameBorder={0}
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
    ColumnNode,
    EmbedNode,
};
