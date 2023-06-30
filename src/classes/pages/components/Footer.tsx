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
                    <a id={"themeButton"} href={"javascript:toggleTheme()"}>
                        {
                            // this option only exists because some people might prefer their
                            // paste be viewed in light/dark mode, so having the option to switch
                            // the theme without going to browser settings is helpful
                        }
                        theme
                    </a>
                </li>

                <style
                    dangerouslySetInnerHTML={{
                        __html: `.__footernav li:not(:first-child) {
                            margin-left: 0.25rem;
                        }
                        
                        .__footernav li::marker {
                            content: "·";
                        }

                        .__footernav li:first-child {
                           margin-left: -0.25rem;
                        }
                        
                        .__footernav li:first-child::marker {
                            content: "";
                        }`,
                    }}
                />

                <script
                    dangerouslySetInnerHTML={{
                        __html: `function toggleTheme() {
                            document.documentElement.classList.toggle("other-theme");
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
