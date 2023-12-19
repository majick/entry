export default function ToggleTheme() {
    return (
        <>
            <a
                id={"ThemeButton"}
                href={"javascript:ToggleTheme()"}
                title={"Toggle Theme"}
                style={{
                    color: "var(--text-color-faded)",
                }}
            >
                <div id="theme-icon-sun">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Sun Symbol"}
                    >
                        <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Zm3.536-1.464a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Z"></path>
                    </svg>
                </div>

                <div id="theme-icon-moon">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Moon Symbol"}
                    >
                        <path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z"></path>
                    </svg>
                </div>
            </a>

            <script
                dangerouslySetInnerHTML={{
                    __html: `window.SunIcon = document.getElementById("theme-icon-sun");
                    window.MoonIcon = document.getElementById("theme-icon-moon");
                    function ToggleTheme() {
                        if (
                            window.PASTE_USES_CUSTOM_THEME && 
                            window.localStorage.getItem("bundles:user.ForceClientTheme") !== "true"
                        ) return;
                        
                        const current = window.localStorage.getItem("theme");

                        if (current === "dark") {
                            /* set light */
                            document.documentElement.classList.remove("dark-theme");
                            window.localStorage.setItem("theme", "light");
                            
                            window.SunIcon.style.display = "block";
                            window.MoonIcon.style.display = "none";
                        } else {
                            /* set dark */
                            document.documentElement.classList.add("dark-theme");
                            window.localStorage.setItem("theme", "dark");

                            window.SunIcon.style.display = "none";
                            window.MoonIcon.style.display = "block";
                        }
                    }
                    
                    /* prefer theme */
                    if (
                        window.matchMedia("(prefers-color-scheme: dark)").matches && 
                        !window.localStorage.getItem("theme")
                    ) {
                        document.documentElement.classList.add("dark-theme");
                        window.localStorage.setItem("theme", "dark");
                        window.SunIcon.style.display = "none";
                        window.MoonIcon.style.display = "block";
                    } else if (
                        window.matchMedia("(prefers-color-scheme: light)").matches && 
                        !window.localStorage.getItem("theme")
                    ) {
                        document.documentElement.classList.remove("dark-theme");
                        window.localStorage.setItem("theme", "light");
                        window.SunIcon.style.display = "block";
                        window.MoonIcon.style.display = "none";
                    }
                    
                    /* restore theme */
                    else if (window.localStorage.getItem("theme")) {
                        const current = window.localStorage.getItem("theme");
                        document.documentElement.className = \`\${current}-theme\`;
                        
                        if (current.includes("dark")) {
                            /* sun icon */
                            window.SunIcon.style.display = "none";
                            window.MoonIcon.style.display = "block";
                        } else {
                            /* moon icon */
                            window.SunIcon.style.display = "block";
                            window.MoonIcon.style.display = "none";
                        }
                    }
                    
                    /* global css string */
                    if (
                        !window.PASTE_USES_CUSTOM_THEME || 
                        window.localStorage.getItem("bundles:user.ForceClientTheme") === "true"
                    ) {
                        const style = document.createElement("style");
                        style.innerHTML = window.localStorage.getItem("bundles:user.GlobalCSSString");
                        document.body.appendChild(style);
                    }`
                        .replaceAll("\n", "")
                        .replaceAll("    ", ""),
                }}
            />
        </>
    );
}
