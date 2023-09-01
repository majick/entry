export default function Modal(props: {
    children: any;
    buttonid: string;
    modalid: string;
}) {
    return (
        <>
            <dialog id={props.modalid}>{props.children}</dialog>

            <script
                dangerouslySetInnerHTML={{
                    __html: `document.getElementById("${props.buttonid}")
                        .addEventListener("click", () => {
                            document.getElementById("${props.modalid}").showModal(); 
                        });`,
                }}
            />
        </>
    );
}
