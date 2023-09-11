import {
    Update,
    SetSidebar,
    SidebarOpen,
    AddComponent,
    Document,
    CurrentPage,
    SetPage,
    Selected,
    Move,
    Delete,
    SelectedParent,
} from "../Builder";

export function QuickInput(props: {
    name: string;
    property: string;
    type: "input" | "textarea";
    inputType?: string;
    default?: any;
    step?: number;
}) {
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
                        value={(Selected as { [key: string]: any })[props.property]}
                        onBlur={(event) => {
                            (Selected as { [key: string]: any })[props.property] = (
                                event.target as HTMLInputElement
                            ).value;

                            Update();
                        }}
                        style={{
                            minWidth: "100%",
                        }}
                    ></textarea>
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
    return (
        <div
            className="builder:sidebar"
            style={{
                display: SidebarOpen ? "flex" : "none",
            }}
        >
            <button
                class={"mobile-only"}
                style={{
                    position: "sticky",
                    top: 0,
                }}
                onClick={() => SetSidebar(false)}
            >
                Back
            </button>

            {Selected && Selected.NotRemovable !== true && !props.Page && (
                <button onClick={() => Delete(Selected)} class={"red"}>
                    Delete
                </button>
            )}

            {Selected && Selected.NotRemovable !== true && !props.Page && (
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

                                <div className="option">
                                    <label htmlFor="Theme">
                                        <b>Theme</b>
                                    </label>

                                    <select
                                        name="Theme"
                                        id="Theme"
                                        class={"secondary"}
                                        style={{
                                            width: "100%",
                                        }}
                                        onChange={(event) => {
                                            if (Selected.Type !== "Page") return;

                                            const target =
                                                event.target as HTMLSelectElement;

                                            Selected.Theme = target
                                                .selectedOptions[0].value as any;

                                            Update();
                                        }}
                                    >
                                        <option
                                            value="light"
                                            selected={
                                                Document.Pages[CurrentPage].Theme ===
                                                "light"
                                            }
                                        >
                                            Light
                                        </option>

                                        <option
                                            value="dark"
                                            selected={
                                                Document.Pages[CurrentPage].Theme ===
                                                "dark"
                                            }
                                        >
                                            Dark
                                        </option>

                                        <option
                                            value="purple"
                                            selected={
                                                Document.Pages[CurrentPage].Theme ===
                                                "purple"
                                            }
                                        >
                                            Purple
                                        </option>

                                        <option
                                            value="pink"
                                            selected={
                                                Document.Pages[CurrentPage].Theme ===
                                                "pink"
                                            }
                                        >
                                            Pink
                                        </option>

                                        <option
                                            value="green"
                                            selected={
                                                Document.Pages[CurrentPage].Theme ===
                                                "green"
                                            }
                                        >
                                            Green
                                        </option>

                                        <option
                                            value="blue"
                                            selected={
                                                Document.Pages[CurrentPage].Theme ===
                                                "blue"
                                            }
                                        >
                                            Blue
                                        </option>
                                    </select>
                                </div>

                                <div className="option">
                                    <label htmlFor="AlignX">
                                        <b>Align X</b>
                                    </label>

                                    <select
                                        name="AlignX"
                                        id="AlignX"
                                        class={"secondary"}
                                        style={{
                                            width: "100%",
                                        }}
                                        onChange={(event) => {
                                            if (Selected.Type !== "Page") return;

                                            const target =
                                                event.target as HTMLSelectElement;

                                            Selected.AlignX = target
                                                .selectedOptions[0].value as any;

                                            Update();
                                        }}
                                    >
                                        <option
                                            value="flex-start"
                                            selected={
                                                Document.Pages[CurrentPage]
                                                    .AlignX === "left"
                                            }
                                        >
                                            Left
                                        </option>

                                        <option
                                            value="center"
                                            selected={
                                                Document.Pages[CurrentPage]
                                                    .AlignX === "center" ||
                                                !Document.Pages[CurrentPage].AlignX
                                            }
                                        >
                                            Center
                                        </option>

                                        <option
                                            value="flex-end"
                                            selected={
                                                Document.Pages[CurrentPage]
                                                    .AlignX === "right"
                                            }
                                        >
                                            Right
                                        </option>
                                    </select>
                                </div>

                                <div className="option">
                                    <label htmlFor="AlignY">
                                        <b>Align Y</b>
                                    </label>

                                    <select
                                        name="AlignY"
                                        id="AlignY"
                                        class={"secondary"}
                                        style={{
                                            width: "100%",
                                        }}
                                        onChange={(event) => {
                                            if (Selected.Type !== "Page") return;

                                            const target =
                                                event.target as HTMLSelectElement;

                                            Selected.AlignY = target
                                                .selectedOptions[0].value as any;

                                            Update();
                                        }}
                                    >
                                        <option
                                            value="flex-start"
                                            selected={
                                                Document.Pages[CurrentPage]
                                                    .AlignY === "top"
                                            }
                                        >
                                            Top
                                        </option>

                                        <option
                                            value="center"
                                            selected={
                                                Document.Pages[CurrentPage]
                                                    .AlignY === "center" ||
                                                !Document.Pages[CurrentPage].AlignY
                                            }
                                        >
                                            Center
                                        </option>

                                        <option
                                            value="flex-end"
                                            selected={
                                                Document.Pages[CurrentPage]
                                                    .AlignY === "bottom"
                                            }
                                        >
                                            Bottom
                                        </option>
                                    </select>
                                </div>
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

                                    <div className="option">
                                        <label htmlFor="Background">
                                            <b>Background</b>
                                        </label>

                                        <select
                                            name="Background"
                                            id="Background"
                                            class={"secondary"}
                                            style={{
                                                width: "100%",
                                            }}
                                            onChange={(event) => {
                                                if (Selected.Type !== "Card") return;

                                                const target =
                                                    event.target as HTMLSelectElement;

                                                Selected.Background = target
                                                    .selectedOptions[0].value as any;

                                                Update();
                                            }}
                                        >
                                            <option
                                                value="var(--background-surface1)"
                                                selected={
                                                    Selected.Background !==
                                                    "transparent"
                                                }
                                            >
                                                Shown
                                            </option>

                                            <option
                                                value="transparent"
                                                selected={
                                                    Selected.Background ===
                                                    "transparent"
                                                }
                                            >
                                                Hidden
                                            </option>
                                        </select>
                                    </div>
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

                                    <div className="option">
                                        <label htmlFor="Alignment">
                                            <b>Align</b>
                                        </label>

                                        <select
                                            name="Alignment"
                                            id="Alignment"
                                            class={"secondary"}
                                            style={{
                                                width: "100%",
                                            }}
                                            onChange={(event) => {
                                                if (Selected.Type !== "Text") return;

                                                const target =
                                                    event.target as HTMLSelectElement;

                                                Selected.Alignment = target
                                                    .selectedOptions[0].value as any;

                                                Update();
                                            }}
                                        >
                                            <option
                                                value="left"
                                                selected={
                                                    Selected.Alignment === "left"
                                                }
                                            >
                                                Left
                                            </option>

                                            <option
                                                value="right"
                                                selected={
                                                    Selected.Alignment === "right"
                                                }
                                            >
                                                Right
                                            </option>

                                            <option
                                                value="center"
                                                selected={
                                                    Selected.Alignment === "center"
                                                }
                                            >
                                                Center
                                            </option>
                                        </select>
                                    </div>
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
                        <div className="option">
                            <label htmlFor="StyleString">
                                <b>CSS Style String</b>
                            </label>

                            <textarea
                                class={"secondary"}
                                type="text"
                                name={"StyleString"}
                                id={"StyleString"}
                                value={(Selected.StyleString || "").replaceAll(
                                    /\;\s*(?!\n)/g,
                                    ";\n"
                                )}
                                onKeyUp={(event) => {
                                    Selected.StyleString = (
                                        event.target as HTMLInputElement
                                    ).value;

                                    Update();
                                }}
                                style={{
                                    minWidth: "100%",
                                }}
                            ></textarea>
                        </div>
                    </>
                ))}
        </div>
    );
}
