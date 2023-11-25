import { Select, Document, CurrentPage } from "../Builder";
import { Node } from "../schema";
import parser from "../parser";

/**
 * @function NodeListing
 *
 * @export
 * @param {{ Node: Node, DisableBuilderFeatures?: boolean }} props
 * @return {any}
 */
export default function NodeListing(props: {
    Node: Node;
    DisableBuilderFeatures?: boolean;
}): any {
    const node = props.Node;

    // if node has the id "node:removed", return nothing
    if (props.Node.ID === "node:removed") return <></>;

    // if node has a child node with the id "node:removed", remove it
    if (props.Node.Children)
        for (const child of props.Node.Children)
            if (child.ID === "node:removed")
                props.Node.Children[props.Node.Children.indexOf(child)] = {
                    Type: "HTMLEntity",
                    NotRemovable: true,
                    Content: "",
                };

    // don't render HTMLEntity
    if (props.Node.Type === "HTMLEntity") return <></>;

    // return
    return (
        <div
            title={node.ID}
            onMouseEnter={() => {
                if (props.DisableBuilderFeatures === true) return;

                // try to get rendered node
                const rendered = (window as any).Builder.Page.Element.getElementById(
                    node.ID!
                );

                if (!rendered) return;

                // remove hover from all other elements
                for (const element of (
                    window as any
                ).Builder.Page.Element.querySelectorAll("component"))
                    element.classList.remove("hover");

                // add hover
                return rendered.classList.add("hover");
            }}
            onMouseLeave={() => {
                if (props.DisableBuilderFeatures === true) return;

                // try to get rendered node
                const rendered = (window as any).Builder.Page.Element.getElementById(
                    node.ID!
                );

                if (!rendered) return;

                // remove hover
                return rendered.classList.remove("hover");
            }}
        >
            {(() => {
                // has 0 children
                if (!props.Node.Children || props.Node.Children.length === 0)
                    return (
                        <button
                            class={"justify-start round full"}
                            onClick={() => {
                                if (props.DisableBuilderFeatures === true) return;

                                // get parent node
                                let parent = parser
                                    .GetNodes()
                                    .find(
                                        (n) =>
                                            n.Type === "Card" &&
                                            n.Children.includes(node)
                                    );

                                if (!parent) {
                                    // try to find in current page
                                    if (
                                        Document.Pages[
                                            CurrentPage
                                        ].Children.includes(node)
                                    )
                                        parent = Document.Pages[CurrentPage];
                                    else return;
                                }

                                // select
                                Select(node, parent.Children!);
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-label={"File Icon"}
                            >
                                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                            </svg>
                            {node.Nickname || node.Type}{" "}
                            {node.Nickname && <>({node.Type})</>}
                        </button>
                    );
                // element has child nodes!
                else
                    return (
                        <details class="file-list-entry full round">
                            <summary
                                class={"option full justify-space-between"}
                                style={{
                                    flexDirection: "row",
                                    paddingRight: 0,
                                }}
                            >
                                <span class={"flex g-4 align-center"}>
                                    <svg
                                        className="closed-icon"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Directory Closed Icon"}
                                    >
                                        <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
                                    </svg>
                                    <svg
                                        className="open-icon"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Directory Open Icon"}
                                    >
                                        <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13a1 1 0 0 1 1 1v.5H2.75a.75.75 0 0 0 0 1.5h11.978a1 1 0 0 1 .994 1.117L15 13.25A1.75 1.75 0 0 1 13.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75c0-.464.184-.91.513-1.237Z"></path>
                                    </svg>
                                    {node.Nickname || node.Type}{" "}
                                    {node.Nickname && <>({node.Type})</>}
                                </span>

                                {props.DisableBuilderFeatures !== true && (
                                    <button
                                        class={"normal round"}
                                        title={"Inspect Component"}
                                        style={{
                                            background: "transparent",
                                        }}
                                        onClick={() => {
                                            // get parent node
                                            let parent = parser
                                                .GetNodes()
                                                .find(
                                                    (n) =>
                                                        n.Type === "Card" &&
                                                        n.Children.includes(node)
                                                );

                                            if (!parent) {
                                                // try to find in current page
                                                if (
                                                    Document.Pages[
                                                        CurrentPage
                                                    ].Children.includes(node)
                                                )
                                                    parent =
                                                        Document.Pages[CurrentPage];
                                                else return;
                                            }

                                            // select
                                            Select(node, parent.Children!);
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Pencil Symbol"}
                                        >
                                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                        </svg>
                                    </button>
                                )}
                            </summary>

                            <div className="details-flex-content-list-box">
                                {node.Children!.map((n) => (
                                    <NodeListing
                                        Node={n}
                                        DisableBuilderFeatures={
                                            props.DisableBuilderFeatures || false
                                        }
                                    />
                                ))}
                            </div>
                        </details>
                    );
            })()}
        </div>
    );
}
