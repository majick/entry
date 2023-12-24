import ToggleTheme from "./ToggleTheme";
import { Modal } from "fusion";

import BundlesDB from "../../../db/BundlesDB";
import { HoneybeeConfig } from "honeybee";

import pack from "../../../../../package.json";
import LoadingModal from "./modals/Loading";

// plugin footer load
const FooterExtras: string[] = [];

export async function InitFooterExtras(plugins: HoneybeeConfig["Pages"]) {
    // if a plugin page exists that begins with ._footer, save it to FooterExtras
    for (const plugin of Object.entries(plugins)) {
        if (!plugin[0].startsWith("._footer")) continue;

        FooterExtras.push(
            // load plugin using fake request and then push the text output
            `<!-- ${plugin[0]} -->${await (
                await new plugin[1].Page().request(
                    new Request("bundles:footer-load")
                )
            ).text()}`
        );
    }
}

// ...
export default function Footer(props: {
    ShowBottomRow?: boolean;
    IncludeLoading?: boolean;
}) {
    const homepageLink =
        (BundlesDB.config &&
            BundlesDB.config.app &&
            BundlesDB.config.app.hostname &&
            `https://${BundlesDB.config.app.hostname}/`) ||
        "/";

    // return
    return (
        <div class={"flex justify-center align-center flex-column"}>
            <hr
                class={"small"}
                style={{
                    width: "425px",
                    maxWidth: "100%",
                    marginTop: "1rem",
                }}
            />

            <ul
                class={"__footernav"}
                style={{
                    padding: "0",
                    margin: "0",
                }}
            >
                <li>
                    {!BundlesDB.config.app ||
                        (BundlesDB.config.app.enable_builder !== false && (
                            <a
                                href="javascript:"
                                class={"modal:bundles:button.NewPaste"}
                            >
                                new
                            </a>
                        )) || <a href={`${homepageLink}?new-paste`}>new</a>}
                </li>

                <li>
                    <a href="/s">settings</a>
                </li>

                {BundlesDB.config.app &&
                    BundlesDB.config.app.enable_search !== false && (
                        <li>
                            <a href="/search">search</a>
                        </li>
                    )}

                {BundlesDB.config.app &&
                    BundlesDB.config.app.footer &&
                    BundlesDB.config.app.footer.info && (
                        <li>
                            <a href={`/${BundlesDB.config.app.footer.info}`}>info</a>
                        </li>
                    )}
            </ul>

            {BundlesDB.config.app &&
                BundlesDB.config.app.footer &&
                BundlesDB.config.app.footer.rows && (
                    <>
                        {/* custom footer rows */}
                        {BundlesDB.config.app.footer.rows.map((row) => (
                            <ul
                                class={"__footernav flex"}
                                style={{
                                    gap: "0.25rem",
                                    padding: "0",
                                    margin: "0",
                                }}
                            >
                                {Object.entries(row).map((link) => (
                                    <li>
                                        <a href={link[1]}>{link[0]}</a>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </>
                )}

            {props.ShowBottomRow !== false && (
                <p
                    style={{
                        fontSize: "12px",
                        margin: "0.4rem 0 0 0",
                    }}
                >
                    <a
                        href="https://codeberg.org/sentrytwo/bundles"
                        title={`Powered by Bundles${
                            pack ? ` v${pack.version}` : ""
                        }`}
                    >
                        {BundlesDB.config.name || "Bundles"}
                    </a>{" "}
                    <span
                        style={{
                            color: "var(--text-color-faded)",
                        }}
                    >
                        - {BundlesDB.config.tagline || "Markdown Delivery Service"}
                    </span>
                </p>
            )}

            <div
                style={{
                    position: "relative",
                    width: "100%",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        bottom: props.ShowBottomRow !== false ? "8px" : "0",
                        right: "0",
                    }}
                >
                    <ToggleTheme />
                </div>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `.__footernav {
                        display: flex;
                        gap: 0.25rem;
                    }
                    
                    .__footernav li {
                        list-style-type: "·";
                        padding: 0 0.25rem;
                    }

                    .__footernav li:first-child {
                       margin-left: -0.25rem;
                    }
                    
                    .__footernav li:first-child {
                        list-style-type: none;
                    }
                    
                    .__footer_cardbtn {
                        width: calc(33% - 0.25rem);
                        height: 10rem !important;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        gap: 0.5rem;
                        border-radius: 0.4rem;
                    }`,
                }}
            />

            {/* localize dates */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `setTimeout(() => {
                        for (const element of document.querySelectorAll(".utc-date-to-localize"))
                                element.innerText = new Date(element.innerText).toLocaleString();
                    }, 50);`,
                }}
            />

            {/* handle prefetch */}
            <script
                data-state="save"
                type={"module"}
                dangerouslySetInnerHTML={{
                    __html: `import Prefetch from "/Prefetch.js"; new Prefetch({});`,
                }}
            />

            {/* events */}
            <script
                type="module"
                dangerouslySetInnerHTML={{
                    __html: `import { RegisterEditorFormListeners } from "/Prefetch.js"; 
                    RegisterEditorFormListeners();`,
                }}
            />

            {/* footer extras */}
            {FooterExtras.map((html) => (
                <div dangerouslySetInnerHTML={{ __html: html }}></div>
            ))}

            {/* modals */}
            <Modal
                buttonid="bundles:button.NewPaste"
                modalid="bundles:modal.NewPaste"
                noIdMatch={true}
                round={true}
            >
                <h4 style={{ textAlign: "center", width: "100%" }}>Create Paste</h4>

                <hr />

                <div class={"flex flex-wrap justify-center align-center g-4"}>
                    <a
                        href={`${homepageLink}?new-paste`}
                        class={"button border dashed __footer_cardbtn"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                            aria-label={"File Symbol"}
                        >
                            <path d="M3 3a2 2 0 0 1 2-2h9.982a2 2 0 0 1 1.414.586l4.018 4.018A2 2 0 0 1 21 7.018V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm2-.5a.5.5 0 0 0-.5.5v18a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V8.5h-4a2 2 0 0 1-2-2v-4Zm10 0v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0-.146-.336l-4.018-4.018A.5.5 0 0 0 15 2.5Z"></path>
                        </svg>
                        <b>Normal</b>
                    </a>

                    <a
                        href={`${homepageLink}paste/writer`}
                        class={"button border dashed __footer_cardbtn"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="24"
                            height="24"
                            aria-label={"Pencil Symbol"}
                        >
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                        </svg>
                        <b>Writer</b>
                    </a>

                    {BundlesDB.config.app &&
                        BundlesDB.config.app.enable_builder !== false && (
                            <a
                                href={`${homepageLink}paste/builder`}
                                class={"button border dashed __footer_cardbtn"}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="24"
                                    height="24"
                                    aria-label={"Sparkle Symbol"}
                                >
                                    <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z"></path>
                                </svg>
                                <b>Builder</b>
                            </a>
                        )}
                </div>

                <hr />

                <form
                    method="dialog"
                    style={{
                        width: "25rem",
                        maxWidth: "100%",
                    }}
                >
                    <button
                        className="green round"
                        style={{
                            width: "100%",
                        }}
                    >
                        Cancel
                    </button>
                </form>
            </Modal>

            {props.IncludeLoading !== false && <LoadingModal />}
        </div>
    );
}
