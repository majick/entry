export default function Modal(props: {
    children: any;
    buttonid: string;
    modalid: string;
    noIdMatch?: boolean;
}) {
    return (
        <>
            <dialog id={props.modalid}>{props.children}</dialog>

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
                    for (const button of document.getElementsByClassName("modal\:${
                        props.buttonid
                    }"))
                        button.addEventListener("click", () => {
                            document.getElementById("${props.modalid}").showModal(); 
                        });
                        
                    if (!window.modals) window.modals = {};
                    window.modals["${props.modalid}"] = (state) => {
                        if (state === undefined || state === false) document.getElementById("${
                            props.modalid
                        }").close();
                        else document.getElementById("${
                            props.modalid
                        }").showModal(); 
                    }`.replaceAll("\n", ""),
                }}
            />
        </>
    );
}
