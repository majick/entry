/**
 * @file Handle UserSettings
 * @name UserSettings.tsx
 * @license MIT
 */

import { render } from "preact";
import Checkbox from "../form/Checkbox";

/**
 * @function UserSettings
 *
 * @export
 * @param {string} id
 * @return {*}
 */
export default function UserSettings(id: string): any {
    // build options
    const options: any[] = [];

    function AddOption(
        label: string,
        key: string,
        type: string = "checkbox",
        selectOptions: Array<{ label: string; value: string }> = [],
        refresh: boolean = false
    ) {
        options.push(
            <div
                class={"builder:card"}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.4rem",
                    alignItems: "center",
                    background: "var(--background-surface)",
                    borderRadius: "0.4rem",
                    width: "100%",
                }}
            >
                <label htmlFor={key} title={key}>
                    <b>{label}</b>
                </label>

                {(type === "checkbox" && (
                    <Checkbox
                        name={key}
                        checked={window.localStorage.getItem(key) === "true"}
                        round={true}
                        changed={(event) => {
                            const target = event.target as HTMLInputElement;

                            window.localStorage.setItem(
                                key,
                                target.checked === true ? "true" : "false"
                            );
                        }}
                    />
                )) ||
                    (type === "select" && (
                        <select
                            name={key}
                            id={key}
                            class={"mobile:max round"}
                            style={{
                                width: "20rem",
                            }}
                            onChange={(event) => {
                                const target = event.target as HTMLSelectElement;

                                window.localStorage.setItem(
                                    key,
                                    target.selectedOptions[0].value as any
                                );

                                if (refresh) window.location.reload();
                            }}
                        >
                            {selectOptions!.map((option) => (
                                <option
                                    value={option.value}
                                    selected={
                                        window.localStorage.getItem(key) ===
                                        option.value
                                    }
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )) ||
                    (type === "textarea" && (
                        <textarea
                            name={key}
                            id={key}
                            class={"round"}
                            value={window.localStorage.getItem(key) || ""}
                            onBlur={(event: Event<HTMLInputElement>) => {
                                const target = event.target as HTMLInputElement;
                                window.localStorage.setItem(key, target.value);
                            }}
                            style={{
                                width: "20rem",
                                maxWidth: "100%",
                            }}
                        />
                    ))}
            </div>
        );
    }

    // ...
    AddOption(
        "Global Theme",
        "theme",
        "select",
        [
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
                value: "purple-theme dark",
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
                value: "blue-theme dark",
            },
        ],
        true
    );

    AddOption("Force Global Theme", "entry:user.ForceClientTheme");
    AddOption("Disable Custom Paste CSS", "entry:user.DisableCustomPasteCSS");
    AddOption("Disable Images", "entry:user.DisableImages");
    AddOption("Disable Animations", "entry:user.DisableAnimations");
    AddOption("Editor Hints", "entry:user.EditorHints");
    AddOption("Show Line Numbers", "entry:user.ShowLineNumbers");
    AddOption("Global CSS String", "entry:user.GlobalCSSString", "textarea");

    // render
    return render(<>{options}</>, document.getElementById(id)!);
}
