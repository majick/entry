import ToggleTheme from "./ToggleTheme";

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
                    maxWidth: "100vw",
                }}
            />

            <ul
                class={"__footernav"}
                style={{
                    display: "flex",
                    gap: "0.25rem",
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

                <li>
                    <ToggleTheme />
                </li>

                <style
                    dangerouslySetInnerHTML={{
                        __html: `.__footernav li:not(:first-child) {
                            margin-left: 0.25rem;
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
            </ul>

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
        </div>
    );
}
