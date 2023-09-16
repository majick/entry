/**
 * @file Handle builder sidebar
 * @name Sidebar.tsx
 * @license MIT
 */

import {
    Update,
    SetSidebar,
    SidebarOpen,
    AddComponent,
    Document,
    SetPage,
    Selected,
    Move,
    Delete,
    SelectedParent,
} from "../Builder";

import { Node } from "../schema";
import parser from "../parser";

/**
 * @function QuickInput
 *
 * @export
 * @param {({
 *     name: string;
 *     property: string;
 *     type: "input" | "textarea" | "select";
 *     inputType?: string; // input only
 *     default?: any; // input/textarea only
 *     step?: number; // inputType number only
 *     value?: string; // input/textarea only
 *     options?: { label: string; value: string }[]; // select only
 * })} props
 * @return {*}
 */
export function QuickInput(props: {
    name: string;
    property: string;
    type: "input" | "textarea" | "select";
    inputType?: string; // input only
    default?: any; // input/textarea only
    step?: number; // inputType number only
    value?: string; // input/textarea only
    options?: { label: string; value: string }[]; // select only
}): any {
    return (
        <div className="option">
            <label htmlFor={props.name.replaceAll(" ", "_")}>
                <b>{props.name}</b>
            </label>

            {(props.type === "input" && (
                <input
                    class={"secondary"}
                    type={props.inputType || "text"}
                    name={props.name}
                    id={props.name.replaceAll(" ", "_")}
                    value={
                        props.value ||
                        (Selected as { [key: string]: any })[props.property] ||
                        props.default ||
                        ""
                    }
                    onBlur={(event) => {
                        (Selected as { [key: string]: any })[props.property] = (
                            event.target as HTMLInputElement
                        ).value;

                        Update();
                    }}
                    style={{
                        minWidth: "100%",
                    }}
                    step={props.step || 0.5}
                />
            )) ||
                (props.type === "textarea" && (
                    <textarea
                        class={"secondary"}
                        name={props.name}
                        id={props.name.replaceAll(" ", "_")}
                        value={
                            props.value ||
                            (Selected as { [key: string]: any })[props.property]
                        }
                        onBlur={(event) => {
                            (Selected as { [key: string]: any })[props.property] = (
                                event.target as HTMLInputElement
                            ).value;

                            Update();
                        }}
                        onInput={(event) => {
                            // get target
                            const target = event.target as HTMLTextAreaElement;

                            // reset height
                            target.style.height = "";

                            // expand
                            target.style.height = `${Math.min(
                                target.scrollHeight,
                                500
                            )}px`;
                        }}
                        style={{
                            minWidth: "100%",
                        }}
                    ></textarea>
                )) ||
                (props.type === "select" && (
                    <select
                        name={props.name.replaceAll(" ", "_")}
                        id={props.name.replaceAll(" ", "_")}
                        class={"secondary"}
                        style={{
                            width: "100%",
                        }}
                        onChange={(event) => {
                            const target = event.target as HTMLSelectElement;

                            (Selected as { [key: string]: any })[props.property] =
                                target.selectedOptions[0].value as any;

                            Update();
                        }}
                    >
                        {props.options!.map((option) => (
                            <option
                                value={option.value}
                                selected={
                                    (Selected as { [key: string]: any })[
                                        props.property
                                    ] === option.value
                                }
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                ))}
        </div>
    );
}

/**
 * @function Sidebar
 *
 * @export
 * @param {{ Page?: string }} props
 * @return {*}
 */
export default function Sidebar(props: { Page?: string }): any {
    const search = new URLSearchParams(window.location.search);

    // return
    return (
        <div
            className="builder:sidebar"
            style={{
                display: SidebarOpen ? "flex" : "none",
            }}
        >
            <button
                style={{
                    position: "sticky",
                    top: 0,
                }}
                onClick={() => SetSidebar(false)}
            >
                Close Sidebar
            </button>

            {Selected && Selected.NotRemovable !== true && !props.Page && (
                <button onClick={() => Delete(Selected)} class={"red"}>
                    Delete
                </button>
            )}

            {Selected && Selected.Type !== "Page" && !props.Page && (
                <button onClick={() => Move(true, Selected, SelectedParent)}>
                    Move
                </button>
            )}

            {(props &&
                ((props.Page === "PagesView" && (
                    <>
                        {/* pages list */}
                        <button onClick={() => AddComponent("Page")}>
                            Add Page
                        </button>

                        {Document.Pages.map((page) => {
                            const index = Document.Pages.indexOf(page);

                            // check if page was remove
                            if (page.ID === "node:removed") {
                                Document.Pages.splice(
                                    Document.Pages.indexOf(page),
                                    1
                                );

                                return <></>;
                            }

                            // return
                            return (
                                <button
                                    onClick={() => SetPage(index)}
                                    title={page.ID}
                                >
                                    Page {index + 1}
                                </button>
                            );
                        })}
                    </>
                )) ||
                    (props.Page === "Move" && (
                        <>
                            {/* move instructions */}
                            <div className="option">
                                <b>Moving Component</b>
                            </div>

                            <div className="option">
                                <p>
                                    Select the element you want to move this element
                                    before/after. A dialog will ask you if you want
                                    to move it before or after the selected element.
                                </p>
                            </div>

                            <button
                                className="green mobile-only"
                                onClick={() => SetSidebar(false)}
                            >
                                Show Page
                            </button>

                            <button class={"red"} onClick={() => Move(false)}>
                                Cancel
                            </button>
                        </>
                    )))) ||
                (Selected && (
                    <>
                        {(Selected.Type === "Page" && (
                            <>
                                {/* page element controls */}
                                <QuickInput name="ID" property="ID" type="input" />

                                <QuickInput
                                    name="Theme"
                                    property="Theme"
                                    type="select"
                                    options={[
                                        {
                                            label: "Light",
                                            value: "light",
                                        },
                                        {
                                            label: "Dark",
                                            value: "dark",
                                        },
                                        {
                                            label: "Purple",
                                            value: "purple",
                                        },
                                        {
                                            label: "Pink",
                                            value: "pink",
                                        },
                                        {
                                            label: "Green",
                                            value: "green",
                                        },
                                        {
                                            label: "Blue",
                                            value: "blue",
                                        },
                                    ]}
                                />

                                <QuickInput
                                    name="Align X"
                                    property="AlignX"
                                    type="select"
                                    options={[
                                        {
                                            label: "Left",
                                            value: "flex-start",
                                        },
                                        {
                                            label: "Center",
                                            value: "center",
                                        },
                                        {
                                            label: "Right",
                                            value: "flex-end",
                                        },
                                    ]}
                                />

                                <QuickInput
                                    name="Align Y"
                                    property="AlignY"
                                    type="select"
                                    options={[
                                        {
                                            label: "Top",
                                            value: "flex-start",
                                        },
                                        {
                                            label: "Center",
                                            value: "center",
                                        },
                                        {
                                            label: "Bottom",
                                            value: "flex-end",
                                        },
                                    ]}
                                />
                            </>
                        )) ||
                            (Selected.Type === "Card" && (
                                <>
                                    {/* card element controls */}

                                    <QuickInput
                                        name="Width"
                                        property="Width"
                                        type="input"
                                        inputType="number"
                                        default={-1}
                                    />

                                    <QuickInput
                                        name="Background"
                                        property="Background"
                                        type="select"
                                        options={[
                                            {
                                                label: "Shown",
                                                value: "var(--background-surface1)",
                                            },
                                            {
                                                label: "Hidden",
                                                value: "transparent",
                                            },
                                        ]}
                                    />

                                    <QuickInput
                                        name="Display"
                                        property="Display"
                                        type="select"
                                        options={[
                                            {
                                                label: "Block",
                                                value: "block",
                                            },
                                            {
                                                label: "Container",
                                                value: "flex",
                                            },
                                        ]}
                                    />

                                    <details class={"option"}>
                                        <summary>Container Display Options</summary>

                                        <div class={"details-flex-content-list-box"}>
                                            <QuickInput
                                                name="Gap"
                                                property="Gap"
                                                type="input"
                                                inputType="number"
                                                step={1}
                                                default={0}
                                            />

                                            <QuickInput
                                                name="Justify Content"
                                                property="JustifyContent"
                                                type="select"
                                                options={[
                                                    {
                                                        label: "Start",
                                                        value: "flex-start",
                                                    },
                                                    {
                                                        label: "Center",
                                                        value: "center",
                                                    },
                                                    {
                                                        label: "End",
                                                        value: "flex-end",
                                                    },
                                                    {
                                                        label: "Space Between",
                                                        value: "space-between",
                                                    },
                                                ]}
                                            />

                                            <QuickInput
                                                name="Align Items"
                                                property="AlignItems"
                                                type="select"
                                                options={[
                                                    {
                                                        label: "Start",
                                                        value: "flex-start",
                                                    },
                                                    {
                                                        label: "Center",
                                                        value: "center",
                                                    },
                                                    {
                                                        label: "End",
                                                        value: "flex-end",
                                                    },
                                                ]}
                                            />

                                            <QuickInput
                                                name="Direction"
                                                property="Direction"
                                                type="select"
                                                options={[
                                                    {
                                                        label: "Row",
                                                        value: "row",
                                                    },
                                                    {
                                                        label: "Column",
                                                        value: "column",
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </details>
                                </>
                            )) ||
                            (Selected.Type === "Text" && (
                                <>
                                    {/* text element controls */}

                                    <QuickInput
                                        name="Content"
                                        property="Content"
                                        type="textarea"
                                    />

                                    <QuickInput
                                        name="Text Size"
                                        property="Size"
                                        type="input"
                                        inputType="number"
                                        default={16}
                                    />

                                    <QuickInput
                                        name="Line Spacing"
                                        property="LineSpacing"
                                        type="input"
                                        inputType="number"
                                        default={1.5}
                                    />

                                    <QuickInput
                                        name="Letter Spacing"
                                        property="LetterSpacing"
                                        type="input"
                                        inputType="number"
                                        default={1}
                                    />

                                    <QuickInput
                                        name="Margin"
                                        property="Margins"
                                        type="input"
                                        inputType="number"
                                        default={0}
                                        step={0.1}
                                    />

                                    <QuickInput
                                        name="Padding"
                                        property="Padding"
                                        type="input"
                                        inputType="number"
                                        default={0.2}
                                        step={0.1}
                                    />

                                    <QuickInput
                                        name="Border Radius"
                                        property="BorderRadius"
                                        type="input"
                                        inputType="number"
                                        default={0}
                                        step={1}
                                    />

                                    <QuickInput
                                        name="Font Weight"
                                        property="Weight"
                                        type="input"
                                        inputType="number"
                                        default={400}
                                        step={100}
                                    />

                                    <QuickInput
                                        name="Background"
                                        property="Background"
                                        type="input"
                                        default={"transparent"}
                                    />

                                    <QuickInput
                                        name="Color"
                                        property="Color"
                                        type="input"
                                        default={"var(--text-color)"}
                                    />

                                    <QuickInput
                                        name="Alignment"
                                        property="Alignment"
                                        type="select"
                                        options={[
                                            {
                                                label: "Left",
                                                value: "left",
                                            },
                                            {
                                                label: "Center",
                                                value: "center",
                                            },
                                            {
                                                label: "Right",
                                                value: "right",
                                            },
                                        ]}
                                    />

                                    <QuickInput
                                        name="Width"
                                        property="Width"
                                        type="select"
                                        options={[
                                            {
                                                label: "Content",
                                                value: "max-content",
                                            },
                                            {
                                                label: "Full",
                                                value: "100%",
                                            },
                                        ]}
                                    />
                                </>
                            )) ||
                            (Selected.Type === "Image" && (
                                <>
                                    {/* image element controls */}

                                    <QuickInput
                                        name="Source"
                                        property="Source"
                                        type="input"
                                    />

                                    <QuickInput
                                        name="Alt Text"
                                        property="Alt"
                                        type="input"
                                    />
                                </>
                            )) ||
                            (Selected.Type === "Embed" && (
                                <>
                                    {/* embed element controls */}

                                    <QuickInput
                                        name="Source"
                                        property="Source"
                                        type="input"
                                    />

                                    <QuickInput
                                        name="Alt Text"
                                        property="Alt"
                                        type="input"
                                    />
                                </>
                            ))}

                        {/* inputs everything supports!! */}

                        {/* class string */}
                        <QuickInput
                            name="CSS Class"
                            property="ClassString"
                            type="input"
                        />

                        {/* style string */}
                        <QuickInput
                            name="CSS Style String"
                            property="StyleString"
                            type="textarea"
                            value={(Selected.StyleString || "").replaceAll(
                                Selected.Type !== "Page"
                                    ? // don't preserve whitespace on components that aren't pages
                                      /\;\s*(?!\n)/g
                                    : /\;(?!\n)/g,
                                ";\n"
                            )}
                        />

                        {/* import/export */}
                        {!(search.get("edit") || "").startsWith("components/") && (
                            <button
                                onClick={() => {
                                    // @ts-ignore
                                    window.modals["entry:modal.SaveToToolbox"](true);
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                >
                                    <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                                    <path d="M11.78 4.72a.749.749 0 1 1-1.06 1.06L8.75 3.811V9.5a.75.75 0 0 1-1.5 0V3.811L5.28 5.78a.749.749 0 1 1-1.06-1.06l3.25-3.25a.749.749 0 0 1 1.06 0l3.25 3.25Z"></path>
                                </svg>
                                Publish
                            </button>
                        )}

                        <details className="option">
                            <summary>Advanced</summary>

                            <div class={"details-flex-content-list-box"}>
                                <button
                                    onClick={() => {
                                        // remove EditMode
                                        Selected.EditMode = undefined;

                                        // create blob
                                        const blob = new Blob(
                                            [JSON.stringify(Selected)],
                                            {
                                                type: "application/json",
                                            }
                                        );

                                        // get url and open
                                        window.open(
                                            URL.createObjectURL(blob),
                                            "_blank"
                                        );
                                    }}
                                >
                                    Export
                                </button>

                                <button
                                    onClick={() => {
                                        // ask for element json
                                        const element = prompt(
                                            "Enter exported component JSON below:"
                                        );
                                        if (!element) return;

                                        // parse
                                        const parsed = JSON.parse(element) as Node;

                                        // randomize ID (so we don't have any ID conflicts)
                                        parsed.ID = crypto.randomUUID();

                                        // set node
                                        SelectedParent[
                                            SelectedParent.indexOf(Selected)
                                        ] = parsed;

                                        // refresh all nodes
                                        parser.ResetNodes();

                                        // return and update
                                        return Update();
                                    }}
                                >
                                    Import
                                </button>
                            </div>
                        </details>
                    </>
                ))}
        </div>
    );
}
