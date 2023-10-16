export default function Window(props: {
    title: string;
    children: any;
    id?: string;
    fullClose?: boolean;
}) {
    // state
    let Dragging = false;
    const ID = props.id || crypto.randomUUID(); // add id if we don't already have one

    // return
    return (
        <div
            id={ID}
            class="block-dialog"
            style={{
                top: "0.5rem",
                left: "0.5rem",
            }}
            onMouseUp={() => (Dragging = false)} // we can only start from block-header!
            onMouseMove={(event) => {
                if (!Dragging) return;

                // get target
                let target = event.target as HTMLElement;

                // ...find dialog
                while (!target.classList.contains("block-dialog"))
                    target = target.parentElement as HTMLElement;

                // ...find header
                const header: HTMLDivElement =
                    target.querySelector(".block-header")!;

                const headerRect = header.getBoundingClientRect();

                // move element
                target.style.left = `${event.pageX - target.clientWidth / 2}px`;
                target.style.top = `${
                    event.pageY - target.clientHeight / headerRect.height - 25
                }px`;
            }}
        >
            <div
                className="block-header flex justify-space-between align-center"
                onMouseDown={() => (Dragging = true)}
            >
                <span>{props.title}</span>

                <div className="flex g-4">
                    <button
                        onClick={() => {
                            const content = document.getElementById(
                                `${ID}-content`
                            )!;

                            if (content.style.display === "none")
                                content.style.display = "block";
                            else content.style.display = "none";
                        }}
                    >
                        Fold
                    </button>

                    <button
                        onClick={() =>
                            !props.fullClose
                                ? (document.getElementById(ID)!.style.display =
                                      "none")
                                : document.getElementById(ID)!.remove()
                        }
                    >
                        Close
                    </button>
                </div>
            </div>

            <div id={`${ID}-content`}>{props.children}</div>
        </div>
    );
}
