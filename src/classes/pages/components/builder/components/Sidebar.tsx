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
    EditOrder,
    Delete,
    SelectedParent,
    RenderSidebar,
    Select,
    CurrentPage,
    RestoreState,
    HistoryCurrent,
} from "../Builder";

import { Node } from "../schema";
import parser from "../parser";

import HTMLEditor from "./HTMLEditor";
let CurrentEditor: any;

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
                        if ((event.target as HTMLInputElement).value === "\n")
                            return;

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
                            if ((event.target as HTMLInputElement).value === "\n")
                                return;

                            (Selected as { [key: string]: any })[props.property] = (
                                event.target as HTMLInputElement
                            ).value
                                .replaceAll("<!DOCTYPE html>", "")
                                .replaceAll("<html>", "")
                                .replaceAll("</html>", "")
                                .replaceAll("<head>", "")
                                .replaceAll("</head>", "");

                            Update();
                        }}
                        onInput={(event) => {
                            // get target
                            const target = event.target as HTMLTextAreaElement;

                            // reset height
                            target.style.height = "";

                            // expand
                            target.style.height = `${
                                Math.min(target.scrollHeight, 500) + 5
                            }px`;
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
                                    ] === option.value ||
                                    ((Selected as { [key: string]: any })[
                                        props.property
                                    ] === undefined &&
                                        props.default === option.value)
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
            id={"main-sidebar"}
            className="builder:sidebar editor-tab"
            style={{
                left: SidebarOpen ? "0" : "-100%",
                display: "flex",
            }}
        >
            <div
                className="card flex justify-space-between align-center flex-wrap g-4"
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 9999,
                    borderBottom: "solid 1px var(--background-surface2a)",
                }}
            >
                <b>{props.Page || "Edit Component"}</b>

                <button
                    class={"normal border round tooltip-wrapper"}
                    onClick={() => {
                        const SidebarElement =
                            document.getElementById("main-sidebar")!;

                        // if sidebar class contains full, remove it
                        if (SidebarElement.classList.contains("full")) {
                            document
                                .getElementById("main-sidebar")!
                                .classList.remove("full");

                            // this means we were probably in a secondary menu
                            // rerender sidebar with Selected
                            RenderSidebar();

                            // return and render
                            return Update();
                        }

                        // close sidebar
                        SetSidebar(false);

                        // render
                        Update();
                    }}
                    aria-label={"Collapse Sidebar"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        title={"Sidebar Collapse Symbol"}
                    >
                        <path d="M6.823 7.823a.25.25 0 0 1 0 .354l-2.396 2.396A.25.25 0 0 1 4 10.396V5.604a.25.25 0 0 1 .427-.177Z"></path>
                        <path d="M1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0ZM1.5 1.75v12.5c0 .138.112.25.25.25H9.5v-13H1.75a.25.25 0 0 0-.25.25ZM11 14.5h3.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H11Z"></path>
                    </svg>

                    <div className="card secondary round border tooltip left">
                        Show Less
                    </div>
                </button>
            </div>

            {/* code editor */}
            {props.Page && props.Page === "HTML" && (
                <>
                    <div
                        id="_editor"
                        style={{
                            width: "100%",
                            height: "95dvh",
                            maxHeight: "90dvh",
                        }}
                    ></div>

                    <style
                        dangerouslySetInnerHTML={{
                            __html: `.cm-line, .cm-line span { font-family: monospace !important; }`,
                        }}
                    />
                </>
            )}

            {/* main options */}
            <div className="options">
                {Selected && !props.Page && (
                    <button
                        onClick={() => {
                            if (!Selected.NotRemovable) return Delete(Selected);
                            else
                                (window as any).modals[
                                    "entry:modal.ConfirmNotRemovable"
                                ](true);
                        }}
                        class={"red"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Trash Symbol"}
                        >
                            <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                        </svg>
                        Delete
                    </button>
                )}

                {Selected && Selected.Type !== "Page" && !props.Page && (
                    <button
                        onClick={() => EditOrder(true, Selected, SelectedParent)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Movement Grabber Symbol"}
                        >
                            <path d="M10 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-4 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                        </svg>
                        Edit Order
                    </button>
                )}

                {Selected &&
                    (Selected.Type === "Source" || Selected.Type === "Page") &&
                    !props.Page && (
                        <button
                            onClick={() => {
                                if (
                                    Selected.Type !== "Source" &&
                                    Selected.Type !== "Page"
                                )
                                    return;

                                // make sidebar fill screen
                                document
                                    .getElementById("main-sidebar")!
                                    .classList.add("full");

                                // render sidebar
                                RenderSidebar({ Page: "HTML" });

                                // create editor
                                CurrentEditor = HTMLEditor.CreateEditor(
                                    document.getElementById("_editor")!,
                                    (NewContent) => {
                                        if (
                                            Selected.Type !== "Source" &&
                                            Selected.Type !== "Page"
                                        )
                                            return;

                                        Selected.Content = NewContent;
                                    }
                                );

                                // set editor content
                                CurrentEditor.dispatch(
                                    CurrentEditor.state.update({
                                        changes: {
                                            from: 0,
                                            to: CurrentEditor.state.doc.length,
                                            insert: Selected.Content,
                                        },
                                    })
                                );
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-label={"Code Icon"}
                            >
                                <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Zm7.47 3.97a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L10.69 8 9.22 6.53a.75.75 0 0 1 0-1.06ZM6.78 6.53 5.31 8l1.47 1.47a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215l-2-2a.75.75 0 0 1 0-1.06l2-2a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path>
                            </svg>
                            Edit HTML
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
                                    <b>Editing Component Order</b>
                                </div>

                                <div className="option">
                                    <p>
                                        Select the element you want to move this
                                        element before/after. A dialog will ask you
                                        if you want to move it before or after the
                                        selected element.
                                    </p>
                                </div>

                                <button
                                    className="green mobile-only"
                                    onClick={() => SetSidebar(false)}
                                >
                                    Show Page
                                </button>

                                <button
                                    class={"red"}
                                    onClick={() => EditOrder(false)}
                                >
                                    Cancel
                                </button>
                            </>
                        )) ||
                        (props.Page === "More" && (
                            <>
                                {/* more options */}
                                <button
                                    onClick={() => {
                                        RenderSidebar({
                                            Page: "Tree",
                                        });
                                    }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Tree Symbol"}
                                        style={{
                                            marginBottom: "1px",
                                        }}
                                    >
                                        <path d="M4.75 7a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM5 4.75A.75.75 0 0 1 5.75 4h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 5 4.75ZM6.75 10a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z"></path>
                                        <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25Z"></path>
                                    </svg>
                                    Component Tree
                                </button>

                                <button
                                    onClick={() => {
                                        RenderSidebar({
                                            Page: "History",
                                        });
                                    }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"History Symbol"}
                                    >
                                        <path d="m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z"></path>
                                    </svg>
                                    Document History
                                </button>
                            </>
                        )) ||
                        (props.Page === "Tree" && (
                            <>
                                {/* component tree */}
                                {parser.GetNodes().map((node) => {
                                    return (
                                        <button
                                            title={node.ID}
                                            onClick={() => {
                                                // get parent node
                                                let parent = parser
                                                    .GetNodes()
                                                    .find(
                                                        (n) =>
                                                            n.Type === "Card" &&
                                                            n.Children.includes(node)
                                                    );

                                                if (!parent) {
                                                    // try to find in current page
                                                    if (
                                                        Document.Pages[
                                                            CurrentPage
                                                        ].Children.includes(node)
                                                    )
                                                        parent =
                                                            Document.Pages[
                                                                CurrentPage
                                                            ];
                                                    else return;
                                                }

                                                // select
                                                Select(node, parent.Children!);
                                            }}
                                            onMouseEnter={() => {
                                                // try to get rendered node
                                                const rendered =
                                                    document.getElementById(
                                                        node.ID!
                                                    );

                                                if (!rendered) return;

                                                // add hover
                                                return rendered.classList.add(
                                                    "hover"
                                                );
                                            }}
                                            onMouseLeave={() => {
                                                // try to get rendered node
                                                const rendered =
                                                    document.getElementById(
                                                        node.ID!
                                                    );

                                                if (!rendered) return;

                                                // remove hover
                                                return rendered.classList.remove(
                                                    "hover"
                                                );
                                            }}
                                        >
                                            {node.Type}
                                        </button>
                                    );
                                })}
                            </>
                        )) ||
                        (props.Page === "History" && (
                            <>
                                <button
                                    onClick={() => RestoreState(HistoryCurrent - 1)}
                                >
                                    Back
                                </button>

                                <button
                                    onClick={() => RestoreState(HistoryCurrent + 1)}
                                >
                                    Forward
                                </button>
                            </>
                        )))) ||
                    (Selected && !props.Page && (
                        <>
                            {(Selected.Type === "Page" && (
                                <>
                                    {/* page element controls */}
                                    <QuickInput
                                        name="ID"
                                        property="ID"
                                        type="input"
                                    />

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
                                        name="Automatic Positioning"
                                        property="ManualPosition"
                                        type="select"
                                        options={[
                                            {
                                                label: "True",
                                                value: "false",
                                            },
                                            {
                                                label: "False",
                                                value: "true",
                                            },
                                        ]}
                                    />

                                    <details className="option round">
                                        <summary>
                                            Automatic Positioning Options
                                        </summary>

                                        <div class={"details-flex-content-list-box"}>
                                            <p className="option">
                                                These options only apply if
                                                "Automatic Positioning" is set to
                                                "True"
                                            </p>

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

                                            <QuickInput
                                                name="Spacing"
                                                property="Spacing"
                                                type="input"
                                                inputType="number"
                                                value={(
                                                    Selected.Spacing || 10
                                                ).toString()}
                                            />
                                        </div>
                                    </details>
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

                                        <details class={"option round"}>
                                            <summary>
                                                Container Display Options
                                            </summary>

                                            <div
                                                class={
                                                    "details-flex-content-list-box"
                                                }
                                            >
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
                                            name="Font Weight"
                                            property="Weight"
                                            type="input"
                                            inputType="number"
                                            default={400}
                                            step={100}
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
                                )) ||
                                (Selected.Type === "Source" && (
                                    <>
                                        {/* source element controls */}
                                        <QuickInput
                                            name="Use Content Box"
                                            property="UseContentBox"
                                            type="select"
                                            default={"false"}
                                            options={[
                                                {
                                                    label: "True",
                                                    value: "true",
                                                },
                                                {
                                                    label: "False",
                                                    value: "false",
                                                },
                                            ]}
                                        />
                                    </>
                                )) ||
                                (Selected.Type === "StarInfo" && (
                                    <>
                                        {/* starinfo element controls */}
                                        <QuickInput
                                            name="Source"
                                            property="Source"
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
                                value={(Selected.StyleString || "\n").replaceAll(
                                    Selected.Type !== "Page"
                                        ? // don't preserve whitespace on components that aren't pages
                                          /\;\s*(?!\n)/g
                                        : /\;(?!\n)/g,
                                    ";\n"
                                )}
                            />

                            {/* events (not supported on some elements!!) */}
                            {Selected.Type !== "Embed" &&
                                Selected.Type !== "Source" &&
                                Selected.Type !== "StarInfo" &&
                                Selected.Type !== "Card" && (
                                    <details class={"option round"}>
                                        <summary>Events</summary>

                                        <div class={"details-flex-content-list-box"}>
                                            <div className="option">
                                                Events will not preview in the
                                                editor.
                                            </div>

                                            <QuickInput
                                                name="on:click"
                                                property={"onClick"}
                                                value={Selected.onClick || "\n"}
                                                type="textarea"
                                            />

                                            <QuickInput
                                                name="on:mouseenter"
                                                property={"onMouseEnter"}
                                                value={Selected.onMouseEnter || "\n"}
                                                type="textarea"
                                            />

                                            <QuickInput
                                                name="on:mouseleave"
                                                property={"onMouseLeave"}
                                                value={Selected.onMouseLeave || "\n"}
                                                type="textarea"
                                            />

                                            <QuickInput
                                                name="on:keypress"
                                                property={"onKeyPress"}
                                                value={Selected.onKeyPress || "\n"}
                                                type="textarea"
                                            />
                                        </div>
                                    </details>
                                )}

                            {/* import/export */}
                            <details className="option round">
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
                                            const parsed = JSON.parse(
                                                element
                                            ) as Node;

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
        </div>
    );
}
