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
                    borderColor: "var(--background-surface1)",
                    maxWidth: "100vw",
                }}
            />

            <div
                style={{
                    display: "flex",
                    gap: "0.25rem",
                }}
            >
                <a href="/">new</a>
                <span>·</span>
                <a href="https://codeberg.org/hkau/entry/issues">issues</a>
                <span>·</span>
                <a id={"themeButton"} href={"javascript:toggleTheme()"}>
                    {
                        // this option only exists because some people might prefer their
                        // paste be viewed in light/dark mode, so having the option to switch
                        // the theme without going to browser settings is helpful
                    }
                    theme
                </a>

                <script
                    dangerouslySetInnerHTML={{
                        __html: `function toggleTheme() {
                            document.documentElement.classList.toggle("other-theme");
                        }`,
                    }}
                />
            </div>

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
