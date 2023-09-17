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

    function AddOption(label: string, key: string) {
        options.push(
            <div
                class={"builder:card"}
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--background-surface)",
                    borderRadius: "0.4rem",
                    width: "100%",
                }}
            >
                <label htmlFor={key} title={key}>
                    <b>{label}</b>
                </label>

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
            </div>
        );
    }

    // ...
    AddOption("Force Client Theme", "entry:user.ForceClientTheme");
    AddOption("Disable Images", "entry:user.DisableImages");
    AddOption("Editor Hints", "entry:user.EditorHints");

    // render
    return render(<>{options}</>, document.getElementById(id)!);
}
