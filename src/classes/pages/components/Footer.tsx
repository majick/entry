import ToggleTheme from "./ToggleTheme";

import EntryDB, { Paste } from "../../db/EntryDB";
import { HoneybeeConfig } from "honeybee";

import { db } from "../api/API";

// get version
let version: Partial<Paste> | undefined;

if (!EntryDB.config) {
    await EntryDB.GetConfig();
    version = await db.GetPasteFromURL("v");
}

// plugin footer load
const FooterExtras: string[] = [];

export async function InitFooterExtras(plugins: HoneybeeConfig["Pages"]) {
    // if a plugin page exists that begins with ._footer, save it to FooterExtras
    for (const plugin of Object.entries(plugins)) {
        if (!plugin[0].startsWith("._footer")) continue;

        FooterExtras.push(
            // load plugin using fake request and then push the text output
            `<!-- ${plugin[0]} -->${await (
                await new plugin[1].Page().request(new Request("entry:footer-load"))
            ).text()}`
        );
    }
}

// ...
export default function Footer(props: { ShowBottomRow?: boolean }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
            }}
        >
            <hr
                style={{
                    width: "425px",
                    maxWidth: "100%",
                }}
            />

            <ul
                class={"__footernav"}
                style={{
                    padding: "0",
                    margin: "0",
                }}
            >
                <li>
                    <a href="/">new</a>
                </li>

                <li>
                    <a href="https://codeberg.org/hkau/entry/issues">issues</a>
                </li>

                {EntryDB.config.app &&
                    EntryDB.config.app.enable_search !== false && (
                        <li>
                            <a href="/search">search</a>
                        </li>
                    )}

                <li>
                    <ToggleTheme />
                </li>
            </ul>

            {EntryDB.config.app &&
                EntryDB.config.app.footer &&
                EntryDB.config.app.footer.rows && (
                    <>
                        {/* custom footer rows */}
                        {EntryDB.config.app.footer.rows.map((row) => (
                            <ul
                                class={"__footernav"}
                                style={{
                                    display: "flex",
                                    gap: "0.25rem",
                                    padding: "0",
                                    margin: "0",
                                }}
                            >
                                {Object.entries(row).map((link) => (
                                    <li>
                                        <a href={link[1]}>{link[0]}</a>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </>
                )}

            {props.ShowBottomRow !== false && (
                <p
                    style={{
                        fontSize: "12px",
                        margin: "0.4rem 0 0 0",
                    }}
                >
                    <a
                        href="https://codeberg.org/hkau/entry"
                        title={`Running Entry${
                            version ? ` v${version!.Content}` : ""
                        }`}
                    >
                        {EntryDB.config.name || "Entry"}
                    </a>{" "}
                    <span
                        style={{
                            color: "var(--text-color-faded)",
                        }}
                    >
                        - A Markdown Pastebin
                    </span>
                </p>
            )}

            <style
                dangerouslySetInnerHTML={{
                    __html: `.__footernav {
                        display: flex;
                        gap: 0.25rem;
                    }
                    
                    .__footernav li {
                        list-style-type: "·";
                        padding: 0 0.25rem;
                    }

                    .__footernav li:first-child {
                       margin-left: -0.25rem;
                    }
                    
                    .__footernav li:first-child {
                        list-style-type: none;
                    }`,
                }}
            />

            {/* localize dates */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `setTimeout(() => {
                        for (const element of document.querySelectorAll(".utc-date-to-localize"))
                                element.innerText = new Date(element.innerText).toLocaleString();
                    }, 50);`,
                }}
            />

            {/* footer extras */}
            {FooterExtras.map((html) => (
                <div dangerouslySetInnerHTML={{ __html: html }}></div>
            ))}
        </div>
    );
}
