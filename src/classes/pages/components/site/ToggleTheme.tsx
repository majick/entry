export default function ToggleTheme() {
    return (
        <>
            <a id={"ThemeButton"} href={"javascript:"}>
                theme
            </a>

            <script
                dangerouslySetInnerHTML={{
                    __html: `document.getElementById("ThemeButton").addEventListener("click", () => {
                        if (
                            window.PASTE_USES_CUSTOM_THEME && 
                            window.localStorage.getItem("entry:user.ForceClientTheme") !== "true"
                        ) return;
                        
                        const current = window.localStorage.getItem("theme");

                        if (current === "dark") {
                            /* set light */
                            document.documentElement.classList.remove("dark-theme");
                            window.localStorage.setItem("theme", "light");
                        } else {
                            /* set dark */
                            document.documentElement.classList.add("dark-theme");
                            window.localStorage.setItem("theme", "dark");
                        }
                    });
                    
                    /* prefer theme */
                    if (
                        window.matchMedia("(prefers-color-scheme: dark)").matches && 
                        !window.localStorage.getItem("theme")
                    ) {
                        document.documentElement.classList.add("dark-theme");
                        window.localStorage.setItem("theme", "dark");
                    } else if (
                        window.matchMedia("(prefers-color-scheme: light)").matches && 
                        !window.localStorage.getItem("theme")
                    ) {
                        document.documentElement.classList.remove("dark-theme");
                        window.localStorage.setItem("theme", "light");
                    }
                    
                    /* restore theme */
                    else if (window.localStorage.getItem("theme")) {
                        const current = window.localStorage.getItem("theme");
                        document.documentElement.className = \`\${current}-theme\`;
                    }`
                        .replaceAll("\n", "")
                        .replaceAll("    ", ""),
                }}
            />
        </>
    );
}
