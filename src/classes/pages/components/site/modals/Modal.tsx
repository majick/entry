export default function Modal(props: {
    children: any;
    buttonid: string;
    modalid: string;
    noIdMatch?: boolean;
    round?: boolean;
}) {
    return (
        <>
            <dialog
                id={props.modalid}
                style={{
                    borderRadius: props.round ? "var(--u-04)" : undefined,
                    padding: props.round ? "var(--u-12)" : undefined,
                    border: props.round
                        ? "solid 1px var(--background-surface1-5)"
                        : undefined,
                }}
            >
                {props.children}
            </dialog>

            <script
                dangerouslySetInnerHTML={{
                    __html: `${
                        props.noIdMatch !== true
                            ? `document.getElementById("${props.buttonid}")
                    .addEventListener("click", () => {
                        document.getElementById("${props.modalid}").showModal(); 
                    });\n`
                            : ""
                    }

                    setTimeout(() => {
                        for (const button of document.getElementsByClassName("modal\:${props.buttonid.replaceAll(
                            ":",
                            "\\:"
                        )}"))
                            button.addEventListener("click", () => {
                                document.getElementById("${
                                    props.modalid
                                }").showModal(); 
                            });
                    }, 500);
                        
                    if (!window.modals) window.modals = {};
                    window.modals["${props.modalid}"] = (state) => {
                        if (state === undefined || state === false) document.getElementById("${
                            props.modalid
                        }").close();
                        else document.getElementById("${
                            props.modalid
                        }").showModal(); 
                    };
                    
                    (() => {
                        /* remove extra versions of modal using XPathEvaluator */
                        /* "evaluate" will return a snapshotLength of however many of this modal exist */
                        const result = (new XPathEvaluator())
                            .createExpression('//*[@id="${props.modalid}"]')
                            .evaluate(document, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
                        
                        if (result.snapshotLength > 1) document.getElementById("${
                            props.modalid
                        }").remove();
                    })();`
                        .replaceAll("\n", "")
                        .replaceAll("    ", ""),
                }}
            />
        </>
    );
}
