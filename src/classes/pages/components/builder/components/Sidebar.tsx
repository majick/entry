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
} from "../Builder";

export default function Sidebar(props: { Page?: string }) {
    return (
        <div
            className="builder:sidebar"
            style={{
                display: SidebarOpen ? "flex" : "none",
            }}
        >
            <button class={"mobile-only"} onClick={() => SetSidebar(false)}>
                Back
            </button>

            {Selected && Selected.NotRemovable !== true && (
                <button onClick={() => Delete(Selected)}>Delete</button>
            )}

            {(props && props.Page === "PagesView" && (
                <>
                    {/* pages list */}
                    <button onClick={() => AddComponent("Page")}>Add Page</button>

                    {Document.Pages.map((page) => {
                        const index = Document.Pages.indexOf(page);

                        return (
                            <button onClick={() => SetPage(index)} title={page.ID}>
                                Page {index + 1}
                            </button>
                        );
                    })}
                </>
            )) ||
                (Selected && (
                    <>
                        {(Selected.Type === "Page" && (
                            <>
                                {/* page element controls */}
                                <div className="option">
                                    <label htmlFor="ID">
                                        <b>ID</b>
                                    </label>

                                    <input
                                        class={"secondary"}
                                        type="text"
                                        name={"ID"}
                                        id={"ID"}
                                        value={Selected.ID}
                                        onKeyUp={(event) => {
                                            if (Selected.Type !== "Page") return;

                                            Selected.ID = (
                                                event.target as HTMLInputElement
                                            ).value;

                                            Update();
                                        }}
                                        style={{
                                            minWidth: "100%",
                                        }}
                                    />
                                </div>

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
                                                    .AlignX === "center"
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
                                                    .AlignY === "center"
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
                                    <div className="option">
                                        <label htmlFor="Width">
                                            <b>Width</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="number"
                                            name={"Width"}
                                            id={"Width"}
                                            value={Selected.Width || -1}
                                            onInput={(event) => {
                                                if (Selected.Type !== "Card") return;

                                                Selected.Width = (
                                                    event.target as HTMLInputElement
                                                ).value;

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>

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
                                    <button onClick={() => Move(true)}>Move</button>

                                    <div className="option">
                                        <label htmlFor="Content">
                                            <b>Content</b>
                                        </label>

                                        <textarea
                                            class={"secondary"}
                                            type="text"
                                            name={"Content"}
                                            id={"Content"}
                                            value={Selected.Content}
                                            onKeyUp={(event) => {
                                                if (Selected.Type !== "Text") return;

                                                Selected.Content = (
                                                    event.target as HTMLInputElement
                                                ).value;

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        ></textarea>
                                    </div>

                                    <div className="option">
                                        <label htmlFor="Size">
                                            <b>Text Size</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="number"
                                            name={"Size"}
                                            id={"Size"}
                                            value={Selected.Size || 16}
                                            onInput={(event) => {
                                                if (Selected.Type !== "Text") return;

                                                Selected.Size = parseInt(
                                                    (
                                                        event.target as HTMLInputElement
                                                    ).value
                                                );

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>

                                    <div className="option">
                                        <label htmlFor="LineSpacing">
                                            <b>Line Spacing</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="number"
                                            name={"LineSpacing"}
                                            id={"LineSpacing"}
                                            value={Selected.LineSpacing || 1.5}
                                            step={"any"}
                                            onInput={(event) => {
                                                if (Selected.Type !== "Text") return;

                                                Selected.LineSpacing = parseInt(
                                                    (
                                                        event.target as HTMLInputElement
                                                    ).value
                                                );

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>

                                    <div className="option">
                                        <label htmlFor="LetterSpacing">
                                            <b>Letter Spacing</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="number"
                                            name={"LetterSpacing"}
                                            id={"LetterSpacing"}
                                            value={Selected.LineSpacing || 1}
                                            step={"any"}
                                            onInput={(event) => {
                                                if (Selected.Type !== "Text") return;

                                                Selected.LetterSpacing = parseInt(
                                                    (
                                                        event.target as HTMLInputElement
                                                    ).value
                                                );

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>

                                    <div className="option">
                                        <label htmlFor="Margin">
                                            <b>Margin</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="number"
                                            name={"Margin"}
                                            id={"Margin"}
                                            value={Selected.Margins || 0}
                                            onInput={(event) => {
                                                if (Selected.Type !== "Text") return;

                                                Selected.Margins = parseInt(
                                                    (
                                                        event.target as HTMLInputElement
                                                    ).value
                                                );

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>

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
                                    <button onClick={() => Move(true)}>Move</button>

                                    <div className="option">
                                        <label htmlFor="Source">
                                            <b>Source</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="url"
                                            name={"Source"}
                                            id={"Source"}
                                            value={Selected.Source}
                                            onKeyUp={(event) => {
                                                if (Selected.Type !== "Image")
                                                    return;

                                                Selected.Source = (
                                                    event.target as HTMLInputElement
                                                ).value;

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>

                                    <div className="option">
                                        <label htmlFor="Alt">
                                            <b>Alt Text</b>
                                        </label>

                                        <input
                                            class={"secondary"}
                                            type="text"
                                            name={"Alt"}
                                            id={"Alt"}
                                            value={Selected.Alt}
                                            onKeyUp={(event) => {
                                                if (Selected.Type !== "Image")
                                                    return;

                                                Selected.Alt = (
                                                    event.target as HTMLInputElement
                                                ).value;

                                                Update();
                                            }}
                                            style={{
                                                minWidth: "100%",
                                            }}
                                        />
                                    </div>
                                </>
                            ))}
                    </>
                ))}
        </div>
    );
}
