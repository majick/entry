import ToggleTheme from "./ToggleTheme";

import type { Config } from "../../..";
import EntryDB from "../../db/EntryDB";

const config: Config = (await EntryDB.GetConfig()) as Config;

export default function Footer() {
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

                <li>
                    <a href="/v">version</a>
                </li>

                {config.app && config.app.enable_search !== false && (
                    <li>
                        <a href="/search">search</a>
                    </li>
                )}

                <li>
                    <ToggleTheme />
                </li>
            </ul>

            {config.app && config.app.footer && config.app.footer.rows && (
                <>
                    {/* custom footer rows */}
                    {config.app.footer.rows.map((row) => (
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

            <p
                style={{
                    fontSize: "12px",
                    margin: "0.4rem 0 0 0",
                }}
            >
                <a href="https://codeberg.org/hkau/entry">Entry</a>{" "}
                <span
                    style={{
                        color: "var(--text-color-faded)",
                    }}
                >
                    - A Markdown Pastebin
                </span>
            </p>

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
                    __html: `for (const element of document.querySelectorAll(".utc-date-to-localize"))
                                element.innerText = new Date(element.innerText).toLocaleString();`,
                }}
            />
        </div>
    );
}
