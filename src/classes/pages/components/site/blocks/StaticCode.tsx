import LineNumbers from "./LineNumbers";

/**
 * @function StaticCode
 *
 * @export
 * @param {{
 *     children: string;
 *     block?: number;
 *     lang?: string;
 * }} props
 * @return {*}
 */
export default function StaticCode(props: {
    children: string;
    block?: number;
    lang?: string;
    margin?: boolean;
}): any {
    if (!props.block) props.block = 0;
    const BlockID = crypto.randomUUID();

    // return
    return (
        <pre
            class="flex"
            style={`position: relative;${
                // only add padding if there is only 1 line
                props.children.split("\n").length === 1 ? ' padding: 12px 0;"' : ""
            }${props.margin === false ? " margin-bottom: 0;" : ""}`}
        >
            <LineNumbers block={props.block}>{props.children}</LineNumbers>

            <code class={`language-${props.lang || "plain"} flex`} id={BlockID}>
                {props.children.split("\n").map((line) => (
                    <span
                        class={`${
                            line.startsWith("+")
                                ? "added"
                                : line.startsWith("-")
                                ? "removed"
                                : ""
                        }`}
                    >
                        {line}
                    </span>
                ))}
            </code>

            <button
                class="secondary copy-button"
                title="Copy Code"
                id={`copy-${BlockID}`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                >
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                </svg>
            </button>

            <script
                dangerouslySetInnerHTML={{
                    __html: `document.getElementById("copy-${BlockID}").addEventListener("click", () => {
                        window.navigator.clipboard.writeText(document.getElementById("${BlockID}").innerText);
                    });`,
                }}
            />
        </pre>
    );
}
